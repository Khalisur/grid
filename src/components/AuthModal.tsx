/* eslint-disable prettier/prettier */
import { useState } from 'react'
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalBody,
	ModalCloseButton,
	Button,
	Input,
	VStack,
	useToast,
	Tabs,
	TabList,
	TabPanels,
	Tab,
	TabPanel,
	FormControl,
	FormLabel,
} from '@chakra-ui/react'
import { auth } from '../firebase/config'
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
} from 'firebase/auth'
import { useUserStore } from '../stores/userStore'

interface AuthModalProps {
	isOpen: boolean
	onClose: () => void
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [name, setName] = useState('')
	const [loading, setLoading] = useState(false)
	const toast = useToast()
	const addUser = useUserStore((state) => state.addUser)
	const fetchUsers = useUserStore((state) => state.fetchUsers)

	const handleSignUp = async () => {
		try {
			setLoading(true)
			
			// First create the Firebase auth user
			const userCredential = await createUserWithEmailAndPassword(
				auth,
				email,
				password,
			)
			const user = userCredential.user;
			
			// Fetch users first to ensure we have the most up-to-date data
			await fetchUsers();
			
			// Get users from the store (after fetching)
			const users = useUserStore.getState().users;
			
			// Check if user already exists in our local state FIRST
			if (users && users[user.uid]) {
				console.log('User already exists in local state:', users[user.uid]);
				
				// If the user exists but the name is different (or 'User'), update it
				if (name && (users[user.uid].name === 'User' || users[user.uid].name !== name)) {
					console.log('Updating existing user name from', users[user.uid].name, 'to', name);
					
					// Get the API URL
					const API_URL = import.meta.env.DEV ? 'http://localhost:3001' : '/api';
					
					// Get the user's actual ID (not uid) that JSON Server uses
					const response = await fetch(`${API_URL}/users?uid=${user.uid}`);
					const existingUsers = await response.json();
					
					if (existingUsers && existingUsers.length > 0) {
						const userId = existingUsers[0].id; // Get the JSON Server ID
						
						// Update the name
						const updateResponse = await fetch(`${API_URL}/users/${userId}`, {
							method: 'PATCH',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								name: name,
							}),
						});
						
						if (updateResponse.ok) {
							await fetchUsers(); // Refresh users after update
							toast({
								title: 'Profile Updated',
								description: 'Your profile name has been updated',
								status: 'success',
								duration: 3000,
								isClosable: true,
							});
						}
					}
				} else {
					toast({
						title: 'Account linked',
						description: 'Your account has been linked with your existing profile',
						status: 'success',
						duration: 3000,
						isClosable: true,
					});
				}
				onClose();
				return;
			}

			// Double check against the API directly
			const API_URL = import.meta.env.DEV ? 'http://localhost:3001' : '/api';
			const checkResponse = await fetch(`${API_URL}/users?uid=${user.uid}`);
			const existingUsers = await checkResponse.json();
			
			if (existingUsers && existingUsers.length > 0) {
				console.log('User already exists in database, not creating duplicate:', existingUsers[0]);
				
				// Check if we need to update the name
				if (name && (existingUsers[0].name === 'User' || existingUsers[0].name !== name)) {
					console.log('Updating existing user name in API from', existingUsers[0].name, 'to', name);
					
					const userId = existingUsers[0].id; // Get the JSON Server ID
					
					// Update the name
					const updateResponse = await fetch(`${API_URL}/users/${userId}`, {
						method: 'PATCH',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							name: name,
						}),
					});
					
					if (updateResponse.ok) {
						toast({
							title: 'Profile Updated',
							description: 'Your profile has been updated with your chosen name',
							status: 'success',
							duration: 3000,
							isClosable: true,
						});
					} else {
						toast({
							title: 'Account Linked',
							description: 'Your account has been linked to your existing profile',
							status: 'success',
							duration: 3000,
							isClosable: true,
						});
					}
				} else {
					// The user is already in our database with the correct name
					toast({
						title: 'Account linked',
						description: 'Your account has been linked to your existing profile',
						status: 'success',
						duration: 3000,
						isClosable: true,
					});
				}
				
				// Refresh users to ensure local state is up-to-date
				await fetchUsers();
			} else {
				// User doesn't exist in our database, create a new profile
				console.log('Creating new user profile in database with name:', name);
				await addUser({
					uid: user.uid,
					email: user.email || '',
					name: name || user.email?.split('@')[0] || 'User',
				});
				
				toast({
					title: 'Account created successfully',
					description: 'You have been allocated 10 tokens',
					status: 'success',
					duration: 3000,
					isClosable: true,
				});
			}
			
			onClose();
		} catch (error) {
			console.error('Signup error:', error)
			toast({
				title: 'Error creating account',
				description: (error as Error).message,
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
		} finally {
			setLoading(false)
		}
	}

	const handleLogin = async () => {
		try {
			setLoading(true)
			await signInWithEmailAndPassword(auth, email, password)
			toast({
				title: 'Logged in successfully',
				status: 'success',
				duration: 3000,
				isClosable: true,
			})
			onClose()
		} catch (error) {
			toast({
				title: 'Error logging in',
				description: (error as Error).message,
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
		} finally {
			setLoading(false)
		}
	}

	return (
		<Modal isOpen={isOpen} onClose={onClose}>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader>Authentication</ModalHeader>
				<ModalCloseButton />
				<ModalBody pb={6}>
					<Tabs isFitted variant="enclosed">
						<TabList mb="1em">
							<Tab>Login</Tab>
							<Tab>Sign Up</Tab>
						</TabList>
						<TabPanels>
							<TabPanel>
								<VStack spacing={4}>
									<Input
										placeholder="Email"
										value={email}
										onChange={(e) =>
											setEmail(e.target.value)
										}
									/>
									<Input
										type="password"
										placeholder="Password"
										value={password}
										onChange={(e) =>
											setPassword(e.target.value)
										}
									/>
									<Button
										colorScheme="blue"
										width="full"
										onClick={handleLogin}
										isLoading={loading}
									>
										Login
									</Button>
								</VStack>
							</TabPanel>
							<TabPanel>
								<VStack spacing={4}>
									<FormControl>
										<FormLabel>Name</FormLabel>
										<Input
											placeholder="Your name"
											value={name}
											onChange={(e) =>
												setName(e.target.value)
											}
										/>
									</FormControl>
									<Input
										placeholder="Email"
										value={email}
										onChange={(e) =>
											setEmail(e.target.value)
										}
									/>
									<Input
										type="password"
										placeholder="Password"
										value={password}
										onChange={(e) =>
											setPassword(e.target.value)
										}
									/>
									<Button
										colorScheme="green"
										width="full"
										onClick={handleSignUp}
										isLoading={loading}
									>
										Sign Up
									</Button>
								</VStack>
							</TabPanel>
						</TabPanels>
					</Tabs>
				</ModalBody>
			</ModalContent>
		</Modal>
	)
}
