import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { firestore } from "../configs/firebase";

/**
 * Contacts Service
 * Manages saved contacts (account numbers) for each user
 * Contacts are stored in users/{userId}/contacts subcollection
 */
class ContactsService {
  /**
   * Add a new contact for the user
   * @param {string} userId - The user's ID
   * @param {Object} contactData - Contact information
   * @param {string} contactData.accountNumber - Account number (required)
   * @param {string} contactData.firstName - First name
   * @param {string} contactData.lastName - Last name
   * @param {string} contactData.emailAddress - Email address
   * @param {string} contactData.nickname - Optional nickname for the contact
   * @returns {Promise<Object>} Created contact with ID
   */
  async addContact(userId, contactData) {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      if (!contactData.accountNumber) {
        throw new Error("Account number is required");
      }

      // Check if contact with this account number already exists
      const existingContact = await this.getContactByAccountNumber(
        userId,
        contactData.accountNumber
      );

      if (existingContact) {
        // Update existing contact instead of creating duplicate
        return await this.updateContact(userId, existingContact.id, contactData);
      }

      const contactsRef = collection(firestore, `users/${userId}/contacts`);
      const contactDoc = await addDoc(contactsRef, {
        accountNumber: contactData.accountNumber,
        firstName: contactData.firstName || "",
        lastName: contactData.lastName || "",
        emailAddress: contactData.emailAddress || "",
        nickname: contactData.nickname || "",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: new Date(), // Track when contact was last used for transfer
      });

      return {
        id: contactDoc.id,
        ...contactData,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      };
    } catch (error) {
      console.error("Error adding contact:", error);
      throw error;
    }
  }

  /**
   * Get all contacts for a user
   * @param {string} userId - The user's ID
   * @param {Object} options - Query options
   * @param {boolean} options.orderByLastUsed - Order by last used date (default: true)
   * @returns {Promise<Array>} Array of contacts
   */
  async getContacts(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const contactsRef = collection(firestore, `users/${userId}/contacts`);
      let q;

      if (options.orderByLastUsed !== false) {
        // Order by last used date (most recently used first)
        q = query(contactsRef, orderBy("lastUsedAt", "desc"));
      } else {
        // Order by creation date
        q = query(contactsRef, orderBy("createdAt", "desc"));
      }

      const querySnapshot = await getDocs(q);
      const contacts = [];

      querySnapshot.forEach((doc) => {
        contacts.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return contacts;
    } catch (error) {
      console.error("Error getting contacts:", error);
      throw error;
    }
  }

  /**
   * Get a contact by account number
   * @param {string} userId - The user's ID
   * @param {string} accountNumber - Account number to search for
   * @returns {Promise<Object|null>} Contact if found, null otherwise
   */
  async getContactByAccountNumber(userId, accountNumber) {
    try {
      if (!userId || !accountNumber) {
        return null;
      }

      const contactsRef = collection(firestore, `users/${userId}/contacts`);
      const q = query(contactsRef, where("accountNumber", "==", accountNumber));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
        };
      }

      return null;
    } catch (error) {
      console.error("Error getting contact by account number:", error);
      return null;
    }
  }

  /**
   * Get a single contact by ID
   * @param {string} userId - The user's ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object|null>} Contact if found, null otherwise
   */
  async getContact(userId, contactId) {
    try {
      if (!userId || !contactId) {
        return null;
      }

      const contactRef = doc(firestore, `users/${userId}/contacts/${contactId}`);
      const contactDoc = await getDoc(contactRef);

      if (contactDoc.exists()) {
        return {
          id: contactDoc.id,
          ...contactDoc.data(),
        };
      }

      return null;
    } catch (error) {
      console.error("Error getting contact:", error);
      return null;
    }
  }

  /**
   * Update a contact
   * @param {string} userId - The user's ID
   * @param {string} contactId - Contact ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(userId, contactId, updateData) {
    try {
      if (!userId || !contactId) {
        throw new Error("User ID and Contact ID are required");
      }

      const contactRef = doc(firestore, `users/${userId}/contacts/${contactId}`);
      const updatePayload = {
        ...updateData,
        updatedAt: new Date(),
      };

      await updateDoc(contactRef, updatePayload);

      const updatedDoc = await getDoc(contactRef);
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };
    } catch (error) {
      console.error("Error updating contact:", error);
      throw error;
    }
  }

  /**
   * Update last used timestamp for a contact
   * @param {string} userId - The user's ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<void>}
   */
  async updateLastUsed(userId, contactId) {
    try {
      if (!userId || !contactId) {
        return;
      }

      const contactRef = doc(firestore, `users/${userId}/contacts/${contactId}`);
      await updateDoc(contactRef, {
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating last used:", error);
      // Don't throw error for this, it's not critical
    }
  }

  /**
   * Delete a contact
   * @param {string} userId - The user's ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<void>}
   */
  async deleteContact(userId, contactId) {
    try {
      if (!userId || !contactId) {
        throw new Error("User ID and Contact ID are required");
      }

      const contactRef = doc(firestore, `users/${userId}/contacts/${contactId}`);
      await deleteDoc(contactRef);
    } catch (error) {
      console.error("Error deleting contact:", error);
      throw error;
    }
  }

  /**
   * Subscribe to contacts changes (real-time updates)
   * @param {string} userId - The user's ID
   * @param {Function} callback - Callback function to receive updates
   * @returns {Function} Unsubscribe function
   */
  subscribeToContacts(userId, callback) {
    if (!userId) {
      console.error("User ID is required for subscription");
      return () => {};
    }

    try {
      const contactsRef = collection(firestore, `users/${userId}/contacts`);
      const q = query(contactsRef, orderBy("lastUsedAt", "desc"));

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const contacts = [];
          querySnapshot.forEach((doc) => {
            contacts.push({
              id: doc.id,
              ...doc.data(),
            });
          });
          callback(contacts);
        },
        (error) => {
          console.error("Error in contacts subscription:", error);
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up contacts subscription:", error);
      return () => {};
    }
  }

  /**
   * Search contacts by name or account number
   * @param {string} userId - The user's ID
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of matching contacts
   */
  async searchContacts(userId, searchTerm) {
    try {
      if (!userId || !searchTerm) {
        return [];
      }

      const allContacts = await this.getContacts(userId, {
        orderByLastUsed: false,
      });

      const searchLower = searchTerm.toLowerCase().trim();

      return allContacts.filter((contact) => {
        const accountNumber = (contact.accountNumber || "").toLowerCase();
        const firstName = (contact.firstName || "").toLowerCase();
        const lastName = (contact.lastName || "").toLowerCase();
        const nickname = (contact.nickname || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`.toLowerCase();

        return (
          accountNumber.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          fullName.includes(searchLower) ||
          nickname.includes(searchLower)
        );
      });
    } catch (error) {
      console.error("Error searching contacts:", error);
      return [];
    }
  }
}

// Export singleton instance
const contactsService = new ContactsService();
export default contactsService;
