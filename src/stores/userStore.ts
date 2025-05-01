/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { create } from 'zustand'

// New property interface
export interface Property {
	id: string  // Changed from propertyId: number
	owner: string
	cells: string[]
	price: number // Purchase price
	name?: string 
	description?: string
	address?: string
	forSale?: boolean
	salePrice?: number
}

interface UserData {
	uid: string
	email: string
	name: string
	tokens: number
	properties: Property[] // Updated from GridProperty[]
}

interface UserStore {
	users: Record<string, UserData>
	addUser: (user: Omit<UserData, 'tokens' | 'properties'>) => Promise<void>
	updateUserProperty: (
		uid: string,
		property: Property,  // Updated to take a complete Property object
	) => Promise<void>
	deductToken: (uid: string, amount?: number) => Promise<void> // Added optional amount
	addToken: (uid: string, amount: number) => Promise<void>
	fetchUsers: () => Promise<void>
	transferProperty: (
		propertyId: string, 
		fromUserId: string, 
		toUserId: string, 
		amount: number
	) => Promise<boolean>
}

// Update API URL based on environment
const API_URL = import.meta.env.DEV ? 'http://localhost:3001' : '/api'

export const useUserStore = create<UserStore>()((set, get) => ({
	users: {},
	fetchUsers: async () => {
		try {
			const response = await fetch(`${API_URL}/users`)
			
			const usersArray = await response.json()
			console.log(usersArray,"user----------->")
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

			// First check if the user already exists in the API
			const checkResponse = await fetch(`${API_URL}/users?uid=${user.uid}`);
			const existingUsers = await checkResponse.json();
			
			if (existingUsers && existingUsers.length > 0) {
				console.log('User already exists in API, not creating duplicate:', existingUsers[0]);
				
				// Update the local state with the existing user
				set((state) => ({
					users: {
						...state.users,
						[user.uid]: existingUsers[0],
					},
				}));
				
				return;
			}

			// If we reach here, the user doesn't exist and should be created
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
	updateUserProperty: async (uid, property) => {
		try {
			// First, we need to find the user by uid to get their ID
			const response = await fetch(`${API_URL}/users?uid=${uid}`);
			const users = await response.json();
			
			if (!users || users.length === 0) {
				console.error('User not found with uid:', uid);
				return;
			}
			
			// Get the user's actual ID (not uid) that JSON Server uses
			const user = users[0];
			const userId = user.id;
			
			console.log('Found user:', user);
			console.log('Using JSON Server ID:', userId);
			
			// Now update the user using the correct ID for JSON Server
			const existingProperties = user.properties || [];
			const existingPropertyIndex = existingProperties.findIndex(
				(p: Property) => p.id === property.id,
			);

			const updatedProperties = [...existingProperties];
			if (existingPropertyIndex >= 0) {
				updatedProperties[existingPropertyIndex] = property;
			} else {
				updatedProperties.push(property);
			}

			const updateResponse = await fetch(`${API_URL}/users/${userId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					properties: updatedProperties,
				}),
			});
			
			if (!updateResponse.ok) {
				const errorText = await updateResponse.text();
				throw new Error(`HTTP error: ${updateResponse.status}, ${errorText}`);
			}
			
			const updatedUser = await updateResponse.json();
			
			// Update the local state to reflect the change
			set((state) => ({
				users: {
					...state.users,
					[uid]: updatedUser,
				},
			}));
		} catch (error) {
			console.error('Error updating user property:', error);
		}
	},
	deductToken: async (uid, amount = 1) => {
		try {
			// First, we need to find the user by uid to get their ID
			const response = await fetch(`${API_URL}/users?uid=${uid}`);
			const users = await response.json();
			
			if (!users || users.length === 0) {
				console.error('User not found with uid:', uid);
				return;
			}
			
			// Get the user's actual ID (not uid) that JSON Server uses
			const user = users[0];
			const userId = user.id;
			
			if (user.tokens < amount) {
				console.error('Insufficient tokens');
				return;
			}

			const updateResponse = await fetch(`${API_URL}/users/${userId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					tokens: user.tokens - amount,
				}),
			});
			
			if (!updateResponse.ok) {
				const errorText = await updateResponse.text();
				throw new Error(`HTTP error: ${updateResponse.status}, ${errorText}`);
			}
			
			const updatedUser = await updateResponse.json();
			
			// Update the local state to reflect the change
			set((state) => ({
				users: {
					...state.users,
					[uid]: updatedUser,
				},
			}));
		} catch (error) {
			console.error('Error deducting token:', error);
		}
	},
	addToken: async (uid, amount) => {
		try {
			// First, we need to find the user by uid to get their ID
			const response = await fetch(`${API_URL}/users?uid=${uid}`);
			const users = await response.json();
			
			if (!users || users.length === 0) {
				console.error('User not found with uid:', uid);
				return;
			}
			
			// Get the user's actual ID (not uid) that JSON Server uses
			const user = users[0];
			const userId = user.id;

			const updateResponse = await fetch(`${API_URL}/users/${userId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					tokens: user.tokens + amount,
				}),
			});
			
			if (!updateResponse.ok) {
				const errorText = await updateResponse.text();
				throw new Error(`HTTP error: ${updateResponse.status}, ${errorText}`);
			}
			
			const updatedUser = await updateResponse.json();
			
			// Update the local state to reflect the change
			set((state) => ({
				users: {
					...state.users,
					[uid]: updatedUser,
				},
			}));
		} catch (error) {
			console.error('Error adding tokens:', error);
		}
	},
	transferProperty: async (
		propertyId: string, 
		fromUserId: string, 
		toUserId: string, 
		amount: number
	) => {
		try {
			// First get data for both users
			const fromUserResponse = await fetch(`${API_URL}/users?uid=${fromUserId}`);
			const fromUsers = await fromUserResponse.json();
			
			const toUserResponse = await fetch(`${API_URL}/users?uid=${toUserId}`);
			const toUsers = await toUserResponse.json();
			
			if (!fromUsers || fromUsers.length === 0 || !toUsers || toUsers.length === 0) {
				console.error('One or both users not found');
				return false;
			}
			
			// Get the users
			const fromUser = fromUsers[0];
			const toUser = toUsers[0];
			
			// Get JSON Server IDs
			const fromUserJSONId = fromUser.id;
			const toUserJSONId = toUser.id;
			
			// Check if buyer has enough tokens
			if (toUser.tokens < amount) {
				console.error('Buyer has insufficient tokens');
				return false;
			}
			
			// Find the property in the seller's properties
			const fromUserProperties = fromUser.properties || [];
			const propertyIndex = fromUserProperties.findIndex((p: Property) => p.id === propertyId);
			
			if (propertyIndex === -1) {
				console.error('Property not found in seller properties');
				return false;
			}
			
			// Get the property
			const property = {...fromUserProperties[propertyIndex]};
			
			// Update property owner and remove forSale flag
			property.owner = toUserId;
			property.forSale = false;
			
			// Remove property from seller
			const updatedFromProperties = [...fromUserProperties];
			updatedFromProperties.splice(propertyIndex, 1);
			
			// Add property to buyer
			const toUserProperties = toUser.properties || [];
			const updatedToProperties = [...toUserProperties, property];
			
			// Update token balances
			const fromUserNewTokens = fromUser.tokens + amount;
			const toUserNewTokens = toUser.tokens - amount;
			
			// Update seller
			const updateFromResponse = await fetch(`${API_URL}/users/${fromUserJSONId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					properties: updatedFromProperties,
					tokens: fromUserNewTokens
				}),
			});
			
			if (!updateFromResponse.ok) {
				throw new Error(`Error updating seller: ${updateFromResponse.status}`);
			}
			
			// Update buyer
			const updateToResponse = await fetch(`${API_URL}/users/${toUserJSONId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					properties: updatedToProperties,
					tokens: toUserNewTokens
				}),
			});
			
			if (!updateToResponse.ok) {
				throw new Error(`Error updating buyer: ${updateToResponse.status}`);
			}
			
			// Get updated users
			const updatedFromUser = await updateFromResponse.json();
			const updatedToUser = await updateToResponse.json();
			
			// Update local state
			set((state) => ({
				users: {
					...state.users,
					[fromUserId]: updatedFromUser,
					[toUserId]: updatedToUser,
				},
			}));
			
			return true;
		} catch (error) {
			console.error('Error transferring property:', error);
			return false;
		}
	},
}))
