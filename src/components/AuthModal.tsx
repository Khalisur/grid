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

	const handleSignUp = async () => {
		try {
			setLoading(true)
			const userCredential = await createUserWithEmailAndPassword(
				auth,
				email,
				password,
			)
			const user = userCredential.user

			// Create user profile in our store
			await addUser({
				uid: user.uid,
				email: user.email || '',
				name: name || user.email?.split('@')[0] || 'User',
			})

			toast({
				title: 'Account created successfully',
				description: 'You have been allocated 10 tokens',
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
