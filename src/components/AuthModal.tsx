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

	const handleSignUp = async () => {
		try {
			setLoading(true)
			
			// Create Firebase auth user
			const userCredential = await createUserWithEmailAndPassword(auth, email, password)
			const user = userCredential.user

			// Attempt to create user in database (backend handles duplicates)
			const newUser = {
				uid: user.uid,
				email: user.email || '',
				name: name || user.email?.split('@')[0] || 'User',
			}

			let isNewUser = true
			try {
				await addUser(newUser)
			} catch (error) {
				console.log('User already exists or API error:', error)
				isNewUser = false
			}

			// Show appropriate success message
			toast({
				title: isNewUser ? 'Account created successfully' : 'Account linked',
				description: isNewUser ? 'You have been allocated 10 tokens' : 'Your account has been linked to your existing profile',
				status: 'success',
				duration: 3000,
				isClosable: true,
			})
			
			onClose()
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
		console.log('Google sign in started')
		setLoading(true)
		const provider = new GoogleAuthProvider()
		
		try {
			const result = await signInWithPopup(auth, provider)
			const user = result.user

			// Attempt to create user in database (backend handles duplicates)
			const newUser = {
				uid: user.uid,
				email: user.email || '',
				name: user.displayName || user.email?.split('@')[0] || 'User',
			}

			let isNewUser = true
			try {
				await addUser(newUser)
			} catch (error) {
				console.log('User already exists or API error:', error)
				isNewUser = false
			}

			// Show appropriate success message
			toast({
				title: isNewUser ? 'Account created successfully' : 'Logged in successfully',
				description: isNewUser ? 'You have been allocated 10 tokens.' : 'Welcome back!',
				status: 'success',
				duration: 3000,
				isClosable: true,
			})
			
			onClose()
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
			})
			return
		}

		try {
			setLoading(true)
			await sendPasswordResetEmail(auth, email)
			toast({
				title: 'Password reset email sent',
				description: 'Check your inbox for password reset instructions.',
				status: 'success',
				duration: 5000,
				isClosable: true,
			})
		} catch (error) {
			toast({
				title: 'Error sending reset email',
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
