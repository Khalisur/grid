/* eslint-disable prettier/prettier */
import { 
  Box, 
  Flex, 
  Text, 
  Badge, 
  Button, 
  useColorModeValue, 
  Heading,
  HStack,
  Tooltip
} from '@chakra-ui/react'
import { FaCheck, FaTimes, FaClock } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { Bid } from '../stores/propertyStore'
import { formatDate } from '../utils/dateFormatter'

interface BidCardProps {
  bid: Bid
  isUserReceived?: boolean
  onAccept?: (bidId: string) => void
  onDecline?: (bidId: string) => void
  onCancel?: (bidId: string) => void
}

export const BidCard = ({ 
  bid, 
  isUserReceived = false,
 
  onCancel 
}: BidCardProps) => {
  const cardBg = useColorModeValue('white', 'gray.700')
  const textColor = useColorModeValue('gray.600', 'gray.200')
  
  // Status color mapping
  const statusColorScheme = {
    active: 'blue',
    accepted: 'green',
    declined: 'red',
    cancelled: 'gray'
  }
  
  // Status icon mapping
  const StatusIcon = {
    active: FaClock,
    accepted: FaCheck,
    declined: FaTimes,
    cancelled: FaTimes
  }[bid.status]
  
  return (
    <Box 
      bg={cardBg} 
      borderRadius="lg" 
      p={4} 
      boxShadow="md"
      borderLeft="4px solid"
      borderLeftColor={`${statusColorScheme[bid.status]}.400`}
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="sm">
          {bid.propertyName || `Property #${bid.propertyId.substring(0, 8)}`}
        </Heading>
        
        <Badge 
          colorScheme={statusColorScheme[bid.status]} 
          display="flex" 
          alignItems="center"
          px={2}
          py={1}
        >
          <Box as={StatusIcon} mr={1} />
          {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
        </Badge>
      </Flex>
      
      <Text fontWeight="bold" mb={2}>
        Bid Amount: {bid.amount} tokens
      </Text>
      
      {bid.message && (
        <Text mb={2} fontSize="sm" color={textColor}>
          &quot;{bid.message}&quot;
        </Text>
      )}
      
      <Flex justify="space-between" fontSize="sm" color={textColor} mb={3}>
        <Text>{isUserReceived ? 'From:' : 'To:'} User #{(isUserReceived ? bid.bidder : bid.owner).substring(0, 8)}</Text>
        <Tooltip label={new Date(bid.createdAt).toLocaleString()}>
          <Text>{formatDate(bid.createdAt)}</Text>
        </Tooltip>
      </Flex>
      
      {bid.status === 'active' && (
        <HStack spacing={2} justify="flex-end" mt={2}>
          <Button 
            as={Link}
            to={`/?propertyId=${bid.propertyId}`}
            size="xs" 
            colorScheme="blue" 
            variant="outline"
          >
            View Property
          </Button>
          
          
          
          {!isUserReceived && onCancel && (
            <Button 
              size="xs" 
              colorScheme="red" 
              variant="outline"
              onClick={() => onCancel(bid.id)}
            >
              Cancel
            </Button>
          )}
        </HStack>
      )}
    </Box>
  )
} 