export interface Treasure {
	name: string
	description: string
	cells: string[]
	rewardType: string
	rewardAmount: number
	rewardMessage: string
	maxRedemptions: number
	expiresAt: string
}

export interface TreasureCreationData extends Treasure {
	// Additional fields that might be returned from API
	id?: string
	createdAt?: string
	createdBy?: string
}

export interface TreasureDiscovery {
	id: string
	name: string
	description: string
	rewardType: string
	rewardAmount: number
	rewardMessage: string
	treasureCells: string[]
	overlappingCells: string[]
}
