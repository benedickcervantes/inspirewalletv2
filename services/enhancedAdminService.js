import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import enhancedPresenceService from './enhancedPresenceService';

class EnhancedAdminService {
  constructor() {
    this.adminListeners = new Map();
    this.workloadCache = new Map();
    this.assignmentAlgorithm = 'intelligent'; // 'round-robin', 'least-loaded', 'intelligent'
    this.rebalanceInterval = null;
  }

  // Initialize enhanced admin service
  async initialize() {
    try {
      await this.loadAdminWorkloads();
      this.startWorkloadMonitoring();
      this.startAutoRebalancing();

      return { success: true };
    } catch (error) {
      console.error('Error initializing enhanced admin service:', error);
      throw error;
    }
  }

  // Create enhanced admin profile with specializations
  async createEnhancedAdmin(adminData) {
    try {
      const adminId = adminData.adminId || `admin_${Date.now()}`;

      const enhancedAdminData = {
        adminId,
        profile: {
          name: adminData.name,
          email: adminData.email,
          displayName: adminData.displayName || adminData.name,
          avatar: adminData.avatar || null,
          timezone: adminData.timezone || 'UTC',
          language: adminData.language || 'en'
        },
        capabilities: {
          maxConcurrentUsers: adminData.maxUsers || 10,
          maxDailyUsers: adminData.maxDailyUsers || 50,
          specializations: adminData.specializations || [],
          languages: adminData.supportedLanguages || ['en'],
          workingHours: {
            enabled: adminData.workingHours?.enabled || false,
            timezone: adminData.workingHours?.timezone || adminData.timezone || 'UTC',
            schedule: adminData.workingHours?.schedule || {
              monday: { start: '09:00', end: '17:00', enabled: true },
              tuesday: { start: '09:00', end: '17:00', enabled: true },
              wednesday: { start: '09:00', end: '17:00', enabled: true },
              thursday: { start: '09:00', end: '17:00', enabled: true },
              friday: { start: '09:00', end: '17:00', enabled: true },
              saturday: { start: '10:00', end: '14:00', enabled: false },
              sunday: { start: '10:00', end: '14:00', enabled: false }
            }
          }
        },
        status: {
          isActive: true,
          availability: adminData.availability || 'available', // 'available', 'busy', 'away', 'offline'
          customStatus: adminData.customStatus || '',
          lastActivity: serverTimestamp()
        },
        workload: {
          currentUsers: 0,
          dailyUsers: 0,
          averageResponseTime: 0,
          totalConversations: 0,
          activeConversations: [],
          lastAssignment: null
        },
        performance: {
          customerSatisfactionScore: 0,
          totalRatings: 0,
          averageResponseTime: 0,
          conversationsResolved: 0,
          responseRate: 100,
          onlineHours: 0
        },
        preferences: {
          autoAssignment: adminData.autoAssignment !== false,
          notificationSettings: {
            newAssignment: true,
            newMessage: true,
            urgentMessages: true,
            workloadAlerts: true
          },
          workloadThresholds: {
            warning: 0.8, // 80% of max capacity
            critical: 0.95 // 95% of max capacity
          }
        },
        metadata: {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          version: '2.0'
        }
      };

      const adminRef = doc(db, 'enhancedAdmins', adminId);
      await setDoc(adminRef, enhancedAdminData);

      // Initialize presence tracking
      await enhancedPresenceService.initializePresence(adminId, {
        role: 'admin',
        platform: 'web'
      });

      // Update cache
      this.workloadCache.set(adminId, enhancedAdminData.workload);

      return { success: true, adminId, adminData: enhancedAdminData };

    } catch (error) {
      console.error('Error creating enhanced admin:', error);
      throw error;
    }
  }

