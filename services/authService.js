import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { API_ENDPOINTS, STORAGE_KEYS } from '../configs/apiConfig';

/**
 * Authentication Service
 * Handles all authentication operations with MongoDB backend
 */
class AuthService {
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<{success: boolean, user?: Object, token?: string, error?: string}>}
     */
    async register(userData, options = {}) {
        try {
            const { persistSession = true } = options;
            const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, {
                firstName: userData.firstName,
                lastName: userData.lastName,
                emailAddress: userData.email || userData.emailAddress,
                password: userData.password,
                confirmPassword: userData.confirmPassword,
                agent: userData.agent || false,
                agentNumber: userData.agentNumber,
                agentCode: userData.agentCode,
                refferedAgent: userData.refferedAgent || '0',
                pendingReferral: userData.pendingReferral,
                userId: userData.userId,
            });

            if (response.data.success) {
                const { user, token } = response.data.data;

                // Store token and user data
                if (persistSession) {
                    await this.storeAuthData(token, user);
                }

                return { success: true, user, token };
            }

            return { success: false, error: response.data.error || 'Registration failed' };
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: error.response?.data?.error || error.message || 'Registration failed',
            };
        }
    }

    /**
     * Login user (supports migration when Firebase token is provided)
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string|null} firebaseToken - Firebase ID token (optional)
     * @returns {Promise<{success: boolean, user?: Object, token?: string, needsMigration?: boolean, message?: string, data?: Object, error?: string}>}
     */
    async login(email, password, firebaseToken = null) {
        try {
            const payload = {
                emailAddress: email,
                password: password,
            };

            if (firebaseToken) {
                payload.firebaseToken = firebaseToken;
            }

            const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, payload);

            if (response.data.success) {
                const { user, token } = response.data.data;

                // Store token and user data
                await this.storeAuthData(token, user);

                return { success: true, user, token };
            }

            if (response.data.needsMigration) {
                return {
                    success: false,
                    needsMigration: true,
                    message: response.data.message || 'Migration required',
                    data: response.data.data,
                };
            }

            return {
                success: false,
                error: response.data.error || response.data.message || 'Login failed',
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.response?.data?.error || error.message || 'Login failed',
            };
        }
    }

    /**
     * Check migration status for a Firebase user
     * @param {string} firebaseToken - Firebase ID token
     * @returns {Promise<{success: boolean, needsMigration?: boolean, message?: string, firebaseUserId?: string, email?: string, userExists?: boolean, error?: string}>}
     */
    async checkMigrationStatus(firebaseToken) {
        try {
            const response = await apiClient.post(API_ENDPOINTS.MIGRATION.CHECK_STATUS, {
                firebaseToken,
            });

            if (response.data.success) {
                const status = response.data.data || {};
                return {
                    success: true,
                    ...status,
                };
            }

            return {
                success: false,
                error: response.data.error || response.data.message || 'Migration status check failed',
            };
        } catch (error) {
            console.error('Migration status error:', error);
            return {
                success: false,
                error: error.response?.data?.error || error.message || 'Migration status check failed',
            };
        }
    }

    /**
     * Login with Firebase token and link/create MongoDB user
     * @param {string} firebaseToken - Firebase ID token
     * @returns {Promise<{success: boolean, user?: Object, token?: string, error?: string, status?: number}>}
     */
    async loginWithFirebaseToken(firebaseToken) {
        try {
            const response = await apiClient.post(API_ENDPOINTS.AUTH.FIREBASE_LOGIN, {
                firebaseToken,
            });

            if (response.data.success) {
                const { user, token } = response.data.data;
                await this.storeAuthData(token, user);
                return { success: true, user, token };
            }

            return {
                success: false,
                error: response.data.error || 'Login failed',
                status: response.status,
            };
        } catch (error) {
            console.error('Firebase login error:', error);
            return {
                success: false,
                error: error.response?.data?.error || error.message || 'Login failed',
                status: error.response?.status,
            };
        }
    }

    /**
     * Setup password for Firebase migration
     * @param {string} firebaseToken - Firebase ID token
     * @param {string} password - New password
     * @param {string} confirmPassword - Password confirmation
     * @returns {Promise<{success: boolean, user?: Object, token?: string, error?: string}>}
     */
    async setupMigrationPassword(firebaseToken, password, confirmPassword = password) {
        try {
            const response = await apiClient.post(API_ENDPOINTS.MIGRATION.SETUP_PASSWORD, {
                firebaseToken,
                password,
                confirmPassword,
            });

            if (response.data.success) {
                const { user, token } = response.data.data;
                await this.storeAuthData(token, user);
                return { success: true, user, token };
            }

            return {
                success: false,
                error: response.data.error || response.data.message || 'Migration failed',
            };
        } catch (error) {
            console.error('Migration setup error:', error);
            return {
                success: false,
                error: error.response?.data?.error || error.message || 'Migration failed',
            };
        }
    }

    /**
     * Logout user
     * @returns {Promise<{success: boolean}>}
     */
    async logout() {
        try {
            // Clear stored auth data
            await AsyncStorage.multiRemove([
                STORAGE_KEYS.TOKEN,
                STORAGE_KEYS.USER,
                STORAGE_KEYS.REFRESH_TOKEN,
            ]);

            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current user profile from backend
     * @returns {Promise<Object|null>}
     */
    async getCurrentUserProfile() {
        try {
            const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);

            if (response.data.success) {
                const user = response.data.data;
                // Update stored user data
                await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
                return user;
            }

            return null;
        } catch (error) {
            console.error('Get profile error:', error);
            return null;
        }
    }

    /**
     * Get stored authentication token
     * @returns {Promise<string|null>}
     */
    async getStoredToken() {
        try {
            return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        } catch (error) {
            console.error('Error getting stored token:', error);
            return null;
        }
    }

    /**
     * Get stored user data
     * @returns {Promise<Object|null>}
     */
    async getStoredUser() {
        try {
            const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);
            return userJson ? JSON.parse(userJson) : null;
        } catch (error) {
            console.error('Error getting stored user:', error);
            return null;
        }
    }

    /**
     * Check if user is authenticated (has valid token)
     * @returns {Promise<boolean>}
     */
    async isAuthenticated() {
        const token = await this.getStoredToken();
        return !!token;
    }

    /**
     * Store authentication data
     * @private
     */
    async storeAuthData(token, user) {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
            await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        } catch (error) {
            console.error('Error storing auth data:', error);
            throw error;
        }
    }

    /**
     * Validate JWT token (basic check - doesn't verify signature)
     * @returns {Promise<boolean>}
     */
    async validateToken() {
        try {
            const token = await this.getStoredToken();
            if (!token) return false;

            // Try to fetch profile with current token
            const profile = await this.getCurrentUserProfile();
            return !!profile;
        } catch (error) {
            return false;
        }
    }
}

// Export singleton instance
export default new AuthService();
