import apiClient, { API_ENDPOINTS } from '../configs/apiConfig';
import authService from './authService';

/**
 * User Service
 * Handles user-related operations with MongoDB backend
 */
class UserService {
    /**
     * Get user profile by ID or current user
     * @param {string} userId - Optional user ID, defaults to current user
     * @returns {Promise<Object|null>}
     */
    async getUserProfile(userId = null) {
        try {
            let response;

            if (userId) {
                response = await apiClient.get(API_ENDPOINTS.USERS.BY_ID(userId));
            } else {
                // Get current user profile
                response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
            }

            if (response.data.success) {
                return response.data.data;
            }

            return null;
        } catch (error) {
            console.error('Get user profile error:', error);
            return null;
        }
    }

    /**
     * Update user profile
     * @param {Object} updates - Profile fields to update
     * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
     */
    async updateUserProfile(updates) {
        try {
            const response = await apiClient.put(API_ENDPOINTS.USERS.PROFILE, updates);

            if (response.data.success) {
                return { success: true, user: response.data.data };
            }

            return { success: false, error: response.data.error || 'Update failed' };
        } catch (error) {
            console.error('Update profile error:', error);
            return {
                success: false,
                error: error.response?.data?.error || error.message || 'Update failed',
            };
        }
    }

    /**
     * Search users with filters
     * @param {Object} options - Query options
     * @returns {Promise<{users: Array, pagination: Object}|null>}
     */
    async searchUsers(options = {}) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.USERS.BASE, {
                params: options
            });

            if (response.data.success) {
                return response.data.data;
            }

            return null;
        } catch (error) {
            console.error('Search users error:', error);
            return null;
        }
    }

    /**
     * Get current user subcollection data
     * @param {string} name - Subcollection name
     * @param {Object} options - Query options
     * @returns {Promise<Array>}
     */
    async getUserSubcollection(name, options = {}) {
        try {
            const response = await apiClient.get(API_ENDPOINTS.USERS.SUBCOLLECTION(name), {
                params: options
            });

            if (response.data.success) {
                return response.data.data?.items || [];
            }

            return [];
        } catch (error) {
            console.error('Get subcollection error:', error);
            return [];
        }
    }

    /**
     * Get user balance information
     * @returns {Promise<Object|null>}
     */
    async getUserBalance() {
        try {
            const profile = await this.getUserProfile();

            if (profile) {
                return {
                    walletAmount: profile.walletAmount || 0,
                    stockAmount: profile.stockAmount || 0,
                    agentWalletAmount: profile.agentWalletAmount || 0,
                    timeDepositAmount: profile.timeDepositAmount || 0,
                    usdtAmount: profile.usdtAmount || 0,
                    availBalanceAmount: profile.availBalanceAmount || 0,
                    dollarWalletAmount: profile.dollarWalletAmount || 0,
                    cryptoWalletAmount: profile.cryptoWalletAmount || 0,
                    cryptoBalances: profile.cryptoBalances || { BTC: 0, ETH: 0, USDT: 0 },
                    currencyBalances: profile.currencyBalances || { USD: 0, JPY: 0 },
                };
            }

            return null;
        } catch (error) {
            console.error('Get balance error:', error);
            return null;
        }
    }

    /**
     * Get user account type
     * @returns {Promise<string>}
     */
    async getAccountType() {
        try {
            const profile = await this.getUserProfile();
            return profile?.accountType || 'Basic';
        } catch (error) {
            console.error('Get account type error:', error);
            return 'Basic';
        }
    }

    /**
     * Check if user is an agent
     * @returns {Promise<boolean>}
     */
    async isAgent() {
        try {
            const profile = await this.getUserProfile();
            return profile?.agent === true;
        } catch (error) {
            console.error('Check agent status error:', error);
            return false;
        }
    }

    /**
     * Check if user is admin
     * @returns {Promise<boolean>}
     */
    async isAdmin() {
        try {
            const user = await authService.getStoredUser();
            return user?.role === 'admin' || user?.isAdmin === true;
        } catch (error) {
            console.error('Check admin status error:', error);
            return false;
        }
    }

    /**
     * Get user's full name
     * @returns {Promise<string>}
     */
    async getUserFullName() {
        try {
            const profile = await this.getUserProfile();
            if (profile) {
                return `${profile.firstName} ${profile.lastName}`.trim();
            }
            return '';
        } catch (error) {
            console.error('Get full name error:', error);
            return '';
        }
    }
}

// Export singleton instance
export default new UserService();
