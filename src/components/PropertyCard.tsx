/* eslint-disable prettier/prettier */
import { Box, Badge, Image, Text, Flex, Heading, Button, useColorModeValue } from '@chakra-ui/react'
import { FaMapMarkerAlt } from 'react-icons/fa'
import { Property } from '../stores/userStore'
import { Link } from 'react-router-dom'

interface PropertyCardProps {
  property: Property
  showActions?: boolean
  onViewBids?: () => void
}

export const PropertyCard = ({ property, showActions = true }: PropertyCardProps) => {
  const cardBg = useColorModeValue('white', 'gray.700')
  const textColor = useColorModeValue('gray.600', 'gray.200')
  
  return (
    <Box 
      bg={cardBg} 
      borderRadius="lg" 
      overflow="hidden" 
      boxShadow="md"
      transition="transform 0.3s ease, box-shadow 0.3s ease"
      _hover={{ transform: 'translateY(-5px)', boxShadow: 'lg' }}
    >
      <Box h="150px" bg="gray.300" position="relative">
        {/* Placeholder for property image */}
        <Image
          src={`https://via.placeholder.com/300x150?text=${property.name || 'Property'}`}
          alt={property.name || 'Property'}
          objectFit="cover"
          w="100%"
          h="100%"
        />
        
        {property.forSale && (
          <Badge 
            position="absolute" 
            top="10px" 
            right="10px" 
            colorScheme="green" 
            fontSize="0.8em"
            px={2}
            py={1}
            borderRadius="md"
          >
            For Sale
          </Badge>
        )}
      </Box>
      
      <Box p={4}>
        <Heading size="md" mb={2}>{property.name || `Property #${property.id.substring(0, 8)}`}</Heading>
        
        {property.address && (
          <Flex align="center" color={textColor} mb={2}>
            <FaMapMarkerAlt size="14px" />
            <Text ml={1} fontSize="sm">{property.address}</Text>
          </Flex>
        )}
        
        {property.description && (
          <Text color={textColor} fontSize="sm" noOfLines={2} mb={3}>
            {property.description}
          </Text>
        )}
        
        <Flex justify="space-between" align="center" mt={2}>
          <Text fontWeight="bold">
            {property.forSale 
              ? `Price: ${property.salePrice} tokens` 
              : `Value: ${property.price} tokens`}
          </Text>
          
          {showActions && (
            <Flex>
              <Button 
                as={Link}
                to={`/?propertyId=${property.id}`}
                size="sm" 
                colorScheme="blue" 
                mr={2}
              >
                View Map
              </Button>
              
              
            </Flex>
          )}
        </Flex>
      </Box>
    </Box>
  )
} 