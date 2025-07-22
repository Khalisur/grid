import { ChakraProvider } from '@chakra-ui/react'
import { MapComponent } from './components/MapComponent'
import { Layout } from './Layout'

function App() {
	return (
		<ChakraProvider>
			<Layout>
				<MapComponent />
			</Layout>
		</ChakraProvider>
	)
}

export default App
