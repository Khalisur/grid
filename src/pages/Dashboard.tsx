/* eslint-disable prettier/prettier */
import {
	Box,
	Heading,
	Text,
	SimpleGrid,
	Stat,
	StatLabel,
	StatNumber,
	StatHelpText,
	StatArrow,
	Card,
	CardBody,
	useColorModeValue,
} from '@chakra-ui/react'

export const Dashboard = () => {
	const cardBg = useColorModeValue('white', 'gray.700')
	
	return (
		<Box p={8} maxWidth="1200px" mx="auto">
			<Heading mb={6}>Dashboard</Heading>
			
			<SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mb={8}>
				<Card bg={cardBg}>
					<CardBody>
						<Stat>
							<StatLabel>Total Users</StatLabel>
							<StatNumber>1,024</StatNumber>
							<StatHelpText>
								<StatArrow type="increase" />
								23.36%
							</StatHelpText>
						</Stat>
					</CardBody>
				</Card>
				
				<Card bg={cardBg}>
					<CardBody>
						<Stat>
							<StatLabel>Active Projects</StatLabel>
							<StatNumber>45</StatNumber>
							<StatHelpText>
								<StatArrow type="increase" />
								12.5%
							</StatHelpText>
						</Stat>
					</CardBody>
				</Card>
				
				<Card bg={cardBg}>
					<CardBody>
						<Stat>
							<StatLabel>Completion Rate</StatLabel>
							<StatNumber>87%</StatNumber>
							<StatHelpText>
								<StatArrow type="decrease" />
								3.1%
							</StatHelpText>
						</Stat>
					</CardBody>
				</Card>
			</SimpleGrid>
			
			<Text>Welcome to your dashboard. Here you can monitor your activity and track your progress.</Text>
		</Box>
	)
} 