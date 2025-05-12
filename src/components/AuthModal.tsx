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
	InputGroup,
	InputRightElement,
	IconButton,
} from '@chakra-ui/react'
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'
import { auth } from '../firebase/config'
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	GoogleAuthProvider,
	signInWithPopup,
	sendPasswordResetEmail,
} from 'firebase/auth'
import { useUserStore } from '../stores/userStore'
import { fetchWithAuth } from '../firebase/authUtils'

interface AuthModalProps {
	isOpen: boolean
	onClose: () => void
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [name, setName] = useState('')
	const [loading, setLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
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
					const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
					
					
					// Get the user's actual ID (not uid) that JSON Server uses
					const response = await fetch(`${API_URL}/users/profile`);
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
			const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
			const checkResponse = await fetch(`${API_URL}/users/profile`);
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

	const handleGoogleSignIn = async () => {
		console.log('Google sign in started');
		setLoading(true)
		const provider = new GoogleAuthProvider()
		try {
			const result = await signInWithPopup(auth, provider)
			const user = result.user

			// First check if this user exists in our database
			const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
			
			try {
				// Check if user exists using the Firebase auth token
				console.log('Checking if user exists in firebase with UID:', user.uid);
				const checkResponse = await fetchWithAuth(`${API_URL}/users/profile`);
				const responseData = await checkResponse.json();
				console.log('Response data--->:', responseData);
				
				// If we get a successful response (not an error message), the user exists
				if (checkResponse.ok && !responseData.message) {
					console.log('User exists in database:', responseData);
					
					// Update local store and notify user
					await fetchUsers();
					toast({
						title: 'Logged in successfully',
						description: 'Welcome back!',
						status: 'success',
						duration: 3000,
						isClosable: true,
					});
				} else {
					// User doesn't exist in our database, create them
					console.log('Creating new user in database for Google user:', user.displayName);
					
					// Call addUser to create the user record in the database
					await addUser({
						uid: user.uid,
						email: user.email || '',
						name: user.displayName || user.email?.split('@')[0] || 'User',
					});
					
					toast({
						title: 'Account created successfully',
						description: 'You have been allocated 10 tokens.',
						status: 'success',
						duration: 3000,
						isClosable: true,
					});
					
					// Refresh users to ensure local state is up-to-date
					await fetchUsers();
				}
				onClose();
			} catch (apiError) {
				console.error('API error checking/creating user:', apiError);
				
				// If API check fails, attempt to create the user anyway as a fallback
				try {
					await addUser({
						uid: user.uid,
						email: user.email || '',
						name: user.displayName || user.email?.split('@')[0] || 'User',
					});
					
					toast({
						title: 'Account created',
						description: 'Your account has been created',
						status: 'success',
						duration: 3000,
						isClosable: true,
					});
					
					await fetchUsers();
					onClose();
				} catch (addUserError) {
					console.error('Error creating user after API check failed:', addUserError);
					toast({
						title: 'Error creating account',
						description: 'Please try again later',
						status: 'error',
						duration: 3000,
						isClosable: true,
					});
				}
			}
		} catch (error) {
			console.error('Google Sign-In error:', error)
			toast({
				title: 'Error signing in with Google',
				description: (error as Error).message,
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
		} finally {
			setLoading(false)
		}
	}

	const handlePasswordReset = async () => {
		if (!email) {
			toast({
				title: 'Email required',
				description: 'Please enter your email address to reset your password.',
				status: 'warning',
				duration: 3000,
				isClosable: true,
			});
			return;
		}
		try {
			setLoading(true);
			await sendPasswordResetEmail(auth, email);
			toast({
				title: 'Password reset email sent',
				description: 'Check your inbox for password reset instructions.',
				status: 'success',
				duration: 5000,
				isClosable: true,
			});
		} catch (error) {
			toast({
				title: 'Error sending reset email',
				description: (error as Error).message,
				status: 'error',
				duration: 3000,
				isClosable: true,
			});
		} finally {
			setLoading(false);
		}
	};

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
									<InputGroup size="md">
										<Input
											pr="4.5rem"
											type={showPassword ? 'text' : 'password'}
											placeholder="Password"
											value={password}
											onChange={(e) =>
												setPassword(e.target.value)
											}
										/>
										<InputRightElement width="4.5rem">
											<IconButton
												h="1.75rem"
												size="sm"
												onClick={() => setShowPassword(!showPassword)}
												icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
												aria-label={showPassword ? 'Hide password' : 'Show password'}
											/>
										</InputRightElement>
									</InputGroup>
									<Button
										variant="link"
										alignSelf="flex-start"
										mt={1}
										mb={2}
										onClick={handlePasswordReset}
										disabled={loading}
									>
										Forgot Password?
									</Button>
									<Button
										colorScheme="blue"
										width="full"
										onClick={handleLogin}
										isLoading={loading}
									>
										Login
									</Button>
									<Button
										colorScheme="red"
										width="full"
										onClick={handleGoogleSignIn}
										isLoading={loading}
									>
										Sign in with Google
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
									<InputGroup size="md">
										<Input
											pr="4.5rem"
											type={showPassword ? 'text' : 'password'}
											placeholder="Password"
											value={password}
											onChange={(e) =>
												setPassword(e.target.value)
											}
										/>
										<InputRightElement width="4.5rem">
											<IconButton
												h="1.75rem"
												size="sm"
												onClick={() => setShowPassword(!showPassword)}
												icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
												aria-label={showPassword ? 'Hide password' : 'Show password'}
											/>
										</InputRightElement>
									</InputGroup>
									<Button
										colorScheme="green"
										width="full"
										onClick={handleSignUp}
										isLoading={loading}
									>
										Sign Up
									</Button>
									<Button
										mt={2}
										colorScheme="red"
										width="full"
										onClick={handleGoogleSignIn}
										isLoading={loading}
									>
										Sign up with Google
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
