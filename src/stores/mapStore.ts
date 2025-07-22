import { create } from 'zustand'

// Available map styles in Mapbox
export type MapStyle =
	| 'streets-v11' // Default street style
	| 'light-v10' // Light style
	| 'dark-v10' // Dark style
	| 'satellite-v9' // Satellite imagery
	| 'satellite-streets-v11' // Satellite with streets
	| 'outdoors-v11' // Outdoor style

interface MapState {
	currentStyle: MapStyle
	setMapStyle: (style: MapStyle) => void
	// Grid settings
	isGridEnabled: boolean
	setGridEnabled: (enabled: boolean) => void
	minZoomForGrid: number
	setMinZoomForGrid: (zoom: number) => void
	gridColor: string
	setGridColor: (color: string) => void
	selectionColor: string
	setSelectionColor: (color: string) => void
}

// Load initial selection color from localStorage or use default
const savedSelectionColor = localStorage.getItem('selectionColor') || '#0080ff'

export const useMapStore = create<MapState>((set) => ({
	currentStyle: 'streets-v11',
	setMapStyle: (style: MapStyle) => set({ currentStyle: style }),
	// Grid default settings
	isGridEnabled: true, // Grid enabled by default
	setGridEnabled: (enabled: boolean) => set({ isGridEnabled: enabled }),
	minZoomForGrid: 10,
	setMinZoomForGrid: (zoom: number) => set({ minZoomForGrid: zoom }),
	gridColor: '#000000',
	setGridColor: (color: string) => set({ gridColor: color }),
	selectionColor: savedSelectionColor,
	setSelectionColor: (color: string) => {
		localStorage.setItem('selectionColor', color)
		set({ selectionColor: color })
	},
}))
