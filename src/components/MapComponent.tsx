/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
	FunctionComponent,
	ReactElement,
	useEffect,
	useRef,
	useState,
	ReactNode,
	useCallback,
} from 'react'
import {
	Box,
	Text,
	Center,
	Spinner,
	Input,
	InputGroup,
	InputLeftElement,
	List,
	ListItem,
	Button,
	FormControl,
	FormLabel,
	useToast,
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalFooter,
	ModalBody,
	ModalCloseButton,
	Tabs, 
	TabList, 
	TabPanels, 
	Tab, 
	TabPanel,
	NumberInput,
	NumberInputField,
	NumberInputStepper,
	NumberIncrementStepper,
	NumberDecrementStepper,
	Textarea,
	Badge,
	Flex
} from '@chakra-ui/react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Global, css } from '@emotion/react'
import { useMapStore } from '../stores/mapStore'
import { SearchIcon } from '@chakra-ui/icons'
import { useUserStore } from '../stores/userStore'
import { useAuthStore } from '../stores/authStore'
import { v4 as uuidv4 } from 'uuid'
import { Property } from '../stores/userStore'

// Set Mapbox access token
mapboxgl.accessToken =
	'pk.eyJ1IjoiYmNucHJvMjAiLCJhIjoiY205cmVvZXhrMXB6dTJqb2I4cHFxN2xnbiJ9.HOKvHjSyBLNkwiaiEoFnBg'

// API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Grid layer IDs
const GRID_SOURCE_ID = 'grid-source'
const GRID_LAYER_ID = 'grid-layer'
const GRID_SELECTION_SOURCE_ID = 'grid-selection-source'
const GRID_SELECTION_LAYER_ID = 'grid-selection-layer'
const PROPERTIES_SOURCE_ID = 'properties-source'
const PROPERTIES_LAYER_ID = 'properties-layer'
const OWN_PROPERTIES_LAYER_ID = 'own-properties-layer'
const OTHER_PROPERTIES_LAYER_ID = 'other-properties-layer'

// Define grid size in degrees (approximately 10m x 10m)
const GRID_SIZE = 0.0001 // 0.0001 degrees ≈ 10m
const GRID_SIZE_LAT = 0.0000705 // Adjusted to make cells appear as squares
const MIN_GRID_ZOOM = 17 // Minimum zoom level for grid visibility
const MAX_GRID_ZOOM = 30 // Maximum zoom level for grid visibility

interface MapComponentProps {
	initialOptions?: string[]
	children?: ReactNode
}

// Type for Mapbox Geocoding API feature
type MapboxFeature = GeoJSON.Feature & {
	place_name: string
	center: [number, number]
}

