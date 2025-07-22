import { FunctionComponent, ReactElement, ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import { Global, css } from '@emotion/react'

import { NavBar } from './components/NavBar'

interface LayoutProps {
	children?: ReactNode
}

export const Layout: FunctionComponent<LayoutProps> = ({
	children,
}): ReactElement => {
	return (
		<>
			<Global
				styles={css`
					html,
					body,
					#root {
						height: 100%;
						margin: 0;
						padding: 0;
						overflow: auto;
					}
				`}
			/>

			{/* Main content area - full width and height */}
			<Box
				height="100vh"
				width="100vw"
				position="relative"
				overflow="auto"
			>
				{/* An <Outlet> renders whatever child route is currently active */}
				<Box width="100%" height="100%" overflow="auto">
					{children || <Outlet />}
				</Box>

				{/* NavBar as sidebar with absolute positioning */}
				<NavBar />
			</Box>
		</>
	)
}