  // Intelligent admin assignment with multiple factors
  async assignUserToOptimalAdmin(userId, userInfo = {}) {
    try {
      // Get all available admins
      const availableAdmins = await this.getAvailableAdmins();

      if (!availableAdmins.length) {
        throw new Error('No available admins found');
      }

      // Calculate optimal admin based on algorithm
      let selectedAdmin;

      switch (this.assignmentAlgorithm) {
        case 'round-robin':
          selectedAdmin = this.selectRoundRobin(availableAdmins);
          break;
        case 'least-loaded':
          selectedAdmin = this.selectLeastLoaded(availableAdmins);
          break;
        case 'intelligent':
        default:
          selectedAdmin = await this.selectIntelligent(availableAdmins, userInfo);
          break;
      }

      if (!selectedAdmin) {
        throw new Error('Could not select optimal admin');
      }

      // Create assignment
      const assignment = await this.createAssignment(userId, selectedAdmin.adminId, userInfo);

      // Update admin workload
      await this.updateAdminWorkload(selectedAdmin.adminId, {
        currentUsers: increment(1),
        dailyUsers: increment(1),
        activeConversations: arrayUnion(assignment.conversationId),
        lastAssignment: serverTimestamp()
      });

      // Track assignment analytics
      await this.trackAssignmentDecision(selectedAdmin.adminId, userId, {
        algorithm: this.assignmentAlgorithm,
        factors: await this.getAssignmentFactors(selectedAdmin, userInfo),
        alternativeOptions: availableAdmins.length
      });

      return {
        adminId: selectedAdmin.adminId,
        adminName: selectedAdmin.profile.name,
        adminEmail: selectedAdmin.profile.email,
        assignment,
        assignmentMethod: this.assignmentAlgorithm
      };

    } catch (error) {
      console.error('Error assigning user to optimal admin:', error);
      throw error;
    }
  }

  // Get available admins with enhanced filtering
  async getAvailableAdmins() {
    try {
      const now = new Date();

      const adminsQuery = query(
        collection(db, 'enhancedAdmins'),
        where('status.isActive', '==', true)
      );

      const adminsSnapshot = await getDocs(adminsQuery);
      const availableAdmins = [];

      for (const adminDoc of adminsSnapshot.docs) {
        const adminData = adminDoc.data();

        // Check basic availability
        if (!this.isAdminAvailable(adminData)) {
          continue;
        }

        // Check working hours if enabled
        if (adminData.capabilities.workingHours.enabled &&
            !this.isWithinWorkingHours(adminData.capabilities.workingHours, now)) {
          continue;
        }

        // Check workload capacity
        const workloadRatio = adminData.workload.currentUsers / adminData.capabilities.maxConcurrentUsers;
        if (workloadRatio >= 1.0) {
          continue;
        }

        // Get real-time presence
        const presence = await enhancedPresenceService.getUserPresence(adminData.adminId);

        // Enhanced availability check
        if (presence.isOnline && presence.status !== 'offline') {
          availableAdmins.push({
            ...adminData,
            presence,
            workloadRatio
          });
        }
      }

      return availableAdmins;

    } catch (error) {
      console.error('Error getting available admins:', error);
      return [];
    }
  }

  // Check if admin is available
  isAdminAvailable(adminData) {
    const availability = adminData.status.availability;
    return availability === 'available' || availability === 'away';
  }

  // Check if current time is within admin's working hours
  isWithinWorkingHours(workingHours, currentTime) {
    const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const schedule = workingHours.schedule[dayOfWeek];

    if (!schedule || !schedule.enabled) {
      return false;
    }

    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = schedule.start.split(':').map(Number);
    const [endHour, endMinute] = schedule.end.split(':').map(Number);

    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;

    return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
  }

  // Round-robin selection
  selectRoundRobin(admins) {
    // Sort by last assignment time
    const sortedAdmins = admins.sort((a, b) => {
      const aTime = a.workload.lastAssignment?.toMillis() || 0;
      const bTime = b.workload.lastAssignment?.toMillis() || 0;
      return aTime - bTime;
    });

    return sortedAdmins[0];
  }

  // Least loaded selection
  selectLeastLoaded(admins) {
    return admins.reduce((least, current) => {
      if (current.workloadRatio < least.workloadRatio) {
        return current;
      }
      return least;
    });
  }

