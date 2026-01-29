import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';
import enhancedPresenceService from './enhancedPresenceService';

class SmartNotificationService {
  constructor() {
    this.notificationListeners = new Map();
    this.userPreferences = new Map();
    this.deliveryChannels = ['realtime', 'push', 'email', 'sms'];
    this.notificationQueue = new Map();
    this.processingQueue = false;
  }

  // Initialize notification service
  async initialize() {
    try {
      await this.loadUserPreferences();
      this.startNotificationProcessor();
      this.setupNotificationListeners();

      return { success: true };
    } catch (error) {
      console.error('Error initializing smart notification service:', error);
      throw error;
    }
  }

  // Send smart notification with channel optimization
  async sendNotification(userId, notification) {
    try {
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get user preferences and presence
      const userPrefs = await this.getUserPreferences(userId);
      const userPresence = await enhancedPresenceService.getUserPresence(userId);

      // Determine optimal delivery channels
      const deliveryChannels = await this.determineDeliveryChannels(
        userPrefs,
        userPresence,
        notification
      );

      // Enhanced notification object
      const enhancedNotification = {
        id: notificationId,
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        priority: notification.priority || 'normal',
        category: notification.category || 'message',
        channels: deliveryChannels,
        createdAt: serverTimestamp(),
        scheduledFor: notification.scheduledFor || null,
        expiresAt: notification.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
        deliveryAttempts: [],
        status: 'pending',
        metadata: {
          conversationId: notification.conversationId,
          senderId: notification.senderId,
          messageId: notification.messageId,
          source: notification.source || 'system'
        }
      };

      // Store notification
      const notificationRef = doc(db, 'notifications', notificationId);
      await setDoc(notificationRef, enhancedNotification);

      // Immediate processing for high priority
      if (notification.priority === 'high' || notification.immediate) {
        await this.processNotification(notificationId, enhancedNotification);
      } else {
        // Queue for batch processing
        this.notificationQueue.set(notificationId, enhancedNotification);
      }

      return notificationId;

    } catch (error) {
      console.error('Error sending smart notification:', error);
      throw error;
    }
  }

  // Determine optimal delivery channels
  async determineDeliveryChannels(userPrefs, userPresence, notification) {
    const channels = [];

    // Real-time delivery for online users
    if (userPresence.isOnline) {
      channels.push({
        type: 'realtime',
        priority: 1,
        config: {
          showInApp: true,
          playSound: userPrefs.sounds?.enabled !== false,
          showBadge: userPrefs.badges?.enabled !== false,
          vibrate: userPrefs.vibration?.enabled !== false
        }
      });

      // Skip other channels for non-critical notifications if user is active
      if (notification.priority !== 'high' && userPresence.status === 'online') {
        return channels;
      }
    }

    // Push notifications based on preferences and device
    if (userPrefs.push?.enabled !== false && userPresence.platform === 'mobile') {
      const pushConfig = this.getPushNotificationConfig(userPrefs, userPresence, notification);

      if (pushConfig.shouldSend) {
        channels.push({
          type: 'push',
          priority: userPresence.isOnline ? 2 : 1,
          config: pushConfig
        });
      }
    }

    // Email notifications for important messages when user is offline
    if (this.shouldSendEmail(userPrefs, userPresence, notification)) {
      channels.push({
        type: 'email',
        priority: 3,
        config: {
          template: this.getEmailTemplate(notification.type),
          includeConversationHistory: userPrefs.email?.includeHistory !== false,
          digest: userPrefs.email?.digestMode === true
        }
      });
    }

    // SMS for critical notifications
    if (this.shouldSendSMS(userPrefs, userPresence, notification)) {
      channels.push({
        type: 'sms',
        priority: 1,
        config: {
          shortMessage: true,
          includeLink: true
        }
      });
    }

    // Sort by priority
    return channels.sort((a, b) => a.priority - b.priority);
  }

