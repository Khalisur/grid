/* eslint-disable prettier/prettier */
import { useEffect } from 'react'
import {
	Box,
	Heading,
	SimpleGrid,
	Stat,
	StatLabel,
	StatNumber,
	StatHelpText,
	StatArrow,
	Card,
	CardBody,
	useColorModeValue,
	Tabs,
	TabList,
	TabPanels,
	Tab,
	TabPanel,
	Flex,
	Spinner,
	Alert,
	AlertIcon,
	Grid,
	GridItem,
	useToast,
	Text,
} from '@chakra-ui/react'
import { FaHome, FaHandshake, FaEnvelope } from 'react-icons/fa'
import { usePropertyStore } from '../stores/propertyStore'
import { PropertyCard } from '../components/PropertyCard'
import { BidCard } from '../components/BidCard'

export const Dashboard = () => {
	const cardBg = useColorModeValue('white', 'gray.700')
	const toast = useToast()
	const { 
		userProperties, 
		bidsMade, 
		bidsReceived, 
		loading, 
		error,
		fetchUserProperties, 
		fetchBidsMade, 
		fetchBidsReceived,
		acceptBid,
		declineBid,
		cancelBid,
		resetErrors,
		initAuth
	} = usePropertyStore()
	
	// Initialize auth first, then fetch data
	useEffect(() => {
		const initializeAndFetch = async () => {
			try {
				// First make sure auth is initialized
				await initAuth()
				
				// Then fetch all data in parallel
				await Promise.all([
					fetchUserProperties(),
					fetchBidsMade(),
					fetchBidsReceived()
				])
			} catch (error) {
				console.error("Error initializing dashboard", error)
			}
		}
		
		initializeAndFetch()
		
		// Set up polling to refresh the data every 60 seconds
		const intervalId = setInterval(() => {
			Promise.all([
				fetchUserProperties(),
				fetchBidsMade(),
				fetchBidsReceived()
			]).catch(error => {
				console.error("Error in refresh polling", error)
			})
		}, 60000)
		
		// Cleanup interval on unmount
		return () => clearInterval(intervalId)
	}, [fetchUserProperties, fetchBidsMade, fetchBidsReceived, initAuth])
	
	// Show toast messages for meaningful errors only (not auth errors during initialization)
	useEffect(() => {
		// Check each error and show toast if needed
		if (error.properties && !error.properties.includes('Authentication required')) {
			toast({
				title: 'Properties Error',
				description: error.properties,
				status: 'error',
				duration: 5000,
				isClosable: true,
			})
		}
		
		if (error.bidsMade && !error.bidsMade.includes('Authentication required')) {
			toast({
				title: 'Bids Error',
				description: error.bidsMade,
				status: 'error',
				duration: 5000,
				isClosable: true,
			})
		}
		
		if (error.bidsReceived && !error.bidsReceived.includes('Authentication required')) {
			toast({
				title: 'Offers Error',
				description: error.bidsReceived,
				status: 'error',
				duration: 5000,
				isClosable: true,
			})
		}
		
		// Clear errors after showing toasts
		if (error.properties || error.bidsMade || error.bidsReceived) {
			resetErrors()
		}
	}, [error, toast, resetErrors])
	
	// Stats calculations - ensure we're working with arrays
	const userPropertiesArray = Array.isArray(userProperties) ? userProperties : []
	const bidsMadeArray = Array.isArray(bidsMade) ? bidsMade : []
	const bidsReceivedArray = Array.isArray(bidsReceived) ? bidsReceived : []
	
	const activeProperties = userPropertiesArray.length
	const activeBids = bidsMadeArray.filter(bid => bid.status === 'active').length
	const pendingOffers = bidsReceivedArray.filter(bid => bid.status === 'active').length
	
	// Handle bid actions
	const handleAcceptBid = async (bidId: string) => {
		const bid = bidsReceivedArray.find(b => b.id === bidId);
		if (!bid) {
			toast({
				title: 'Error',
				description: 'Bid not found',
				status: 'error',
				duration: 3000,
				isClosable: true,
			});
			return;
		}

		const success = await acceptBid(bid.propertyId, bidId);
		if (success) {
			toast({
				title: 'Bid Accepted',
				description: 'The bid has been accepted successfully',
				status: 'success',
				duration: 3000,
				isClosable: true,
			});
		}
	}
	
	const handleDeclineBid = async (bidId: string) => {
		const bid = bidsReceivedArray.find(b => b.id === bidId);
		if (!bid) {
			toast({
				title: 'Error',
				description: 'Bid not found',
				status: 'error',
				duration: 3000,
				isClosable: true,
			});
			return;
		}

		const success = await declineBid(bid.propertyId, bidId);
		if (success) {
			toast({
				title: 'Bid Declined',
				description: 'The bid has been declined successfully',
				status: 'success',
				duration: 3000,
				isClosable: true,
			});
		}
	}
	
	const handleCancelBid = async (bidId: string) => {
		const bid = bidsMadeArray.find(b => b.id === bidId);
		if (!bid) {
			toast({
				title: 'Error',
				description: 'Bid not found',
				status: 'error',
				duration: 3000,
				isClosable: true,
			});
			return;
		}

		const success = await cancelBid(bid.propertyId);
		if (success) {
			toast({
				title: 'Bid Cancelled',
				description: 'Your bid has been cancelled successfully',
				status: 'success',
				duration: 3000,
				isClosable: true,
			});
		}
	}
	
	// Check if all data is loading for the first time
	const isInitialLoading = loading.properties && loading.bidsMade && loading.bidsReceived
	
	return (
		<Box p={8} maxWidth="1200px" mx="auto" height="auto" minHeight="100%">
			<Heading mb={6}>Dashboard</Heading>
			
			{isInitialLoading ? (
				<Flex direction="column" align="center" justify="center" py={10}>
					<Spinner size="xl" mb={4} />
					<Text>Loading your dashboard...</Text>
				</Flex>
			) : (
				<>
					<SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mb={8}>
						<Card bg={cardBg}>
							<CardBody>
								<Stat>
									<StatLabel>My Properties</StatLabel>
									<StatNumber>{activeProperties}</StatNumber>
									<StatHelpText>
										<StatArrow type="increase" />
										Properties Owned
									</StatHelpText>
								</Stat>
							</CardBody>
						</Card>
						
						<Card bg={cardBg}>
							<CardBody>
								<Stat>
									<StatLabel>My Active Bids</StatLabel>
									<StatNumber>{activeBids}</StatNumber>
									<StatHelpText>
										<StatArrow type="increase" />
										Offers Made
									</StatHelpText>
								</Stat>
							</CardBody>
						</Card>
						
						<Card bg={cardBg}>
							<CardBody>
								<Stat>
									<StatLabel>Pending Offers</StatLabel>
									<StatNumber>{pendingOffers}</StatNumber>
									<StatHelpText>
										{pendingOffers > 0 ? (
											<StatArrow type="increase" />
										) : (
											<StatArrow type="decrease" />
										)}
										Offers Received
									</StatHelpText>
								</Stat>
							</CardBody>
						</Card>
					</SimpleGrid>
					
					<Tabs variant="enclosed" colorScheme="blue" isLazy>
						<TabList>
							<Tab><Box as={FaHome} mr={2} /> My Properties</Tab>
							<Tab><Box as={FaHandshake} mr={2} /> My Bids</Tab>
							<Tab><Box as={FaEnvelope} mr={2} /> Offers Received</Tab>
						</TabList>
						
						<TabPanels>
							{/* Properties Tab */}
							<TabPanel>
								{loading.properties ? (
									<Flex justify="center" p={8}>
										<Spinner size="xl" />
									</Flex>
								) : userPropertiesArray.length === 0 ? (
									<Alert status="info" borderRadius="md">
										<AlertIcon />
										You don&apos;t own any properties yet.
									</Alert>
								) : (
									<SimpleGrid 
										columns={{ base: 1, md: 2, lg: 3 }} 
										spacing={6}
										pb={4}
									>
										{userPropertiesArray.map(property => (
											<PropertyCard 
												key={property.id} 
												property={property} 
												onViewBids={() => {}} 
											/>
										))}
									</SimpleGrid>
								)}
							</TabPanel>
							
							{/* My Bids Tab */}
							<TabPanel>
								{loading.bidsMade ? (
									<Flex justify="center" p={8}>
										<Spinner size="xl" />
									</Flex>
								) : bidsMadeArray.length === 0 ? (
									<Alert status="info" borderRadius="md">
										<AlertIcon />
										You haven&apos;t made any bids yet.
									</Alert>
								) : (
									<Grid 
										templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
										gap={4}
									>
										{bidsMadeArray.map(bid => (
											<GridItem key={bid.id}>
												<BidCard 
													bid={bid}
													onCancel={handleCancelBid}
												/>
											</GridItem>
										))}
									</Grid>
								)}
							</TabPanel>
							
							{/* Offers Received Tab */}
							<TabPanel>
								{loading.bidsReceived ? (
									<Flex justify="center" p={8}>
										<Spinner size="xl" />
									</Flex>
								) : bidsReceivedArray.length === 0 ? (
									<Alert status="info" borderRadius="md">
										<AlertIcon />
										You haven&apos;t received any offers yet.
									</Alert>
								) : (
									<Grid 
										templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
										gap={4}
									>
										{bidsReceivedArray.map(bid => (
											<GridItem key={bid.id}>
												<BidCard 
													bid={bid}
													isUserReceived={true}
													onAccept={handleAcceptBid}
													onDecline={handleDeclineBid}
												/>
											</GridItem>
										))}
									</Grid>
								)}
							</TabPanel>
						</TabPanels>
					</Tabs>
				</>
			)}
		</Box>
	)
} 