/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import { useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

// Constants for grid cell size (must match the ones in MapComponent)
const GRID_SIZE = 0.0001; // 0.0001 degrees ≈ 10m
const GRID_SIZE_LAT = 0.0000705; // Adjusted to make cells appear as squares

// Type definitions
export interface LocationInfo {
  address?: string;
  place?: string;
  neighborhood?: string;
  postcode?: string;
  region?: string;
  country?: string;
  coordinates: {
    lng: number;
    lat: number;
  };
  raw?: any; // The raw response from Mapbox API
}

/**
 * Custom hook to find location information from selected cells using Mapbox API
 */
const useLocationFromCells = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);

  /**
   * Convert a cell key (grid index) to geographic coordinates
   * @param cellKey - The cell key in format "lngIndex,latIndex"
   * @returns The geographic coordinates of the cell
   */
  const cellToCoordinates = useCallback((cellKey: string): { lng: number; lat: number } | null => {
    try {
      const [lngIndex, latIndex] = cellKey.split(',').map(Number);
      
      if (isNaN(lngIndex) || isNaN(latIndex)) {
        console.error('Invalid cell key format:', cellKey);
        return null;
      }
      
      // Convert grid indices to geographic coordinates
      const lng = lngIndex * GRID_SIZE;
      const lat = latIndex * GRID_SIZE_LAT;
      
      return { lng, lat };
    } catch (error) {
      console.error('Error converting cell to coordinates:', error);
      return null;
    }
  }, []);

  /**
   * Find the center coordinates of multiple cells
   * @param cells - Array of cell keys
   * @returns The center coordinates of all cells
   */
  const findCenterOfCells = useCallback((cells: string[]): { lng: number; lat: number } | null => {
    if (!cells.length) return null;
    
    let totalLng = 0;
    let totalLat = 0;
    let validCells = 0;
    
    cells.forEach(cellKey => {
      const coords = cellToCoordinates(cellKey);
      if (coords) {
        totalLng += coords.lng;
        totalLat += coords.lat;
        validCells++;
      }
    });
    
    if (validCells === 0) return null;
    
    return {
      lng: totalLng / validCells,
      lat: totalLat / validCells
    };
  }, [cellToCoordinates]);

  /**
   * Get location information from Mapbox for the given coordinates
   * @param coordinates - The coordinates to lookup
   * @returns Promise resolving to location information
   */
  const getLocationFromCoordinates = useCallback(async (
    coordinates: { lng: number; lat: number }
  ): Promise<LocationInfo> => {
    const { lng, lat } = coordinates;
    
    // Use Mapbox Geocoding API in reverse mode
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&types=address,place,neighborhood,postcode,region,country`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract useful information from the response
    const locationInfo: LocationInfo = {
      coordinates: { lng, lat },
      raw: data
    };
    
    // Process the features to extract relevant information
    if (data.features && data.features.length > 0) {
      data.features.forEach((feature: any) => {
        if (feature.place_type.includes('address')) {
          locationInfo.address = feature.place_name;
        } else if (feature.place_type.includes('place')) {
          locationInfo.place = feature.text;
        } else if (feature.place_type.includes('neighborhood')) {
          locationInfo.neighborhood = feature.text;
        } else if (feature.place_type.includes('postcode')) {
          locationInfo.postcode = feature.text;
        } else if (feature.place_type.includes('region')) {
          locationInfo.region = feature.text;
        } else if (feature.place_type.includes('country')) {
          locationInfo.country = feature.text;
        }
      });
    }
    
    return locationInfo;
  }, []);

  /**
   * Get location information for an array of selected cells
   * @param selectedCells - Array of selected cell keys
   */
  const getLocationFromCells = useCallback(async (selectedCells: string[]) => {
    if (!selectedCells.length) {
      setError('No cells selected');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Find the center of all selected cells
      const centerCoords = findCenterOfCells(selectedCells);
      
      if (!centerCoords) {
        throw new Error('Could not calculate center coordinates from selected cells');
      }
      
      console.log(`Calculated center coordinates from ${selectedCells.length} cells:`, centerCoords);
      
      // Get location information for the center coordinates
      const location = await getLocationFromCoordinates(centerCoords);
      
      console.log('Location information retrieved:', location);
      
      setLocationInfo(location);
      return location;
    } catch (err) {
      console.error('Error getting location from cells:', err);
      setError(err instanceof Error ? err.message : 'Failed to get location information');
      setLocationInfo(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [findCenterOfCells, getLocationFromCoordinates]);

  return {
    getLocationFromCells,
    locationInfo,
    loading,
    error,
    cellToCoordinates,
    findCenterOfCells
  };
};

export default useLocationFromCells; 