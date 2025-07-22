/* eslint-disable prettier/prettier */
import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Box, Spinner, Center, Text, Alert, AlertIcon } from '@chakra-ui/react'
import { useAuthStore } from '../stores/authStore'
import { useUserStore } from '../stores/userStore'

interface ProtectedRouteProps {
	children: React.ReactNode
	requireAdmin?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
	children,
	requireAdmin = false,
}) => {
	const { user, loading: authLoading } = useAuthStore()
	const { users, fetchUsers } = useUserStore()
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const loadUserData = async () => {
			if (authLoading) return

			if (!user) {
				setIsLoading(false)
				return
			}

			// Check if user data is already loaded
			if (users[user.uid]) {
				setIsLoading(false)
				return
			}

			// Fetch user data if not loaded
			try {
				await fetchUsers()
			} catch (error) {
				console.error('Error loading user data:', error)
			} finally {
				setIsLoading(false)
			}
		}

		loadUserData()
	}, [user, authLoading, users, fetchUsers])

	// Show loading spinner while checking auth and user data
	if (authLoading || isLoading) {
		return (
			<Center height="100vh">
				<Spinner size="xl" />
			</Center>
		)
	}

	// Redirect to home if not authenticated
	if (!user) {
		return <Navigate to="/" replace />
	}

	// Check admin requirement
	if (requireAdmin) {
		const currentUser = users[user.uid]

		if (!currentUser) {
			return (
				<Center height="100vh">
					<Alert status="error" maxW="md">
						<AlertIcon />
						Unable to load user data. Please try again.
					</Alert>
				</Center>
			)
		}

		if (!currentUser.isAdmin) {
			return (
				<Center height="100vh">
					<Alert status="warning" maxW="md">
						<AlertIcon />
						<Box>
							<Text fontWeight="bold">Access Denied</Text>
							<Text>
								You need admin privileges to access this page.
							</Text>
						</Box>
					</Alert>
				</Center>
			)
		}
	}

	return <>{children}</>
} 