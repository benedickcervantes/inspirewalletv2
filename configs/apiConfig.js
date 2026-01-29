import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const API_TIMEOUT = 30000; // 30 seconds

// Storage Keys
export const STORAGE_KEYS = {
    TOKEN: '@inspire_wallet_token',
    USER: '@inspire_wallet_user',
    REFRESH_TOKEN: '@inspire_wallet_refresh_token',
};

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Error getting token from storage:', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle token expiration
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Clear stored auth data on 401
                await AsyncStorage.multiRemove([
                    STORAGE_KEYS.TOKEN,
                    STORAGE_KEYS.USER,
                    STORAGE_KEYS.REFRESH_TOKEN,
                ]);

                // Optionally: implement token refresh logic here if backend supports it
                // For now, just clear and require re-login
            } catch (clearError) {
                console.error('Error clearing auth data:', clearError);
            }
        }

        return Promise.reject(error);
    }
);

// API Endpoints
export const API_ENDPOINTS = {
    // Authentication
    AUTH: {
        REGISTER: '/api/auth/register',
        LOGIN: '/api/auth/login',
        FIREBASE_LOGIN: '/api/auth/firebase-login',
        PROFILE: '/api/auth/profile',
        LOGOUT: '/api/auth/logout',
    },
    MIGRATION: {
        CHECK_STATUS: '/api/migration/check-status',
        SETUP_PASSWORD: '/api/migration/setup-password',
    },

    // Agents
    AGENTS: {
        BASE: '/api/agents',
        BY_NUMBER: (agentNumber) => `/api/agents/number/${agentNumber}`,
        BY_CODE: (agentCode) => `/api/agents/code/${agentCode}`,
        HIERARCHY: (agentNumber) => `/api/agents/${agentNumber}/hierarchy`,
    },

    // Users
    USERS: {
        BASE: '/api/users',
        BY_ID: (userId) => `/api/users/${userId}`,
        PROFILE: '/api/users/profile',
        UPDATE_BALANCE: '/api/users/balance',
        SUBCOLLECTION: (name) => `/api/users/subcollections/${name}`,
    },

    // Transactions (to be implemented on backend)
    TRANSACTIONS: {
        BASE: '/api/transactions',
        TRANSFER: '/api/transactions/transfer',
        WITHDRAW: '/api/transactions/withdraw',
        DEPOSIT: '/api/transactions/deposit',
        HISTORY: '/api/transactions/history',
    },

    // Stocks (to be implemented on backend)
    STOCKS: {
        BASE: '/api/stocks',
        BALANCE: '/api/stocks/balance',
        TRANSFER: '/api/stocks/transfer',
    },
};

export default apiClient;
