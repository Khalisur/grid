/* eslint-disable prettier/prettier */
import { create } from 'zustand'
import { fetchWithAuth } from '../firebase/authUtils'
import { Property } from './userStore'
import { auth } from '../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'

// API response structures

// Bids made by user response
interface BidsMadeResponse {
  userId: string
  bidsCount: number
  bids: Array<{
    propertyId: string
    propertyName: string
    propertyOwner: string
    bid: {
      amount: number
      message?: string
      status: 'active' | 'accepted' | 'declined' | 'cancelled'
      createdAt: string
    }
  }>
}

// Bid received item structure
interface BidReceivedItem {
  propertyId: string
  propertyName: string
  bid?: {
    bidderId: string
    amount: number
    message?: string
    status: 'active' | 'accepted' | 'declined' | 'cancelled'
    createdAt: string
  }
}

// Our internal bid structure for the UI
export interface Bid {
  id: string               // This will be generated as propertyId
  propertyId: string
  propertyName?: string
  bidder: string           // user ID of bidder
  owner: string            // user ID of property owner
  amount: number
  message?: string
  status: 'active' | 'accepted' | 'declined' | 'cancelled'
  createdAt: string
  updatedAt: string
}

interface PropertyStore {
  userProperties: Property[]
  bidsMade: Bid[]
  bidsReceived: Bid[]
  loading: {
    properties: boolean
    bidsMade: boolean
    bidsReceived: boolean
  }
  error: {
    properties: string | null
    bidsMade: string | null
    bidsReceived: string | null
  }
  authInitialized: boolean
  
  // Fetch user's properties
  fetchUserProperties: () => Promise<void>
  
  // Fetch bids made by user
  fetchBidsMade: () => Promise<void>
  
  // Fetch bids received on user's properties
  fetchBidsReceived: () => Promise<void>
  
  // Create a new bid
  createBid: (propertyId: string, amount: number, message?: string) => Promise<boolean>
  
  // Update bid status
  updateBidStatus: (bidId: string, status: Bid['status']) => Promise<boolean>
  
  // Reset error state
  resetErrors: () => void
  
  // Initialize auth state
  initAuth: () => Promise<boolean>
}

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Helper function to check if user is authenticated
const isUserAuthenticated = (): boolean => {
  return !!auth.currentUser;
}

// Helper function to wait for auth initialization
const waitForAuthInit = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    // First check if already authenticated
    if (isUserAuthenticated()) {
      resolve(true);
      return;
    }
    
    // If not, listen once for auth state change
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(!!user);
    });
    
    // If auth doesn't initialize within 2 seconds, continue anyway
    setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, 2000);
  });
};