  // Intelligent selection with multiple factors
  async selectIntelligent(admins, userInfo) {
    const scoredAdmins = [];

    for (const admin of admins) {
      const score = await this.calculateAdminScore(admin, userInfo);
      scoredAdmins.push({ admin, score });
    }

    // Sort by highest score
    scoredAdmins.sort((a, b) => b.score - a.score);

    return scoredAdmins[0]?.admin;
  }

  // Calculate comprehensive admin score
  async calculateAdminScore(admin, userInfo) {
    let score = 100; // Base score

    // Workload factor (higher available capacity = higher score)
    const workloadScore = (1 - admin.workloadRatio) * 30;
    score += workloadScore;

    // Performance factor
    const performanceScore = (admin.performance.customerSatisfactionScore / 5) * 20;
    score += performanceScore;

    // Response time factor (lower response time = higher score)
    const avgResponseTime = admin.performance.averageResponseTime || 300000; // 5 minutes default
    const responseTimeScore = Math.max(0, 20 - (avgResponseTime / 60000) * 2); // 2 points per minute
    score += responseTimeScore;

    // Language matching
    if (userInfo.language && admin.capabilities.languages.includes(userInfo.language)) {
      score += 15;
    }

    // Specialization matching
    if (userInfo.category && admin.capabilities.specializations.includes(userInfo.category)) {
      score += 10;
    }

    // Timezone compatibility
    const timezoneScore = this.calculateTimezoneScore(admin, userInfo);
    score += timezoneScore;

    // Online status bonus
    if (admin.presence.status === 'online') {
      score += 10;
    }

    // Connection quality bonus
    const connectionQuality = admin.presence.connectionQuality;
    if (connectionQuality === 'excellent') {
      score += 5;
    } else if (connectionQuality === 'good') {
      score += 3;
    }

    return Math.max(0, score);
  }

  // Calculate timezone compatibility score
  calculateTimezoneScore(admin, userInfo) {
    if (!userInfo.timezone || !admin.profile.timezone) {
      return 0;
    }

    try {
      const adminTime = new Date().toLocaleString('en-US', { timeZone: admin.profile.timezone });
      const userTime = new Date().toLocaleString('en-US', { timeZone: userInfo.timezone });

      const adminHour = new Date(adminTime).getHours();
      const userHour = new Date(userTime).getHours();

      const hourDiff = Math.abs(adminHour - userHour);

      // Better score for closer timezones
      return Math.max(0, 5 - (hourDiff * 0.5));

    } catch (error) {
      return 0;
    }
  }

