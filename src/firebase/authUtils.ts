/* eslint-disable prettier/prettier */
import { auth } from './config'

// Get an authenticated fetch function that includes the Firebase ID token
export const getAuthenticatedFetch = async () => {
	const user = auth.currentUser
	if (!user) {
		throw new Error('User not authenticated')
	}
	
	const token = await user.getIdToken()
	
	return async (url: string, options: RequestInit = {}) => {
		const headers = {
			...options.headers,
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
		}
		
		return fetch(url, {
			...options,
			headers,
		})
	}
}

// Get auth headers with the Firebase ID token
export const getAuthHeaders = async () => {
	const user = auth.currentUser
	if (!user) {
		throw new Error('User not authenticated')
	}
	
	const token = await user.getIdToken()
	
	return {
		'Authorization': `Bearer ${token}`,
		'Content-Type': 'application/json',
	}
}

// Execute a fetch request with authentication
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
	const headers = await getAuthHeaders()
	
	return fetch(url, {
		...options,
		headers: {
			...options.headers,
			...headers,
		},
	})
}