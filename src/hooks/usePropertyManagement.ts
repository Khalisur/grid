/* eslint-disable prettier/prettier */
import { useState, useCallback, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { useToast } from '@chakra-ui/react'
import { v4 as uuidv4 } from 'uuid'
import { Property } from '../stores/userStore'
import { useAuthStore } from '../stores/authStore'
import { useUserStore } from '../stores/userStore'
import { fetchWithAuth } from '../firebase/authUtils'

// API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Property layer IDs
export const PROPERTIES_SOURCE_ID = 'properties-source'
export const PROPERTIES_LAYER_ID = 'properties-layer'
export const OWN_PROPERTIES_LAYER_ID = 'own-properties-layer'
export const OTHER_PROPERTIES_LAYER_ID = 'other-properties-layer'

export const usePropertyManagement = (
  mapRef: React.MutableRefObject<mapboxgl.Map | null>,
  selectedCells: React.MutableRefObject<Set<string>>,
  isSelectionMode: React.MutableRefObject<boolean>,
  updateSelection: () => void
) => {
  const { user } = useAuthStore()
  const { users, updateUserProperty, deductToken, fetchUsers } = useUserStore()
  const [currentPropertyId, setCurrentPropertyId] = useState<string>('')
  const [propertyPrice, setPropertyPrice] = useState<number>(1) // Default price per cell
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [propertiesLoaded, setPropertiesLoaded] = useState(false)
  const [propertyLoadAttempts, setPropertyLoadAttempts] = useState(0)
  const maxPropertyLoadAttempts = 5
  
  // Property modal state
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [propertyName, setPropertyName] = useState('')
  const [propertyDescription, setPropertyDescription] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [propertyForSale, setPropertyForSale] = useState(false)
  const [propertySalePrice, setPropertySalePrice] = useState(0)
  const [isOwnProperty, setIsOwnProperty] = useState(false)
  
  // Store current users in a ref to avoid re-renders
  const usersRef = useRef(users)
  
  // Function to check if a cell is already owned by any user
  const isCellAlreadyOwned = useCallback((cellKey: string): boolean => {
    const currentUsers = usersRef.current
    if (!currentUsers || Object.keys(currentUsers).length === 0) return false
    
    // Check all users and their properties
    for (const userData of Object.values(currentUsers)) {
      if (!userData.properties || userData.properties.length === 0) continue
      
      for (const property of userData.properties) {
        if (!property.cells || property.cells.length === 0) continue
        
        // Check if this cell is in the property
        if (property.cells.includes(cellKey)) {
          return true
        }
      }
    }
    
    return false
  }, [])

  // Fly to a property location
  const flyToProperty = useCallback((propertyId: string, gridSize: number, gridSizeLat: number): void => {
    if (!mapRef.current || !user || !usersRef.current[user.uid]) return
    
    const userProperties = usersRef.current[user.uid].properties || []
    const property = userProperties.find(p => p.id === propertyId)
    
    if (!property || !property.cells || property.cells.length === 0) {
      console.warn('Cannot fly to property: property not found or has no cells')
      return
    }
    
    // Get the first cell to determine location
    const firstCell = property.cells[0]
    const parts = firstCell.split(',')
    if (parts.length !== 2) return
    
    const lngIndex = parseInt(parts[0], 10)
    const latIndex = parseInt(parts[1], 10)
    
    if (isNaN(lngIndex) || isNaN(latIndex)) return
    
    const lng = lngIndex * gridSize
    const lat = latIndex * gridSizeLat
    
    console.log(`Flying to property location: ${lng}, ${lat}`)
    
    // Fly to the property location and zoom in enough to see it
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: Math.max(mapRef.current.getZoom(), 18),
      essential: true
    })
  }, [mapRef, user])

  // Load properties onto the map
  const loadProperties = useCallback(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) {
      console.warn('Cannot load properties: Map not ready')
      return false
    }
    
    if (!usersRef.current || Object.keys(usersRef.current).length === 0) {
      console.warn('Cannot load properties: Users data not available')
      return false
    }
    
    try {
      // Create features for all properties
      const allFeatures: GeoJSON.Feature[] = []
      console.log('User IDs in usersRef:', Object.keys(usersRef.current).join(', '))
      
      // Count properties per user for debugging
      let totalPropertyCount = 0

      Object.entries(usersRef.current).forEach(([uid, userData]) => {
        const propCount = userData.properties?.length || 0
        totalPropertyCount += propCount
        console.log(`User ${userData.name} (${uid}) has ${propCount} properties`)
      })
      
      console.log(`Total properties across all users: ${totalPropertyCount}`)
      
      // Process all users and their properties
      Object.values(usersRef.current).forEach(userData => {
        if (!userData.properties || userData.properties.length === 0) return
        
        console.log(`Loading ${userData.properties.length} properties for user ${userData.name} (${userData.uid})`)
        
        userData.properties.forEach(property => {
          // Skip empty properties
          if (!property.cells || property.cells.length === 0) {
            console.warn('Skipping property with no cells:', property.id)
            return
          }
          
          console.log(`Processing property ${property.id} with ${property.cells.length} cells`)
          
          // Create individual Polygon features for each cell
          property.cells.forEach(cellKey => {
            try {
              const parts = cellKey.split(',')
              if (parts.length !== 2) {
                console.warn('Invalid cell key format:', cellKey)
                return
              }
              
              const lngIndex = parseInt(parts[0], 10)
              const latIndex = parseInt(parts[1], 10)
              
              if (isNaN(lngIndex) || isNaN(latIndex)) {
                console.warn('Invalid cell coordinates:', cellKey)
                return
              }
              
              const lng = lngIndex * 0.0001 // GRID_SIZE
              const lat = latIndex * 0.0000705 // GRID_SIZE_LAT
              
              // Create a polygon for this cell
              const cellPolygon: GeoJSON.Position[][] = [[
                [lng, lat],
                [lng + 0.0001, lat], 
                [lng + 0.0001, lat + 0.0000705],
                [lng, lat + 0.0000705],
                [lng, lat]
              ]]
              
              // Create a feature for this cell
              const cellFeature: GeoJSON.Feature = {
                type: 'Feature',
                properties: {
                  id: property.id,
                  owner: property.owner,
                  price: property.price,
                  cellCount: property.cells.length,
                  isOwnProperty: user && property.owner === user.uid,
                  cellKey: cellKey,
                  forSale: property.forSale || false,
                  salePrice: property.salePrice || 0,
                  name: property.name || '',
                  description: property.description || '',
                  address: property.address || ''
                },
                geometry: {
                  type: 'Polygon',
                  coordinates: cellPolygon
                }
              }
              
              allFeatures.push(cellFeature)
            } catch (err) {
              console.error('Error processing cell:', cellKey, err)
            }
          })
        })
      })
      
      console.log(`Loaded ${allFeatures.length} total property cells`)
      
      // If no features were loaded, this is a critical failure - try to repair by fetching all properties
      if (allFeatures.length === 0 && totalPropertyCount > 0) {
        console.warn('No features were created despite having properties in userData - trying to repair')
        
        // Schedule a fresh fetch of all properties
        setTimeout(async () => {
          try {
            console.log('Attempting to repair property loading...')
            const propsResponse = await fetchWithAuth(`${API_URL}/properties`)
            
            if (propsResponse.ok) {
              const properties = await propsResponse.json()
              console.log(`Repair: Fetched ${properties.length} properties directly from API`)
              
              // Force a new attempt to load properties after fetching fresh data
              const uniqueUserIds = [...new Set(properties.map((prop: Property) => prop.owner))]
              
              // Make sure we have data for all users
              let fetchedUsers = 0
              for (const uid of uniqueUserIds) {
                if (typeof uid === 'string') {
                  try {
                    const userResponse = await fetchWithAuth(`${API_URL}/users/profile`)
                    if (userResponse.ok) {
                      const userData = await userResponse.json()
                      if (usersRef.current) {
                        usersRef.current[uid] = userData
                        fetchedUsers++
                      }
                    }
                  } catch (error) {
                    console.error(`Repair: Error fetching user ${uid}:`, error)
                  }
                }
              }
              console.log(`Repair: Fetched ${fetchedUsers} users`)
              
              // Try loading properties again after repairing
              setTimeout(() => {
                loadProperties()
              }, 300)
            }
          } catch (error) {
            console.error('Repair attempt failed:', error)
          }
        }, 500)
        
        return false
      }
      
      // Check if the map is still valid
      if (!mapRef.current || !mapRef.current.isStyleLoaded()) {
        console.warn('Map no longer valid when trying to add property features')
        return false
      }
      
      // Add or update sources
      if (mapRef.current.getSource(PROPERTIES_SOURCE_ID)) {
        (mapRef.current.getSource(PROPERTIES_SOURCE_ID) as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: allFeatures
        })
      } else {
        console.log('Creating new properties source and layer')
        // Add source first
        try {
          mapRef.current.addSource(PROPERTIES_SOURCE_ID, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: allFeatures
            }
          })
          
          // Add layer for all properties - base layer with increased visibility
          mapRef.current.addLayer({
            id: PROPERTIES_LAYER_ID,
            type: 'fill',
            source: PROPERTIES_SOURCE_ID,
            paint: {
              'fill-opacity': 0.7, // Increased opacity for better visibility
              'fill-color': [
                'case',
                ['==', ['get', 'isOwnProperty'], true],
                '#4CAF50', // Green for own properties
                ['==', ['get', 'forSale'], true],
                '#FFC107', // Yellow for properties for sale
                '#F44336'  // Red for other properties
              ],
              'fill-outline-color': [
                'case',
                ['==', ['get', 'isOwnProperty'], true],
                '#2E7D32', // Darker green for own properties
                ['==', ['get', 'forSale'], true],
                '#FF8F00', // Darker yellow for properties for sale
                '#B71C1C'  // Darker red for other properties
              ]
            }
          })
          
          // Add an outline layer for better visibility
          mapRef.current.addLayer({
            id: 'property-outline',
            type: 'line',
            source: PROPERTIES_SOURCE_ID,
            paint: {
              'line-color': [
                'case',
                ['==', ['get', 'isOwnProperty'], true],
                '#2E7D32', // Darker green for own properties
                ['==', ['get', 'forSale'], true],
                '#FF8F00', // Darker yellow for properties for sale
                '#B71C1C'  // Darker red for other properties
              ],
              'line-width': 2,
              'line-opacity': 0.9
            }
          })
        } catch (err) {
          console.error('Error adding property layers:', err)
          return false
        }
      }
      
      setPropertiesLoaded(true)
      console.log('Properties successfully loaded on map')
      return true
    } catch (err) {
      console.error('Error loading properties on map:', err)
      return false
    }
  }, [mapRef, user])

  // Refresh property display
  const refreshPropertyDisplay = useCallback(() => {
    console.log('Refreshing property display')
    
    // First reload users data, then properties
    fetchUsers().then(() => {
      // Load properties
      const success = loadProperties()
      
      // If direct loading failed, try again after a delay
      if (!success) {
        console.log('First property load attempt failed, retrying...')
        setTimeout(() => {
          loadProperties()
        }, 1000)
      }
    }).catch(err => {
      console.error('Error refreshing user data:', err)
    })
  }, [fetchUsers, loadProperties])

  // Save property details
  const handleSavePropertyDetails = async () => {
    if (!selectedProperty || !user) return
    
    try {
      setIsLoading(true)
      
      // Update property details
      const updatedProperty: Property = {
        ...selectedProperty,
        name: propertyName,
        description: propertyDescription,
        address: propertyAddress,
        forSale: propertyForSale,
        salePrice: propertySalePrice
      }
      
      // Save to database using the PUT endpoint
      const response = await fetchWithAuth(`${API_URL}/properties/${selectedProperty.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          },
        body: JSON.stringify({
          name: propertyName,
          description: propertyDescription,
          address: propertyAddress,
          forSale: propertyForSale,
          salePrice: propertySalePrice
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update property')
      }
      
      toast({
        title: 'Success',
        description: 'Property details updated successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      })
      
      // Close modal
      setIsPropertyModalOpen(false)
      
      // Refresh properties
      await fetchUsers()
      
      // Force property reload with a small delay
      setTimeout(() => {
        refreshPropertyDisplay()
      }, 500)
    } catch (error) {
      console.error('Error saving property details:', error)
      toast({
        title: 'Error',
        description: 'Failed to update property details',
        status: 'error',
        duration: 2000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Buy property
  const handleBuyProperty = async (): Promise<void> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to buy property',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    const selectedCellArray = Array.from(selectedCells.current)
    if (selectedCellArray.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one cell to buy',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }
    
    // Check if any cells are already owned
    const ownedCells = selectedCellArray.filter(cell => isCellAlreadyOwned(cell))
    if (ownedCells.length > 0) {
      toast({
        title: 'Error',
        description: `${ownedCells.length} of the selected cells are already owned and cannot be purchased`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      setIsLoading(true)
      
      // Directly fetch latest user data from API
      const response = await fetchWithAuth(`${API_URL}/users/profile`)
      
      // Handle user not found in API
      if (!response.ok) {
        return
      } else {
        // User exists in API, get the data and update local state
        const userProfile = await response.json()
        if (usersRef.current) {
          usersRef.current[user.uid] = userProfile
        }
      }
      
      // Now get the latest user data (from our local state which we just updated)
      const userProfile = usersRef.current?.[user.uid]
      if (!userProfile) {
        throw new Error('Failed to retrieve user profile after updates')
      }
      
      console.log('Working with user profile:', userProfile)
      
      // Calculate total cost
      const totalCost = selectedCellArray.length * propertyPrice
      if (userProfile.tokens < totalCost) {
        toast({
          title: 'Error',
          description: `Insufficient tokens. You need ${totalCost} tokens to buy this property`,
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        return
      }
      
      // Create a new property with a unique ID
      const propertyId = uuidv4()
      
      // Create a property object
      const propertyData: Property = {
        id: propertyId,
        owner: user.uid,
        cells: selectedCellArray,
        price: totalCost, // Initial purchase price (could be made resellable later)
      }
      const purchaseResponse = await fetchWithAuth(`${API_URL}/properties/unallocated/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propertyData),
      })
      
      console.log('purchaseResponse', purchaseResponse)
      
      toast({
        title: 'Success',
        description: `Property purchased successfully for ${totalCost} tokens`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      
      // Clear selection after purchase
      selectedCells.current.clear()
      isSelectionMode.current = false
      updateSelection()
      
      // Reload properties on the map
      await fetchUsers()
      
      // Force property reload with a small delay
      setTimeout(() => {
        refreshPropertyDisplay()
      }, 500)

      // Fly to newly purchased property after a short delay
      setTimeout(() => {
        console.log('Flying to newly purchased property')
        flyToProperty(propertyId, 0.0001, 0.0000705)
      }, 1000)
    } catch (error) {
      console.error('Buy property error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to purchase property',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Buy listed property
  const handleBuyListedProperty = async () => {
    if (!selectedProperty || !user) return
    
    try {
      setIsLoading(true)
      
      // Directly fetch the current user data from API instead of relying on local state
      const userResponse = await fetchWithAuth(`${API_URL}/users/profile`)
      
      if (!userResponse.ok) {
        toast({
          title: 'Error',
          description: 'Could not retrieve your user data. Please try again later.',
          status: 'error',
          duration: 2000,
          isClosable: true,
        })
        return
      }
      
      // Get fresh user data directly from API
      const userData = await userResponse.json()
      
      // Update local user data
      if (usersRef.current) {
        usersRef.current[user.uid] = userData
      }
      
      // Check if user has enough tokens
      if (userData.tokens < (selectedProperty.salePrice || 0)) {
        toast({
          title: 'Insufficient Tokens',
          description: `You need ${selectedProperty.salePrice} tokens to buy this property`,
          status: 'error',
          duration: 2000,
          isClosable: true,
        })
        return
      }
      
      // Make API call to purchase the property
      const purchaseResponse = await fetchWithAuth(`${API_URL}/properties/${selectedProperty.id}/buy`)
      
      if (!purchaseResponse.ok) {
        const errorData = await purchaseResponse.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to purchase property')
      }
      
      // Property purchase successful
      toast({
        title: 'Success',
        description: 'Property purchased successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      })
      
      // Close modal
      setIsPropertyModalOpen(false)
      
      // Refresh properties
      await fetchUsers()
      
      // Force property reload with a small delay
      setTimeout(() => {
        refreshPropertyDisplay()
      }, 500)
    } catch (error) {
      console.error('Error purchasing property:', error)
      toast({
        title: 'Error',
        description: 'An error occurred during purchase',
        status: 'error',
        duration: 2000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle property click
  const handlePropertyClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (!mapRef.current) {
      console.log('Property click handler called but map not available')
      return
    }
    
    console.log('Property click event at:', e.lngLat)
    
    // Query all features at the clicked point
    const features = mapRef.current.queryRenderedFeatures(e.point)
    console.log('All features at click point:', features.length)
    
    // Filter to just properties layer
    const propertyFeatures = mapRef.current.queryRenderedFeatures(e.point, {
      layers: [PROPERTIES_LAYER_ID]
    })
    
    console.log('Property features found:', propertyFeatures.length)
    
    if (propertyFeatures.length > 0) {
      const propertyFeature = propertyFeatures[0]
      const propertyId = propertyFeature.properties?.id
      const propertyOwner = propertyFeature.properties?.owner
      const isOwnProperty = user && propertyOwner === user.uid
      const forSale = propertyFeature.properties?.forSale
      
      console.log('Clicked on property:', propertyFeature.properties)
      
      // Find property data in user properties
      let propertyData: Property | null = null
      let ownerData = null
      
      // Look for the owner in users
      if (usersRef.current) {
        for (const userData of Object.values(usersRef.current)) {
          if (!userData.properties) continue
          
          const foundProperty = userData.properties.find(p => p.id === propertyId)
          if (foundProperty) {
            propertyData = foundProperty
            ownerData = userData
            break
          }
        }
      }
      
      if (!propertyData) {
        return
      }
      
      // Set property data for modal
      setSelectedProperty(propertyData)
      setPropertyName(propertyData.name || '')
      setPropertyDescription(propertyData.description || '')
      setPropertyAddress(propertyData.address || '')
      setPropertyForSale(!!propertyData.forSale)
      setPropertySalePrice(propertyData.salePrice || 0)
      setIsOwnProperty(!!isOwnProperty)
      
      // Open modal
      setIsPropertyModalOpen(true)
      
      if (isOwnProperty) {
        // Find the property in user data
        const userData = usersRef.current[user?.uid || '']
        if (!userData) {
          console.warn('User data not found for current user')
          return
        }
        
        const property = userData.properties.find(p => p.id === propertyId)
        if (!property) {
          console.warn('Property not found in user data:', propertyId)
          return
        }
        
        // Select all cells in this property
        console.log(`Selecting ${property.cells.length} cells from property ${propertyId}`)
        
        // Clear current selection
        selectedCells.current.clear()
        
        // Add all property cells to selection
        property.cells.forEach(cellKey => {
          selectedCells.current.add(cellKey)
        })
        
        // Update selection display
        updateSelection()
      }
    } else {
      console.log('No property features found at click location')
    }
  }, [mapRef, user, usersRef, toast, updateSelection])

  return {
    usersRef,
    isLoading,
    propertyPrice,
    setPropertyPrice,
    selectedProperty,
    isPropertyModalOpen,
    setIsPropertyModalOpen,
    propertyName,
    setPropertyName,
    propertyDescription,
    setPropertyDescription,
    propertyAddress,
    setPropertyAddress,
    propertyForSale,
    setPropertyForSale,
    propertySalePrice,
    setPropertySalePrice,
    isOwnProperty,
    loadProperties,
    refreshPropertyDisplay,
    handleSavePropertyDetails,
    handleBuyProperty,
    handleBuyListedProperty,
    handlePropertyClick,
    isCellAlreadyOwned,
    flyToProperty
  }
} 