  // Create enhanced assignment
  async createAssignment(userId, adminId, userInfo) {
    try {
      const assignmentId = `assign_${userId}_${adminId}_${Date.now()}`;

      const assignmentData = {
        assignmentId,
        userId,
        adminId,
        userInfo: {
          displayName: userInfo.displayName || 'User',
          email: userInfo.email || '',
          platform: userInfo.platform || 'mobile',
          language: userInfo.language || 'en',
          timezone: userInfo.timezone || null,
          category: userInfo.category || null
        },
        status: 'active',
        assignedAt: serverTimestamp(),
        metadata: {
          assignmentMethod: this.assignmentAlgorithm,
          adminScore: await this.calculateAdminScore(
            await this.getAdminById(adminId),
            userInfo
          ),
          priority: userInfo.priority || 'normal'
        }
      };

      // Store assignment
      const assignmentRef = doc(db, 'userAssignments', assignmentId);
      await setDoc(assignmentRef, assignmentData);

      // Create conversation
      const conversationId = await this.createConversation(adminId, userId, userInfo);
      assignmentData.conversationId = conversationId;

      // Update assignment with conversation ID
      await updateDoc(assignmentRef, { conversationId });

      return assignmentData;

    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
  }

  // Create conversation
  async createConversation(adminId, userId, userInfo) {
    try {
      const conversationId = `conv_${userId}_${adminId}_${Date.now()}`;

      const conversationData = {
        conversationId,
        adminId,
        userId,
        participants: [adminId, userId],
        createdAt: serverTimestamp(),
        status: 'active',
        metadata: {
          assignmentMethod: this.assignmentAlgorithm,
          userInfo
        }
      };

      const conversationRef = doc(db, 'conversations', conversationId);
      await setDoc(conversationRef, conversationData);

      return conversationId;

    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Transfer conversation to different admin
  async transferConversation(conversationId, fromAdminId, toAdminId, reason) {
    try {
      // Validate transfer
      const toAdmin = await this.getAdminById(toAdminId);
      if (!toAdmin || !this.isAdminAvailable(toAdmin)) {
        throw new Error('Target admin is not available');
      }

      const batch = writeBatch(db);

      // Update conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      batch.update(conversationRef, {
        adminId: toAdminId,
        participants: [toAdminId, conversationId.split('_')[1]], // Extract userId
        transferHistory: arrayUnion({
          fromAdmin: fromAdminId,
          toAdmin: toAdminId,
          timestamp: serverTimestamp(),
          reason
        }),
        updatedAt: serverTimestamp()
      });

      // Update old admin workload
      const fromAdminRef = doc(db, 'enhancedAdmins', fromAdminId);
      batch.update(fromAdminRef, {
        'workload.currentUsers': increment(-1),
        'workload.activeConversations': arrayRemove(conversationId),
        'workload.transfersOut': increment(1)
      });

      // Update new admin workload
      const toAdminRef = doc(db, 'enhancedAdmins', toAdminId);
      batch.update(toAdminRef, {
        'workload.currentUsers': increment(1),
        'workload.activeConversations': arrayUnion(conversationId),
        'workload.transfersIn': increment(1)
      });

      await batch.commit();

      // Send system message
      await this.sendTransferMessage(conversationId, fromAdminId, toAdminId, reason);

      // Update caches
      this.updateWorkloadCache(fromAdminId, { activeConversations: -1 });
      this.updateWorkloadCache(toAdminId, { activeConversations: 1 });

      // Track transfer analytics
      await this.trackTransfer(conversationId, fromAdminId, toAdminId, reason);

      return { success: true };

    } catch (error) {
      console.error('Error transferring conversation:', error);
      throw error;
    }
  }

  // Send transfer system message
  async sendTransferMessage(conversationId, fromAdminId, toAdminId, reason) {
    try {
      const [fromAdmin, toAdmin] = await Promise.all([
        this.getAdminById(fromAdminId),
        this.getAdminById(toAdminId)
      ]);

      const message = `Conversation transferred from ${fromAdmin.profile.name} to ${toAdmin.profile.name}`;
      const detailedMessage = reason ? `${message}. Reason: ${reason}` : message;

      // This would integrate with the enhanced conversation service
      // await enhancedConversationService.sendSystemMessage(conversationId, detailedMessage);

    } catch (error) {
      console.error('Error sending transfer message:', error);
    }
  }

  // Auto-rebalancing system
  async rebalanceWorkloads() {
    try {
      const admins = await this.getAllActiveAdmins();
      const overloadedAdmins = admins.filter(admin =>
        admin.workloadRatio > admin.preferences.workloadThresholds.warning
      );

      const underloadedAdmins = admins.filter(admin =>
        admin.workloadRatio < 0.5 && admin.workloadRatio > 0
      ).sort((a, b) => a.workloadRatio - b.workloadRatio);

      if (!overloadedAdmins.length || !underloadedAdmins.length) {
        return { rebalanced: 0 };
      }

      let rebalancedCount = 0;

      for (const overloadedAdmin of overloadedAdmins) {
        if (!underloadedAdmins.length) break;

        // Find conversations that can be transferred
        const transferableConversations = await this.getTransferableConversations(overloadedAdmin.adminId);

        for (const conversation of transferableConversations) {
          if (!underloadedAdmins.length) break;

          const targetAdmin = underloadedAdmins.find(admin =>
            admin.workloadRatio < admin.capabilities.maxConcurrentUsers * 0.8
          );

          if (targetAdmin) {
            await this.transferConversation(
              conversation.conversationId,
              overloadedAdmin.adminId,
              targetAdmin.adminId,
              'Automated load balancing'
            );

            rebalancedCount++;
            targetAdmin.workloadRatio += 1 / targetAdmin.capabilities.maxConcurrentUsers;

            // Remove target admin if they're now at capacity
            if (targetAdmin.workloadRatio >= 0.8) {
              const index = underloadedAdmins.indexOf(targetAdmin);
              underloadedAdmins.splice(index, 1);
            }
          }
        }
      }

      return { rebalanced: rebalancedCount };

    } catch (error) {
      console.error('Error rebalancing workloads:', error);
      return { rebalanced: 0, error: error.message };
    }
  }

  // Get transferable conversations
  async getTransferableConversations(adminId, limit = 3) {
    try {
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('adminId', '==', adminId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );

      const conversationsSnapshot = await getDocs(conversationsQuery);
      return conversationsSnapshot.docs.map(doc => ({
        conversationId: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      console.error('Error getting transferable conversations:', error);
      return [];
    }
  }

  // Get admin by ID
  async getAdminById(adminId) {
    try {
      const adminRef = doc(db, 'enhancedAdmins', adminId);
      const adminDoc = await getDoc(adminRef);

      return adminDoc.exists() ? adminDoc.data() : null;

    } catch (error) {
      console.error('Error getting admin by ID:', error);
      return null;
    }
  }

  // Get all active admins
  async getAllActiveAdmins() {
    try {
      const adminsQuery = query(
        collection(db, 'enhancedAdmins'),
        where('status.isActive', '==', true)
      );

      const adminsSnapshot = await getDocs(adminsQuery);
      return adminsSnapshot.docs.map(doc => ({
        adminId: doc.id,
        ...doc.data(),
        workloadRatio: doc.data().workload.currentUsers / doc.data().capabilities.maxConcurrentUsers
      }));

    } catch (error) {
      console.error('Error getting all active admins:', error);
      return [];
    }
  }

  // Update admin workload
  async updateAdminWorkload(adminId, updates) {
    try {
      const adminRef = doc(db, 'enhancedAdmins', adminId);

      const updateData = {};
      Object.keys(updates).forEach(key => {
        updateData[`workload.${key}`] = updates[key];
      });
      updateData['status.lastActivity'] = serverTimestamp();

      await updateDoc(adminRef, updateData);

      // Update cache
      this.updateWorkloadCache(adminId, updates);

    } catch (error) {
      console.error('Error updating admin workload:', error);
    }
  }

  // Update workload cache
  updateWorkloadCache(adminId, updates) {
    const cachedWorkload = this.workloadCache.get(adminId);
    if (cachedWorkload) {
      Object.keys(updates).forEach(key => {
        if (typeof updates[key] === 'number' && typeof cachedWorkload[key] === 'number') {
          cachedWorkload[key] += updates[key];
        }
      });
    }
  }

  // Load admin workloads into cache
  async loadAdminWorkloads() {
    try {
      const adminsSnapshot = await getDocs(collection(db, 'enhancedAdmins'));

      adminsSnapshot.docs.forEach(doc => {
        const adminData = doc.data();
        this.workloadCache.set(doc.id, adminData.workload);
      });

    } catch (error) {
      console.error('Error loading admin workloads:', error);
    }
  }

  // Start workload monitoring
  startWorkloadMonitoring() {
    const workloadQuery = query(
      collection(db, 'enhancedAdmins'),
      where('status.isActive', '==', true)
    );

    const unsubscribe = onSnapshot(workloadQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified' || change.type === 'added') {
          const adminData = change.doc.data();
          this.workloadCache.set(change.doc.id, adminData.workload);

          // Check for workload alerts
          this.checkWorkloadAlerts(change.doc.id, adminData);
        }
      });
    });

    this.adminListeners.set('workloadMonitoring', unsubscribe);
  }

