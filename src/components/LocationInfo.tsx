import { FC, useEffect, useState } from 'react'
import {
  Box,
  Text,
  Heading,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Stack,
  Divider
} from '@chakra-ui/react'
import useLocationFromCells from '../hooks/useLocationFromCells'
import { LocationInfo as LocationInfoType } from '../hooks/useLocationFromCells'

interface LocationInfoProps {
  cells: string[]
  isVisible: boolean
}

/**
 * Component that displays location information for a set of cells
 */
const LocationInfo: FC<LocationInfoProps> = ({ cells, isVisible }) => {
  const { getLocationFromCells, locationInfo, loading, error } = useLocationFromCells()
  const [displayedInfo, setDisplayedInfo] = useState<LocationInfoType | null>(null)

  // Fetch location info when cells change or component becomes visible
  useEffect(() => {
    if (isVisible && cells.length > 0) {
      getLocationFromCells(cells).then(info => {
        if (info) {
          setDisplayedInfo(info)
        }
      })
    }
  }, [cells, isVisible, getLocationFromCells])

  if (!isVisible) return null

  if (loading) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" boxShadow="sm" bg="white">
        <Stack direction="row" spacing={2} align="center">
          <Spinner size="sm" />
          <Text>Finding location information...</Text>
        </Stack>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="lg">
        <AlertIcon />
        Error: {error}
      </Alert>
    )
  }

  if (!displayedInfo) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" boxShadow="sm" bg="white">
        <Text>No location information available</Text>
      </Box>
    )
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" boxShadow="md" bg="white">
      <Heading size="md" mb={2}>Location Information</Heading>
      <Divider mb={3} />
      
      <Stack spacing={3}>
        {displayedInfo.address && (
          <Box>
            <Badge colorScheme="green" mb={1}>Address</Badge>
            <Text>{displayedInfo.address}</Text>
          </Box>
        )}
        
        <Stack direction="row" flexWrap="wrap" spacing={4}>
          {displayedInfo.place && (
            <Box minWidth="150px">
              <Badge colorScheme="blue" mb={1}>Place</Badge>
              <Text>{displayedInfo.place}</Text>
            </Box>
          )}
          
          {displayedInfo.neighborhood && (
            <Box minWidth="150px">
              <Badge colorScheme="purple" mb={1}>Neighborhood</Badge>
              <Text>{displayedInfo.neighborhood}</Text>
            </Box>
          )}
          
          {displayedInfo.postcode && (
            <Box minWidth="150px">
              <Badge colorScheme="orange" mb={1}>Postal Code</Badge>
              <Text>{displayedInfo.postcode}</Text>
            </Box>
          )}
          
          {displayedInfo.region && (
            <Box minWidth="150px">
              <Badge colorScheme="teal" mb={1}>Region</Badge>
              <Text>{displayedInfo.region}</Text>
            </Box>
          )}
          
          {displayedInfo.country && (
            <Box minWidth="150px">
              <Badge colorScheme="red" mb={1}>Country</Badge>
              <Text>{displayedInfo.country}</Text>
            </Box>
          )}
        </Stack>
        
        <Box>
          <Badge colorScheme="gray" mb={1}>Coordinates</Badge>
          <Text>
            {displayedInfo.coordinates.lng.toFixed(6)}, {displayedInfo.coordinates.lat.toFixed(6)}
          </Text>
        </Box>
      </Stack>
    </Box>
  )
}

export default LocationInfo 