  // Get push notification configuration
  getPushNotificationConfig(userPrefs, userPresence, notification) {
    const config = {
      shouldSend: true,
      title: notification.title,
      body: notification.message,
      icon: '/icons/notification.png',
      badge: '/icons/badge.png',
      tag: notification.conversationId ? `conv-${notification.conversationId}` : undefined,
      requireInteraction: notification.priority === 'high',
      silent: false,
      data: notification.data
    };

    // Respect quiet hours
    if (this.isQuietHours(userPrefs.quietHours)) {
      if (notification.priority !== 'high') {
        config.shouldSend = false;
        return config;
      }
      config.silent = true;
    }

    // Respect do not disturb
    if (userPresence.status === 'busy' && notification.priority !== 'high') {
      config.shouldSend = false;
      return config;
    }

    // Customize based on notification type
    switch (notification.type) {
      case 'new_message':
        config.actions = [
          { action: 'reply', title: 'Reply' },
          { action: 'mark_read', title: 'Mark as Read' }
        ];
        break;
      case 'admin_assigned':
        config.actions = [
          { action: 'start_chat', title: 'Start Chat' },
          { action: 'view_profile', title: 'View Profile' }
        ];
        break;
    }

    // Battery optimization
    if (userPresence.batteryInfo?.level < 0.2 && !userPresence.batteryInfo?.charging) {
      config.silent = true;
    }

    return config;
  }

