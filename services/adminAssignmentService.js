import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  increment
} from 'firebase/firestore';

const db = getFirestore();

// Admin Assignment Service
class AdminAssignmentService {

  // Create an admin profile
  async createAdmin(adminData) {
    try {
      const { adminId, name, email, maxUsers = 10 } = adminData;

      const adminRef = doc(db, 'admins', adminId);
      await setDoc(adminRef, {
        adminId,
        name,
        email,
        maxUsers,
        currentUsers: 0,
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date()
      });

      return { success: true, adminId };
    } catch (error) {
      console.error('Error creating admin:', error);
      throw error;
    }
  }

  // Get admin with least assigned users (round-robin)
  async getNextAvailableAdmin() {
    try {
      const adminsRef = collection(db, 'admins');
      const q = query(
        adminsRef,
        where('isActive', '==', true),
        where('currentUsers', '<', 10), // Less than max capacity
        orderBy('currentUsers', 'asc'), // Order by least assigned users
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No available admins found');
      }

      const adminDoc = querySnapshot.docs[0];
      return {
        adminId: adminDoc.id,
        ...adminDoc.data()
      };
    } catch (error) {
      console.error('Error getting next available admin:', error);
      throw error;
    }
  }

  // Assign a user to an admin (enhanced for mobile users)
  async assignUserToAdmin(userId, userEmail, userName) {
    try {
      // Check if user is already assigned
      const assignmentRef = doc(db, 'userAssignments', userId);
      const existingAssignment = await getDoc(assignmentRef);

      if (existingAssignment.exists()) {
        const assignmentData = existingAssignment.data();

        // Get admin details
        const adminRef = doc(db, 'admins', assignmentData.adminId);
        const adminDoc = await getDoc(adminRef);

        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          return {
            adminId: assignmentData.adminId,
            adminName: adminData.name,
            adminEmail: adminData.email,
            assignment: assignmentData
          };
        }
      }

      // Get next available admin
      const admin = await this.getNextAvailableAdmin();

      // Create assignment record
      const assignmentData = {
        userId,
        adminId: admin.adminId,
        assignedAt: new Date(),
        userProfile: {
          email: userEmail,
          displayName: userName,
          platform: 'mobile'
        },
        status: 'active'
      };

      await setDoc(assignmentRef, assignmentData);

      // Update admin's current user count
      const adminRef = doc(db, 'admins', admin.adminId);
      await updateDoc(adminRef, {
        currentUsers: increment(1),
        lastActivity: new Date()
      });

      return {
        adminId: admin.adminId,
        adminName: admin.name,
        adminEmail: admin.email,
        assignment: assignmentData
      };
    } catch (error) {
      console.error('Error assigning user to admin:', error);
      throw error;
    }
  }

  // Get user's assigned admin
  async getUserAssignedAdmin(userId) {
    try {
      const assignmentRef = doc(db, 'userAssignments', userId);
      const assignmentDoc = await getDoc(assignmentRef);

      if (!assignmentDoc.exists()) {
        return null;
      }

      const assignment = assignmentDoc.data();

      // Get admin details
      const adminRef = doc(db, 'admins', assignment.adminId);
      const adminDoc = await getDoc(adminRef);

      if (!adminDoc.exists()) {
        return null;
      }

      return {
        assignment,
        admin: adminDoc.data()
      };
    } catch (error) {
      console.error('Error getting user assigned admin:', error);
      throw error;
    }
  }

  // Get all users assigned to an admin
  async getAdminAssignedUsers(adminId) {
    try {
      const assignmentsRef = collection(db, 'userAssignments');
      const q = query(
        assignmentsRef,
        where('adminId', '==', adminId),
        where('status', '==', 'active')
      );

      const querySnapshot = await getDocs(q);
      const assignments = [];

      querySnapshot.forEach((doc) => {
        assignments.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return assignments;
    } catch (error) {
      console.error('Error getting admin assigned users:', error);
      throw error;
    }
  }

  // Reassign user to different admin
  async reassignUser(userId, newAdminId) {
    try {
      const assignmentRef = doc(db, 'userAssignments', userId);
      const existingAssignment = await getDoc(assignmentRef);

      if (!existingAssignment.exists()) {
        throw new Error('User assignment not found');
      }

      const oldAdminId = existingAssignment.data().adminId;

      // Update assignment
      await updateDoc(assignmentRef, {
        adminId: newAdminId,
        reassignedAt: new Date(),
        previousAdminId: oldAdminId
      });

      // Update old admin count
      const oldAdminRef = doc(db, 'admins', oldAdminId);
      await updateDoc(oldAdminRef, {
        currentUsers: increment(-1)
      });

      // Update new admin count
      const newAdminRef = doc(db, 'admins', newAdminId);
      await updateDoc(newAdminRef, {
        currentUsers: increment(1),
        lastActivity: new Date()
      });

      return { success: true };
    } catch (error) {
      console.error('Error reassigning user:', error);
      throw error;
    }
  }

  // Get admin statistics
  async getAdminStats(adminId) {
    try {
      const adminRef = doc(db, 'admins', adminId);
      const adminDoc = await getDoc(adminRef);

      if (!adminDoc.exists()) {
        throw new Error('Admin not found');
      }

      const adminData = adminDoc.data();
      const assignedUsers = await this.getAdminAssignedUsers(adminId);

      return {
        adminId,
        name: adminData.name,
        email: adminData.email,
        maxUsers: adminData.maxUsers,
        currentUsers: adminData.currentUsers,
        assignedUsers: assignedUsers,
        utilizationPercent: Math.round((adminData.currentUsers / adminData.maxUsers) * 100),
        isActive: adminData.isActive,
        lastActivity: adminData.lastActivity
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      throw error;
    }
  }

  // Get all admins with their stats
  async getAllAdminsStats() {
    try {
      const adminsRef = collection(db, 'admins');
      const querySnapshot = await getDocs(adminsRef);

      const adminsStats = [];

      for (const doc of querySnapshot.docs) {
        const adminData = doc.data();
        const assignedUsers = await this.getAdminAssignedUsers(doc.id);

        adminsStats.push({
          adminId: doc.id,
          name: adminData.name,
          email: adminData.email,
          maxUsers: adminData.maxUsers,
          currentUsers: adminData.currentUsers,
          assignedUsersCount: assignedUsers.length,
          utilizationPercent: Math.round((adminData.currentUsers / adminData.maxUsers) * 100),
          isActive: adminData.isActive,
          lastActivity: adminData.lastActivity
        });
      }

      return adminsStats;
    } catch (error) {
      console.error('Error getting all admins stats:', error);
      throw error;
    }
  }

  // Create a chat ticket between user and their assigned admin
  async createChatTicket(userId, title, description) {
    try {
      const userAdmin = await this.getUserAssignedAdmin(userId);

      if (!userAdmin) {
        throw new Error('User is not assigned to any admin');
      }

      const ticketId = `ticket_${userId}_${Date.now()}`;

      // Create ticket in user's tickets collection
      const userTicketRef = doc(db, 'users', userId, 'tickets', ticketId);
      await setDoc(userTicketRef, {
        id: ticketId,
        title,
        description,
        status: 'open',
        adminId: userAdmin.admin.adminId,
        adminName: userAdmin.admin.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [{
          id: Date.now(),
          sender: `${userAdmin.assignment.userProfile.firstName} ${userAdmin.assignment.userProfile.lastName}`,
          message: description,
          timestamp: new Date(),
          isCustomer: true
        }]
      });

      // Create corresponding ticket in admin's chat collection
      const adminTicketRef = doc(db, 'adminChats', userAdmin.admin.adminId, 'tickets', ticketId);
      await setDoc(adminTicketRef, {
        id: ticketId,
        title,
        description,
        status: 'open',
        userId,
        userName: `${userAdmin.assignment.userProfile.firstName} ${userAdmin.assignment.userProfile.lastName}`,
        userEmail: userAdmin.assignment.userProfile.email,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [{
          id: Date.now(),
          sender: `${userAdmin.assignment.userProfile.firstName} ${userAdmin.assignment.userProfile.lastName}`,
          message: description,
          timestamp: new Date(),
          isCustomer: true
        }]
      });

      return {
        ticketId,
        adminId: userAdmin.admin.adminId,
        adminName: userAdmin.admin.name
      };
    } catch (error) {
      console.error('Error creating chat ticket:', error);
      throw error;
    }
  }
}

export default new AdminAssignmentService();