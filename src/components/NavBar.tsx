/* eslint-disable prettier/prettier */
import {
	FunctionComponent,
	ReactElement,
	useState,
	useRef,
	useEffect,
} from 'react'
import { Link as ReactRouterLink } from 'react-router-dom'
import {
	Box,
	VStack,
	Text,
	Link,
	useColorMode,
	Flex,
	Divider,
	Icon,
	Tooltip,
	Button,
	ButtonGroup,
	Heading,
	Switch,
	FormControl,
	FormLabel,
	Input,
	Avatar,
	useDisclosure,
	useColorModeValue,
} from '@chakra-ui/react'
import {
	FaHome,
	FaCog,
	FaGlobe,
	FaMoon,
	FaSun,
	FaMountain,
	FaSatellite,
	FaTable,
	FaChartBar,
	FaTrophy,
} from 'react-icons/fa'
// We need to use Chakra UI's <Link> component for consistency with the rest of the UI.
// But we need to use React Router's <Link> component for the routing to work properly.
// So we import Chakra UI's <Link> component, and then import React Router's <Link> component as ReactRouterLink.
// We can then pass the "as" prop to Chakra UI's <Link> component. See: https://chakra-ui.com/docs/components/link/usage#usage-with-routing-library

import { ColorModeSwitcher } from './ColorModeSwitcher'
import { useMapStore, MapStyle } from '../stores/mapStore'
import { useAuthStore } from '../stores/authStore'
import { AuthModal } from './AuthModal'
import { auth } from '../firebase/config'
import { signOut } from 'firebase/auth'

// Define collapsed and expanded widths
const COLLAPSED_WIDTH = '60px'
const EXPANDED_WIDTH = '240px'

// Available grid sizes in meters

