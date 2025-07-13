/* eslint-disable prettier/prettier */
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useDisclosure,
  HStack,
  Spinner,
  Center,
  Badge,
  Switch,
  Textarea,
  VStack,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { fetchWithAuth } from '../firebase/authUtils'
import { auth } from '../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'

// API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

interface Country {
  _id: string
  name: string
  value: number
  isAvailable: boolean
  isActive: boolean
  disabledReason: string
  disabledBy: string
  disabledAt: Date | null
}

interface City {
  _id: string
  name: string
  value: number
  isAvailable: boolean
  isActive: boolean
  disabledReason: string
  disabledBy: string
  disabledAt: Date | null
}

// Helper function to wait for auth initialization
const waitForAuthInit = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    // First check if already authenticated
    if (auth.currentUser) {
      resolve(true);
      return;
    }
    
    // If not, listen once for auth state change
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(!!user);
    });
    
    // If auth doesn't initialize within 2 seconds, continue anyway
    setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, 2000);
  });
};

// Helper function to handle authentication errors with retry
const fetchWithAuthRetry = async (url: string, options: RequestInit = {}, retryCount = 2): Promise<Response> => {
  try {
    // Wait for auth to be ready if user just logged in
    if (retryCount === 2 && !auth.currentUser) {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    return await fetchWithAuth(url, options);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not authenticated' && retryCount > 0) {
      // Wait a bit and retry
      console.log(`Auth not ready, retrying (${retryCount} attempts left)...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithAuthRetry(url, options, retryCount - 1);
    }
    throw error;
  }
};

export const AdminPortal = () => {
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [countries, setCountries] = useState<Country[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<Country | City | null>(null)
  const [editName, setEditName] = useState('')
  const [editValue, setEditValue] = useState(0)
  const [activeTab, setActiveTab] = useState(0)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState(0)
  
  // New state for availability control
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false)
  const [availabilityItem, setAvailabilityItem] = useState<Country | City | null>(null)
  const [disableReason, setDisableReason] = useState('')
  const [isToggling, setIsToggling] = useState(false)

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const isAuthenticated = await waitForAuthInit();
      if (isAuthenticated) {
        fetchData();
      } else {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to access the admin portal',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    };
    initAuth();
  }, []);

  // Fetch countries
  const fetchCountries = async () => {
    try {
      const response = await fetchWithAuthRetry(`${API_URL}/countries`)
      if (response.ok) {
        const data = await response.json()
        setCountries(data)
      } else {
        throw new Error('Failed to fetch countries')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch countries',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  // Fetch cities
  const fetchCities = async () => {
    try {
      const response = await fetchWithAuthRetry(`${API_URL}/cities`)
      if (response.ok) {
        const data = await response.json()
        setCities(data)
      } else {
        throw new Error('Failed to fetch cities')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch cities',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  // Initial data fetch
  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchCountries(), fetchCities()])
    setLoading(false)
  }

  // Handle edit button click
  const handleEdit = (item: Country | City) => {
    console.log('Editing item:', item)
    setEditingItem(item)
    setEditName(item.name)
    setEditValue(item.value)
    onOpen()
  }

  // Handle save changes
  const handleSave = async () => {
    if (!editingItem) return
    console.log('Saving item:', editingItem)

    try {
      const endpoint = activeTab === 0 ? 'countries' : 'cities'
      const response = await fetchWithAuth(`${API_URL}/${endpoint}/${editingItem._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName,
          value: editValue,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${activeTab === 0 ? 'Country' : 'City'} updated successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
        onClose()
        // Refresh data
        if (activeTab === 0) {
          fetchCountries()
        } else {
          fetchCities()
        }
      } else {
        throw new Error('Failed to update')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    console.log('Deleting item with ID:', id)
    try {
      const endpoint = activeTab === 0 ? 'countries' : 'cities'
      const response = await fetchWithAuth(`${API_URL}/${endpoint}/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${activeTab === 0 ? 'Country' : 'City'} deleted successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
        // Refresh data
        if (activeTab === 0) {
          fetchCountries()
        } else {
          fetchCities()
        }
      } else {
        throw new Error('Failed to delete')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  // Handle create
  const handleCreate = async () => {
    try {
      const endpoint = activeTab === 0 ? 'countries' : 'cities'
      const response = await fetchWithAuth(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName,
          value: newValue,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `New ${activeTab === 0 ? 'Country' : 'City'} created successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
        setIsCreateModalOpen(false)
        setNewName('')
        setNewValue(0)
        // Refresh data
        if (activeTab === 0) {
          fetchCountries()
        } else {
          fetchCities()
        }
      } else {
        throw new Error('Failed to create')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  // New function to handle availability toggle
  const handleAvailabilityToggle = async (item: Country | City, reason?: string) => {
    setIsToggling(true)
    try {
      const endpoint = activeTab === 0 ? 'countries' : 'cities'
      const action = item.isAvailable ? 'disable' : 'enable'
      
      const requestOptions: RequestInit = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      }
      
      // Add reason to body if disabling
      if (action === 'disable' && reason) {
        requestOptions.body = JSON.stringify({ reason })
      }
      
      const response = await fetchWithAuth(`${API_URL}/${endpoint}/${item._id}/${action}`, requestOptions)

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Success',
          description: data.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
        
        // Refresh data
        if (activeTab === 0) {
          fetchCountries()
        } else {
          fetchCities()
        }
        
        // Close modal and reset state
        setIsAvailabilityModalOpen(false)
        setAvailabilityItem(null)
        setDisableReason('')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update availability')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update availability',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsToggling(false)
    }
  }

  // Handle availability button click
  const handleAvailabilityClick = (item: Country | City) => {
    setAvailabilityItem(item)
    if (item.isAvailable) {
      // If currently available, show modal to get disable reason
      setIsAvailabilityModalOpen(true)
    } else {
      // If currently disabled, enable immediately
      handleAvailabilityToggle(item)
    }
  }

  // Handle disable with reason
  const handleDisableWithReason = () => {
    if (availabilityItem) {
      handleAvailabilityToggle(availabilityItem, disableReason)
    }
  }

  // Format date for display
  const formatDate = (date: Date | null | string) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString()
  }

  // Get status badge
  const getStatusBadge = (item: Country | City) => {
    if (item.isAvailable && item.isActive) {
      return <Badge colorScheme="green">Available</Badge>
    } else if (!item.isAvailable) {
      return <Badge colorScheme="red">Disabled</Badge>
    } else {
      return <Badge colorScheme="yellow">Inactive</Badge>
    }
  }

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    )
  }

  return (
    <Box p={4} w={'90%'} mx={'auto'}>
      <Tabs onChange={(index) => setActiveTab(index)}>
        <TabList>
          <Tab>Countries</Tab>
          <Tab>Cities</Tab>
        </TabList>

        <TabPanels>
          {/* Countries Tab */}
          <TabPanel>
            <Button
              colorScheme="green"
              mb={4}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Add New Country
            </Button>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Value</Th>
                  <Th>Status</Th>
                  <Th>Availability</Th>
                  <Th>Disabled Reason</Th>
                  <Th>Disabled Date</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {countries.map((country) => (
                  <Tr key={country._id}>
                    <Td>{country.name}</Td>
                    <Td>{country.value}</Td>
                    <Td>{getStatusBadge(country)}</Td>
                    <Td>
                      <Switch
                        isChecked={country.isAvailable}
                        onChange={() => handleAvailabilityClick(country)}
                        colorScheme="green"
                        isDisabled={isToggling}
                      />
                    </Td>
                    <Td>
                      {country.disabledReason ? (
                        <Tooltip label={country.disabledReason}>
                          <Text isTruncated maxW="200px">
                            {country.disabledReason}
                          </Text>
                        </Tooltip>
                      ) : (
                        'N/A'
                      )}
                    </Td>
                    <Td>{formatDate(country.disabledAt)}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <Button
                          colorScheme="blue"
                          size="sm"
                          onClick={() => handleEdit(country)}
                        >
                          Edit
                        </Button>
                        <Button
                          colorScheme="red"
                          size="sm"
                          onClick={() => handleDelete(country._id)}
                        >
                          Delete
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>

          {/* Cities Tab */}
          <TabPanel>
            <Button
              colorScheme="green"
              mb={4}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Add New City
            </Button>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Value</Th>
                  <Th>Status</Th>
                  <Th>Availability</Th>
                  <Th>Disabled Reason</Th>
                  <Th>Disabled Date</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {cities.map((city) => (
                  <Tr key={city._id}>
                    <Td>{city.name}</Td>
                    <Td>{city.value}</Td>
                    <Td>{getStatusBadge(city)}</Td>
                    <Td>
                      <Switch
                        isChecked={city.isAvailable}
                        onChange={() => handleAvailabilityClick(city)}
                        colorScheme="green"
                        isDisabled={isToggling}
                      />
                    </Td>
                    <Td>
                      {city.disabledReason ? (
                        <Tooltip label={city.disabledReason}>
                          <Text isTruncated maxW="200px">
                            {city.disabledReason}
                          </Text>
                        </Tooltip>
                      ) : (
                        'N/A'
                      )}
                    </Td>
                    <Td>{formatDate(city.disabledAt)}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <Button
                          colorScheme="blue"
                          size="sm"
                          onClick={() => handleEdit(city)}
                        >
                          Edit
                        </Button>
                        <Button
                          colorScheme="red"
                          size="sm"
                          onClick={() => handleDelete(city._id)}
                        >
                          Delete
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Edit {activeTab === 0 ? 'Country' : 'City'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </FormControl>

            <FormControl mt={4}>
              <FormLabel>Value</FormLabel>
              <NumberInput
                value={editValue}
                onChange={(value) => setEditValue(Number(value))}
                min={0}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <HStack mt={6} spacing={3}>
              <Button colorScheme="blue" onClick={handleSave}>
                Save
              </Button>
              <Button onClick={onClose}>Cancel</Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Create New {activeTab === 0 ? 'Country' : 'City'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`Enter ${activeTab === 0 ? 'country' : 'city'} name`}
              />
            </FormControl>

            <FormControl mt={4}>
              <FormLabel>Value</FormLabel>
              <NumberInput
                value={newValue}
                onChange={(value) => setNewValue(Number(value))}
                min={0}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <HStack mt={6} spacing={3}>
              <Button colorScheme="green" onClick={handleCreate}>
                Create
              </Button>
              <Button onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Availability Control Modal */}
      <Modal isOpen={isAvailabilityModalOpen} onClose={() => setIsAvailabilityModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Disable {activeTab === 0 ? 'Country' : 'City'} for Purchase
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Text>
                You are about to disable <strong>{availabilityItem?.name}</strong> for property purchases.
              </Text>
              
              <FormControl>
                <FormLabel>Reason for Disabling (Required)</FormLabel>
                <Textarea
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  placeholder="Enter reason for disabling this location..."
                  rows={4}
                />
              </FormControl>

              <HStack mt={6} spacing={3}>
                <Button
                  colorScheme="red"
                  onClick={handleDisableWithReason}
                  isLoading={isToggling}
                  isDisabled={!disableReason.trim()}
                >
                  Disable
                </Button>
                <Button onClick={() => setIsAvailabilityModalOpen(false)}>
                  Cancel
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
} 