  // Check workload alerts
  async checkWorkloadAlerts(adminId, adminData) {
    try {
      const workloadRatio = adminData.workload.currentUsers / adminData.capabilities.maxConcurrentUsers;
      const thresholds = adminData.preferences.workloadThresholds;

      if (workloadRatio >= thresholds.critical) {
        await this.sendWorkloadAlert(adminId, 'critical', workloadRatio);
      } else if (workloadRatio >= thresholds.warning) {
        await this.sendWorkloadAlert(adminId, 'warning', workloadRatio);
      }

    } catch (error) {
      console.error('Error checking workload alerts:', error);
    }
  }

  // Send workload alert
  async sendWorkloadAlert(adminId, level, workloadRatio) {
    try {
      await addDoc(collection(db, 'workloadAlerts'), {
        adminId,
        level,
        workloadRatio,
        timestamp: serverTimestamp(),
        acknowledged: false
      });

      // This would integrate with the notification service
      // await smartNotificationService.sendNotification(adminId, {
      //   type: 'workload_alert',
      //   title: `Workload Alert: ${level.toUpperCase()}`,
      //   message: `Your workload is at ${(workloadRatio * 100).toFixed(1)}% capacity`,
      //   priority: level === 'critical' ? 'high' : 'normal'
      // });

    } catch (error) {
      console.error('Error sending workload alert:', error);
    }
  }

