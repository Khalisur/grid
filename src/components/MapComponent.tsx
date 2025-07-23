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
	Flex,
	SimpleGrid,
	Card,
	CardBody,
	CardHeader,
	CardFooter,
	Divider,
	Stack
} from '@chakra-ui/react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Global, css } from '@emotion/react'
import { useMapStore } from '../stores/mapStore'
import { SearchIcon } from '@chakra-ui/icons'
import { useUserStore } from '../stores/userStore'
import { useAuthStore } from '../stores/authStore'
import { v4 as uuidv4 } from 'uuid'
import { Property as UserProperty } from '../stores/userStore'
import { fetchWithAuth } from '../firebase/authUtils'
import useLocationFromCells from '../hooks/useLocationFromCells'
import { useAdmin } from '../hooks/useAdmin'
import { TreasureModal } from './TreasureModal'
import { TreasureDiscoveryModal } from './TreasureDiscoveryModal'
import { TreasureDiscovery as TreasureDiscoveryType } from '../types/treasure'

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

// Define a custom options type that omits the 'container' property
type MapInitialOptions = Omit<mapboxgl.MapboxOptions, 'container'>;

interface MapComponentProps {
	initialOptions?: MapInitialOptions
	children?: ReactNode
}

// Type for Mapbox Geocoding API feature
type MapboxFeature = GeoJSON.Feature & {
	place_name: string
	center: [number, number]
}

// Define a new type for property bids
type PropertyBid = {
	userId: string
	amount: number
	message: string
	createdAt: Date
	status?: 'active' | 'accepted' | 'declined' | 'cancelled'
	_id?: string
}

// Add bid-related fields to the Property interface
interface PropertyWithBids extends UserProperty {
	bids?: PropertyBid[]
}

// Define treasure discovery interface
interface TreasureDiscovery {
	id: string
	name: string
	description: string
	rewardType: string
	rewardAmount: number
	rewardMessage: string
	treasureCells: string[]
	overlappingCells: string[]
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
	
	// Add location hook
	const { getLocationFromCells, locationInfo, loading: locationLoading } = useLocationFromCells()
	
