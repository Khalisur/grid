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
} from '@chakra-ui/react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Global, css } from '@emotion/react'
import { useMapStore } from '../stores/mapStore'
import { SearchIcon } from '@chakra-ui/icons'
import { useUserStore } from '../stores/userStore'
import { useAuthStore } from '../stores/authStore'

// Set Mapbox access token
mapboxgl.accessToken =
	'pk.eyJ1IjoiYmNucHJvMjAiLCJhIjoiY205cmVvZXhrMXB6dTJqb2I4cHFxN2xnbiJ9.HOKvHjSyBLNkwiaiEoFnBg'

// Grid layer IDs
const GRID_SOURCE_ID = 'grid-source'
const GRID_LAYER_ID = 'grid-layer'
const GRID_SELECTION_SOURCE_ID = 'grid-selection-source'
const GRID_SELECTION_LAYER_ID = 'grid-selection-layer'

// Define grid size in degrees (approximately 10m x 10m)
const GRID_SIZE = 0.0001 // 0.0001 degrees ≈ 10m
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
	const { users, updateUserProperty, deductToken, fetchUsers } =
		useUserStore()
	const [currentPropertyId, setCurrentPropertyId] = useState<string>('')
	const toast = useToast()

	// Get map settings from store
	const { currentStyle, gridColor, selectionColor } = useMapStore()

	// Use a ref to track the current selection color
	const currentSelectionColor = useRef(selectionColor)

	// Update the ref when selectionColor changes
	useEffect(() => {
		currentSelectionColor.current = selectionColor
	}, [selectionColor])

	useEffect(() => {
		fetchUsers()
	}, [fetchUsers])

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

		if (!currentPropertyId) {
			toast({
				title: 'Error',
				description: 'Please enter a property ID',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
			return
		}

		const userProfile = users[user.uid]
		if (!userProfile) {
			toast({
				title: 'Error',
				description: 'User profile not found',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
			return
		}

		if (userProfile.tokens <= 0) {
			toast({
				title: 'Error',
				description: 'Insufficient tokens',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
			return
		}

		try {
			await deductToken(user.uid)
			await updateUserProperty(
				user.uid,
				parseInt(currentPropertyId, 10),
				Array.from(selectedCells.current),
			)
			toast({
				title: 'Success',
				description: 'Selection saved successfully',
				status: 'success',
				duration: 3000,
				isClosable: true,
			})
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to save selection',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
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
			const lat = latIndex * GRID_SIZE

			selectionFeatures.push({
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'Polygon',
					coordinates: [
						[
							[lng, lat],
							[lng + GRID_SIZE, lat],
							[lng + GRID_SIZE, lat + GRID_SIZE],
							[lng, lat + GRID_SIZE],
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
				Math.floor(bounds.getSouth() / GRID_SIZE) * GRID_SIZE
			const endLat = Math.ceil(bounds.getNorth() / GRID_SIZE) * GRID_SIZE
			const startLng =
				Math.floor(bounds.getWest() / GRID_SIZE) * GRID_SIZE
			const endLng = Math.ceil(bounds.getEast() / GRID_SIZE) * GRID_SIZE

			// Generate grid features
			const lineFeatures: GeoJSON.Feature[] = []

			// Generate horizontal lines
			for (let lat = startLat; lat <= endLat; lat += GRID_SIZE) {
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
		return `${Math.floor(lng / GRID_SIZE)},${Math.floor(lat / GRID_SIZE)}`
	}

	// Function to handle mouse down for selection
	const handleMouseDown = useCallback((e: mapboxgl.MapMouseEvent) => {
		if (!map.current || map.current.getZoom() < MIN_GRID_ZOOM) return

		const cellKey = getCellKey(e.lngLat.lng, e.lngLat.lat)

		// Toggle selection mode
		isSelectionMode.current = !isSelectionMode.current

		// If turning on selection mode, select the clicked cell
		if (isSelectionMode.current) {
			selectedCells.current.add(cellKey)
		}

		updateSelection()
	}, [])

	// Function to handle mouse move for selection
	const handleMouseMove = useCallback((e: mapboxgl.MapMouseEvent) => {
		if (
			!map.current ||
			map.current.getZoom() < MIN_GRID_ZOOM ||
			!isSelectionMode.current
		)
			return

		const cellKey = getCellKey(e.lngLat.lng, e.lngLat.lat)

		// Add cell to selection on hover only if in selection mode
		selectedCells.current.add(cellKey)
		updateSelection()
	}, [])

	// Function to handle mouse up to end selection
	const handleMouseUp = useCallback(() => {
		// Keep selection mode active after mouse up
	}, [])

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
						// Ensure zoom level is set correctly after style loads
						newMap.setZoom(MIN_GRID_ZOOM)
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
			newMap.on('mouseup', handleMouseUp)
			newMap.on('mouseleave', handleMouseUp)

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
		handleMouseUp,
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
						onClick={handleSaveSelection}
						boxShadow="md"
					>
						Save Selection
					</Button>
				</Box>

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