  // Start auto-rebalancing
  startAutoRebalancing() {
    // Run rebalancing every 15 minutes
    this.rebalanceInterval = setInterval(async () => {
      try {
        await this.rebalanceWorkloads();
      } catch (error) {
        console.error('Error in auto-rebalancing:', error);
      }
    }, 15 * 60 * 1000);
  }

  // Get assignment factors for analytics
  async getAssignmentFactors(admin, userInfo) {
    return {
      workloadRatio: admin.workloadRatio,
      performanceScore: admin.performance.customerSatisfactionScore,
      responseTime: admin.performance.averageResponseTime,
      languageMatch: userInfo.language && admin.capabilities.languages.includes(userInfo.language),
      specializationMatch: userInfo.category && admin.capabilities.specializations.includes(userInfo.category),
      timezoneScore: this.calculateTimezoneScore(admin, userInfo),
      onlineStatus: admin.presence.status,
      connectionQuality: admin.presence.connectionQuality
    };
  }

  // Track assignment decision
  async trackAssignmentDecision(adminId, userId, decisionData) {
    try {
      await addDoc(collection(db, 'assignmentAnalytics'), {
        adminId,
        userId,
        assignedAt: serverTimestamp(),
        ...decisionData
      });

    } catch (error) {
      console.error('Error tracking assignment decision:', error);
    }
  }

  // Track transfer
  async trackTransfer(conversationId, fromAdminId, toAdminId, reason) {
    try {
      await addDoc(collection(db, 'transferAnalytics'), {
        conversationId,
        fromAdminId,
        toAdminId,
        reason,
        transferredAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error tracking transfer:', error);
    }
  }

  // Get admin performance metrics
  async getAdminPerformanceMetrics(adminId, dateRange = {}) {
    try {
      const admin = await this.getAdminById(adminId);
      if (!admin) return null;

      // Get assignment analytics
      const assignmentQuery = query(
        collection(db, 'assignmentAnalytics'),
        where('adminId', '==', adminId),
        orderBy('assignedAt', 'desc'),
        limit(100)
      );

      const assignmentSnapshot = await getDocs(assignmentQuery);
      const assignments = assignmentSnapshot.docs.map(doc => doc.data());

      // Calculate metrics
      const totalAssignments = assignments.length;
      const averageUserScore = assignments.reduce((sum, a) => sum + (a.factors?.performanceScore || 0), 0) / totalAssignments;

      return {
        adminId,
        profile: admin.profile,
        performance: admin.performance,
        workload: admin.workload,
        metrics: {
          totalAssignments,
          averageUserScore,
          currentCapacity: admin.workload.currentUsers / admin.capabilities.maxConcurrentUsers,
          utilizationRate: totalAssignments / admin.capabilities.maxDailyUsers
        }
      };

    } catch (error) {
      console.error('Error getting admin performance metrics:', error);
      return null;
    }
  }

  // Cleanup enhanced admin service
  cleanup() {
    // Clear rebalance interval
    if (this.rebalanceInterval) {
      clearInterval(this.rebalanceInterval);
      this.rebalanceInterval = null;
    }

    // Cleanup listeners
    this.adminListeners.forEach(unsubscribe => unsubscribe());
    this.adminListeners.clear();

    // Clear caches
    this.workloadCache.clear();
  }
}

export default new EnhancedAdminService();