	// Property modal state
	const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false)
	const [selectedProperty, setSelectedProperty] = useState<PropertyWithBids | null>(null)
	const [propertyName, setPropertyName] = useState('')
	const [propertyDescription, setPropertyDescription] = useState('')
	const [propertyAddress, setPropertyAddress] = useState('')
	const [propertyForSale, setPropertyForSale] = useState(false)
	const [propertySalePrice, setPropertySalePrice] = useState(0)
	const [isOwnProperty, setIsOwnProperty] = useState(false)

	// Add bid-related state
	const [propertyBids, setPropertyBids] = useState<PropertyBid[]>([])
	const [bidAmount, setBidAmount] = useState<number>(0)
	const [bidMessage, setBidMessage] = useState('')
	const [isLoadingBids, setIsLoadingBids] = useState(false)

	// Admin hook for treasure functionality
	const { isAdmin } = useAdmin()

	// Treasure modal state
	const [isTreasureModalOpen, setIsTreasureModalOpen] = useState(false)

	// Treasure discovery modal state
	const [isTreasureDiscoveryOpen, setIsTreasureDiscoveryOpen] = useState(false)
	const [discoveredTreasure, setDiscoveredTreasure] = useState<TreasureDiscovery | null>(null)

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

	// Function to fetch all bids for a property
	const fetchPropertyBids = useCallback(async (propertyId: string) => {
		if (!user || !propertyId) {
			console.log('Cannot fetch bids: No user or property ID')
			return
		}
		
		try {
			setIsLoadingBids(true)
			const response = await fetchWithAuth(`${API_URL}/properties/${propertyId}/bids`)
			
			if (response.ok) {
				const responseData = await response.json()
				
				// Handle different response structures
				let bidsArray: PropertyBid[] = []
				
				if (Array.isArray(responseData)) {
					// If the response is directly an array of bids
					bidsArray = responseData
				} else if (responseData && typeof responseData === 'object') {
					// If the response is an object that contains a bids property
					if (Array.isArray(responseData.bids)) {
						bidsArray = responseData.bids
					} else {
						console.log('Response has no bids array or empty bids:', responseData.bids)
					}
				} else {
					console.log('Response is neither array nor object:', responseData)
				}
				
				// Check if there are any bids from the current user
				const userBids = bidsArray.filter(bid => bid.userId === user.uid)
				if (userBids.length > 0) {
					console.log('User bids:', userBids)
				}
				
				setPropertyBids(bidsArray)
			} else {
				console.error('Failed to fetch property bids:', await response.text())
				setPropertyBids([])
			}
		} catch (error) {
			console.error('Error fetching property bids:', error)
			setPropertyBids([])
		} finally {
			setIsLoadingBids(false)
		}
	}, [user])

	// Also add a useEffect to log when propertyBids changes


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
				
				// Check if the user already exists in the API but not in our local state
				const checkResponse = await fetchWithAuth(`${API_URL}/users/profile`)
				
				if (checkResponse.ok) {
					// User exists in API, just fetch the data
					const userData = await checkResponse.json()
					await fetchUsers()
				} else if (checkResponse.status === 404 || checkResponse.status === 401) {
					// User doesn't exist, try to create them
					const createResponse = await fetchWithAuth(`${API_URL}/users/create`, {
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
						
						// Update token display
						setTimeout(() => {
							updateUserTokensDisplay();
						}, 300);
					} else {
						// Check if the error is because user already exists
						const errorData = await createResponse.json().catch(() => ({ message: 'Unknown error' }))
						
						if (createResponse.status === 409 || errorData.message?.includes('already exists')) {
							// User already exists - this is fine, just fetch the data
							console.log('User already exists, fetching existing profile')
							await fetchUsers()
						} else {
							// Different error - this is a real problem
							throw new Error(`Failed to create user profile: ${errorData.message || 'Unknown error'}`)
						}
					}
				}
			} catch (error) {
				console.error('Error in ensureUserProfile:', error)
				
				// Only show error toast for real errors, not "user already exists"
				const errorMessage = error instanceof Error ? error.message : 'Unknown error'
				if (!errorMessage.includes('already exists')) {
					toast({
						title: 'Error',
						description: 'Failed to load user profile. Please refresh the page.',
						status: 'error',
						duration: 5000,
						isClosable: true,
					})
				}
			} finally {
				isLoadingUsers.current = false
			}
		}

		// Run when user is available
		if (user) {
			// Add a small delay to allow AuthModal to complete user creation first
			setTimeout(() => {
				ensureUserProfile()
			}, 1000)
		}
	}, [user, fetchUsers, toast])

	// Store current users in a ref to avoid re-renders
	const usersRef = useRef(users)
	useEffect(() => {
		usersRef.current = users
	}, [users])

	// Function to check if a cell is already owned by any user
	const isCellAlreadyOwned = useCallback(async (cellKey: string): Promise<boolean> => {
		// First try to check using local data
		const currentUsers = usersRef.current
		if (!currentUsers || Object.keys(currentUsers).length === 0) {
			return false
		}
		
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
		
		// If not found locally, make a direct check to the API
		try {
			const response = await fetch(`${API_URL}/properties/cell/${cellKey}/check`)
			if (response.ok) {
				const result = await response.json()
				return !!result.isOwned
			}
		} catch (error) {
			console.error(`Error checking cell ownership for ${cellKey}:`, error)
		}
		
		return false
	}, [])

	// Function to check if multiple cells are already owned (with batch processing)
	const checkMultipleCellsOwnership = useCallback(async (cells: string[]): Promise<string[]> => {
		if (!cells.length) return []
		
		try {
			// Try to use the bulk check API if available
			const response = await fetch(`${API_URL}/properties/cells/check`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ cells })
			})
			
			if (response.ok) {
				const result = await response.json()
				return result.ownedCells || []
			}
			
			// Fallback to local checking if API fails
			const ownedCells: string[] = []
			const currentUsers = usersRef.current
			
			if (currentUsers && Object.keys(currentUsers).length > 0) {
				for (const cell of cells) {
					for (const userData of Object.values(currentUsers)) {
						if (!userData.properties) continue
						
						const isOwned = userData.properties.some(property => 
							property.cells && property.cells.includes(cell)
						)
						
						if (isOwned) {
							ownedCells.push(cell)
							break
						}
					}
				}
			}
			
			return ownedCells
		} catch (error) {
			console.error('Error checking multiple cells ownership:', error)
			return []
		}
	}, [])

	useEffect(() => {
		fetchUsers()
	}, [fetchUsers])



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
		
		
		// Fly to the property location and zoom in enough to see it
		map.current.flyTo({
			center: [lng, lat],
			zoom: Math.max(map.current.getZoom(), MIN_GRID_ZOOM + 1),
			essential: true
		})
	}, [map, user, usersRef])



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
		
		
		// Query all features at the clicked point
		const features = map.current.queryRenderedFeatures(e.point)
		
		// Filter to just properties layer
		const propertyFeatures = map.current.queryRenderedFeatures(e.point, {
			layers: [PROPERTIES_LAYER_ID]
		})
		
		
		if (propertyFeatures.length > 0) {
			const propertyFeature = propertyFeatures[0]
			const propertyId = propertyFeature.properties?.id
			const propertyOwner = propertyFeature.properties?.owner
			const isOwnProperty = user && propertyOwner === user.uid
			const forSale = propertyFeature.properties?.forSale
			
			
			
			// Find property data in user properties
			let propertyData: PropertyWithBids | null = null
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
			
			// Reset bid form
			setBidAmount(0)
			setBidMessage('')
			
			// Fetch bids for this property - whether owner or not
			// This ensures "My Bids" tab works for everyone
			fetchPropertyBids(propertyId)
			
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
				
				// Clear current selection
				selectedCells.current.clear()
				
				// Add all property cells to selection
				property.cells.forEach(cellKey => {
					selectedCells.current.add(cellKey)
				})
				
				// Update selection display
				updateSelection()

				// Get location info for the property cells
				getLocationFromCells(property.cells).then(location => {
					if (location) {
						// If we have an address but no stored address in the property, suggest updating it
						if (location.address && !propertyData?.address) {
							toast({
								title: 'Location Detected',
								description: `This property appears to be at "${location.address}". Consider updating the property address.`,
								status: 'info',
								duration: 5000,
								isClosable: true,
							})
							// Pre-fill the address field with the detected location
							setPropertyAddress(location.address)
						}
					}
				})
			}
		} else {
			console.log('No property features foun at click location')
		}
	}, [user, usersRef, toast, updateSelection, fetchPropertyBids, getLocationFromCells])

	// Add a new property loading retry mechanism
	const [propertyLoadAttempts, setPropertyLoadAttempts] = useState(0)
	const maxPropertyLoadAttempts = 5

	// Improve the loadProperties function with better error handling and logging
	const loadProperties = useCallback(() => {
		if (!map.current || !map.current.isStyleLoaded()) {
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
			// Log all user IDs we have data for
			
			// Count properties per user for debugging
			let totalPropertyCount = 0

			Object.entries(usersRef.current).forEach(([uid, userData]) => {
				const propCount = userData.properties?.length || 0
				totalPropertyCount += propCount
			})
			
			
			// Store the current user ID for comparison
			const currentUserId = user?.uid
			
			// Process all users and their properties
			Object.values(usersRef.current).forEach(userData => {
				if (!userData.properties || userData.properties.length === 0) return
				
				
				userData.properties.forEach(property => {
					// Skip empty properties
					if (!property.cells || property.cells.length === 0) {
						console.warn('Skipping property with no cells:', property.id)
						return
					}
					
					// Determine if this is the current user's property
					const isOwn = !!(currentUserId && property.owner === currentUserId)
					
					
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
							
							// Create a feature for this cell - using the isOwn variable calculated above
							const cellFeature: GeoJSON.Feature = {
								type: 'Feature',
								properties: {
									id: property.id,
									owner: property.owner,
									price: property.price,
									cellCount: property.cells.length,
									isOwnProperty: isOwn, // Use the precalculated value 
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
			
			
			// If no features were loaded, this is a critical failure - try to repair by fetching all properties
			if (allFeatures.length === 0 && totalPropertyCount > 0) {
				console.warn('No features were created despite having properties in userData - trying to repair')
				
				// Schedule a fresh fetch of all properties
				setTimeout(async () => {
					try {
						const propsResponse = await fetchWithAuth(`${API_URL}/properties`)
						
						if (propsResponse.ok) {
							const properties = await propsResponse.json()
							
							// Force a new attempt to load properties after fetching fresh data
							const uniqueUserIds = [...new Set(properties.map((prop: UserProperty) => prop.owner))]
							
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
			if (!map.current || !map.current.isStyleLoaded()) {
				console.warn('Map no longer valid when trying to add property features')
				return false
			}
			
			// Add or update sources
			if (map.current.getSource(PROPERTIES_SOURCE_ID)) {
				(map.current.getSource(PROPERTIES_SOURCE_ID) as mapboxgl.GeoJSONSource).setData({
					type: 'FeatureCollection',
					features: allFeatures
				})
				
				// Also update the color properties each time we update the data
				// This ensures the correct ownership-based coloring
				if (map.current.getLayer(PROPERTIES_LAYER_ID)) {
					// Update fill color based on ownership comparison
					map.current.setPaintProperty(
						PROPERTIES_LAYER_ID,
						'fill-color', 
						[
							'case',
							// Use the isOwnProperty flag directly which is set during property loading
							['==', ['get', 'isOwnProperty'], true],
							'#4CAF50', // Green for own properties
							['==', ['get', 'forSale'], true],
							'#FFC107', // Yellow for properties for sale
							'#F44336'  // Red for other properties
						]
					);
					
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
					);
				}
				
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
					);
				}
			} else {
				// Add source first
				try {
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
						layout: {
							// Always show properties regardless of zoom level
							visibility: 'visible'
						},
						paint: {
							'fill-opacity': 0.7, // Increased opacity for better visibility
							'fill-color': [
								'case',
								// Use the isOwnProperty flag directly
								['==', ['get', 'isOwnProperty'], true],
								'#4CAF50', // Green for own properties
								['==', ['get', 'forSale'], true],
								'#FFC107', // Yellow for properties for sale
								'#F44336'  // Red for other properties
							],
							'fill-outline-color': [
								'case',
								// Matching outline colors using the same condition
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
								// Matching outline colors using the same condition
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
			return true
		} catch (err) {
			console.error('Error loading properties on map:', err)
			return false
		}
	}, [map, user, usersRef, propertyLoadAttempts])

	// New function to attempt property loading with retries
	const attemptLoadProperties = useCallback(() => {
		const success = loadProperties()
		
		if (!success && propertyLoadAttempts < maxPropertyLoadAttempts) {
			setTimeout(() => {
				setPropertyLoadAttempts(prev => prev + 1)
			}, 500)
		} else if (success) {
			setPropertyLoadAttempts(0)
		} else {
			console.warn(`Failed to load properties after ${maxPropertyLoadAttempts} attempts`)
		}
	}, [loadProperties, propertyLoadAttempts, maxPropertyLoadAttempts])

	// Trigger property loading attempts when attempt counter changes
	useEffect(() => {
		if (propertyLoadAttempts > 0) {
			attemptLoadProperties()
		}
	}, [propertyLoadAttempts, attemptLoadProperties])

	// More robust useEffect for loading properties when map and data are ready
	useEffect(() => {
		if (map.current && styleLoaded && usersRef.current && Object.keys(usersRef.current).length > 0) {
			// Try multiple times with increasing delays to ensure properties load
			loadProperties() // First immediate attempt
			
			// Second attempt after 500ms
			setTimeout(() => {
				loadProperties()
				
				// Third attempt after another second
				setTimeout(() => {
					loadProperties()
				}, 1000)
			}, 500)
		}
	}, [usersRef, styleLoaded, loadProperties])

	// Add a more robust style-loaded detection
	useEffect(() => {
		if (map.current && !styleLoaded) {
			const checkStyleLoaded = () => {
				if (map.current?.isStyleLoaded()) {
					setStyleLoaded(true)
				} else {
					setTimeout(checkStyleLoaded, 100)
				}
			}
			
			checkStyleLoaded()
			
			// Listen for style-related events that might indicate the style is loaded
			const mapRef = map.current;
			
			const styleDataHandler = () => {
				if (mapRef.isStyleLoaded()) {
					setStyleLoaded(true)
				}
			};
			
			mapRef.on('styledata', styleDataHandler);
			
			// Cleanup function
			return () => {
				// Either the component unmounted or the style loaded
				// Try to remove the listener if the map ref is still valid
				if (mapRef) {
					try {
						// Explicitly cast to the correct type
						(mapRef as mapboxgl.Map).off('styledata', styleDataHandler);
					} catch (e) {
						console.warn('Could not remove styledata handler:', e);
					}
				}
			};
		}
	}, [map, styleLoaded])

	// Add a data refresher on window focus to handle returning to tab
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible' && map.current && styleLoaded && user) {
				fetchUsers().then(() => {
					setTimeout(() => {
						loadProperties()
					}, 200)
				})
			}
		}
		
		// Force property loading when the page is loaded/refreshed
		const handlePageLoad = () => {
			if (map.current && styleLoaded) {
				fetchUsers().then(() => {
					// Try loading properties multiple times with increasing delays
					setTimeout(() => loadProperties(), 300)
					setTimeout(() => loadProperties(), 1000)
					setTimeout(() => loadProperties(), 2000)
					
					// Also refresh token display
					if (user) {
						setTimeout(() => updateUserTokensDisplay(), 500)
						setTimeout(() => updateUserTokensDisplay(), 2500)
					}
				})
			}
		}
		
		document.addEventListener('visibilitychange', handleVisibilityChange)
		// Use the 'load' event to detect when the page is fully loaded
		window.addEventListener('load', handlePageLoad)
		
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			window.removeEventListener('load', handlePageLoad)
		}
	}, [fetchUsers, map, styleLoaded, user, loadProperties])

	// Improved refreshPropertyDisplay with retry
	const refreshPropertyDisplay = useCallback(() => {
		
		// First reload users data, then properties
		fetchUsers().then(() => {
			// Load properties
			const success = loadProperties()
			
			// If direct loading failed, try again after a delay
			if (!success) {
				setTimeout(() => {
					loadProperties()
				}, 1000)
			}
		}).catch(err => {
			console.error('Error refreshing user data:', err)
		})
	}, [fetchUsers, loadProperties])

	// Function to handle save property details
	const handleSavePropertyDetails = async () => {
		if (!selectedProperty || !user) return
		
		try {
			setIsLoading(true)
			
			// If address is empty, try to auto-detect it
			if (!propertyAddress && selectedProperty.cells && selectedProperty.cells.length > 0) {
				try {
					const location = await getLocationFromCells(selectedProperty.cells)
					if (location && location.address) {
						// Auto-fill the address with detected location
						setPropertyAddress(location.address)
					}
				} catch (error) {
					console.error('Error auto-detecting address:', error)
				}
			}
			
			// Update property details
			const updatedProperty: PropertyWithBids = {
				...selectedProperty,
				name: propertyName,
				description: propertyDescription,
				address: propertyAddress,
				forSale: propertyForSale,
				salePrice: propertySalePrice
			}
			
			// Save to database using the new PUT endpoint
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
	
	// Function to handle property purchase
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
			const purchaseResponse = await fetchWithAuth(`${API_URL}/properties/${selectedProperty.id}/buy`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			})
			
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
			
			// Update token display
			setTimeout(() => {
				updateUserTokensDisplay();
			}, 300);
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
		const handleMouseUp = async (upEvent: MouseEvent) => {
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
				
				// Check if the cell is already owned asynchronously
				const isOwned = await isCellAlreadyOwned(cellKey)
				if (isOwned) {
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

		// Don't add already owned cells to selection - using an immediate check
		// For performance reasons, we'll just check local data without API lookup during mouse move
		let isLocallyOwned = false;
		const currentUsers = usersRef.current;
		
		if (currentUsers) {
			for (const userData of Object.values(currentUsers)) {
				if (!userData.properties) continue;
				
				for (const property of userData.properties) {
					if (!property.cells) continue;
					
					if (property.cells.includes(cellKey)) {
						isLocallyOwned = true;
						break;
					}
				}
				
				if (isLocallyOwned) break;
			}
		}
		
		if (!isLocallyOwned) {
			// Add cell to selection on hover only if in selection mode and not already owned
			selectedCells.current.add(cellKey)
			updateSelection()
		}
	}, [updateSelection])

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
					setTimeout(checkStyleLoaded, 100)
				}
			}

			// Map fully loaded event
			newMap.on('load', () => {
				if (mounted) {
					setLoading(false)
					setMapInstance(newMap)
					checkStyleLoaded()
				}
			})

			// Listen for style data events
			newMap.on('styledata', () => {
				checkStyleLoaded()
				
				// Refresh user tokens when style is loaded
				if (user) {
					updateUserTokensDisplay();
				}
				
				// Also reload properties when style loads
				if (newMap.isStyleLoaded()) {
					
					// Use the same function as map movement to fetch ALL properties
					setTimeout(() => {
						// Call the all-properties API to get properties from all users
						fetch(`${API_URL}/properties`)
							.then(res => res.json())
							.then(allProperties => {
								if (allProperties.length === 0) return
								
								
								// Group properties by owner to update our users object
								const propertiesByOwner: Record<string, UserProperty[]> = {}
								
								allProperties.forEach((prop: UserProperty) => {
									if (!propertiesByOwner[prop.owner]) {
										propertiesByOwner[prop.owner] = []
									}
									propertiesByOwner[prop.owner].push(prop)
								})
								
								// Update local user records
								if (usersRef.current) {
									Object.keys(propertiesByOwner).forEach(ownerId => {
										if (!usersRef.current![ownerId]) {
											// Create placeholder for unknown users
											usersRef.current![ownerId] = {
												uid: ownerId,
												name: `User ${ownerId.substring(0, 6)}...`,
												email: 'unknown@example.com',
												tokens: 0,
												properties: propertiesByOwner[ownerId]
											}
										} else {
											// Update properties for known users
											usersRef.current![ownerId].properties = propertiesByOwner[ownerId]
										}
									})
								}
								
								// Finally load properties to map
								loadProperties()
							})
							.catch(error => {
								console.error('Error loading properties after style load:', error)
							})
					}, 300)
				}
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

			// Add a separate function to refresh ALL properties whenever the map moves
			// This is key to keeping other users' properties visible
			const refreshAllProperties = () => {
				if (!map.current || !map.current.isStyleLoaded()) return
				
				
				// Set a timeout to avoid too many requests
				if (moveEndTimeoutRef.current) {
					window.clearTimeout(moveEndTimeoutRef.current)
				}
				
				moveEndTimeoutRef.current = window.setTimeout(() => {
					// Store the current user ID for comparison during refresh
					const currentUserId = user?.uid
					
					// Direct API call to get ALL properties
					fetch(`${API_URL}/properties`)
						.then(res => res.json())
						.then(allProperties => {
							
							if (allProperties.length === 0) return
							
							// Store all user properties keyed by user ID for our in-memory users
							const propertiesByOwner: Record<string, UserProperty[]> = {}
							
							// Group properties by owner
							allProperties.forEach((prop: UserProperty) => {
								if (!propertiesByOwner[prop.owner]) {
									propertiesByOwner[prop.owner] = []
								}
								
								// Ensure we preserve ownership information
								if (currentUserId && prop.owner === currentUserId) {
									console.log(`Found own property during refresh: ${prop.id}`)
								}
								
								propertiesByOwner[prop.owner].push(prop)
							})
							
							// Update our local user records with these properties
							if (usersRef.current) {
								// For each owner, either update existing user or create placeholder
								Object.keys(propertiesByOwner).forEach(ownerId => {
									if (usersRef.current![ownerId]) {
										// Update existing user's properties
										usersRef.current![ownerId].properties = propertiesByOwner[ownerId]
									} else {
										// Create a placeholder user record for this owner
										usersRef.current![ownerId] = {
											uid: ownerId,
											name: `User ${ownerId.substring(0, 6)}...`, // Placeholder name
											email: 'unknown@example.com',
											tokens: 0, // Placeholder
											properties: propertiesByOwner[ownerId]
										}
									}
								})
							}
							
							// Now load the properties onto the map
							loadProperties()
						})
						.catch(error => {
							console.error('Error refreshing properties after map movement:', error)
						})
				}, 200) // Small delay to batch movements
			}

			// Update grid on map movement and zoom
			newMap.on('moveend', debouncedDrawGrid)
			newMap.on('zoomend', debouncedDrawGrid)

			// Also update properties on map movement
			newMap.on('moveend', refreshAllProperties)
			newMap.on('zoomend', refreshAllProperties)

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
				title: "Authentication Required",
				description: "Please connect your wallet to buy property.",
				status: "error",
				duration: 5000,
				isClosable: true,
			});
			return;
		}

		const selectedCellArray = Array.from(selectedCells.current);
		if (selectedCellArray.length === 0) {
			toast({
				title: "No Cells Selected",
				description: "Please select at least one cell to buy.",
				status: "error",
				duration: 5000,
				isClosable: true,
			});
			return;
		}

		try {
			setIsLoading(true);
			
			// First get the location address
			const locationInfo = await getLocationFromCells(selectedCellArray);
			console.log('locationInfo', locationInfo)
			if (!locationInfo) {
				toast({
					title: "Location Error",
					description: "Could not determine the location for the selected cells.",
					status: "error",
					duration: 5000,
					isClosable: true,
				});
				setIsLoading(false);
				return;
			}

			// Store the detected address for later use
			setDetectedAddress(locationInfo.address || `${locationInfo.place}, ${locationInfo.region}, ${locationInfo.country}`);

			// Now fetch the base price using the location address
			setIsLoadingBasePrice(true);
			const priceResponse = await fetchWithAuth(`${API_URL}/price/calculate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ address: locationInfo.address || `${locationInfo.place}, ${locationInfo.region}, ${locationInfo.country}` }), // Use the address from the location info object
			});

			if (!priceResponse.ok) {
				throw new Error('Failed to calculate price');
			}

			const priceData = await priceResponse.json();
			setBasePrice(priceData.basePrice);
			setIsLoadingBasePrice(false);
			setIsPriceModalOpen(true);
			setIsLoading(false);
		} catch (error) {
			console.error('Error calculating price:', error);
			toast({
				title: "Error",
				description: "Failed to calculate property price. Please try again.",
				status: "error",
				duration: 5000,
				isClosable: true,
			});
			setIsLoading(false);
			setIsLoadingBasePrice(false);
		}
	}

	// Add new function to handle the actual purchase after price confirmation
	const handleConfirmPurchase = async (): Promise<void> => {
		if (!user) return
		
		setIsLoading(true)
		try {
			// Use the bulk cell checking method instead of individual checks
			const ownedCells = await checkMultipleCellsOwnership(Array.from(selectedCells.current))
			
			if (ownedCells.length > 0) {
				toast({
					title: 'Error',
					description: `${ownedCells.length} of the selected cells are already owned and cannot be purchased`,
					status: 'error',
					duration: 3000,
					isClosable: true,
				})
				setIsLoading(false)
				return
			}
			
			// Directly fetch latest user data from API
			const response = await fetchWithAuth(`${API_URL}/users/profile`)
			
			// Handle user not found in API
			if (!response.ok) {
				setIsLoading(false)
				return
			}
			
			// User exists in API, get the data and update local state
			const userProfile = await response.json()
			if (usersRef.current) {
				usersRef.current[user.uid] = userProfile
			}
			
			// Now get the latest user data (from our local state which we just updated)
			if (!usersRef.current?.[user.uid]) {
				throw new Error('Failed to retrieve user profile after updates')
			}
			
			
			// Calculate total cost using base price
			const totalCost = selectedCells.current.size * basePrice
			if (usersRef.current[user.uid].tokens < totalCost) {
				toast({
					title: 'Error',
					description: `Insufficient tokens. You need ${totalCost} tokens to buy this property`,
					status: 'error',
					duration: 3000,
					isClosable: true,
				})
				setIsLoading(false)
				return
			}
			
			// Create a new property with a unique ID
			const propertyId = uuidv4()
			
			// Use detected location for property name/address if available
			const defaultName = detectedAddress ? 
				`Property at ${detectedAddress.split(',')[0]}` : 
				`Property #${propertyId.substring(0, 8)}`
			
			// Create a property object with detected address if available
			const propertyData: PropertyWithBids = {
				id: propertyId,
				owner: user.uid,
				cells: Array.from(selectedCells.current),
				price: totalCost,
				name: defaultName,
				address: detectedAddress || ''
			}
			
			// Make the API call to purchase the property
			const purchaseResponse = await fetchWithAuth(`${API_URL}/properties/unallocated/buy`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(propertyData),
			})
			
			if (!purchaseResponse.ok) {
				const errorText = await purchaseResponse.text().catch(() => 'Unknown error');
				throw new Error(`Purchase failed: ${errorText}`);
			}
			
			// Parse the response to check for treasure discovery
			const purchaseData = await purchaseResponse.json().catch(() => ({}))
			
			// Check if a treasure was discovered
			if (purchaseData.isTreasure && purchaseData.treasure) {
				// Set treasure discovery data
				setDiscoveredTreasure(purchaseData.treasure)
				
				// Show treasure discovery modal after a short delay for better UX
				setTimeout(() => {
					setIsTreasureDiscoveryOpen(true)
				}, 1000)
				
				// Add detected location to success message if available
				const successMsg = detectedAddress ? 
					`🎉 TREASURE FOUND! Property at "${detectedAddress}" purchased for ${totalCost} tokens!` :
					`🎉 TREASURE FOUND! Property purchased for ${totalCost} tokens!`
				
				toast({
					title: '🎊 Treasure Discovery! 🎊',
					description: successMsg,
					status: 'success',
					duration: 5000,
					isClosable: true,
				})
			} else {
				// Regular success message without treasure
				const successMsg = detectedAddress ? 
					`Property at "${detectedAddress}" purchased successfully for ${totalCost} tokens` :
					`Property purchased successfully for ${totalCost} tokens`
				
				toast({
					title: 'Success',
					description: successMsg,
					status: 'success',
					duration: 3000,
					isClosable: true,
				})
			}
			
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
			
			// Update token display
			setTimeout(() => {
				updateUserTokensDisplay();
			}, 300);
			
			// Fly to newly purchased property after a short delay
			setTimeout(() => {
				flyToProperty(propertyId)
			}, 1000)

			// Close the price modal
			setIsPriceModalOpen(false)
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
			map.current.on('click', PROPERTIES_LAYER_ID, handlePropertyClick)
			
			return () => {
				map.current?.off('click', PROPERTIES_LAYER_ID, handlePropertyClick)
			}
		}
	}, [styleLoaded, user, usersRef, toast, updateSelection])

	// Update the useEffect for fetching users when map loads
	useEffect(() => {
		if (mapInstance && styleLoaded && !isLoadingUsers.current) {
			isLoadingUsers.current = true
			fetchUsers().then(() => {
				isLoadingUsers.current = false
			}).catch(() => {
				isLoadingUsers.current = false
			})
		}
	}, [mapInstance, styleLoaded, fetchUsers])

	// Update the useEffect for loading properties when user changes
	useEffect(() => {
		if (user && mapInstance && styleLoaded && Object.keys(usersRef.current || {}).length > 0) {
			loadProperties()
		}
	}, [user, mapInstance, styleLoaded, loadProperties])

	// Add a dedicated effect for initial mount to load properties
	useEffect(() => {
		// This effect runs once on component mount
		
		// Wait a moment for everything to initialize
		const initialLoadTimeout = setTimeout(async () => {
			if (map.current && map.current.isStyleLoaded()) {
				
				try {
					// Then load properties
					setTimeout(async () => {
						
						// First get all properties directly from the API
						try {
							const propsResponse = await fetch(`${API_URL}/properties`)
							if (propsResponse.ok) {
								const allProperties = await propsResponse.json()
								
								if (allProperties.length > 0) {
									// Create user mapping for all properties
									const propertiesByOwner: Record<string, UserProperty[]> = {}
									
									// Group properties by owner
									allProperties.forEach((prop: UserProperty) => {
										if (!propertiesByOwner[prop.owner]) {
											propertiesByOwner[prop.owner] = []
										}
										propertiesByOwner[prop.owner].push(prop)
									})
									
									// Update our local user records with these properties
									if (usersRef.current) {
										// For each owner, either update existing user or create placeholder
										Object.keys(propertiesByOwner).forEach(ownerId => {
											if (usersRef.current![ownerId]) {
												// Update existing user's properties
												usersRef.current![ownerId].properties = propertiesByOwner[ownerId]
											} else {
												// Create a placeholder user record for this owner
												usersRef.current![ownerId] = {
													uid: ownerId,
													name: `User ${ownerId.substring(0, 6)}...`, // Placeholder name
													email: 'unknown@example.com',
													tokens: 0, // Placeholder
													properties: propertiesByOwner[ownerId]
												}
											}
										})
									}
									
									// Now load all properties to the map
									loadProperties()
								}
							}
						} catch (error) {
							console.error('Error fetching all properties on initial load:', error)
						}
						
						// Try multiple times with increasing delays for reliability
						setTimeout(() => loadProperties(), 1000)
						setTimeout(() => loadProperties(), 3000)
					}, 200)
				} catch (error) {
					console.error('Error in initial property load:', error);
					fetchUsers().then(() => {
						loadProperties();
					});
				}
			} else {
				console.log('Map not ready for initial property load');
			}
		}, 1500);
		
		return () => {
			clearTimeout(initialLoadTimeout);
		};
	}, []); // Empty dependency array ensures this only runs once on mount

	// Keep only one set of state declarations (around line 115)
	const [userTokens, setUserTokens] = useState<number | null>(null)
	const [isPriceModalOpen, setIsPriceModalOpen] = useState(false)
	const [basePrice, setBasePrice] = useState<number>(0)
	const [isLoadingBasePrice, setIsLoadingBasePrice] = useState(false)
	const [detectedAddress, setDetectedAddress] = useState<string>('')

	// Add the updateUserTokensDisplay function
	const updateUserTokensDisplay = async () => {
		if (!user) return;
		
		try {
			// Get the latest user data from API
			const response = await fetchWithAuth(`${API_URL}/users/profile`);
			
			if (response.ok) {
				const userData = await response.json();
				
				// Update both local state AND usersRef
				setUserTokens(userData.tokens);
				
				// Update local state
				if (usersRef.current) {
					usersRef.current[user.uid] = userData;
				}
			}
		} catch (error) {
			console.error('Error updating user tokens display:', error);
		}
	}

	// Replace the useEffect for token updating with this more robust version
	useEffect(() => {
		if (!user) return;
		
		// Update once on mount or when user changes
		updateUserTokensDisplay();
		
		// Then set up interval to refresh every 10 seconds (more frequent refreshes)
		const intervalId = setInterval(() => {
			updateUserTokensDisplay();
		}, 10000);
		
		return () => {
			clearInterval(intervalId);
		};
	}, [user, updateUserTokensDisplay]);

	// Add this effect to update token display based on local data
	useEffect(() => {
		if (user && usersRef.current && usersRef.current[user.uid]?.tokens !== undefined) {
			setUserTokens(usersRef.current[user.uid].tokens);
		}
	}, [user, usersRef.current]);

	// Replace the token display box with this improved version
	{/* Show user tokens */}
	{user && (
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
			<Text fontWeight="bold" color="gray.800">
				Tokens: {userTokens !== null ? userTokens : (usersRef.current?.[user.uid]?.tokens || 0)}
			</Text>
		</Box>
	)}

	// Add this effect to handle token updates when changes happen
	useEffect(() => {
		// Add refreshUserTokens function to trigger updates when changes happen
		const refreshUserTokens = () => {
			if (user) {
				updateUserTokensDisplay();
			}
		};
		
		// Refresh tokens whenever:
		// 1. Map is clicked (possible property interaction)
		// 2. Modal is closed (possible property transaction)
		
		if (map.current) {
			map.current.on('click', refreshUserTokens);
		}
		
		// Listen for property modal close events
		if (!isPropertyModalOpen && user) {
			refreshUserTokens();
		}
		
		return () => {
			if (map.current) {
				map.current.off('click', refreshUserTokens);
			}
		};
	}, [map, isPropertyModalOpen, user, updateUserTokensDisplay]);

	// Function to place a bid on a property
	const handlePlaceBid = async () => {
		if (!user || !selectedProperty) return
		
		try {
			setIsLoading(true)
			
			// Validate bid amount
			if (bidAmount <= 0) {
				toast({
					title: 'Invalid Bid',
					description: 'Bid amount must be greater than zero',
					status: 'error',
					duration: 3000,
					isClosable: true,
				})
				return
			}
			
			// Check if user has enough tokens
			const userProfile = usersRef.current?.[user.uid]
			if (!userProfile || userProfile.tokens < bidAmount) {
				toast({
					title: 'Insufficient Tokens',
					description: `You need ${bidAmount} tokens to place this bid`,
					status: 'error',
					duration: 3000,
					isClosable: true,
				})
				return
			}
			
			
			// Send bid to API
			const response = await fetchWithAuth(`${API_URL}/properties/${selectedProperty.id}/bid`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					amount: bidAmount,
					message: bidMessage
				})
			})
			
			if (!response.ok) {
				throw new Error(`Failed to place bid: ${await response.text()}`)
			}
			
			// Get the response data to confirm bid was placed
			const responseData = await response.json().catch(() => null)
			
			// Bid successful
			toast({
				title: 'Bid Placed',
				description: 'Your bid has been placed successfully',
				status: 'success',
				duration: 3000,
				isClosable: true,
			})
			
			// Reset bid form
			setBidAmount(0)
			setBidMessage('')
			
			// Refresh bids to see the new bid
			await fetchPropertyBids(selectedProperty.id)
			
			// Update user tokens
			await updateUserTokensDisplay();
			
			// Switch to the My Bids tab
			// Check if we can find the tab index for My Bids
			setTimeout(() => {
				try {
					const tabElements = document.querySelectorAll('.chakra-tabs__tab')
					let myBidsTabIndex = -1
					
					// Find the My Bids tab
					for (let i = 0; i < tabElements.length; i++) {
						if (tabElements[i].textContent?.includes('My Bids')) {
							myBidsTabIndex = i
							break
						}
					}
					
					// If found, try to select it
					if (myBidsTabIndex >= 0) {
						const tabsElement = document.querySelector('.chakra-tabs')
						if (tabsElement && 'index' in tabsElement) {
							tabsElement.index = myBidsTabIndex
						}
					}
				} catch (error) {
					console.error('Error switching to My Bids tab:', error)
				}
			}, 500)
			
		} catch (error) {
			console.error('Error placing bid:', error)
			toast({
				title: 'Error',
				description: error instanceof Error ? error.message : 'Failed to place bid',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
		} finally {
			setIsLoading(false)
		}
	}

	// Function to accept a bid
	const handleAcceptBid = async (bidUserId: string) => {
		if (!user || !selectedProperty) return
		
		try {
			setIsLoading(true)
			
			// Send accept bid request to API
			const response = await fetchWithAuth(`${API_URL}/properties/${selectedProperty.id}/bid/accept`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					bidUserId
				})
			})
			
			if (!response.ok) {
				throw new Error(`Failed to accept bid: ${await response.text()}`)
			}
			
			// Bid accepted successfully
			toast({
				title: 'Bid Accepted',
				description: 'The property has been sold successfully',
				status: 'success',
				duration: 3000,
				isClosable: true,
			})
			
			// Close modal
			setIsPropertyModalOpen(false)
			
			// Refresh user data and properties
			await fetchUsers()
			
			// Force property reload with a small delay
			setTimeout(() => {
				refreshPropertyDisplay()
			}, 500)
			
			// Update token display
			setTimeout(() => {
				updateUserTokensDisplay();
			}, 300);
		} catch (error) {
			console.error('Error accepting bid:', error)
			toast({
				title: 'Error',
				description: error instanceof Error ? error.message : 'Failed to accept bid',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
		} finally {
			setIsLoading(false)
		}
	}

	// Add functions to decline and cancel bids
	const handleDeclineBid = async (bidUserId: string) => {
		if (!user || !selectedProperty) return
		
		try {
			setIsLoading(true)
			
			// Send decline bid request to API
			const response = await fetchWithAuth(`${API_URL}/properties/${selectedProperty.id}/bid/decline`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					bidUserId
				})
			})
			
			if (!response.ok) {
				throw new Error(`Failed to decline bid: ${await response.text()}`)
			}
			
			// Decline successful
			toast({
				title: 'Bid Declined',
				description: 'The bid has been declined',
				status: 'info',
				duration: 3000,
				isClosable: true,
			})
			
			// Refresh bids
			await fetchPropertyBids(selectedProperty.id)
			
			// Add:
			// Update token display
			await updateUserTokensDisplay();
		} catch (error) {
			console.error('Error declining bid:', error)
			toast({
				title: 'Error',
				description: error instanceof Error ? error.message : 'Failed to decline bid',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
		} finally {
			setIsLoading(false)
		}
	}

	const handleCancelBid = async (bidId: string) => {
		if (!user || !selectedProperty) return
		
		try {
			setIsLoading(true)
			
			// Send cancel bid request to API
			const response = await fetchWithAuth(`${API_URL}/properties/${selectedProperty.id}/bid/cancel`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					bidId
				})
			})
			
			if (!response.ok) {
				throw new Error(`Failed to cancel bid: ${await response.text()}`)
			}
			
			// Cancel successful
			toast({
				title: 'Bid Cancelled',
				description: 'Your bid has been cancelled',
				status: 'info',
				duration: 3000,
				isClosable: true,
			})
			
			// Refresh bids
			await fetchPropertyBids(selectedProperty.id)
		} catch (error) {
			console.error('Error cancelling bid:', error)
			toast({
				title: 'Error',
				description: error instanceof Error ? error.message : 'Failed to cancel bid',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
		} finally {
			setIsLoading(false)
		}
	}

	// Function to find a property by ID and zoom to it
	const findAndZoomToProperty = useCallback(async (propertyId: string) => {
		if (!mapInstance || !propertyId) return;
		
		
		try {
			// First try to find the property in the local users data
			let propertyFound = false;
			let propCells: string[] = [];
			
			// Check all users' properties
			for (const userData of Object.values(users)) {
				if (!userData.properties) continue;
				
				const property = userData.properties.find(p => p.id === propertyId);
				if (property) {
					propCells = property.cells || [];
					propertyFound = true;
					
					// Store the property ID but don't open the modal
					setCurrentPropertyId(propertyId);
					
					
					break;
				}
			}
			
			// If not found locally, try to fetch from API
			if (!propertyFound) {
				const response = await fetch(`${API_URL}/properties/${propertyId}`);
				
				if (response.ok) {
					const property = await response.json();
					propCells = property.cells || [];
					
					// Store the property ID but don't open the modal
					setCurrentPropertyId(propertyId);
					
					
				} else {
					console.error("Failed to fetch property:", response.statusText);
					toast({
						title: "Property Not Found",
						description: "Could not find the requested property.",
						status: "error",
						duration: 5000,
						isClosable: true,
					});
					return;
				}
			}
			
			// If we have cells, calculate their center and zoom to it
			if (propCells.length > 0) {
				
				// Try to find the correct format for cells
				const firstCell = propCells[0];
				
				let totalLng = 0;
				let totalLat = 0;
				let validCells = 0;
				let cellFormat = 'unknown';
				
				// Check what format the cells are in
				if (typeof firstCell === 'string') {
					if (firstCell.includes('_')) {
						// Format: "lng_lat"
						cellFormat = 'underscore';
						propCells.forEach(cellKey => {
							const [lngStr, latStr] = cellKey.split('_');
							const lng = parseFloat(lngStr);
							const lat = parseFloat(latStr);
							
							if (!isNaN(lng) && !isNaN(lat)) {
								totalLng += lng;
								totalLat += lat;
								validCells++;
							}
						});
					} else if (firstCell.includes(',')) {
						// Format: "lng,lat"
						cellFormat = 'comma';
						propCells.forEach(cellKey => {
							const [lngStr, latStr] = cellKey.split(',');
							const lng = parseFloat(lngStr);
							const lat = parseFloat(latStr);
							
							if (!isNaN(lng) && !isNaN(lat)) {
								totalLng += lng;
								totalLat += lat;
								validCells++;
							}
						});
					} else {
						// Try if it's just direct coordinates as string
						cellFormat = 'direct';
						try {
							// Convert cells directly to numbers if they're stored as numeric strings
							propCells.forEach(cellKey => {
								const num = parseFloat(cellKey);
								if (!isNaN(num)) {
									// Just collect all numbers, we'll split them into lng/lat pairs later
									totalLng += num;
									validCells++;
								}
							});
							
							// If we have an even number of valid cells, treat them as lng/lat pairs
							if (validCells > 0 && validCells % 2 === 0) {
								const lngSum = propCells.filter((_, i) => i % 2 === 0).reduce((sum, val) => sum + parseFloat(val), 0);
								const latSum = propCells.filter((_, i) => i % 2 === 1).reduce((sum, val) => sum + parseFloat(val), 0);
								totalLng = lngSum;
								totalLat = latSum;
								validCells = validCells / 2; // Adjust for pairs
							}
						} catch (e) {
							console.error("Error processing direct cell format:", e);
						}
					}
				}
				
				
				if (validCells > 0) {
					const centerLng = totalLng / validCells;
					const centerLat = totalLat / validCells;
					
					
					// Check if coordinates are outside valid range for mapbox
					if (Math.abs(centerLng) > 180 || Math.abs(centerLat) > 90) {
						
						// This is the value in the sample data: "-740031,577666"
						// These are actually cell grid indices, not lat/lng coordinates
						// We need to convert to real coordinates using GRID_SIZE constants
						// But only if we see values that are too large to be real coords
						
						// Reset accumulation variables
						totalLng = 0;
						totalLat = 0;
						validCells = 0;
						
						// Reprocess cells as grid indices instead of direct coordinates
						propCells.forEach(cellKey => {
							const parts = cellKey.split(',');
							if (parts.length === 2) {
								const lngIndex = parseInt(parts[0], 10);
								const latIndex = parseInt(parts[1], 10);
								
								if (!isNaN(lngIndex) && !isNaN(latIndex)) {
									// Convert grid indices to real coordinates
									const realLng = lngIndex * GRID_SIZE;
									const realLat = latIndex * GRID_SIZE_LAT;
									
									totalLng += realLng;
									totalLat += realLat;
									validCells++;
								}
							}
						});
						
						if (validCells > 0) {
							const gridCenterLng = totalLng / validCells;
							const gridCenterLat = totalLat / validCells;
							
							
							// Validate the resulting coordinates
							if (Math.abs(gridCenterLng) <= 180 && Math.abs(gridCenterLat) <= 90) {
								mapInstance.flyTo({
									center: [gridCenterLng, gridCenterLat],
									zoom: 18,
									essential: true,
									animate: true,
									duration: 2000
								});
								
							} else {
								throw new Error("Converted coordinates still outside valid range");
							}
						} else {
							throw new Error("Failed to interpret cell coordinates");
						}
					} else {
						// Original coordinates are in valid range
						// Zoom to property with explicit animation settings
						mapInstance.flyTo({
							center: [centerLng, centerLat],
							zoom: 18,
							essential: true,
							animate: true,
							duration: 2000
						});
						
					}
				} else {
					console.error("No valid coordinates found in property cells");
					
					// Last resort: if cells might be indexes rather than coordinates
					// For indexes, we need to convert them to actual coordinates
					
					let indexLngSum = 0;
					let indexLatSum = 0;
					let validIndexCells = 0;
					
					propCells.forEach(cellKey => {
						// Try to extract two numbers from the cell key
						const match = cellKey.match(/(\d+)[^0-9]+(\d+)/);
						if (match && match.length >= 3) {
							const lngIndex = parseInt(match[1], 10);
							const latIndex = parseInt(match[2], 10);
							
							if (!isNaN(lngIndex) && !isNaN(latIndex)) {
								// Convert indexes to coordinates using the grid size constants
								indexLngSum += lngIndex * GRID_SIZE;
								indexLatSum += latIndex * GRID_SIZE_LAT;
								validIndexCells++;
							}
						}
					});
					
					if (validIndexCells > 0) {
						const centerLng = indexLngSum / validIndexCells;
						const centerLat = indexLatSum / validIndexCells;
						
						
						// Zoom to property with index-based coordinates
						mapInstance.flyTo({
							center: [centerLng, centerLat],
							zoom: 18,
							essential: true,
							animate: true,
							duration: 2000
						});
						
					} else {
						console.error("Failed to interpret cells in any format");
						toast({
							title: "Error",
							description: "Could not determine property location from cell data.",
							status: "error",
							duration: 5000,
							isClosable: true,
						});
					}
				}
			} else {
				console.error("Property has no cells");
				toast({
					title: "Error",
					description: "Property has no location data to display on map.",
					status: "error",
					duration: 5000,
					isClosable: true,
				});
			}
		} catch (error) {
			console.error("Error finding and zooming to property:", error);
			toast({
				title: "Error",
				description: "Failed to locate the property on the map.",
				status: "error",
				duration: 5000,
				isClosable: true,
			});
		}
	}, [mapInstance, users, toast]);

	// Check URL parameters for propertyId and zoom to property
	useEffect(() => {
		if (!mapInstance || !styleLoaded || !Object.keys(users).length) return;
		
		// Get propertyId from URL parameters
		const urlParams = new URLSearchParams(window.location.search);
		const propertyId = urlParams.get('propertyId');
		
		if (propertyId) {
			// Wait a bit for the map to be ready
			setTimeout(() => {
				findAndZoomToProperty(propertyId);
			}, 1000);
		}
	}, [mapInstance, styleLoaded, users, findAndZoomToProperty]);

	// Add this new modal component before the return statement
	const PriceConfirmationModal = () => (
		<Modal isOpen={isPriceModalOpen} onClose={() => setIsPriceModalOpen(false)}>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader>Confirm Purchase</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					{isLoadingBasePrice ? (
						<Center p={4}>
							<Spinner mr={2} />
							<Text>Calculating price...</Text>
						</Center>
					) : (
						<>
							<Text mb={4}>Base Price per Cell: {basePrice} tokens</Text>
							<Text mb={4}>Number of Cells: {selectedCells.current.size}</Text>
							<Text fontWeight="bold" fontSize="xl" color="green.500">
								Total Cost: {basePrice * selectedCells.current.size} tokens
							</Text>
						</>
					)}
				</ModalBody>
				<ModalFooter>
					<Button variant="ghost" mr={3} onClick={() => setIsPriceModalOpen(false)}>
						Cancel
					</Button>
					<Button 
						colorScheme="green" 
						onClick={handleConfirmPurchase}
						isLoading={isLoading}
						isDisabled={isLoadingBasePrice}
					>
						Buy Now
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)

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
						mr={isAdmin ? 2 : 0}
					>
						Buy Property ({selectedCells.current.size * propertyPrice} tokens)
					</Button>
					{isAdmin && (
						<Button
							colorScheme="purple"
							size="sm"
							onClick={() => {
								if (selectedCells.current.size === 0) {
									toast({
										title: 'No Cells Selected',
										description: 'Please select at least one cell to set as treasure.',
										status: 'warning',
										duration: 3000,
										isClosable: true,
									})
									return
								}
								setIsTreasureModalOpen(true)
							}}
							boxShadow="md"
							isLoading={isLoading}
						>
							Set Property as Treasure
						</Button>
					)}
				</Box>

				{/* Show user tokens */}
				{user && (
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
						<Text fontWeight="bold" color="gray.800">
							Tokens: {userTokens !== null ? userTokens : (usersRef.current?.[user.uid]?.tokens || 0)}
						</Text>
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
							{isOwnProperty ? 'Your Property Details' : 'Property Details'}
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
									{isOwnProperty && <Tab>View Bids</Tab>}
									{!isOwnProperty && selectedProperty?.forSale && <Tab>Place Bid</Tab>}
									{!isOwnProperty && <Tab>My Bids</Tab>}
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
														<Text mt={2} textAlign="center" fontSize="sm" color="gray.500">
															Or place a bid on the &quot;Place Bid&quot; tab
														</Text>
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
									
									{/* View Bids Tab for Property Owner */}
									{isOwnProperty && (
										<TabPanel>
											<Text fontWeight="bold" mb={4}>Bids for Your Property</Text>
											<Text fontSize="xs" color="gray.500" mb={2}>Property ID: {selectedProperty?.id}</Text>
											
											{isLoadingBids ? (
												<Center p={4}>
													<Spinner mr={2} />
													<Text>Loading bids...</Text>
												</Center>
											) : !Array.isArray(propertyBids) || propertyBids.length === 0 ? (
												<Text color="gray.500" textAlign="center">No bids have been placed on this property yet.</Text>
											) : (
												<>
													<Text fontSize="xs" color="gray.500" mb={2}>Found {propertyBids.length} bids</Text>
													<Stack spacing={4}>
														{propertyBids.map((bid, index) => (
															<Card key={index} variant="outline">
																<CardHeader pb={0}>
																	<Flex justifyContent="space-between" alignItems="center">
																		<Text fontWeight="bold">
																			Bid from {usersRef.current?.[bid.userId]?.name || bid.userId.substring(0, 6) + '...'}
																		</Text>
																		<Badge colorScheme={
																			bid.status === 'accepted' ? 'green' : 
																			bid.status === 'declined' ? 'red' : 
																			bid.status === 'cancelled' ? 'gray' : 
																			'blue'
																		}>
																			{bid.amount} tokens {bid.status && bid.status !== 'active' ? `(${bid.status})` : ''}
																		</Badge>
																	</Flex>
																</CardHeader>
																<CardBody pt={2}>
																	{bid.message && <Text fontSize="sm">{bid.message}</Text>}
																	<Text fontSize="xs" color="gray.500" mt={1}>
																		{new Date(bid.createdAt).toLocaleString()}
																	</Text>
																</CardBody>
																{(!bid.status || bid.status === 'active') && (
																	<CardFooter pt={0}>
																		<Flex width="full" gap={2}>
																			<Button 
																				colorScheme="green" 
																				size="sm" 
																				flex="1"
																				onClick={() => handleAcceptBid(bid.userId)}
																				isLoading={isLoading}
																			>
																				Accept
																			</Button>
																			<Button 
																				colorScheme="red" 
																				size="sm" 
																				flex="1"
																				onClick={() => handleDeclineBid(bid.userId || '')}
																				isLoading={isLoading}
																			>
																				Decline
																			</Button>
																		</Flex>
																	</CardFooter>
																)}
															</Card>
														))}
													</Stack>
												</>
											)}
										</TabPanel>
									)}
									
									{/* Place Bid Tab for Other Users */}
									{!isOwnProperty && selectedProperty?.forSale && (
										<TabPanel>
											<Text fontWeight="bold" mb={4}>Place a Bid on This Property</Text>
											<FormControl mb={4}>
												<FormLabel>Bid Amount (tokens)</FormLabel>
												<NumberInput
													value={bidAmount}
													onChange={(value) => setBidAmount(Number(value))}
													min={1}
												>
													<NumberInputField />
													<NumberInputStepper>
														<NumberIncrementStepper />
														<NumberDecrementStepper />
													</NumberInputStepper>
												</NumberInput>
											</FormControl>
											
											<FormControl mb={4}>
												<FormLabel>Message (optional)</FormLabel>
												<Textarea 
													value={bidMessage} 
													onChange={(e) => setBidMessage(e.target.value)}
													placeholder="Add a message to the property owner..."
													resize="vertical"
													rows={3}
												/>
											</FormControl>
											
											<Button 
												colorScheme="blue" 
												width="100%" 
												onClick={handlePlaceBid}
												isLoading={isLoading}
											>
												Submit Bid
											</Button>
											
											<Text mt={3} fontSize="sm" color="gray.500" textAlign="center">
												You currently have {usersRef.current?.[user?.uid || '']?.tokens || 0} tokens available.
											</Text>
										</TabPanel>
									)}
									
									{/* My Bids Tab for non-owner users */}
									{!isOwnProperty && (
										<TabPanel>
											<Text fontWeight="bold" mb={4}>My Bids on This Property</Text>
											<Text fontSize="xs" color="gray.500" mb={2}>
												Property ID: {selectedProperty?.id} | Your User ID: {user?.uid}
											</Text>
											
											{isLoadingBids ? (
												<Center p={4}>
													<Spinner mr={2} />
													<Text>Loading your bids...</Text>
												</Center>
											) : (
												<>
													<Text fontSize="xs" color="gray.500" mb={2}>
														Total bids loaded: {propertyBids.length} | 
														Your bids: {propertyBids.filter(bid => bid.userId === user?.uid).length}
													</Text>
													
													{propertyBids
														.filter(bid => bid.userId === user?.uid)
														.map((bid, index) => (
															<Card key={index} variant="outline" mb={4}>
																<CardHeader pb={0}>
																	<Flex justifyContent="space-between" alignItems="center">
																		<Text fontWeight="bold">Your Bid</Text>
																		<Badge colorScheme={
																			bid.status === 'accepted' ? 'green' : 
																			bid.status === 'declined' ? 'red' : 
																			bid.status === 'cancelled' ? 'gray' : 
																			'blue'
																		}>
																			{bid.amount} tokens {bid.status && bid.status !== 'active' ? `(${bid.status})` : ''}
																		</Badge>
																	</Flex>
																</CardHeader>
																<CardBody pt={2}>
																	{bid.message && <Text fontSize="sm">{bid.message}</Text>}
																	<Text fontSize="xs" color="gray.500" mt={1}>
																		{new Date(bid.createdAt).toLocaleString()}
																	</Text>
																	<Text fontSize="xs" color="gray.500" mt={1}>
																		Bid ID: {bid._id || 'Unknown'}
																	</Text>
																</CardBody>
																{(!bid.status || bid.status === 'active') && (
																	<CardFooter pt={0}>
																		<Button 
																			colorScheme="red" 
																			size="sm" 
																			width="full"
																			onClick={() => handleCancelBid(bid._id || '')}
																			isLoading={isLoading}
																		>
																			Cancel Bid
																		</Button>
																	</CardFooter>
																)}
															</Card>
														))}
														
													{propertyBids.filter(bid => bid.userId === user?.uid).length === 0 && (
														<>
															<Text color="gray.500" textAlign="center" mb={2}>
																You haven&apos;t placed any bids on this property yet.
															</Text>
															<Text fontSize="xs" color="gray.500" textAlign="center">
																(If you just placed a bid, try refreshing the page.)
															</Text>
														</>
													)}
												</>
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

				{/* Add the PriceConfirmationModal */}
				<PriceConfirmationModal />

				{/* Add the TreasureModal for admin users */}
				{isAdmin && (
					<TreasureModal
						isOpen={isTreasureModalOpen}
						onClose={() => setIsTreasureModalOpen(false)}
						selectedCells={Array.from(selectedCells.current)}
						onSuccess={() => {
							// Clear selection after successful treasure creation
							selectedCells.current.clear()
							updateSelection()
							toast({
								title: 'Success',
								description: 'Treasure has been set successfully!',
								status: 'success',
								duration: 3000,
								isClosable: true,
							})
						}}
					/>
				)}

				{/* Add the TreasureDiscoveryModal for when users find treasures */}
				<TreasureDiscoveryModal
					isOpen={isTreasureDiscoveryOpen}
					onClose={() => {
						setIsTreasureDiscoveryOpen(false)
						setDiscoveredTreasure(null)
						// Update token display after treasure discovery
						setTimeout(() => {
							updateUserTokensDisplay()
						}, 500)
					}}
					treasureInfo={discoveredTreasure}
				/>
			</Box>
		</>
	)
}

