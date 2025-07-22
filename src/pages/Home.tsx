import { FunctionComponent, ReactElement } from 'react'
import { Box } from '@chakra-ui/react'
import { MapComponent } from '../components/MapComponent'

export const Home: FunctionComponent = (): ReactElement => {
	return (
		<Box position="relative" width="100%" height="100%">
			{/* Map as the base layer */}
			<MapComponent
				initialOptions={{
					center: [-74.006, 40.7128], // New York City
					zoom: 12, // Start with a detailed city view
				}}
			>
				{/* You can add more absolute positioned components here */}
			</MapComponent>
		</Box>
	)
}
