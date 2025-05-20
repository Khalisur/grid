/* eslint-disable prettier/prettier */
import {
	Box,
	Heading,
	Table,
	Thead,
	Tbody,
	Tr,
	Th,
	Td,
	Text,
	Badge,
	Avatar,
	Flex,
	useColorModeValue,
	Spinner,
	Center,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useUserStore } from '../stores/userStore'

export const Leaderboard = () => {
	const tableBg = useColorModeValue('white', 'gray.700')
	const { users, fetchUsers } = useUserStore()
	const [loading, setLoading] = useState(true)
	const [leaderboardData, setLeaderboardData] = useState<Array<{
		id: string;
		name: string;
		totalProperties: number;
		totalCells: number;
		rank: number;
		badge: string;
	}>>([])

	useEffect(() => {
		const loadUsers = async () => {
			try {
				setLoading(true)
				await fetchUsers()
			} catch (error) {
				console.error('Error loading users:', error)
			} finally {
				setLoading(false)
			}
		}
		loadUsers()
	}, [fetchUsers])

	useEffect(() => {
		if (Object.keys(users).length > 0) {
			// Transform user data for the leaderboard and ensure unique entries
			const userData = Object.values(users)
				.filter((user, index, self) => 
					// Filter out duplicates based on uid
					index === self.findIndex((u) => u.uid === user.uid)
				)
				.map(user => {
					// Calculate total cells for each user
					const totalCells = user.properties.reduce((sum, property) => sum + property.cells.length, 0)
					
					return {
						id: user.uid,
						name: user.name,
						totalProperties: user.properties.length,
						totalCells,
						rank: 0, // Will be calculated after sorting
						badge: getBadgeType(totalCells)
					}
				})
			
			// Sort by total cells in descending order
			userData.sort((a, b) => b.totalCells - a.totalCells)
			
			// Assign ranks
			userData.forEach((user, index) => {
				user.rank = index + 1
			})
			
			setLeaderboardData(userData)
		}
	}, [users])

	const getBadgeType = (totalCells: number) => {
		if (totalCells >= 50) return 'Platinum'
		if (totalCells >= 30) return 'Gold'
		if (totalCells >= 10) return 'Silver'
		return 'Bronze'
	}

	const badgeColorScheme = (badge: string) => {
		switch (badge) {
			case 'Platinum':
				return 'purple'
			case 'Gold':
				return 'yellow'
			case 'Silver':
				return 'gray'
			case 'Bronze':
				return 'orange'
			default:
				return 'green'
		}
	}

	if (loading) {
		return (
			<Center h="300px">
				<Spinner size="xl" />
			</Center>
		)
	}

	return (
		<Box p={8} maxWidth="1200px" mx="auto">
			<Heading mb={6}>User Rankings</Heading>
			
			<Box bg={tableBg} borderRadius="md" overflow="hidden" boxShadow="sm">
				<Table variant="simple">
					<Thead>
						<Tr>
							<Th width="80px">Rank</Th>
							<Th>Player</Th>
							<Th>Badge</Th>
							<Th isNumeric>Total Properties</Th>
							<Th isNumeric>Total Cells</Th>
						</Tr>
					</Thead>
					<Tbody>
						{leaderboardData.map((player) => (
							<Tr key={player.id}>
								<Td fontWeight="bold">{player.rank}</Td>
								<Td>
									<Flex align="center">
										<Avatar size="sm" name={player.name} mr={3} />
										<Text fontWeight="medium">{player.name}</Text>
									</Flex>
								</Td>
								<Td>
									<Badge colorScheme={badgeColorScheme(player.badge)}>
										{player.badge}
									</Badge>
								</Td>
								<Td isNumeric fontWeight="bold">
									{player.totalProperties}
								</Td>
								<Td isNumeric fontWeight="bold">
									{player.totalCells}
								</Td>
							</Tr>
						))}
					</Tbody>
				</Table>
			</Box>
			
			<Text mt={4} fontSize="sm" color="gray.500">
				Rankings based on total cells owned. Collect more cells to climb the leaderboard!
			</Text>
		</Box>
	)
} 