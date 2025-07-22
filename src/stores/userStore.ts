/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { create } from 'zustand'
import { fetchWithAuth } from '../firebase/authUtils'

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
	isAdmin?: boolean
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

// Update API URL based on environment - now using the new API from env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const useUserStore = create<UserStore>()((set, get) => ({
	users: {},
	fetchUsers: async () => {
		try {
			// Get all users - would need to be adapted for a real application
			// since this is just a demo, we'll simply call the endpoint for each user we know about
			const currentUsers = get().users;
			const userIds = Object.keys(currentUsers);
			
			if (userIds.length === 0) {
				// If no users loaded yet, try to get properties
				const propsResponse = await fetch(`${API_URL}/properties`);
				const properties = await propsResponse.json();

				if (propsResponse.ok) {

					// We'll fetch all users in a single API call instead of looping
					try {
						const usersResponse = await fetch(`${API_URL}/users/all`);
						
						if (usersResponse.ok) {
							const allUsers = await usersResponse.json();
							
							// Structure the data properly - allUsers should be an object with user IDs as keys
							set({ users: allUsers });
						} else {
							console.error('Failed to fetch users:', usersResponse.status);
						}
					} catch (error) {
						console.error('Error fetching all users:', error);
					}
				}
				return;
			}
			
			// Update all known users
			const updatedUsers: Record<string, UserData> = {};
			for (const uid of userIds) {
				try {
					const response = await fetchWithAuth(`${API_URL}/users/profile`);
					
					if (response.ok) {
						const userData = await response.json();
						updatedUsers[uid] = userData;
					}
				} catch (error) {
					console.error(`Error fetching user ${uid}:`, error);
					// Keep existing user data if fetch fails
					updatedUsers[uid] = currentUsers[uid];
				}
			}
			
			set({ users: updatedUsers });
		} catch (error) {
			console.error('Error fetching users:', error);
		}
	},
	addUser: async (user) => {
		try {
			console.log('Attempting to add user:', user);
			console.log('API URL:', `${API_URL}/users/create`);

			// Use the new create user endpoint
			const response = await fetchWithAuth(`${API_URL}/users/create`, {
				method: 'POST',
				body: JSON.stringify({
					uid: user.uid,
					email: user.email,
					name: user.name
				}),
			});

			console.log('Response status:', response.status);
			console.log('Response status text:', response.statusText);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`HTTP error! status: ${response.status}, body: ${errorText}`,
				);
			}

			const responseData = await response.json();
			const newUser = responseData.user;
			console.log('New user created:', newUser);

			set((state) => ({
				users: {
					...state.users,
					[user.uid]: newUser,
				},
			}));
		} catch (error) {
			console.error('Detailed error in addUser:', error);
			throw error;
		}
	},
	updateUserProperty: async (uid, property) => {
		try {
			// Use the new properties endpoint
			const response = await fetchWithAuth(`${API_URL}/properties/${property.id}`, {
				method: 'PUT',
				body: JSON.stringify(property),
			});
			
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP error: ${response.status}, ${errorText}`);
			}
			
			// After updating the property, refresh the user data
			await get().fetchUsers();
		} catch (error) {
			console.error('Error updating user property:', error);
		}
	},
	deductToken: async (uid, amount = 1) => {
		try {
			// First, get the current user profile
			const response = await fetchWithAuth(`${API_URL}/users/profile`);
			
			if (!response.ok) {
				console.error('User not found with uid:', uid);
				return;
			}
			
			const userData = await response.json();
			
			if (userData.tokens < amount) {
				console.error('Insufficient tokens');
				return;
			}

			// Update the user's tokens
			const updateResponse = await fetchWithAuth(`${API_URL}/users/update`, {
				method: 'PUT',
				body: JSON.stringify({
					tokens: userData.tokens - amount,
				}),
			});
			
			if (!updateResponse.ok) {
				const errorText = await updateResponse.text();
				throw new Error(`HTTP error: ${updateResponse.status}, ${errorText}`);
			}
			
			// Refresh users to get updated data
			await get().fetchUsers();
		} catch (error) {
			console.error('Error deducting token:', error);
		}
	},
	addToken: async (uid, amount) => {
		try {
			// First, get the current user profile
			const response = await fetchWithAuth(`${API_URL}/users/profile`);
			
			if (!response.ok) {
				console.error('User not found with uid:', uid);
				return;
			}
			
			const userData = await response.json();

			// Update the user's tokens
			const updateResponse = await fetchWithAuth(`${API_URL}/users/update`, {
				method: 'PUT',
				body: JSON.stringify({
					tokens: userData.tokens + amount,
				}),
			});
			
			if (!updateResponse.ok) {
				const errorText = await updateResponse.text();
				throw new Error(`HTTP error: ${updateResponse.status}, ${errorText}`);
			}
			
			// Refresh users to get updated data
			await get().fetchUsers();
		} catch (error) {
			console.error('Error adding tokens:', error);
		}
	},
	transferProperty: async (propertyId, fromUserId, toUserId, amount) => {
		try {
			// This would be better implemented as a single API call to handle atomically
			// But for now we'll implement it in steps
			
			// 1. Deduct tokens from buyer
			const buyerResponse = await fetchWithAuth(`${API_URL}/users/profile`, {
				headers: {
					'Firebase-UID': toUserId
				}
			});
			
			if (!buyerResponse.ok) {
				throw new Error('Buyer not found');
			}
			
			const buyer = await buyerResponse.json();
			
			if (buyer.tokens < amount) {
				throw new Error('Insufficient tokens');
			}
			
			// Update buyer tokens
			const updateBuyerResponse = await fetchWithAuth(`${API_URL}/users/update`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Firebase-UID': toUserId
				},
				body: JSON.stringify({
					tokens: buyer.tokens - amount
				})
			});
			
			if (!updateBuyerResponse.ok) {
				throw new Error('Failed to update buyer tokens');
			}
			
			// 2. Add tokens to seller
			const sellerResponse = await fetchWithAuth(`${API_URL}/users/profile`, {
				headers: {
					'Firebase-UID': fromUserId
				}
			});
			
			if (sellerResponse.ok) {
				const seller = await sellerResponse.json();
				
				const updateSellerResponse = await fetchWithAuth(`${API_URL}/users/update`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						'Firebase-UID': fromUserId
					},
					body: JSON.stringify({
						tokens: seller.tokens + amount
					})
				});
				
				if (!updateSellerResponse.ok) {
					// Rollback buyer tokens if seller update fails
					await fetchWithAuth(`${API_URL}/users/update`, {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json',
							'Firebase-UID': toUserId
						},
						body: JSON.stringify({
							tokens: buyer.tokens
						})
					});
					
					throw new Error('Failed to update seller tokens');
				}
			}
			
			// 3. Transfer property ownership
			const propertyResponse = await fetchWithAuth(`${API_URL}/properties/${propertyId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Firebase-UID': toUserId
				},
				body: JSON.stringify({
					owner: toUserId,
					forSale: false
				})
			});
			
			if (!propertyResponse.ok) {
				// This is a serious failure case - money transferred but property didn't
				// In a real app, you would want better error handling/rollback
				console.error('Failed to transfer property but tokens were transferred!');
				throw new Error('Failed to transfer property');
			}
			
			// Refresh users to get updated data
			await get().fetchUsers();
			
			return true;
		} catch (error) {
			console.error('Error transferring property:', error);
			return false;
		}
	}
}))
