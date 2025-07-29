/* eslint-disable prettier/prettier */
import { useAuthStore } from '../stores/authStore'
import { useUserStore } from '../stores/userStore'
import { useEffect, useState } from 'react'

export const useAdmin = () => {
	const { user, loading: authLoading } = useAuthStore()
	const { users } = useUserStore()
	const [isUserDataLoaded, setIsUserDataLoaded] = useState(false)

	const currentUser = user ? users[user.uid] : null

	// Track when user data has been loaded
	useEffect(() => {
		if (user && users[user.uid]) {
			setIsUserDataLoaded(true)
		} else if (!user) {
			setIsUserDataLoaded(false)
		}
	}, [user, users])

	// Only return false for isAdmin if we're sure the user data has been loaded
	// or if there's no authenticated user
	const isAdmin =
		!authLoading && user && isUserDataLoaded
			? currentUser?.isAdmin === true
			: false

	// Determine if we're still loading user data
	const isLoading = authLoading || (user && !isUserDataLoaded)

	return {
		isAdmin,
		currentUser,
		isLoading,
		isUserDataLoaded,
	}
}