// Helper function to handle authentication errors with retry
const fetchWithAuthRetry = async (url: string, options: RequestInit = {}, retryCount = 2): Promise<Response> => {
  try {
    // Wait for auth to be ready if user just logged in
    if (retryCount === 2 && !isUserAuthenticated()) {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    return await fetchWithAuth(url, options);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not authenticated' && retryCount > 0) {
      // Wait a bit and retry
      console.log(`Auth not ready, retrying (${retryCount} attempts left)...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithAuthRetry(url, options, retryCount - 1);
    }
    throw error;
  }
}

export const usePropertyStore = create<PropertyStore>((set, get) => ({
  userProperties: [],
  bidsMade: [],
  bidsReceived: [],
  loading: {
    properties: false,
    bidsMade: false,
    bidsReceived: false,
  },
  error: {
    properties: null,
    bidsMade: null,
    bidsReceived: null,
  },
  authInitialized: false,
  
  resetErrors: () => {
    set({
      error: {
        properties: null,
        bidsMade: null,
        bidsReceived: null,
      }
    });
  },
  
  initAuth: async () => {
    const isAuthenticated = await waitForAuthInit();
    set({ authInitialized: true });
    return isAuthenticated;
  },
  
  fetchUserProperties: async () => {
    // Initialize auth if not already done
    if (!get().authInitialized) {
      await get().initAuth();
    }
    
    // Soft check - don't set error during initial page load
    if (!isUserAuthenticated() && get().authInitialized) {
      console.log('Authentication check failed for properties, but not showing error during initialization');
      return;
    }
    
    try {
      set(state => ({ 
        loading: { ...state.loading, properties: true },
        error: { ...state.error, properties: null }
      }));
      
      const response = await fetchWithAuthRetry(`${API_URL}/properties/user/my-properties`);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const properties = await response.json();
      // Ensure properties is an array
      const propertiesArray = Array.isArray(properties) ? properties : [];
      set({ userProperties: propertiesArray });
    } catch (error) {
      console.error('Error fetching user properties:', error);
      // Set empty array on error
      set(state => ({
        userProperties: [],
        error: { ...state.error, properties: error instanceof Error ? error.message : 'Unknown error' }
      }));
    } finally {
      set(state => ({ loading: { ...state.loading, properties: false } }));
    }
  },
  
  fetchBidsMade: async () => {
    // Initialize auth if not already done
    if (!get().authInitialized) {
      await get().initAuth();
    }
    
    // Soft check - don't set error during initial page load
    if (!isUserAuthenticated() && get().authInitialized) {
      console.log('Authentication check failed for bids made, but not showing error during initialization');
      return;
    }
    
    try {
      set(state => ({ 
        loading: { ...state.loading, bidsMade: true },
        error: { ...state.error, bidsMade: null }
      }));
      
      const response = await fetchWithAuthRetry(`${API_URL}/properties/bids/made`);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      // Get the response data
      const data = await response.json() as BidsMadeResponse;
      
      // Transform the data to match our Bid interface
      const transformedBids: Bid[] = data.bids?.map(item => ({
        id: item.propertyId,             // Use propertyId as the bid id
        propertyId: item.propertyId,
        propertyName: item.propertyName,
        bidder: data.userId,             // Current user is the bidder
        owner: item.propertyOwner,
        amount: item.bid.amount,
        message: item.bid.message,
        status: item.bid.status,
        createdAt: item.bid.createdAt,
        updatedAt: item.bid.createdAt    // Use createdAt as updatedAt since it's not provided
      })) || [];
      
      set({ bidsMade: transformedBids });
    } catch (error) {
      console.error('Error fetching bids made:', error);
      // Set empty array on error
      set(state => ({
        bidsMade: [],
        error: { ...state.error, bidsMade: error instanceof Error ? error.message : 'Unknown error' }
      }));
    } finally {
      set(state => ({ loading: { ...state.loading, bidsMade: false } }));
    }
  },
  
  fetchBidsReceived: async () => {
    // Initialize auth if not already done
    if (!get().authInitialized) {
      await get().initAuth();
    }
    
    // Soft check - don't set error during initial page load
    if (!isUserAuthenticated() && get().authInitialized) {
      console.log('Authentication check failed for bids received, but not showing error during initialization');
      return;
    }
    
    try {
      set(state => ({ 
        loading: { ...state.loading, bidsReceived: true },
        error: { ...state.error, bidsReceived: null }
      }));
      
      const response = await fetchWithAuthRetry(`${API_URL}/properties/bids/received`);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform the data if it matches the expected format, otherwise use an empty array
      let transformedBids: Bid[] = [];
      
      if (data && data.bids && Array.isArray(data.bids)) {
        transformedBids = data.bids.map((item: BidReceivedItem) => ({
          id: item.propertyId,
          propertyId: item.propertyId,
          propertyName: item.propertyName,
          bidder: item.bid?.bidderId || 'unknown',
          owner: data.userId,
          amount: item.bid?.amount || 0,
          message: item.bid?.message,
          status: item.bid?.status || 'active',
          createdAt: item.bid?.createdAt || new Date().toISOString(),
          updatedAt: item.bid?.createdAt || new Date().toISOString()
        }));
      }
      
      set({ bidsReceived: transformedBids });
    } catch (error) {
      console.error('Error fetching bids received:', error);
      // Set empty array on error
      set(state => ({
        bidsReceived: [],
        error: { ...state.error, bidsReceived: error instanceof Error ? error.message : 'Unknown error' }
      }));
    } finally {
      set(state => ({ loading: { ...state.loading, bidsReceived: false } }));
    }
  },
  
  createBid: async (propertyId, amount, message) => {
    if (!isUserAuthenticated()) {
      set(state => ({ 
        error: { ...state.error, bidsMade: 'Authentication required to place a bid' }
      }));
      return false;
    }
    
    try {
      const response = await fetchWithAuthRetry(`${API_URL}/properties/bids`, {
        method: 'POST',
        body: JSON.stringify({
          propertyId,
          amount,
          message
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      // Refresh bids after creating a new one
      await get().fetchBidsMade();
      return true;
    } catch (error) {
      console.error('Error creating bid:', error);
      set(state => ({
        error: { 
          ...state.error, 
          bidsMade: error instanceof Error ? error.message : 'Unknown error' 
        }
      }));
      return false;
    }
  },
  
  updateBidStatus: async (bidId, status) => {
    if (!isUserAuthenticated()) {
      set(state => ({ 
        error: { ...state.error, bidsReceived: 'Authentication required to update bid status' }
      }));
      return false;
    }
    
    try {
      const response = await fetchWithAuthRetry(`${API_URL}/properties/bids/${bidId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      // Refresh both bid lists after updating
      await Promise.all([
        get().fetchBidsMade(),
        get().fetchBidsReceived()
      ]);
      
      return true;
    } catch (error) {
      console.error('Error updating bid status:', error);
      set(state => ({
        error: { 
          ...state.error, 
          bidsReceived: error instanceof Error ? error.message : 'Unknown error' 
        }
      }));
      return false;
    }
  }
})) 