export const MapComponent: FunctionComponent<MapComponentProps> = ({
	initialOptions,
	children,
}): ReactElement => {
	const mapContainer = useRef<HTMLDivElement>(null)
	const map = useRef<mapboxgl.Map | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null)
	const [styleLoaded, setStyleLoaded] = useState(false)
	const moveEndTimeoutRef = useRef<number | null>(null)
	const [search, setSearch] = useState('')
	const [suggestions, setSuggestions] = useState<MapboxFeature[]>([])
	const [showSuggestions, setShowSuggestions] = useState(false)
	const selectedCells = useRef<Set<string>>(new Set())
	const isSelectionMode = useRef(false)
	const { user } = useAuthStore()
	const { users, updateUserProperty, deductToken, fetchUsers, transferProperty } =
		useUserStore()
	const [currentPropertyId, setCurrentPropertyId] = useState<string>('')
	const [propertyPrice, setPropertyPrice] = useState<number>(1) // Default price per cell
	const toast = useToast()
	const [isLoading, setIsLoading] = useState(false)
	const [propertiesLoaded, setPropertiesLoaded] = useState(false)
	
	// Property modal state
	const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false)
	const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
	const [propertyName, setPropertyName] = useState('')
	const [propertyDescription, setPropertyDescription] = useState('')
	const [propertyAddress, setPropertyAddress] = useState('')
	const [propertyForSale, setPropertyForSale] = useState(false)
	const [propertySalePrice, setPropertySalePrice] = useState(0)
	const [isOwnProperty, setIsOwnProperty] = useState(false)

	// Get map settings from store
	const { currentStyle, gridColor, selectionColor } = useMapStore()

	// Use a ref to track the current selection color
	const currentSelectionColor = useRef(selectionColor)

	// Update the ref when selectionColor changes
	useEffect(() => {
		currentSelectionColor.current = selectionColor
	}, [selectionColor])

	// Add a loading ref to track API call status
	const isLoadingUsers = useRef(false)

	// Update the useEffect for ensureUserProfile to avoid repeated API calls
	useEffect(() => {
		// If user is authenticated but profile not found, create it
		const ensureUserProfile = async () => {
			if (!user || isLoadingUsers.current) return
			
			// First check if user exists in local state
			if (users && users[user.uid]) {
				console.log('User already in local state, no need to create profile')
				return
			}
			
			try {
				isLoadingUsers.current = true
				console.log('User authenticated but profile not found in local state, checking API...')
				console.log('Current user:', user)
				
				// Check if the user already exists in the API but not in our local state
				const checkResponse = await fetch(`${API_URL}/users/profile`, {
					headers: {
						'Firebase-UID': user.uid
					}
				})
				
				if (checkResponse.ok) {
					// User exists in API
					console.log('User exists in API but not in local state, refreshing users...')
					const userData = await checkResponse.json()
					console.log('Existing user found:', userData)
					await fetchUsers()
				} else if (checkResponse.status === 404 || checkResponse.status === 401) {
					console.log('User does not exist in API, creating new user profile...')
					
					// Create new user with the POST create user endpoint
					const createResponse = await fetch(`${API_URL}/users/create`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							uid: user.uid,
							email: user.email || 'unknown@example.com',
							name: user.displayName || 'User'
						})
					})
					
					if (createResponse.ok) {
						await fetchUsers()
						
						toast({
							title: 'Profile Created',
							description: 'Welcome! Your profile has been created with starter tokens.',
							status: 'success',
							duration: 5000,
							isClosable: true,
						})
					} else {
						throw new Error('Failed to create user profile')
					}
				}
			} catch (error) {
				console.error('Failed to create user profile:', error)
				toast({
					title: 'Error',
					description: 'Failed to create user profile. Please check console for details.',
					status: 'error',
					duration: 5000,
					isClosable: true,
				})
			} finally {
				isLoadingUsers.current = false
			}
		}

		// Run when user is available
		if (user) {
			ensureUserProfile()
		}
	}, [user, fetchUsers, toast])

	// Store current users in a ref to avoid re-renders
	const usersRef = useRef(users)
	useEffect(() => {
		usersRef.current = users
	}, [users])

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

	useEffect(() => {
		fetchUsers()
	}, [fetchUsers])

	// Debug function to inspect users data structure
	useEffect(() => {
		if (users && Object.keys(users).length > 0) {
			console.log('=== DEBUG: USERS DATA STRUCTURE ===')
			Object.entries(users).forEach(([uid, userData]) => {
				console.log(`User ${userData.name} (${uid}):`)
				console.log('  Properties:', userData.properties || 'None')
				if (userData.properties) {
					userData.properties.forEach((prop, i) => {
						console.log(`  Property ${i + 1}:`, prop)
						console.log(`    ID: ${prop.id}`)
						console.log(`    Cells: ${prop.cells.length} cells`)
						console.log(`    Sample cells:`, prop.cells.slice(0, 2))
					})
				}
			})
		}
	}, [users])

	// Define flyToProperty function here, before it's used
	const flyToProperty = useCallback((propertyId: string): void => {
		if (!map.current || !user || !usersRef.current[user.uid]) return
		
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
		
		const lng = lngIndex * GRID_SIZE
		const lat = latIndex * GRID_SIZE_LAT
		
		console.log(`Flying to property location: ${lng}, ${lat}`)
		
		// Fly to the property location and zoom in enough to see it
		map.current.flyTo({
			center: [lng, lat],
			zoom: Math.max(map.current.getZoom(), MIN_GRID_ZOOM + 1),
			essential: true
		})
	}, [map, user, usersRef])

	// Function to handle save selection
	const handleSaveSelection = async () => {
		if (!user) {
			toast({
				title: 'Error',
				description: 'You must be logged in to save selections',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
			return
		}

		if (selectedCells.current.size === 0) {
			toast({
				title: 'Error',
				description: 'Please select at least one cell to save',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
			return
		}

		// Ensure users data is loaded
		if (!usersRef.current || Object.keys(usersRef.current).length === 0) {
			await fetchUsers()
		}

		try {
			// Create a new property with a unique ID (for saved selections)
			const propertyId = uuidv4()
			
			// Create a property object (free, for saved selections)
			const propertyData: Property = {
				id: propertyId,
				owner: user.uid,
				cells: Array.from(selectedCells.current),
				price: 0, // Saved selections are free
			}
			
			console.log('Saving property with data:', propertyData)
			
			// Save property to user's properties using the new API endpoint
			const propertyResponse = await fetch(`${API_URL}/properties`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Firebase-UID': user.uid
				},
				body: JSON.stringify(propertyData)
			})
			
			if (!propertyResponse.ok) {
				throw new Error('Failed to create property')
			}
			
			toast({
				title: 'Success',
				description: 'Selection saved successfully',
				status: 'success',
				duration: 3000,
				isClosable: true,
			})
			
			// Clear selection after saving
			selectedCells.current.clear()
			isSelectionMode.current = false
			updateSelection()
			
			// Reload properties on the map
			await fetchUsers()
			
			// Force property reload with a small delay
			setTimeout(() => {
				console.log('Reloading properties after save')
				loadProperties()
			}, 500)

			// Add this inside the try block of handleSaveSelection after the setTimeout
			setTimeout(() => {
				console.log('Flying to newly saved property')
				flyToProperty(propertyId)
			}, 1000)
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to save selection',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
			console.error('Save selection error:', error)
		}
	}

	// Function to update selection
	const updateSelection = useCallback(() => {
		if (!map.current) return

		// Convert selected cells to features
		const selectionFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = []
		selectedCells.current.forEach((cellKey) => {
			const [lngIndex, latIndex] = cellKey.split(',').map(Number)
			const lng = lngIndex * GRID_SIZE
			const lat = latIndex * GRID_SIZE_LAT

			selectionFeatures.push({
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'Polygon',
					coordinates: [
						[
							[lng, lat],
							[lng + GRID_SIZE, lat],
							[lng + GRID_SIZE, lat + GRID_SIZE_LAT],
							[lng, lat + GRID_SIZE_LAT],
							[lng, lat],
						],
					],
				},
			})
		})

		// Log selected cell IDs
		console.log('Selected Grid Cells:', Array.from(selectedCells.current))

		// Update or create selection layer
		if (map.current.getLayer(GRID_SELECTION_LAYER_ID)) {
			// Update the data
			;(
				map.current.getSource(
					GRID_SELECTION_SOURCE_ID,
				) as mapboxgl.GeoJSONSource
			).setData({
				type: 'FeatureCollection',
				features: selectionFeatures,
			})

			// Update the color using the ref
			map.current.setPaintProperty(
				GRID_SELECTION_LAYER_ID,
				'fill-color',
				currentSelectionColor.current,
			)
			map.current.setPaintProperty(
				GRID_SELECTION_LAYER_ID,
				'fill-outline-color',
				currentSelectionColor.current,
			)
		} else {
			// Create new source and layer
			map.current.addSource(GRID_SELECTION_SOURCE_ID, {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: selectionFeatures,
				},
			})

			map.current.addLayer({
				id: GRID_SELECTION_LAYER_ID,
				type: 'fill',
				source: GRID_SELECTION_SOURCE_ID,
				paint: {
					'fill-color': currentSelectionColor.current,
					'fill-opacity': 0.2,
					'fill-outline-color': currentSelectionColor.current,
				},
			})
		}
	}, [])

	// Update selection when selectionColor changes
	useEffect(() => {
		if (map.current && map.current.isStyleLoaded()) {
			// Force update the selection layer with the new color
			if (map.current.getLayer(GRID_SELECTION_LAYER_ID)) {
				console.log('Applying new selection color:', selectionColor)
				map.current.setPaintProperty(
					GRID_SELECTION_LAYER_ID,
					'fill-color',
					selectionColor,
				)
				map.current.setPaintProperty(
					GRID_SELECTION_LAYER_ID,
					'fill-outline-color',
					selectionColor,
				)
			}
		}
		
		// Update the ref value
		currentSelectionColor.current = selectionColor
	}, [selectionColor])

	// Load saved selections from localStorage
	useEffect(() => {
		const savedSelections = localStorage.getItem('savedGridSelections')
		if (savedSelections) {
			selectedCells.current = new Set(JSON.parse(savedSelections))
			// Only update selection if map and style are loaded
			if (map.current && map.current.isStyleLoaded()) {
				updateSelection()
			}
		}
	}, [styleLoaded, updateSelection])

	// Function to generate fixed grid
	const drawGrid = useCallback(() => {
		if (!map.current || !map.current.isStyleLoaded()) return

		try {
			const mapInstance = map.current
			const currentZoom = mapInstance.getZoom()

			// Check if grid layer exists
			const gridLayerExists = mapInstance.getLayer(GRID_LAYER_ID)
			const gridSourceExists = mapInstance.getSource(GRID_SOURCE_ID)

			// Only show grid between MIN_GRID_ZOOM and MAX_GRID_ZOOM
			if (currentZoom < MIN_GRID_ZOOM || currentZoom > MAX_GRID_ZOOM) {
				if (gridLayerExists) {
					mapInstance.setLayoutProperty(
						GRID_LAYER_ID,
						'visibility',
						'none',
					)
				}
				return
			}

			const bounds = mapInstance.getBounds()

			// Calculate grid boundaries aligned to the grid size
			const startLat =
				Math.floor(bounds.getSouth() / GRID_SIZE_LAT) * GRID_SIZE_LAT
			const endLat = Math.ceil(bounds.getNorth() / GRID_SIZE_LAT) * GRID_SIZE_LAT
			const startLng =
				Math.floor(bounds.getWest() / GRID_SIZE) * GRID_SIZE
			const endLng = Math.ceil(bounds.getEast() / GRID_SIZE) * GRID_SIZE

			// Generate grid features
			const lineFeatures: GeoJSON.Feature[] = []

			// Generate horizontal lines
			for (let lat = startLat; lat <= endLat; lat += GRID_SIZE_LAT) {
				lineFeatures.push({
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'LineString',
						coordinates: [
							[startLng, lat],
							[endLng, lat],
						],
					},
				})
			}

			// Generate vertical lines
			for (let lng = startLng; lng <= endLng; lng += GRID_SIZE) {
				lineFeatures.push({
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'LineString',
						coordinates: [
							[lng, startLat],
							[lng, endLat],
						],
					},
				})
			}

			// If grid exists, update its data instead of removing and recreating
			if (gridLayerExists && gridSourceExists) {
				;(
					mapInstance.getSource(
						GRID_SOURCE_ID,
					) as mapboxgl.GeoJSONSource
				).setData({
					type: 'FeatureCollection',
					features: lineFeatures,
				})
				mapInstance.setLayoutProperty(
					GRID_LAYER_ID,
					'visibility',
					'visible',
				)
				// Update grid color
				mapInstance.setPaintProperty(
					GRID_LAYER_ID,
					'line-color',
					gridColor,
				)
			} else {
				// Create new source and layer only if they don't exist
				mapInstance.addSource(GRID_SOURCE_ID, {
					type: 'geojson',
					data: {
						type: 'FeatureCollection',
						features: lineFeatures,
					},
				})

				mapInstance.addLayer({
					id: GRID_LAYER_ID,
					type: 'line',
					source: GRID_SOURCE_ID,
					layout: {
						visibility: 'visible',
					},
					paint: {
						'line-color': gridColor,
						'line-width': 0.5,
						'line-opacity': 0.8,
					},
				})
			}
		} catch (err) {
			console.error('Error drawing grid:', err)
		}
	}, [gridColor])

	// Function to handle show grid button click
	const handleShowGrid = useCallback(() => {
		if (map.current) {
			map.current.flyTo({
				zoom: MIN_GRID_ZOOM,
				center: map.current.getCenter(),
				essential: true,
			})
		}
	}, [])

	// Function to clear all selected cells
	const handleClearSelection = useCallback(() => {
		selectedCells.current.clear()
		isSelectionMode.current = false
		updateSelection()
	}, [])

	// Function to get grid cell key
	const getCellKey = (lng: number, lat: number) => {
		return `${Math.floor(lng / GRID_SIZE)},${Math.floor(lat / GRID_SIZE_LAT)}`
	}

	// Function to handle property click
	const handlePropertyClick = useCallback((e: mapboxgl.MapMouseEvent) => {
		if (!map.current) {
			console.log('Property click handler called but map not available')
			return
		}
		
		console.log('Property click event at:', e.lngLat)
		
		// Query all features at the clicked point
		const features = map.current.queryRenderedFeatures(e.point)
		console.log('All features at click point:', features.length)
		
		// Filter to just properties layer
		const propertyFeatures = map.current.queryRenderedFeatures(e.point, {
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
				// toast({
				// 	title: 'Error',
				// 	description: 'Could not find property data',
				// 	status: 'error',
				// 	duration: 2000,
				// 	isClosable: true,
				// })
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
	}, [user, usersRef, toast, updateSelection])

	// Function to load user properties on the map
	const loadProperties = useCallback(() => {
		if (!map.current || !map.current.isStyleLoaded() || !usersRef.current || Object.keys(usersRef.current).length === 0) {
			console.warn('Cannot load properties: Map not ready or users data not available')
			return
		}

		console.log('Starting property loading process...')
		console.log('Users data available:', Object.keys(usersRef.current).length, 'users')
		
		if (user) {
			console.log('Current user uid:', user.uid)
			console.log('All users:', usersRef.current)
			if (usersRef.current[user.uid]) {
				console.log('Current user data:', usersRef.current[user.uid])
				console.log('Current user properties count:', usersRef.current[user.uid]?.properties?.length || 0)
			} else {
				console.warn('Current user data not found in users object!')
			}
		}

		// Create features for all properties
		const allFeatures: GeoJSON.Feature[] = []
		
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
				
				// Instead of creating a MultiPolygon, create individual Polygon features for each cell
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
						
						const lng = lngIndex * GRID_SIZE
						const lat = latIndex * GRID_SIZE_LAT
						
						// Create a polygon for this cell
						const cellPolygon: GeoJSON.Position[][] = [[
							[lng, lat],
							[lng + GRID_SIZE, lat], 
							[lng + GRID_SIZE, lat + GRID_SIZE_LAT],
							[lng, lat + GRID_SIZE_LAT],
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
		
		try {
			// Check if the map is still valid
			if (!map.current || !map.current.isStyleLoaded()) {
				console.warn('Map no longer valid when trying to add property features')
				return
			}
			
			// Add or update sources
			if (map.current.getSource(PROPERTIES_SOURCE_ID)) {
				(map.current.getSource(PROPERTIES_SOURCE_ID) as mapboxgl.GeoJSONSource).setData({
					type: 'FeatureCollection',
					features: allFeatures
				})
			} else {
				console.log('Creating new properties source and layer')
				// Add source first
				map.current.addSource(PROPERTIES_SOURCE_ID, {
					type: 'geojson',
					data: {
						type: 'FeatureCollection',
						features: allFeatures
					}
				})
				
				// Add layer for all properties - base layer with increased visibility
				map.current.addLayer({
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
				map.current.addLayer({
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
			}
			
			setPropertiesLoaded(true)
			console.log('Properties successfully loaded on map')
		} catch (err) {
			console.error('Error loading properties on map:', err)
		}
	}, [map, user, usersRef])
	
	// Function to refresh property display
	const refreshPropertyDisplay = useCallback(() => {
		console.log('Refreshing property display')
		
		// First reload properties data
		loadProperties()
		
		// Force a repaint of the properties layer
		if (map.current && map.current.getLayer(PROPERTIES_LAYER_ID)) {
			// Update fill color
			map.current.setPaintProperty(
				PROPERTIES_LAYER_ID,
				'fill-color',
				[
					'case',
					['==', ['get', 'isOwnProperty'], true],
					'#4CAF50', // Green for own properties
					['==', ['get', 'forSale'], true],
					'#FFC107', // Yellow for properties for sale
					'#F44336'  // Red for other properties
				]
			)
			
			// Update outline color
			map.current.setPaintProperty(
				PROPERTIES_LAYER_ID,
				'fill-outline-color',
				[
					'case',
					['==', ['get', 'isOwnProperty'], true],
					'#2E7D32', // Darker green for own properties
					['==', ['get', 'forSale'], true],
					'#FF8F00', // Darker yellow for properties for sale
					'#B71C1C'  // Darker red for other properties
				]
			)
			
			// Update property outline layer if it exists
			if (map.current.getLayer('property-outline')) {
				map.current.setPaintProperty(
					'property-outline',
					'line-color',
					[
						'case',
						['==', ['get', 'isOwnProperty'], true],
						'#2E7D32', // Darker green for own properties
						['==', ['get', 'forSale'], true],
						'#FF8F00', // Darker yellow for properties for sale
						'#B71C1C'  // Darker red for other properties
					]
				)
			}
		}
	}, [loadProperties])

	// Update the useEffect for loading properties when users data changes or map loads
	useEffect(() => {
		if (map.current && styleLoaded && usersRef.current && Object.keys(usersRef.current).length > 0) {
			console.log('Map and users data ready - loading properties from useEffect')
			// Add a small delay to ensure the map is fully ready
			setTimeout(() => {
				loadProperties()
			}, 300)
		}
	}, [usersRef, styleLoaded, loadProperties])

	// Update the useEffect for loading properties after a purchase
	useEffect(() => {
		if (user && mapInstance && styleLoaded && Object.keys(usersRef.current || {}).length > 0) {
			console.log('User logged in or changed, refreshing properties')
			loadProperties()
		}
	}, [user, mapInstance, styleLoaded, loadProperties])

	// Function to handle save property details
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
			
			// Save to database using the new PUT endpoint
			const response = await fetch(`${API_URL}/properties/${selectedProperty.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Firebase-UID': user.uid
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
	
	// Function to handle property purchase
	const handleBuyListedProperty = async () => {
		if (!selectedProperty || !user) return
		
		try {
			setIsLoading(true)
			
			// Check user tokens
			const userData = usersRef.current[user.uid]
			if (!userData) {
				toast({
					title: 'Error',
					description: 'User data not found',
					status: 'error',
					duration: 2000,
					isClosable: true,
				})
				return
			}
			
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
			
			// Implement a transfer property endpoint in your API
			// For now we'll simulate it with current API endpoints
			
			// 1. Deduct tokens from buyer (current user)
			const updateBuyerResponse = await fetch(`${API_URL}/users/update`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Firebase-UID': user.uid
				},
				body: JSON.stringify({
					tokens: userData.tokens - (selectedProperty.salePrice || 0)
				})
			})
			
			if (!updateBuyerResponse.ok) {
				throw new Error('Failed to update buyer tokens')
			}
			
			// 2. Add tokens to seller
			const sellerData = usersRef.current[selectedProperty.owner]
			if (sellerData) {
				const updateSellerResponse = await fetch(`${API_URL}/users/update`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						'Firebase-UID': selectedProperty.owner
					},
					body: JSON.stringify({
						tokens: sellerData.tokens + (selectedProperty.salePrice || 0)
					})
				})
				
				if (!updateSellerResponse.ok) {
					throw new Error('Failed to update seller tokens')
				}
			}
			
			// 3. Update property ownership
			const propertyResponse = await fetch(`${API_URL}/properties/${selectedProperty.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Firebase-UID': user.uid
				},
				body: JSON.stringify({
					owner: user.uid,
					forSale: false
				})
			})
			
			if (!propertyResponse.ok) {
				throw new Error('Failed to update property ownership')
			}
			
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

	// Function to handle mouse down for selection
	const handleMouseDown = useCallback((e: mapboxgl.MapMouseEvent) => {
		if (!map.current || map.current.getZoom() < MIN_GRID_ZOOM) return
		
		// Store the mouse down position and time to later determine if it was a click or drag
		const mouseDownTime = Date.now()
		const mouseDownPos = { x: e.originalEvent.clientX, y: e.originalEvent.clientY }
		
		// Define handler for mouseup to determine if this was a click or drag
		const handleMouseUp = (upEvent: MouseEvent) => {
			// Remove listener since we only need it once
			document.removeEventListener('mouseup', handleMouseUp)
			
			// Calculate time and distance
			const mouseUpTime = Date.now()
			const dx = upEvent.clientX - mouseDownPos.x
			const dy = upEvent.clientY - mouseDownPos.y
			const distance = Math.sqrt(dx * dx + dy * dy)
			const duration = mouseUpTime - mouseDownTime
			
			// If mouse moved less than 5px and duration less than 300ms, consider it a click for selection
			// Otherwise, it was likely a pan operation
			if (distance < 5 && duration < 300) {
				const cellKey = getCellKey(e.lngLat.lng, e.lngLat.lat)
				
				// Check if the cell is already owned
				if (isCellAlreadyOwned(cellKey)) {
					return
				}
				
				// Toggle selection mode
				isSelectionMode.current = !isSelectionMode.current
				
				// If turning on selection mode, select the clicked cell
				if (isSelectionMode.current) {
					selectedCells.current.add(cellKey)
					updateSelection()
				}
			}
		}
		
		// Add temporary mouseup listener
		document.addEventListener('mouseup', handleMouseUp)
	}, [isCellAlreadyOwned, updateSelection])

	// Function to handle mouse move for selection
	const handleMouseMove = useCallback((e: mapboxgl.MapMouseEvent) => {
		if (
			!map.current ||
			map.current.getZoom() < MIN_GRID_ZOOM ||
			!isSelectionMode.current
		)
			return

		const cellKey = getCellKey(e.lngLat.lng, e.lngLat.lat)

		// Don't add already owned cells to selection
		if (!isCellAlreadyOwned(cellKey)) {
			// Add cell to selection on hover only if in selection mode and not already owned
			selectedCells.current.add(cellKey)
			updateSelection()
		}
	}, [isCellAlreadyOwned, updateSelection])

	// Initialize map
	useEffect(() => {
		if (!mapContainer.current) {
			console.error('Map container not available')
			setError('Map container not available')
			setLoading(false)
			return
		}

		let mounted = true
		let updateTimeout: number | null = null

		try {
			console.log('Initializing map...')

			// Default options
			const defaultOptions: mapboxgl.MapboxOptions = {
				container: mapContainer.current,
				style: `mapbox://styles/mapbox/${currentStyle}`,
				center: [0, 0],
				zoom: MIN_GRID_ZOOM,
				minZoom: 0, // Allow zooming out to global view
			}

			// Create a map with combined options
			const newMap = new mapboxgl.Map({
				...defaultOptions,
				...initialOptions,
				container: mapContainer.current,
			})

			// Add navigation controls
			newMap.addControl(new mapboxgl.NavigationControl(), 'top-right')

			map.current = newMap

			// Set up a one-time check for style loading
			const checkStyleLoaded = () => {
				if (!mounted) return

				if (newMap.isStyleLoaded()) {
					console.log('Style is fully loaded')
					if (mounted) {
						setStyleLoaded(true)
						drawGrid() // Draw grid when style is loaded
						// Do NOT force zoom level here
						// Load saved selections after style is loaded
						const savedSelections = localStorage.getItem(
							'savedGridSelections',
						)
						if (savedSelections) {
							selectedCells.current = new Set(
								JSON.parse(savedSelections),
							)
							updateSelection()
						}
					}
				} else {
					console.log('Style not fully loaded, retrying...')
					setTimeout(checkStyleLoaded, 100)
				}
			}

			// Map fully loaded event
			newMap.on('load', () => {
				console.log('Map fully loaded!')
				if (mounted) {
					setLoading(false)
					setMapInstance(newMap)
					checkStyleLoaded()
				}
			})

			// Listen for style data events
			newMap.on('styledata', () => {
				console.log('Style data event received')
				checkStyleLoaded()
			})

			// Add mouse event listeners for selection
			newMap.on('mousedown', handleMouseDown)
			newMap.on('mousemove', handleMouseMove)
			
			// Add handler for when mouse leaves the map area during selection
			newMap.on('mouseleave', () => {
				// We don't cancel selection mode when mouse leaves the map
				// This allows users to continue selecting after re-entering the map
			})

			// Debounce grid updates
			const debouncedDrawGrid = () => {
				if (updateTimeout) {
					window.clearTimeout(updateTimeout)
				}
				updateTimeout = window.setTimeout(() => {
					drawGrid()
				}, 100)
			}

			// Update grid on map movement and zoom
			newMap.on('moveend', debouncedDrawGrid)
			newMap.on('zoomend', debouncedDrawGrid)

			newMap.on('error', (e: { error: { message?: string } }) => {
				console.error('Mapbox error:', e)
				if (mounted) {
					setError(
						'Error loading map: ' +
							(e.error?.message || 'Unknown error'),
					)
					setLoading(false)
				}
			})

			// Handle mouse event for selection
			newMap.on('click', PROPERTIES_LAYER_ID, handlePropertyClick)

			return () => {
				mounted = false
				if (moveEndTimeoutRef.current) {
					window.clearTimeout(moveEndTimeoutRef.current)
				}
				if (updateTimeout) {
					window.clearTimeout(updateTimeout)
				}
				console.log('Cleaning up map')
				if (map.current) {
					map.current.remove()
				}
				map.current = null
				setMapInstance(null)
				setStyleLoaded(false)
			}
		} catch (err) {
			console.error('Error creating map:', err)
			if (mounted) {
				setError(
					`Failed to initialize map: ${err instanceof Error ? err.message : String(err)}`,
				)
				setLoading(false)
				setStyleLoaded(false)
			}
		}
	}, [
		initialOptions,
		currentStyle,
		drawGrid,
		handleMouseDown,
		handleMouseMove,
	])

	// Update map style when it changes in the store
	useEffect(() => {
		if (map.current) {
			try {
				setStyleLoaded(false)
				map.current.setStyle(`mapbox://styles/mapbox/${currentStyle}`)
				console.log(`Map style changed to: ${currentStyle}`)
			} catch (err) {
				console.error('Error changing map style:', err)
			}
		}
	}, [currentStyle])

	// Fetch for address suggestions (no debounce)
	const fetchSuggestions = useCallback(async (query: string) => {
		if (!query) {
			setSuggestions([])
			return
		}
		try {
			const res = await fetch(
				`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
					query,
				)}.json?access_token=${mapboxgl.accessToken}&autocomplete=true&limit=5`,
			)
			const data = await res.json()
			setSuggestions(data.features || [])
		} catch (err) {
			setSuggestions([])
		}
	}, [])

	// Handle input change
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value
		setSearch(value)
		setShowSuggestions(!!value)
		fetchSuggestions(value)
	}

	// Handle suggestion click
	const handleSuggestionClick = (feature: MapboxFeature) => {
		setSearch(feature.place_name)
		setShowSuggestions(false)
		setSuggestions([])
		if (map.current && feature.center) {
			map.current.flyTo({
				center: feature.center,
				zoom: 14,
				essential: true,
			})
		}
	}

	// Hide suggestions on map click
	useEffect(() => {
		if (!map.current) return
		const handler = () => setShowSuggestions(false)
		map.current.on('click', handler)
		return () => {
			map.current?.off('click', handler)
		}
	}, [])

	// Function to handle buy property
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

		// Check for user profile with the new API
		try {
			setIsLoading(true)
			
			// Ensure we have the latest users data
			await fetchUsers()
			
			// Check if user profile exists in the current data
			let userProfile = usersRef.current[user.uid]
			
			if (!userProfile) {
				console.log('User profile not found, checking API directly...')
				
				const response = await fetch(`${API_URL}/users/profile`, {
					headers: {
						'Firebase-UID': user.uid
					}
				})
				
				if (!response.ok) {
					if (response.status === 404 || response.status === 401) {
						console.log('Creating new user profile...')
						// Create user if not found
						const createResponse = await fetch(`${API_URL}/users/create`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								uid: user.uid,
								email: user.email || 'unknown@example.com',
								name: user.displayName || 'User'
							})
						})
						
						if (!createResponse.ok) {
							throw new Error('Failed to create user profile')
						}
						
						// Fetch the newly created user directly from API
						const newUserResponse = await fetch(`${API_URL}/users/profile`, {
							headers: {
								'Firebase-UID': user.uid
							}
						})
						
						if (!newUserResponse.ok) {
							throw new Error('Failed to fetch newly created user profile')
						}
						
						userProfile = await newUserResponse.json()
						
						// Also update global users data
						await fetchUsers()
					} else {
						throw new Error('Failed to retrieve user profile')
					}
				} else {
					// User exists in API but not in our local state
					userProfile = await response.json()
					await fetchUsers()
				}
			}
			
			// Now check if we have a valid user profile
			if (!userProfile) {
				throw new Error('User profile not found after creation')
			}
			
			console.log('Working with user profile:', userProfile)
			
			// At this point we should have a valid user profile
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
			
			console.log('Buying property with data:', propertyData)
			
			// Deduct tokens for purchase
			await deductToken(user.uid, totalCost)
			
			// Save property to user's properties using the new API endpoint
			const propertyResponse = await fetch(`${API_URL}/properties`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Firebase-UID': user.uid
				},
				body: JSON.stringify(propertyData)
			})
			
			if (!propertyResponse.ok) {
				throw new Error('Failed to create property')
			}
			
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
				flyToProperty(propertyId)
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

	// Now add these useEffect hooks after the styleLoaded useEffect but before the return statement

	// Add click handler when map loads
	useEffect(() => {
		if (map.current && styleLoaded) {
			console.log('Adding property click handler to map')
			map.current.on('click', PROPERTIES_LAYER_ID, handlePropertyClick)
			
			return () => {
				console.log('Removing property click handler from map')
				map.current?.off('click', PROPERTIES_LAYER_ID, handlePropertyClick)
			}
		}
	}, [styleLoaded, user, usersRef, toast, updateSelection])

	// Update the useEffect for fetching users when map loads
	useEffect(() => {
		if (mapInstance && styleLoaded && !isLoadingUsers.current) {
			console.log('Map loaded and style ready - fetching latest user data')
			isLoadingUsers.current = true
			fetchUsers().then(() => {
				console.log('Users data refreshed after map load')
				isLoadingUsers.current = false
			}).catch(() => {
				isLoadingUsers.current = false
			})
		}
	}, [mapInstance, styleLoaded, fetchUsers])

	// Update the useEffect for loading properties when user changes
	useEffect(() => {
		if (user && mapInstance && styleLoaded && Object.keys(usersRef.current || {}).length > 0) {
			console.log('User logged in, refreshing properties')
			loadProperties()
		}
	}, [user, mapInstance, styleLoaded, loadProperties])

	return (
		<>
			<Global
				styles={css`
					.mapboxgl-canvas {
						width: 100% !important;
						height: 100% !important;
					}
					.mapboxgl-map {
						width: 100% !important;
						height: 100% !important;
					}
				`}
			/>

			<Box position="relative" width="100%" height="100%">
				{/* Show Grid Button */}
				<Box position="absolute" top="16px" right="16px" zIndex={1001}>
					<Button
						colorScheme="blue"
						size="sm"
						onClick={handleShowGrid}
						boxShadow="md"
						mr={2}
					>
						Show Grid
					</Button>
					<Button
						colorScheme="red"
						size="sm"
						onClick={handleClearSelection}
						boxShadow="md"
						mr={2}
					>
						Clear Selection
					</Button>
					<Button
						colorScheme="green"
						size="sm"
						onClick={handleBuyProperty}
						boxShadow="md"
						isLoading={isLoading}
						loadingText="Buying..."
					>
						Buy Property ({selectedCells.current.size * propertyPrice} tokens)
					</Button>
				</Box>

				{/* Show user tokens */}
				{user && usersRef.current[user.uid] && (
					<Box
						position="absolute"
						top="56px"
						right="16px"
						zIndex={1001}
						bg="white"
						p={2}
						borderRadius="md"
						boxShadow="md"
					>
						<Text fontWeight="bold" color="gray.800">Tokens: {usersRef.current[user.uid].tokens}</Text>
					</Box>
				)}

				{/* Map Legend */}
				<Box
					position="absolute"
					bottom="20px"
					right="16px"
					zIndex={1001}
					bg="white"
					p={3}
					borderRadius="md"
					boxShadow="md"
				>
					<Text fontWeight="bold" mb={2} color="gray.800">Property Legend</Text>
					<Flex align="center" mb={1}>
						<Box width="20px" height="20px" bg="#4CAF50" mr={2} borderRadius="sm" />
						<Text fontSize="sm" color="gray.800">Your Properties</Text>
					</Flex>
					<Flex align="center" mb={1}>
						<Box width="20px" height="20px" bg="#FFC107" mr={2} borderRadius="sm" />
						<Text fontSize="sm" color="gray.800">Properties For Sale</Text>
					</Flex>
					<Flex align="center">
						<Box width="20px" height="20px" bg="#F44336" mr={2} borderRadius="sm" />
						<Text fontSize="sm" color="gray.800">Other Properties</Text>
					</Flex>
				</Box>

				{/* Property Details Modal */}
				<Modal isOpen={isPropertyModalOpen} onClose={() => setIsPropertyModalOpen(false)} size="lg">
					<ModalOverlay />
					<ModalContent>
						<ModalHeader>
							{isOwnProperty ? 'Your Property Details' : 'Property For Sale'}
							{selectedProperty?.forSale && (
								<Badge colorScheme="green" ml={2}>For Sale</Badge>
							)}
						</ModalHeader>
						<ModalCloseButton />
						<ModalBody>
							<Tabs>
								<TabList>
									<Tab>Details</Tab>
									{isOwnProperty && <Tab>Sell Property</Tab>}
								</TabList>
								<TabPanels>
									<TabPanel>
										{isOwnProperty ? (
											<>
												<FormControl mb={4}>
													<FormLabel>Property Name</FormLabel>
													<Input 
														value={propertyName} 
														onChange={(e) => setPropertyName(e.target.value)}
														placeholder="Enter property name"
													/>
												</FormControl>
												
												<FormControl mb={4}>
													<FormLabel>Description</FormLabel>
													<Textarea 
														value={propertyDescription} 
														onChange={(e) => setPropertyDescription(e.target.value)}
														placeholder="Describe your property"
													/>
												</FormControl>
												
												<FormControl mb={4}>
													<FormLabel>Address</FormLabel>
													<Input 
														value={propertyAddress} 
														onChange={(e) => setPropertyAddress(e.target.value)}
														placeholder="Enter property address"
													/>
												</FormControl>
												
												<Text>Property Size: {selectedProperty?.cells.length || 0} cells</Text>
												<Text mt={2}>Original Cost: {selectedProperty?.price || 0} tokens</Text>
											</>
										) : (
											<>
												<Text fontWeight="bold" fontSize="xl">{propertyName || 'Unnamed Property'}</Text>
												{propertyDescription && (
													<Text mt={2}>{propertyDescription}</Text>
												)}
												{propertyAddress && (
													<Text mt={2}><strong>Address:</strong> {propertyAddress}</Text>
												)}
												<Text mt={4}>Property Size: {selectedProperty?.cells.length || 0} cells</Text>
												{selectedProperty?.forSale && (
													<>
														<Text mt={2} fontSize="xl" fontWeight="bold" color="green.500">
															Price: {selectedProperty.salePrice} tokens
														</Text>
														<Button 
															mt={4} 
															colorScheme="green" 
															width="100%"
															onClick={handleBuyListedProperty}
															isLoading={isLoading}
														>
															Buy This Property
														</Button>
													</>
												)}
											</>
										)}
									</TabPanel>
									
									{isOwnProperty && (
										<TabPanel>
											<FormControl mb={4}>
												<FormLabel>List For Sale</FormLabel>
												<input 
													type="checkbox" 
													checked={propertyForSale}
													onChange={(e) => setPropertyForSale(e.target.checked)}
												/>
											</FormControl>
											
											{propertyForSale && (
												<FormControl mb={4}>
													<FormLabel>Sale Price (tokens)</FormLabel>
													<NumberInput
														value={propertySalePrice}
														onChange={(value) => setPropertySalePrice(Number(value))}
														min={1}
													>
														<NumberInputField />
														<NumberInputStepper>
															<NumberIncrementStepper />
															<NumberDecrementStepper />
														</NumberInputStepper>
													</NumberInput>
												</FormControl>
											)}
										</TabPanel>
									)}
								</TabPanels>
							</Tabs>
						</ModalBody>
						<ModalFooter>
							<Button variant="ghost" mr={3} onClick={() => setIsPropertyModalOpen(false)}>
								Cancel
							</Button>
							{isOwnProperty && (
								<Button 
									colorScheme="blue" 
									onClick={handleSavePropertyDetails}
									isLoading={isLoading}
								>
									Save
								</Button>
							)}
						</ModalFooter>
					</ModalContent>
				</Modal>

				{/* Search Bar */}
				<Box
					position="absolute"
					top="16px"
					left="50%"
					transform="translateX(-50%)"
					zIndex={1001}
					width="350px"
				>
					<InputGroup>
						<InputLeftElement pointerEvents="none">
							<SearchIcon color="gray.400" />
						</InputLeftElement>
						<Input
							value={search}
							onChange={handleSearchChange}
							placeholder="Search for a location..."
							bg="white"
							borderRadius="md"
							boxShadow="md"
							autoComplete="off"
							color="gray.800"
							_placeholder={{ color: 'gray.500' }}
							_focus={{ borderColor: 'blue.500' }}
						/>
					</InputGroup>
					{showSuggestions && suggestions.length > 0 && (
						<List
							position="absolute"
							top="44px"
							width="100%"
							bg="white"
							borderRadius="md"
							boxShadow="lg"
							zIndex={1002}
							maxHeight="250px"
							overflowY="auto"
						>
							{suggestions.map((feature) => (
								<ListItem
									key={feature.id}
									px={4}
									py={2}
									cursor="pointer"
									onClick={() =>
										handleSuggestionClick(feature)
									}
									_hover={{ bg: 'gray.100' }}
									color="gray.800"
								>
									{feature.place_name}
								</ListItem>
							))}
						</List>
					)}
				</Box>

				{loading && (
					<Center
						position="absolute"
						top="0"
						left="0"
						width="100%"
						height="100%"
						zIndex="10"
						bg="rgba(255,255,255,0.7)"
					>
						<Spinner size="xl" />
						<Text ml={4}>Loading map...</Text>
					</Center>
				)}

				{error && (
					<Box
						position="absolute"
						top="10px"
						left="10px"
						zIndex="1000"
						bg="red.500"
						color="white"
						p={3}
						borderRadius="md"
					>
						{error}
					</Box>
				)}

				<Box ref={mapContainer} id="map" width="100%" height="100%" />

				{/* Render children only after map and style are loaded */}
				{!loading && !error && mapInstance && styleLoaded && children}
			</Box>
		</>
	)
}