export const NavBar: FunctionComponent = (): ReactElement => {
	const { colorMode } = useColorMode()
	const [isExpanded, setIsExpanded] = useState(false)
	const navRef = useRef<HTMLDivElement>(null)
	const { isOpen, onOpen, onClose } = useDisclosure()
	const { user, loading } = useAuthStore()
	const bgColor = useColorModeValue('white', 'gray.800')
	const borderColor = useColorModeValue('gray.200', 'gray.700')

	// Get current settings and setters from store
	const {
		currentStyle,
		setMapStyle,
		isGridEnabled,
		setGridEnabled,

		gridColor,
		setGridColor,
		selectionColor,
		setSelectionColor,
	} = useMapStore()

	// Handle mouse enter/leave events
	const handleMouseEnter = () => setIsExpanded(true)
	const handleMouseLeave = () => setIsExpanded(false)

	// Add event listeners
	useEffect(() => {
		const nav = navRef.current
		if (nav) {
			nav.addEventListener('mouseenter', handleMouseEnter)
			nav.addEventListener('mouseleave', handleMouseLeave)

			return () => {
				nav.removeEventListener('mouseenter', handleMouseEnter)
				nav.removeEventListener('mouseleave', handleMouseLeave)
			}
		}
	}, [])

	// Map style configuration
	const mapStyles: Array<{
		id: MapStyle
		name: string
		icon: React.ElementType
		tooltip: string
	}> = [
		{
			id: 'streets-v11',
			name: 'Streets',
			icon: FaGlobe,
			tooltip: 'Street map style',
		},
		{
			id: 'light-v10',
			name: 'Light',
			icon: FaSun,
			tooltip: 'Light map style',
		},
		{
			id: 'dark-v10',
			name: 'Dark',
			icon: FaMoon,
			tooltip: 'Dark map style',
		},
		{
			id: 'satellite-v9',
			name: 'Satellite',
			icon: FaSatellite,
			tooltip: 'Satellite imagery',
		},
		{
			id: 'outdoors-v11',
			name: 'Outdoors',
			icon: FaMountain,
			tooltip: 'Outdoor map style',
		},
	]

	const handleLogout = async () => {
		try {
			await signOut(auth)
		} catch (error) {
			console.error('Error signing out:', error)
		}
	}

	return (
		<Box
			ref={navRef}
			as="nav"
			width={isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH}
			height="100vh"
			borderRight={1}
			borderStyle="solid"
			borderColor={borderColor}
			bg={bgColor}
			shadow="md"
			position="absolute"
			top={0}
			left={0}
			zIndex={1000}
			transition="width 0.3s ease"
			overflow="hidden"
			p={isExpanded ? 4 : 2}
			display="flex"
			flexDirection="column"
		>
			<VStack spacing={6} align="start" height="100%" width="100%">
				{/* Logo/Title Area */}
				<Flex
					alignItems="center"
					justifyContent={isExpanded ? 'flex-start' : 'center'}
					width="100%"
				>
					<Text fontSize="xs" color="gray.500" mb={2}>
						Version 0.0.1
					</Text>
				</Flex>

				<Divider />

				{/* Navigation Links */}
				<VStack spacing={4} align="stretch" width="100%">
					<Link
						as={ReactRouterLink}
						to="/"
						display="flex"
						alignItems="center"
						justifyContent={isExpanded ? 'flex-start' : 'center'}
						p={2}
						borderRadius="md"
						_hover={{
							bg: colorMode === 'light' ? 'gray.100' : 'gray.700',
						}}
					>
						<Icon
							as={FaHome}
							fontSize="20px"
							mr={isExpanded ? 3 : 0}
						/>
						{isExpanded && <Text>Home</Text>}
					</Link>
					
					<Link
						as={ReactRouterLink}
						to="/dashboard"
						display="flex"
						alignItems="center"
						justifyContent={isExpanded ? 'flex-start' : 'center'}
						p={2}
						borderRadius="md"
						_hover={{
							bg: colorMode === 'light' ? 'gray.100' : 'gray.700',
						}}
					>
						<Icon
							as={FaChartBar}
							fontSize="20px"
							mr={isExpanded ? 3 : 0}
						/>
						{isExpanded && <Text>Dashboard</Text>}
					</Link>
					
					<Link
						as={ReactRouterLink}
						to="/leaderboard"
						display="flex"
						alignItems="center"
						justifyContent={isExpanded ? 'flex-start' : 'center'}
						p={2}
						borderRadius="md"
						_hover={{
							bg: colorMode === 'light' ? 'gray.100' : 'gray.700',
						}}
					>
						<Icon
							as={FaTrophy}
							fontSize="20px"
							mr={isExpanded ? 3 : 0}
						/>
						{isExpanded && <Text>Leaderboard</Text>}
					</Link>
				</VStack>

				{/* Spacer to push content to bottom */}
				<Box flexGrow={1} />

				{/* Authentication Section */}
				{isExpanded ? (
					<Box width="100%" mb={4}>
						<Heading size="xs" mb={2}>
							Account
						</Heading>
						{loading ? (
							<Text fontSize="sm">Loading...</Text>
						) : user ? (
							<VStack spacing={2} align="stretch">
								<Flex align="center">
									<Avatar
										name={user.email || 'User'}
										size="sm"
										mr={2}
									/>
									<Text fontSize="sm" isTruncated>
										{user.email}
									</Text>
								</Flex>
								<Text
									fontSize="md"
									fontWeight="medium"
									color="blue.500"
								>
									<Button
										colorScheme="red"
										size="sm"
										width="full"
										onClick={handleLogout}
									>
										Logout
									</Button>
								</Text>
							</VStack>
						) : (
							<Button
								colorScheme="blue"
								size="sm"
								width="full"
								onClick={onOpen}
							>
								Login / Sign Up
							</Button>
						)}
					</Box>
				) : (
					<Tooltip
						label={
							loading
								? 'Loading...'
								: user
									? 'Logout'
									: 'Login / Sign Up'
						}
						placement="right"
					>
						<Button
							size="sm"
							p={0}
							width="100%"
							height="30px"
							mb={2}
							display="flex"
							justifyContent="center"
							onClick={user ? handleLogout : onOpen}
							colorScheme={user ? 'red' : 'blue'}
						>
							{loading ? (
								<Text>...</Text>
							) : user ? (
								<Avatar name={user.email || 'User'} size="xs" />
							) : (
								<Icon as={FaCog} fontSize="16px" />
							)}
						</Button>
					</Tooltip>
				)}

				{/* Grid Controls */}
				{isExpanded ? (
					<Box width="100%" mb={4}>
						<Heading size="xs" mb={2}>
							Grid Controls
						</Heading>
						<FormControl display="flex" alignItems="center" mb={3}>
							<FormLabel
								htmlFor="grid-toggle"
								mb="0"
								fontSize="sm"
							>
								Show Grid
							</FormLabel>
							<Switch
								id="grid-toggle"
								isChecked={isGridEnabled}
								onChange={(e) =>
									setGridEnabled(e.target.checked)
								}
								colorScheme="blue"
							/>
						</FormControl>

						{isGridEnabled && (
							<>
								<Box mb={3}>
									<Text fontSize="xs" mb={1}>
										Grid Color
									</Text>
									<Input
										type="color"
										value={gridColor}
										onChange={(e) =>
											setGridColor(e.target.value)
										}
										size="sm"
										height="24px"
									/>
								</Box>
								<Box mb={3}>
									<Text fontSize="xs" mb={1}>
										Selection Color
									</Text>
									<Input
										type="color"
										value={selectionColor}
										onChange={(e) =>
											setSelectionColor(e.target.value)
										}
										size="sm"
										height="24px"
									/>
								</Box>
							</>
						)}
					</Box>
				) : (
					<Tooltip label="Toggle Grid" placement="right">
						<Button
							size="sm"
							p={0}
							width="100%"
							height="30px"
							mb={2}
							display="flex"
							justifyContent="center"
							variant={isGridEnabled ? 'solid' : 'ghost'}
							colorScheme={isGridEnabled ? 'blue' : 'gray'}
							onClick={() => setGridEnabled(!isGridEnabled)}
						>
							<Icon as={FaTable} fontSize="16px" />
						</Button>
					</Tooltip>
				)}

				{/* Map Style Selector */}
				{isExpanded ? (
					<Box width="100%" mb={4}>
						<Heading size="xs" mb={2}>
							Map Style
						</Heading>
						<ButtonGroup
							variant="outline"
							size="sm"
							isAttached
							width="100%"
						>
							{mapStyles
								.map((style) => (
									<Button
										key={style.id}
										leftIcon={<Icon as={style.icon} />}
										onClick={() => setMapStyle(style.id)}
										flex="1"
										colorScheme={
											currentStyle === style.id
												? 'blue'
												: 'gray'
										}
										size="xs"
										title={style.tooltip}
									>
										{style.name}
									</Button>
								))
								.slice(0, 2)}
						</ButtonGroup>
						<ButtonGroup
							variant="outline"
							size="sm"
							isAttached
							width="100%"
							mt={2}
						>
							{mapStyles
								.map((style) => (
									<Button
										key={style.id}
										leftIcon={<Icon as={style.icon} />}
										onClick={() => setMapStyle(style.id)}
										flex="1"
										colorScheme={
											currentStyle === style.id
												? 'blue'
												: 'gray'
										}
										size="xs"
										title={style.tooltip}
									>
										{style.name}
									</Button>
								))
								.slice(2, 4)}
						</ButtonGroup>
						<ButtonGroup
							variant="outline"
							size="sm"
							isAttached
							width="100%"
							mt={2}
						>
							{mapStyles
								.map((style) => (
									<Button
										key={style.id}
										leftIcon={<Icon as={style.icon} />}
										onClick={() => setMapStyle(style.id)}
										flex="1"
										colorScheme={
											currentStyle === style.id
												? 'blue'
												: 'gray'
										}
										size="xs"
										title={style.tooltip}
									>
										{style.name}
									</Button>
								))
								.slice(4, 6)}
						</ButtonGroup>
					</Box>
				) : (
					<VStack spacing={2} width="100%" mb={3}>
						{mapStyles.map((style) => (
							<Tooltip
								label={style.name}
								placement="right"
								key={style.id}
							>
								<Button
									size="sm"
									p={0}
									width="100%"
									height="30px"
									display="flex"
									justifyContent="center"
									variant={
										currentStyle === style.id
											? 'solid'
											: 'ghost'
									}
									colorScheme={
										currentStyle === style.id
											? 'blue'
											: 'gray'
									}
									onClick={() => setMapStyle(style.id)}
								>
									<Icon as={style.icon} fontSize="16px" />
								</Button>
							</Tooltip>
						))}
					</VStack>
				)}

				{/* Theme Switcher */}
				<Flex width="100%" justifyContent="center" mb={2}>
					<ColorModeSwitcher size="sm" />
				</Flex>
			</VStack>

			<AuthModal isOpen={isOpen} onClose={onClose} />
		</Box>
	)
}
