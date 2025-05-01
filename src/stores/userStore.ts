import { create } from 'zustand'

interface GridProperty {
	propertyId: number
	cells: string[]
}

interface UserData {
	uid: string
	email: string
	name: string
	tokens: number
	properties: GridProperty[]
}

interface UserStore {
	users: Record<string, UserData>
	addUser: (user: Omit<UserData, 'tokens' | 'properties'>) => Promise<void>
	updateUserProperty: (
		uid: string,
		propertyId: number,
		cells: string[],
	) => Promise<void>
	deductToken: (uid: string) => Promise<void>
	addToken: (uid: string, amount: number) => Promise<void>
	fetchUsers: () => Promise<void>
}

const API_URL = 'http://localhost:3001'

export const useUserStore = create<UserStore>()((set, get) => ({
	users: {},
	fetchUsers: async () => {
		try {
			const response = await fetch(`${API_URL}/users`)
			console.log(response)
			const usersArray = await response.json()
			// Convert array to object with uid as key
			const usersObject = usersArray.reduce(
				(acc: Record<string, UserData>, user: UserData) => {
					acc[user.uid] = user
					return acc
				},
				{},
			)
			set({ users: usersObject })
		} catch (error) {
			console.error('Error fetching users:', error)
		}
	},
	addUser: async (user) => {
		try {
			console.log('Attempting to add user:', user)
			console.log('API URL:', `${API_URL}/users`)

			const response = await fetch(`${API_URL}/users`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					uid: user.uid,
					email: user.email,
					name: user.name,
					tokens: 10,
					properties: [],
				}),
			})

			console.log('Response status:', response.status)
			console.log('Response status text:', response.statusText)

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(
					`HTTP error! status: ${response.status}, body: ${errorText}`,
				)
			}

			const newUser = await response.json()
			console.log('New user created:', newUser)

			set((state) => ({
				users: {
					...state.users,
					[user.uid]: newUser,
				},
			}))
		} catch (error) {
			console.error('Detailed error in addUser:', error)
			throw error
		}
	},
	updateUserProperty: async (uid, propertyId, cells) => {
		try {
			const user = get().users[uid]
			if (!user) return

			const existingPropertyIndex = user.properties.findIndex(
				(p) => p.propertyId === propertyId,
			)

			const updatedProperties = [...user.properties]
			if (existingPropertyIndex >= 0) {
				updatedProperties[existingPropertyIndex] = {
					propertyId,
					cells,
				}
			} else {
				updatedProperties.push({ propertyId, cells })
			}

			const response = await fetch(`${API_URL}/users/${uid}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					properties: updatedProperties,
				}),
			})
			const updatedUser = await response.json()
			set((state) => ({
				users: {
					...state.users,
					[uid]: updatedUser,
				},
			}))
		} catch (error) {
			console.error('Error updating user property:', error)
		}
	},
	deductToken: async (uid) => {
		try {
			const user = get().users[uid]
			if (!user || user.tokens <= 0) return

			const response = await fetch(`${API_URL}/users/${uid}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					tokens: user.tokens - 1,
				}),
			})
			const updatedUser = await response.json()
			set((state) => ({
				users: {
					...state.users,
					[uid]: updatedUser,
				},
			}))
		} catch (error) {
			console.error('Error deducting token:', error)
		}
	},
	addToken: async (uid, amount) => {
		try {
			const user = get().users[uid]
			if (!user) return

			const response = await fetch(`${API_URL}/users/${uid}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					tokens: user.tokens + amount,
				}),
			})
			const updatedUser = await response.json()
			set((state) => ({
				users: {
					...state.users,
					[uid]: updatedUser,
				},
			}))
		} catch (error) {
			console.error('Error adding tokens:', error)
		}
	},
}))
