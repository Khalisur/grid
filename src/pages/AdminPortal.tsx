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
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { fetchWithAuth } from '../firebase/authUtils'

// API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

interface Country {
  _id: string
  name: string
  value: number
}

interface City {
  _id: string
  name: string
  value: number
}

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

  // Fetch countries
  const fetchCountries = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/countries`)
      console.log('Fetched countries response:', response)
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched countries:', data)
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
      const response = await fetchWithAuth(`${API_URL}/cities`)
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched cities:', data)
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
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([fetchCountries(), fetchCities()])
      setLoading(false)
    }
    fetchData()
  }, [])

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

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    )
  }

  return (
    <Box p={4} w={'70%'} mx={'auto'}>
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
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {countries.map((country) => (
                  <Tr key={country._id}>
                    <Td>{country.name}</Td>
                    <Td>{country.value}</Td>
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
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {cities.map((city) => (
                  <Tr key={city._id}>
                    <Td>{city.name}</Td>
                    <Td>{city.value}</Td>
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
    </Box>
  )
} 