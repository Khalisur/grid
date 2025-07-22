import { FunctionComponent, ReactElement } from 'react'
import {
	Box,
	Heading,
	VStack,
	FormControl,
	FormLabel,
	Switch,
	Select,
	Button,
} from '@chakra-ui/react'

export const Settings: FunctionComponent = (): ReactElement => {
	return (
		<Box p={8} maxWidth="800px" mx="auto">
			<Heading mb={6}>Map Settings</Heading>

			<VStack spacing={6} align="stretch">
				<Box bg="white" p={5} borderRadius="md" boxShadow="md">
					<Heading size="md" mb={4}>
						Map Style
					</Heading>
					<FormControl mb={4}>
						<FormLabel>Map Type</FormLabel>
						<Select defaultValue="streets-v11">
							<option value="streets-v11">Streets</option>
							<option value="light-v10">Light</option>
							<option value="dark-v10">Dark</option>
							<option value="satellite-v9">Satellite</option>
							<option value="satellite-streets-v11">
								Satellite Streets
							</option>
							<option value="outdoors-v11">Outdoors</option>
						</Select>
					</FormControl>

					<FormControl display="flex" alignItems="center" mb={4}>
						<FormLabel mb="0">Show Building 3D</FormLabel>
						<Switch colorScheme="blue" />
					</FormControl>

					<FormControl display="flex" alignItems="center">
						<FormLabel mb="0">Traffic Data</FormLabel>
						<Switch colorScheme="blue" />
					</FormControl>
				</Box>

				<Box bg="white" p={5} borderRadius="md" boxShadow="md">
					<Heading size="md" mb={4}>
						Display Options
					</Heading>

					<FormControl display="flex" alignItems="center" mb={4}>
						<FormLabel mb="0">Show Points of Interest</FormLabel>
						<Switch colorScheme="blue" defaultChecked />
					</FormControl>

					<FormControl display="flex" alignItems="center" mb={4}>
						<FormLabel mb="0">Show Labels</FormLabel>
						<Switch colorScheme="blue" defaultChecked />
					</FormControl>

					<FormControl display="flex" alignItems="center">
						<FormLabel mb="0">Terrain Features</FormLabel>
						<Switch colorScheme="blue" />
					</FormControl>
				</Box>

				<Box textAlign="right">
					<Button colorScheme="blue" mr={3}>
						Apply Settings
					</Button>
					<Button variant="outline">Reset Defaults</Button>
				</Box>
			</VStack>
		</Box>
	)
}
