/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import React, { useEffect, useState } from 'react'
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalFooter,
	ModalBody,
	ModalCloseButton,
	Button,
	Text,
	VStack,
	Box,
	Badge,
	Flex,
	Icon,
	Divider,
	useColorModeValue,
} from '@chakra-ui/react'
import { FaGift, FaTrophy, FaCoins } from 'react-icons/fa'

interface TreasureInfo {
	id: string
	name: string
	description: string
	rewardType: string
	rewardAmount: number
	rewardMessage: string
	treasureCells: string[]
	overlappingCells: string[]
}

interface TreasureDiscoveryModalProps {
	isOpen: boolean
	onClose: () => void
	treasureInfo: TreasureInfo | null
}

export const TreasureDiscoveryModal: React.FC<TreasureDiscoveryModalProps> = ({
	isOpen,
	onClose,
	treasureInfo,
}) => {
	const [showConfetti, setShowConfetti] = useState(false)
	const bgColor = useColorModeValue('white', 'gray.800')
	const textColor = useColorModeValue('gray.600', 'gray.200')

	// Trigger confetti when modal opens
	useEffect(() => {
		if (isOpen && treasureInfo) {
			setShowConfetti(true)
			// Create confetti effect
			createConfetti()
			
			// Play celebration sound
			playTreasureSound()
			
			// Hide confetti after animation
			const timer = setTimeout(() => {
				setShowConfetti(false)
			}, 3000)
			
			return () => clearTimeout(timer)
		}
	}, [isOpen, treasureInfo])

	const createConfetti = () => {
		// Create multiple confetti particles
		for (let i = 0; i < 100; i++) {
			setTimeout(() => {
				createConfettiParticle()
			}, i * 50)
		}
		
		// Create some special sparkle effects
		for (let i = 0; i < 20; i++) {
			setTimeout(() => {
				createSparkle()
			}, i * 200)
		}
	}

	const createConfettiParticle = () => {
		const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9F43', '#10AC84']
		const shapes = ['●', '★', '♦', '▲', '♥', '♠']
		const confetti = document.createElement('div')
		
		confetti.style.position = 'fixed'
		confetti.style.fontSize = Math.random() * 10 + 10 + 'px'
		confetti.style.color = colors[Math.floor(Math.random() * colors.length)]
		confetti.style.left = Math.random() * window.innerWidth + 'px'
		confetti.style.top = '-20px'
		confetti.style.zIndex = '9999'
		confetti.style.pointerEvents = 'none'
		confetti.style.userSelect = 'none'
		confetti.style.fontWeight = 'bold'
		confetti.innerHTML = shapes[Math.floor(Math.random() * shapes.length)]
		
		document.body.appendChild(confetti)
		
		// Animate the confetti falling with rotation
		let position = -20
		let rotation = 0
		const fallSpeed = Math.random() * 4 + 3
		const drift = (Math.random() - 0.5) * 3
		const rotationSpeed = (Math.random() - 0.5) * 10
		
		const animate = () => {
			position += fallSpeed
			rotation += rotationSpeed
			confetti.style.top = position + 'px'
			confetti.style.left = (parseFloat(confetti.style.left) + drift) + 'px'
			confetti.style.transform = `rotate(${rotation}deg)`
			
			if (position < window.innerHeight + 50) {
				requestAnimationFrame(animate)
			} else {
				document.body.removeChild(confetti)
			}
		}
		
		requestAnimationFrame(animate)
	}

	const createSparkle = () => {
		const sparkle = document.createElement('div')
		
		sparkle.style.position = 'fixed'
		sparkle.style.width = '4px'
		sparkle.style.height = '4px'
		sparkle.style.backgroundColor = '#FFD700'
		sparkle.style.borderRadius = '50%'
		sparkle.style.left = Math.random() * window.innerWidth + 'px'
		sparkle.style.top = Math.random() * window.innerHeight + 'px'
		sparkle.style.zIndex = '9999'
		sparkle.style.pointerEvents = 'none'
		sparkle.style.boxShadow = '0 0 6px #FFD700'
		
		document.body.appendChild(sparkle)
		
		// Animate sparkle with pulsing and fading
		let opacity = 1
		let scale = 1
		let pulseDirection = 1
		
		const animate = () => {
			opacity -= 0.02
			scale += pulseDirection * 0.1
			
			if (scale > 2 || scale < 0.5) {
				pulseDirection *= -1
			}
			
			sparkle.style.opacity = opacity.toString()
			sparkle.style.transform = `scale(${scale})`
			
			if (opacity > 0) {
				requestAnimationFrame(animate)
			} else {
				document.body.removeChild(sparkle)
			}
		}
		
		requestAnimationFrame(animate)
	}

	const playTreasureSound = () => {
		// Create a simple celebratory beep sound using Web Audio API
		try {
			const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
			
			// Create multiple tones for a celebratory sound
			const frequencies = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 - major chord
			
			frequencies.forEach((freq, index) => {
				const oscillator = audioContext.createOscillator()
				const gainNode = audioContext.createGain()
				
				oscillator.connect(gainNode)
				gainNode.connect(audioContext.destination)
				
				oscillator.frequency.setValueAtTime(freq, audioContext.currentTime)
				oscillator.type = 'sine'
				
				// Create a nice envelope
				gainNode.gain.setValueAtTime(0, audioContext.currentTime)
				gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01)
				gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5 + (index * 0.1))
				
				oscillator.start(audioContext.currentTime + (index * 0.1))
				oscillator.stop(audioContext.currentTime + 0.5 + (index * 0.1))
			})
		} catch (error) {
			console.log('Could not play treasure sound:', error)
		}
	}

	const getRewardIcon = (rewardType: string) => {
		switch (rewardType.toLowerCase()) {
			case 'tokens':
				return FaCoins
			case 'points':
				return FaTrophy
			default:
				return FaGift
		}
	}

	const getRewardColor = (rewardType: string) => {
		switch (rewardType.toLowerCase()) {
			case 'tokens':
				return 'yellow'
			case 'points':
				return 'purple'
			default:
				return 'blue'
		}
	}

	if (!treasureInfo) return null

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="lg" closeOnOverlayClick={false}>
			<ModalOverlay bg="rgba(0, 0, 0, 0.6)" />
			<ModalContent
				bg={bgColor}
				border="3px solid"
				borderColor="yellow.400"
				borderRadius="2xl"
				boxShadow="0 0 30px rgba(255, 215, 0, 0.5)"
				position="relative"
				overflow="hidden"
			>
				{/* Animated background */}
				<Box
					position="absolute"
					top={0}
					left={0}
					right={0}
					bottom={0}
					bgGradient="linear(45deg, rgba(255,215,0,0.1) 0%, rgba(255,140,0,0.1) 50%, rgba(255,215,0,0.1) 100%)"
					animation={showConfetti ? "pulse 2s infinite" : "none"}
					zIndex={-1}
				/>
				
				<ModalHeader textAlign="center" pb={2}>
					<VStack spacing={2}>
						<Box
							fontSize="4xl"
							animation={showConfetti ? "bounce 1s infinite" : "none"}
						>
							🎉
						</Box>
						<Text
							fontSize="2xl"
							fontWeight="bold"
							bgGradient="linear(to-r, yellow.400, orange.400)"
							bgClip="text"
						>
							Treasure Discovered!
						</Text>
					</VStack>
				</ModalHeader>
				
				<ModalCloseButton />
				
				<ModalBody px={6} pb={6}>
					<VStack spacing={4} align="stretch">
						{/* Treasure Message */}
						<Box
							textAlign="center"
							bg="yellow.50"
							border="2px solid"
							borderColor="yellow.200"
							borderRadius="lg"
							p={4}
							_dark={{
								bg: "yellow.900",
								borderColor: "yellow.600"
							}}
						>
							<Text
								fontSize="lg"
								fontWeight="medium"
								color="yellow.800"
								_dark={{ color: "yellow.200" }}
							>
								{treasureInfo.rewardMessage || "🎉 Congratulations! You found a treasure!"}
							</Text>
						</Box>

						<Divider />

						{/* Treasure Details */}
						<VStack spacing={3} align="stretch">
							<Text fontSize="lg" fontWeight="bold" textAlign="center">
								Treasure Details
							</Text>
							
							<Box
								bg="gray.50"
								borderRadius="lg"
								p={4}
								_dark={{ bg: "gray.700" }}
							>
								<VStack spacing={3} align="stretch">
									<Flex justify="space-between" align="center">
										<Text fontWeight="semibold">Name:</Text>
										<Text color={textColor}>{treasureInfo.name}</Text>
									</Flex>
									
									<Flex justify="space-between" align="start">
										<Text fontWeight="semibold">Description:</Text>
										<Text color={textColor} textAlign="right" maxW="60%">
											{treasureInfo.description}
										</Text>
									</Flex>
									
									<Flex justify="space-between" align="center">
										<Text fontWeight="semibold">Reward:</Text>
										<Flex align="center" gap={2}>
											<Icon
												as={getRewardIcon(treasureInfo.rewardType)}
												color={`${getRewardColor(treasureInfo.rewardType)}.500`}
											/>
											<Badge
												colorScheme={getRewardColor(treasureInfo.rewardType)}
												fontSize="md"
												px={3}
												py={1}
											>
												{treasureInfo.rewardAmount} {treasureInfo.rewardType}
											</Badge>
										</Flex>
									</Flex>
									
									<Flex justify="space-between" align="center">
										<Text fontWeight="semibold">Treasure Cells:</Text>
										<Text color={textColor} fontSize="sm">
											{treasureInfo.treasureCells.length} cells
										</Text>
									</Flex>
									
									<Flex justify="space-between" align="center">
										<Text fontWeight="semibold">Found Cells:</Text>
										<Text color={textColor} fontSize="sm">
											{treasureInfo.overlappingCells.length} cells
										</Text>
									</Flex>
								</VStack>
							</Box>
						</VStack>

						{/* Celebration Message */}
						<Box
							textAlign="center"
							bg="green.50"
							border="2px solid"
							borderColor="green.200"
							borderRadius="lg"
							p={3}
							_dark={{
								bg: "green.900",
								borderColor: "green.600"
							}}
						>
							<Text
								fontSize="md"
								color="green.800"
								_dark={{ color: "green.200" }}
							>
								🎊 Your reward has been added to your account! 🎊
							</Text>
						</Box>
					</VStack>
				</ModalBody>

				<ModalFooter justifyContent="center">
					<Button
						colorScheme="yellow"
						size="lg"
						onClick={onClose}
						_hover={{
							transform: "scale(1.05)",
						}}
						transition="all 0.2s"
					>
						Awesome! 🎉
					</Button>
				</ModalFooter>
			</ModalContent>
			
			{/* CSS for animations */}
			<style>
				{`
					@keyframes bounce {
						0%, 20%, 50%, 80%, 100% {
							transform: translateY(0);
						}
						40% {
							transform: translateY(-10px);
						}
						60% {
							transform: translateY(-5px);
						}
					}
					
					@keyframes pulse {
						0% {
							opacity: 0.8;
						}
						50% {
							opacity: 1;
						}
						100% {
							opacity: 0.8;
						}
					}
				`}
			</style>
		</Modal>
	)
} 