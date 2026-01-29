import { useState, useEffect } from 'react';
import authService from '../services/authService';
import userService from '../services/userService';

/**
 * Custom hook for MongoDB-backed authentication
 * Replaces Firebase Auth with JWT-based backend authentication
 */
export const useMobileAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize authentication state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Initialize authentication - check for stored token and user
   */
  const initializeAuth = async () => {
    try {
      setLoading(true);

      const token = await authService.getStoredToken();

      if (token) {
        // Validate token and get fresh user data
        const userProfile = await authService.getCurrentUserProfile();

        if (userProfile) {
          setUser({
            uid: userProfile._id,
            id: userProfile._id,
            email: userProfile.emailAddress,
            emailAddress: userProfile.emailAddress,
            displayName: `${userProfile.firstName} ${userProfile.lastName}`,
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            accountNumber: userProfile.accountNumber,
            accountType: userProfile.accountType,
            agent: userProfile.agent,
            agentNumber: userProfile.agentNumber,
            agentCode: userProfile.agentCode,
            ...userProfile
          });
        } else {
          // Token invalid, clear auth
          await authService.logout();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const result = await authService.login(email, password);

      if (result.success) {
        // Set user state with formatted data
        setUser({
          uid: result.user._id,
          id: result.user._id,
          email: result.user.emailAddress,
          emailAddress: result.user.emailAddress,
          displayName: `${result.user.firstName} ${result.user.lastName}`,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          accountNumber: result.user.accountNumber,
          accountType: result.user.accountType,
          agent: result.user.agent,
          agentNumber: result.user.agentNumber,
          agentCode: result.user.agentCode,
          ...result.user
        });

        return { success: true, user: result.user };
      }

      if (result.needsMigration) {
        const message = result.message || 'Migration required';
        setError(message);
        return { success: false, needsMigration: true, message, data: result.data };
      }

      setError(result.error);
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Sign in error:', error);
      const errorMessage = error.message || 'Sign in failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (email, password, firstName, lastName, additionalData = {}) => {
    try {
      setError(null);
      setLoading(true);

      const userData = {
        email,
        emailAddress: email,
        password,
        confirmPassword: password, // Backend expects this
        firstName,
        lastName,
        ...additionalData
      };

      const result = await authService.register(userData);

      if (result.success) {
        // Set user state with formatted data
        setUser({
          uid: result.user._id,
          id: result.user._id,
          email: result.user.emailAddress,
          emailAddress: result.user.emailAddress,
          displayName: `${result.user.firstName} ${result.user.lastName}`,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          accountNumber: result.user.accountNumber,
          accountType: result.user.accountType,
          agent: result.user.agent,
          agentNumber: result.user.agentNumber,
          agentCode: result.user.agentCode,
          ...result.user
        });

        return { success: true, user: result.user };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Sign up error:', error);
      const errorMessage = error.message || 'Sign up failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out
   */
  const logout = async () => {
    try {
      setError(null);

      const result = await authService.logout();

      if (result.success) {
        setUser(null);
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Sign out error:', error);
      const errorMessage = error.message || 'Sign out failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Update user profile
   */
  const updateUserProfile = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in');

      setError(null);

      const result = await userService.updateUserProfile(updates);

      if (result.success) {
        // Update local user state
        setUser(prev => ({
          ...prev,
          ...updates,
          displayName: updates.firstName && updates.lastName
            ? `${updates.firstName} ${updates.lastName}`
            : prev.displayName
        }));

        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = error.message || 'Profile update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Get user profile
   */
  const getUserProfile = async (userId = null) => {
    try {
      return await userService.getUserProfile(userId);
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  };

  /**
   * Check if user is admin
   */
  const isAdmin = () => {
    return user?.role === 'admin' || user?.isAdmin === true;
  };

  /**
   * Set user online status (placeholder - implement with backend presence API)
   */
  const setOnlineStatus = async (isOnline) => {
    try {
      if (!user) return;

      // TODO: Implement presence API when backend supports it
      console.log('Presence status update:', isOnline);

      // For now, just a placeholder
      // await presenceService.updateStatus(user.id, isOnline);
    } catch (error) {
      console.error('Set online status error:', error);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    logout,
    updateUserProfile,
    getUserProfile,
    isAdmin,
    setOnlineStatus,
    isAuthenticated: !!user,
    refreshUser: initializeAuth, // Allow manual refresh
  };
};