  // Check if it's quiet hours
  isQuietHours(quietHours) {
    if (!quietHours?.enabled) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const startHour = quietHours.start || 22;
    const endHour = quietHours.end || 7;

    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  // Should send email notification
  shouldSendEmail(userPrefs, userPresence, notification) {
    if (userPrefs.email?.enabled === false) return false;

    // Always send for high priority
    if (notification.priority === 'high') return true;

    // Send if user has been offline for more than 30 minutes
    const offlineThreshold = 30 * 60 * 1000; // 30 minutes
    const lastSeen = userPresence.lastSeen?.toMillis() || 0;
    const now = Date.now();

    return (now - lastSeen) > offlineThreshold;
  }

  // Should send SMS notification
  shouldSendSMS(userPrefs, userPresence, notification) {
    if (userPrefs.sms?.enabled === false) return false;
    if (notification.priority !== 'high') return false;

    // Only for critical notifications and when user hasn't been seen in hours
    const criticalThreshold = 4 * 60 * 60 * 1000; // 4 hours
    const lastSeen = userPresence.lastSeen?.toMillis() || 0;
    const now = Date.now();

    return (now - lastSeen) > criticalThreshold;
  }

  // Get email template based on notification type
  getEmailTemplate(notificationType) {
    const templates = {
      new_message: 'new-message-email',
      admin_assigned: 'admin-assignment-email',
      conversation_closed: 'conversation-closed-email',
      system_update: 'system-update-email'
    };

    return templates[notificationType] || 'default-email';
  }

  // Process notification through channels
  async processNotification(notificationId, notification) {
    try {
      const deliveryResults = [];

      // Process each channel in priority order
      for (const channel of notification.channels) {
        try {
          const result = await this.deliverViaChannel(
            notificationId,
            notification,
            channel
          );

          deliveryResults.push({
            channel: channel.type,
            success: result.success,
            timestamp: Date.now(),
            details: result.details
          });

          // If high priority channel succeeds, we might skip lower priority ones
          if (result.success && channel.priority === 1 && notification.priority === 'high') {
            break;
          }

        } catch (error) {
          deliveryResults.push({
            channel: channel.type,
            success: false,
            timestamp: Date.now(),
            error: error.message
          });
        }
      }

      // Update notification with delivery results
      await this.updateNotificationStatus(notificationId, 'processed', {
        deliveryAttempts: deliveryResults,
        processedAt: serverTimestamp()
      });

      // Track delivery analytics
      await this.trackNotificationDelivery(notificationId, notification, deliveryResults);

    } catch (error) {
      console.error('Error processing notification:', error);
      await this.updateNotificationStatus(notificationId, 'failed', {
        error: error.message,
        failedAt: serverTimestamp()
      });
    }
  }

  // Deliver via specific channel
  async deliverViaChannel(notificationId, notification, channel) {
    switch (channel.type) {
      case 'realtime':
        return await this.deliverRealtime(notificationId, notification, channel.config);

      case 'push':
        return await this.deliverPush(notificationId, notification, channel.config);

      case 'email':
        return await this.deliverEmail(notificationId, notification, channel.config);

      case 'sms':
        return await this.deliverSMS(notificationId, notification, channel.config);

      default:
        throw new Error(`Unknown notification channel: ${channel.type}`);
    }
  }

  // Deliver real-time notification
  async deliverRealtime(notificationId, notification, config) {
    try {
      const realtimeNotification = {
        id: notificationId,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: Date.now(),
        config: {
          showInApp: config.showInApp,
          playSound: config.playSound,
          showBadge: config.showBadge,
          vibrate: config.vibrate,
          autoHide: config.autoHide !== false,
          duration: config.duration || 5000
        }
      };

      // Store for real-time pickup
      await addDoc(collection(db, 'realtimeNotifications'), {
        ...realtimeNotification,
        expiresAt: new Date(Date.now() + 300000) // 5 minutes
      });

      return {
        success: true,
        details: { method: 'realtime', deliveredAt: Date.now() }
      };

    } catch (error) {
      console.error('Error delivering real-time notification:', error);
      return {
        success: false,
        details: { error: error.message }
      };
    }
  }

  // Deliver push notification
  async deliverPush(notificationId, notification, config) {
    try {
      if (!config.shouldSend) {
        return {
          success: true,
          details: { skipped: true, reason: 'user_preferences' }
        };
      }

      // Get user's push tokens
      const userTokens = await this.getUserPushTokens(notification.userId);

      if (!userTokens.length) {
        return {
          success: false,
          details: { error: 'no_push_tokens' }
        };
      }

      const pushPayload = {
        notification: {
          title: config.title,
          body: config.body,
          icon: config.icon,
          badge: config.badge,
          tag: config.tag,
          requireInteraction: config.requireInteraction,
          silent: config.silent,
          image: config.image
        },
        data: {
          ...config.data,
          notificationId,
          clickAction: config.clickAction || 'FLUTTER_NOTIFICATION_CLICK'
        }
      };

      // Add actions if supported
      if (config.actions && config.actions.length > 0) {
        pushPayload.notification.actions = config.actions;
      }

      // Queue for push delivery service
      await addDoc(collection(db, 'pushNotificationQueue'), {
        userId: notification.userId,
        tokens: userTokens,
        payload: pushPayload,
        notificationId,
        priority: notification.priority,
        createdAt: serverTimestamp(),
        status: 'queued'
      });

      return {
        success: true,
        details: {
          method: 'push',
          tokenCount: userTokens.length,
          queuedAt: Date.now()
        }
      };

    } catch (error) {
      console.error('Error delivering push notification:', error);
      return {
        success: false,
        details: { error: error.message }
      };
    }
  }

  // Deliver email notification
  async deliverEmail(notificationId, notification, config) {
    try {
      const userProfile = await this.getUserProfile(notification.userId);

      if (!userProfile?.email) {
        return {
          success: false,
          details: { error: 'no_email_address' }
        };
      }

      const emailData = {
        to: userProfile.email,
        template: config.template,
        subject: notification.title,
        data: {
          userName: userProfile.displayName || userProfile.email,
          message: notification.message,
          notificationData: notification.data,
          conversationId: notification.metadata?.conversationId,
          timestamp: new Date().toISOString(),
          unsubscribeLink: `${process.env.APP_URL}/unsubscribe?token=${userProfile.unsubscribeToken}`
        }
      };

      // Include conversation history if requested
      if (config.includeConversationHistory && notification.metadata?.conversationId) {
        emailData.data.conversationHistory = await this.getConversationHistoryForEmail(
          notification.metadata.conversationId
        );
      }

      // Queue for email service
      await addDoc(collection(db, 'emailQueue'), {
        ...emailData,
        notificationId,
        priority: notification.priority,
        createdAt: serverTimestamp(),
        status: 'queued'
      });

      return {
        success: true,
        details: {
          method: 'email',
          recipient: userProfile.email,
          template: config.template,
          queuedAt: Date.now()
        }
      };

    } catch (error) {
      console.error('Error delivering email notification:', error);
      return {
        success: false,
        details: { error: error.message }
      };
    }
  }

  // Deliver SMS notification
  async deliverSMS(notificationId, notification, config) {
    try {
      const userProfile = await this.getUserProfile(notification.userId);

      if (!userProfile?.phoneNumber) {
        return {
          success: false,
          details: { error: 'no_phone_number' }
        };
      }

      // Create short message
      let message = config.shortMessage
        ? `${notification.title}: ${notification.message.substring(0, 100)}...`
        : notification.message;

      // Add link if requested
      if (config.includeLink && notification.metadata?.conversationId) {
        const shortLink = await this.generateShortLink(notification.metadata.conversationId);
        message += ` ${shortLink}`;
      }

      const smsData = {
        to: userProfile.phoneNumber,
        message,
        notificationId,
        priority: notification.priority,
        createdAt: serverTimestamp(),
        status: 'queued'
      };

      // Queue for SMS service
      await addDoc(collection(db, 'smsQueue'), smsData);

      return {
        success: true,
        details: {
          method: 'sms',
          recipient: userProfile.phoneNumber,
          messageLength: message.length,
          queuedAt: Date.now()
        }
      };

    } catch (error) {
      console.error('Error delivering SMS notification:', error);
      return {
        success: false,
        details: { error: error.message }
      };
    }
  }

  // Get user preferences
  async getUserPreferences(userId) {
    try {
      // Check cache first
      if (this.userPreferences.has(userId)) {
        return this.userPreferences.get(userId);
      }

      const prefsRef = doc(db, 'userPreferences', userId);
      const prefsDoc = await getDoc(prefsRef);

      const defaultPrefs = this.getDefaultPreferences();

      if (prefsDoc.exists()) {
        const prefs = { ...defaultPrefs, ...prefsDoc.data() };
        this.userPreferences.set(userId, prefs);
        return prefs;
      } else {
        this.userPreferences.set(userId, defaultPrefs);
        return defaultPrefs;
      }

    } catch (error) {
      console.error('Error getting user preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  // Get default notification preferences
  getDefaultPreferences() {
    return {
      push: {
        enabled: true,
        sounds: true,
        vibration: true,
        badges: true
      },
      email: {
        enabled: true,
        digest: false,
        includeHistory: true
      },
      sms: {
        enabled: false
      },
      quietHours: {
        enabled: true,
        start: 22,
        end: 7
      },
      categories: {
        messages: true,
        assignments: true,
        system: true
      }
    };
  }

  // Update user preferences
  async updateUserPreferences(userId, preferences) {
    try {
      const prefsRef = doc(db, 'userPreferences', userId);

      await setDoc(prefsRef, {
        ...preferences,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Update cache
      const currentPrefs = this.userPreferences.get(userId) || this.getDefaultPreferences();
      this.userPreferences.set(userId, { ...currentPrefs, ...preferences });

      return { success: true };

    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // Get user push tokens
  async getUserPushTokens(userId) {
    try {
      const tokensQuery = query(
        collection(db, 'pushTokens'),
        where('userId', '==', userId),
        where('isValid', '==', true)
      );

      const tokensSnapshot = await getDocs(tokensQuery);
      return tokensSnapshot.docs.map(doc => doc.data().token);

    } catch (error) {
      console.error('Error getting user push tokens:', error);
      return [];
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      return userDoc.exists() ? userDoc.data() : null;

    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Generate short link for SMS
  async generateShortLink(conversationId) {
    try {
      const shortLinkRef = await addDoc(collection(db, 'shortLinks'), {
        target: `/conversation/${conversationId}`,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        clicks: 0
      });

      return `${process.env.APP_URL}/s/${shortLinkRef.id}`;

    } catch (error) {
      console.error('Error generating short link:', error);
      return `${process.env.APP_URL}/conversation/${conversationId}`;
    }
  }

  // Get conversation history for email
  async getConversationHistoryForEmail(conversationId, limit = 10) {
    try {
      const messagesQuery = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(limit)
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      return messagesSnapshot.docs.map(doc => ({
        content: doc.data().content,
        senderName: doc.data().senderName,
        timestamp: doc.data().timestamp,
        senderType: doc.data().senderType
      })).reverse();

    } catch (error) {
      console.error('Error getting conversation history for email:', error);
      return [];
    }
  }

  // Update notification status
  async updateNotificationStatus(notificationId, status, additionalData = {}) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);

      await updateDoc(notificationRef, {
        status,
        updatedAt: serverTimestamp(),
        ...additionalData
      });

    } catch (error) {
      console.error('Error updating notification status:', error);
    }
  }

  // Track notification delivery analytics
  async trackNotificationDelivery(notificationId, notification, deliveryResults) {
    try {
      await addDoc(collection(db, 'notificationAnalytics'), {
        notificationId,
        userId: notification.userId,
        type: notification.type,
        priority: notification.priority,
        channels: deliveryResults.map(r => ({
          type: r.channel,
          success: r.success,
          timestamp: r.timestamp
        })),
        totalChannels: deliveryResults.length,
        successfulChannels: deliveryResults.filter(r => r.success).length,
        processingTime: Date.now() - notification.createdAt,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error tracking notification delivery:', error);
    }
  }

  // Start notification processor
  startNotificationProcessor() {
    if (this.processingQueue) return;

    this.processingQueue = true;

    const processQueue = async () => {
      try {
        if (this.notificationQueue.size === 0) return;

        // Sort by priority and timestamp
        const sortedNotifications = Array.from(this.notificationQueue.entries())
          .sort(([, a], [, b]) => {
            if (a.priority !== b.priority) {
              const priorityOrder = { high: 3, normal: 2, low: 1 };
              return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            return a.createdAt - b.createdAt;
          });

        // Process up to 10 notifications at once
        const batchSize = Math.min(10, sortedNotifications.length);
        const batch = sortedNotifications.slice(0, batchSize);

        await Promise.all(
          batch.map(([notificationId, notification]) =>
            this.processNotification(notificationId, notification)
              .then(() => this.notificationQueue.delete(notificationId))
              .catch(error =>
                console.error(`Error processing notification ${notificationId}:`, error)
              )
          )
        );

      } catch (error) {
        console.error('Error processing notification queue:', error);
      }
    };

    // Process queue every 5 seconds
    setInterval(processQueue, 5000);
  }

  // Setup notification listeners
  setupNotificationListeners() {
    // Listen for real-time notification acknowledgments
    const ackQuery = query(
      collection(db, 'notificationAcknowledgments'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    onSnapshot(ackQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const ackData = change.doc.data();
          this.handleNotificationAcknowledgment(ackData);
        }
      });
    });
  }

  // Handle notification acknowledgment
  async handleNotificationAcknowledgment(ackData) {
    try {
      await this.updateNotificationStatus(ackData.notificationId, 'acknowledged', {
        acknowledgedAt: serverTimestamp(),
        acknowledgedBy: ackData.userId,
        acknowledgmentMethod: ackData.method
      });

    } catch (error) {
      console.error('Error handling notification acknowledgment:', error);
    }
  }

  // Load user preferences cache
  async loadUserPreferences() {
    try {
      const prefsQuery = query(
        collection(db, 'userPreferences'),
        limit(1000) // Load commonly used preferences
      );

      const prefsSnapshot = await getDocs(prefsQuery);

      prefsSnapshot.docs.forEach(doc => {
        this.userPreferences.set(doc.id, doc.data());
      });

    } catch (error) {
      console.error('Error loading user preferences cache:', error);
    }
  }

  // Get notification statistics
  async getNotificationStats(userId = null, dateRange = {}) {
    try {
      let analyticsQuery = collection(db, 'notificationAnalytics');

      if (userId) {
        analyticsQuery = query(analyticsQuery, where('userId', '==', userId));
      }

      const analyticsSnapshot = await getDocs(analyticsQuery);

      const stats = {
        total: 0,
        byType: {},
        byChannel: {},
        byPriority: {},
        successRate: 0,
        averageProcessingTime: 0
      };

      let totalProcessingTime = 0;
      let totalSuccessful = 0;

      analyticsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        stats.total++;

        // Count by type
        stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;

        // Count by priority
        stats.byPriority[data.priority] = (stats.byPriority[data.priority] || 0) + 1;

        // Count by channel
        data.channels.forEach(channel => {
          stats.byChannel[channel.type] = (stats.byChannel[channel.type] || 0) + 1;
          if (channel.success) totalSuccessful++;
        });

        // Processing time
        totalProcessingTime += data.processingTime || 0;
      });

      stats.successRate = stats.total > 0 ? (totalSuccessful / stats.total) * 100 : 0;
      stats.averageProcessingTime = stats.total > 0 ? totalProcessingTime / stats.total : 0;

      return stats;

    } catch (error) {
      console.error('Error getting notification stats:', error);
      return null;
    }
  }

  // Cleanup notification service
  cleanup() {
    this.processingQueue = false;

    // Clear queues and caches
    this.notificationQueue.clear();
    this.userPreferences.clear();

    // Cleanup listeners
    this.notificationListeners.forEach(unsubscribe => unsubscribe());
    this.notificationListeners.clear();
  }
}

export default new SmartNotificationService();