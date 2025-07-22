/* eslint-disable prettier/prettier */
import React, { useState } from 'react'
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalFooter,
	ModalBody,
	ModalCloseButton,
	Button,
	FormControl,
	FormLabel,
	Input,
	Textarea,
	NumberInput,
	NumberInputField,
	NumberInputStepper,
	NumberIncrementStepper,
	NumberDecrementStepper,
	Select,
	useToast,
	VStack,
	Text,
} from '@chakra-ui/react'
import { Treasure } from '../types/treasure'
import { fetchWithAuth } from '../firebase/authUtils'

interface TreasureModalProps {
	isOpen: boolean
	onClose: () => void
	selectedCells: string[]
	onSuccess?: () => void
}

// API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const TreasureModal: React.FC<TreasureModalProps> = ({
	isOpen,
	onClose,
	selectedCells,
	onSuccess,
}) => {
	const toast = useToast()
	const [isLoading, setIsLoading] = useState(false)
	
	// Form state
	const [formData, setFormData] = useState<Treasure>({
		name: '',
		description: '',
		cells: selectedCells,
		rewardType: 'tokens',
		rewardAmount: 0,
		rewardMessage: '',
		maxRedemptions: 1,
		expiresAt: '',
	})

	// Update cells when selectedCells prop changes
	React.useEffect(() => {
		setFormData(prev => ({ ...prev, cells: selectedCells }))
	}, [selectedCells])

	const handleInputChange = (field: keyof Treasure, value: string | number | string[]) => {
		setFormData(prev => ({ ...prev, [field]: value }))
	}

	const handleSubmit = async () => {
		// Validation
		if (!formData.name.trim()) {
			toast({
				title: 'Validation Error',
				description: 'Treasure name is required',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
			return
		}

		if (!formData.description.trim()) {
			toast({
				title: 'Validation Error',
				description: 'Treasure description is required',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
			return
		}

		if (formData.cells.length === 0) {
			toast({
				title: 'Validation Error',
				description: 'Please select at least one cell for the treasure',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
			return
		}

		if (formData.rewardAmount <= 0) {
			toast({
				title: 'Validation Error',
				description: 'Reward amount must be greater than 0',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
			return
		}

		if (!formData.expiresAt) {
			toast({
				title: 'Validation Error',
				description: 'Expiration date is required',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
			return
		}

		try {
			setIsLoading(true)

			// Convert the datetime-local value to ISO format for the API
			const treasureData = {
				...formData,
				expiresAt: new Date(formData.expiresAt).toISOString(),
			}

			const response = await fetchWithAuth(`${API_URL}/treasures`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(treasureData),
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				throw new Error(errorData.message || 'Failed to create treasure')
			}

			toast({
				title: 'Success',
				description: 'Treasure created successfully!',
				status: 'success',
				duration: 3000,
				isClosable: true,
			})

			// Reset form
			setFormData({
				name: '',
				description: '',
				cells: [],
				rewardType: 'tokens',
				rewardAmount: 0,
				rewardMessage: '',
				maxRedemptions: 1,
				expiresAt: '',
			})

			onClose()
			onSuccess?.()
		} catch (error) {
			console.error('Error creating treasure:', error)
			toast({
				title: 'Error',
				description: error instanceof Error ? error.message : 'Failed to create treasure',
				status: 'error',
				duration: 3000,
				isClosable: true,
			})
		} finally {
			setIsLoading(false)
		}
	}

	const handleClose = () => {
		// Reset form when closing
		setFormData({
			name: '',
			description: '',
			cells: [],
			rewardType: 'tokens',
			rewardAmount: 0,
			rewardMessage: '',
			maxRedemptions: 1,
			expiresAt: '',
		})
		onClose()
	}

	return (
		<Modal isOpen={isOpen} onClose={handleClose} size="lg">
			<ModalOverlay />
			<ModalContent>
				<ModalHeader>Set Property as Treasure</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<VStack spacing={4}>
						<Text fontSize="sm" color="gray.600">
							Selected Cells: {selectedCells.length} cells
						</Text>

						<FormControl isRequired>
							<FormLabel>Treasure Name</FormLabel>
							<Input
								value={formData.name}
								onChange={(e) => handleInputChange('name', e.target.value)}
								placeholder="e.g., Golden Coins"
							/>
						</FormControl>

						<FormControl isRequired>
							<FormLabel>Description</FormLabel>
							<Textarea
								value={formData.description}
								onChange={(e) => handleInputChange('description', e.target.value)}
								placeholder="e.g., A chest full of golden coins"
								rows={3}
							/>
						</FormControl>

						<FormControl isRequired>
							<FormLabel>Reward Type</FormLabel>
							<Select
								value={formData.rewardType}
								onChange={(e) => handleInputChange('rewardType', e.target.value)}
							>
								<option value="tokens">Tokens</option>
								<option value="points">Points</option>
								<option value="items">Items</option>
							</Select>
						</FormControl>

						<FormControl isRequired>
							<FormLabel>Reward Amount</FormLabel>
							<NumberInput
								value={formData.rewardAmount}
								onChange={(valueString) => handleInputChange('rewardAmount', parseInt(valueString) || 0)}
								min={1}
							>
								<NumberInputField />
								<NumberInputStepper>
									<NumberIncrementStepper />
									<NumberDecrementStepper />
								</NumberInputStepper>
							</NumberInput>
						</FormControl>

						<FormControl>
							<FormLabel>Reward Message</FormLabel>
							<Input
								value={formData.rewardMessage}
								onChange={(e) => handleInputChange('rewardMessage', e.target.value)}
								placeholder="e.g., 🎉 You found a treasure chest!"
							/>
						</FormControl>

						<FormControl isRequired>
							<FormLabel>Max Redemptions</FormLabel>
							<NumberInput
								value={formData.maxRedemptions}
								onChange={(valueString) => handleInputChange('maxRedemptions', parseInt(valueString) || 1)}
								min={1}
							>
								<NumberInputField />
								<NumberInputStepper>
									<NumberIncrementStepper />
									<NumberDecrementStepper />
								</NumberInputStepper>
							</NumberInput>
						</FormControl>

						<FormControl isRequired>
							<FormLabel>Expires At</FormLabel>
							<Input
								type="datetime-local"
								value={formData.expiresAt}
								onChange={(e) => handleInputChange('expiresAt', e.target.value)}
							/>
						</FormControl>
					</VStack>
				</ModalBody>

				<ModalFooter>
					<Button variant="ghost" mr={3} onClick={handleClose}>
						Cancel
					</Button>
					<Button
						colorScheme="blue"
						onClick={handleSubmit}
						isLoading={isLoading}
						loadingText="Creating..."
					>
						Create Treasure
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
} 