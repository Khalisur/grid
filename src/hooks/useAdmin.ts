import { useAuthStore } from '../stores/authStore'
import { useUserStore } from '../stores/userStore'

export const useAdmin = () => {
	const { user } = useAuthStore()
	const { users } = useUserStore()

	const currentUser = user ? users[user.uid] : null
	const isAdmin = currentUser?.isAdmin === true

	return {
		isAdmin,
		currentUser,
	}
}