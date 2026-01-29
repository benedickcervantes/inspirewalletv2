import authService from "../services/authService";
import userService from "../services/userService";

/**
 * Check if the current user has the required account type to access a feature
 * @param {string} requiredType - "Basic" or "Premium" 
 * @returns {Promise<{hasAccess: boolean, userAccountType: string}>}
 */
export const checkAccountTypeAccess = async (requiredType = "Premium") => {
  try {
    const user = await authService.getStoredUser();

    if (!user) {
      return { hasAccess: false, userAccountType: null };
    }

    // Check if the user is the specific user ID that should be restricted
    // Note: This was previously a Firebase UID, may need updating for MongoDB _id
    const restrictedUserId = "JgJ3mmw2pOOEXwzdOghRic059gl1";

    // Get fresh user data from backend
    const userData = await userService.getUserProfile();

    if (!userData) {
      return { hasAccess: false, userAccountType: null };
    }

    const userAccountType = userData.accountType || "Basic"; // Default to Basic if not set

    // If the user is the restricted user and has Basic account type
    if (user._id === restrictedUserId && userAccountType === "Basic") {
      return { hasAccess: false, userAccountType };
    }

    // If the user is the restricted user but has Premium account type
    if (user._id === restrictedUserId && userAccountType === "Premium") {
      return { hasAccess: true, userAccountType };
    }

    // For all other users, allow access (existing behavior)
    return { hasAccess: true, userAccountType };

  } catch (error) {
    console.error("Error checking account type access:", error);
    return { hasAccess: false, userAccountType: null };
  }
};

/**
 * Check if user has Premium account type
 * @returns {Promise<boolean>}
 */
export const isPremiumUser = async () => {
  const { hasAccess, userAccountType } = await checkAccountTypeAccess("Premium");
  return userAccountType === "Premium";
};

/**
 * Check if user is the restricted user with Basic account
 * @returns {Promise<boolean>}
 */
export const isRestrictedBasicUser = async () => {
  try {
    const user = await authService.getStoredUser();
    const restrictedUserId = "JgJ3mmw2pOOEXwzdOghRic059gl1";

    if (!user || user._id !== restrictedUserId) {
      return false;
    }

    const { userAccountType } = await checkAccountTypeAccess();
    return userAccountType === "Basic";
  } catch (error) {
    console.error("Error checking if restricted basic user:", error);
    return false;
  }
};
