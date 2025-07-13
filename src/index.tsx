import { ColorModeScript } from '@chakra-ui/react'
import * as React from 'react'
import { Root, createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Router } from '@remix-run/router'
import { ChakraProvider } from '@chakra-ui/react'
import theme from './theme'

import { Layout } from './Layout'
import { RouterError } from './pages/RouterError'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { NotFound } from './pages/NotFound'
import { Dashboard } from './pages/Dashboard'
import { Leaderboard } from './pages/Leaderboard'
import { AdminPortal } from './pages/AdminPortal'
import { ProtectedRoute } from './components/ProtectedRoute'

const router: Router = createBrowserRouter([
	{
		path: '/',
		element: <Layout />,
		errorElement: <RouterError />,
		children: [
			{
				index: true,
				element: <Home />,
			},
			{
				path: 'dashboard',
				element: <Dashboard />,
			},
			{
				path: 'leaderboard',
				element: <Leaderboard />,
			},
			{
				path: 'settings',
				element: <Settings />,
			},
			{
				path: 'admin',
				element: (
					<ProtectedRoute requireAdmin={true}>
						<AdminPortal />
					</ProtectedRoute>
				),
			},
			{
				path: '*',
				element: <NotFound />,
			},
		],
	},
])

const container = document.getElementById('root') as HTMLElement
if (!container) throw new Error('Failed to find the root element')
const root: Root = createRoot(container)

root.render(
	<React.StrictMode>
		<ChakraProvider theme={theme}>
			<ColorModeScript />
			<RouterProvider router={router} />
		</ChakraProvider>
	</React.StrictMode>,
)
