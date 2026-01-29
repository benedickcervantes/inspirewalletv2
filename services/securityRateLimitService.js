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
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import CryptoJS from 'crypto-js';

class SecurityRateLimitService {
  constructor() {
    this.rateLimitCache = new Map();
    this.suspiciousActivityCache = new Map();
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    this.rateLimits = {
      messages: {
        perMinute: 30,
        perHour: 500,
        perDay: 2000
      },
      conversations: {
        perHour: 10,
        perDay: 50
      },
      api: {
        perMinute: 100,
        perHour: 1000
      },
      login: {
        perMinute: 5,
        perHour: 20,
        lockoutDuration: 15 * 60 * 1000 // 15 minutes
      }
    };
    this.suspicionThresholds = {
      rapidMessages: 50, // messages in 1 minute
      unusualPatterns: 0.8, // similarity score
      multipleFailedLogins: 5,
      suspiciousKeywords: ['hack', 'exploit', 'vulnerability', 'admin password']
    };
  }

  // Initialize security service
  async initialize() {
    try {
      await this.loadRateLimitData();
      this.startCleanupTasks();
      this.setupSecurityMonitoring();

      return { success: true };
    } catch (error) {
      console.error('Error initializing security rate limit service:', error);
      throw error;
    }
  }

  // Check rate limits for various actions
  async checkRateLimit(userId, action, additionalData = {}) {
    try {
      const now = Date.now();
      const userKey = `${userId}_${action}`;

      // Get current rate limit data
      let rateLimitData = this.rateLimitCache.get(userKey) || {
        minute: { count: 0, resetTime: now + 60000 },
        hour: { count: 0, resetTime: now + 3600000 },
        day: { count: 0, resetTime: now + 86400000 },
        violations: []
      };

      // Reset counters if time windows have passed
      if (now >= rateLimitData.minute.resetTime) {
        rateLimitData.minute = { count: 0, resetTime: now + 60000 };
      }
      if (now >= rateLimitData.hour.resetTime) {
        rateLimitData.hour = { count: 0, resetTime: now + 3600000 };
      }
      if (now >= rateLimitData.day.resetTime) {
        rateLimitData.day = { count: 0, resetTime: now + 86400000 };
      }

      const limits = this.rateLimits[action];
      if (!limits) {
        return { allowed: true, remaining: Infinity };
      }

      // Check limits
      const checks = [
        { period: 'minute', limit: limits.perMinute },
        { period: 'hour', limit: limits.perHour },
        { period: 'day', limit: limits.perDay }
      ].filter(check => check.limit);

      for (const check of checks) {
        const periodData = rateLimitData[check.period];

        if (periodData.count >= check.limit) {
          // Rate limit exceeded
          await this.handleRateLimitViolation(userId, action, check.period, additionalData);

          return {
            allowed: false,
            reason: 'rate_limit_exceeded',
            period: check.period,
            limit: check.limit,
            resetTime: periodData.resetTime
          };
        }
      }

      // Increment counters
      rateLimitData.minute.count++;
      rateLimitData.hour.count++;
      rateLimitData.day.count++;

      // Update cache
      this.rateLimitCache.set(userKey, rateLimitData);

      // Persist to database occasionally
      if (Math.random() < 0.1) { // 10% chance
        await this.persistRateLimitData(userKey, rateLimitData);
      }

      return {
        allowed: true,
        remaining: {
          minute: limits.perMinute ? Math.max(0, limits.perMinute - rateLimitData.minute.count) : Infinity,
          hour: limits.perHour ? Math.max(0, limits.perHour - rateLimitData.hour.count) : Infinity,
          day: limits.perDay ? Math.max(0, limits.perDay - rateLimitData.day.count) : Infinity
        }
      };

    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: true, error: error.message };
    }
  }

  // Handle rate limit violations
  async handleRateLimitViolation(userId, action, period, additionalData) {
    try {
      const violation = {
        userId,
        action,
        period,
        timestamp: serverTimestamp(),
        additionalData,
        severity: this.calculateViolationSeverity(action, period)
      };

      // Log violation
      await addDoc(collection(db, 'rateLimitViolations'), violation);

      // Check for escalation
      await this.checkViolationEscalation(userId, action);

      // Track suspicious activity
      await this.trackSuspiciousActivity(userId, 'rate_limit_violation', {
        action,
        period,
        ...additionalData
      });

    } catch (error) {
      console.error('Error handling rate limit violation:', error);
    }
  }

  // Calculate violation severity
  calculateViolationSeverity(action, period) {
    const severityMatrix = {
      messages: { minute: 'medium', hour: 'high', day: 'critical' },
      conversations: { hour: 'medium', day: 'high' },
      api: { minute: 'low', hour: 'medium' },
      login: { minute: 'high', hour: 'critical' }
    };

    return severityMatrix[action]?.[period] || 'low';
  }

  // Check for violation escalation
  async checkViolationEscalation(userId, action) {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const violationsQuery = query(
        collection(db, 'rateLimitViolations'),
        where('userId', '==', userId),
        where('timestamp', '>=', oneDayAgo),
        orderBy('timestamp', 'desc')
      );

      const violationsSnapshot = await getDocs(violationsQuery);
      const violations = violationsSnapshot.docs.map(doc => doc.data());

      // Check for patterns that indicate abuse
      const criticalViolations = violations.filter(v => v.severity === 'critical').length;
      const highViolations = violations.filter(v => v.severity === 'high').length;

      if (criticalViolations >= 3 || highViolations >= 5) {
        await this.escalateSecurityThreat(userId, 'repeated_rate_limit_violations', {
          criticalViolations,
          highViolations,
          totalViolations: violations.length
        });
      }

    } catch (error) {
      console.error('Error checking violation escalation:', error);
    }
  }

  // Track suspicious activity
  async trackSuspiciousActivity(userId, activityType, data) {
    try {
      const suspiciousActivity = {
        userId,
        activityType,
        data,
        timestamp: serverTimestamp(),
        riskScore: await this.calculateRiskScore(userId, activityType, data),
        status: 'active'
      };

      await addDoc(collection(db, 'suspiciousActivity'), suspiciousActivity);

      // Update user risk profile
      await this.updateUserRiskProfile(userId, activityType, suspiciousActivity.riskScore);

      // Check if immediate action is needed
      if (suspiciousActivity.riskScore > 0.8) {
        await this.handleHighRiskActivity(userId, suspiciousActivity);
      }

    } catch (error) {
      console.error('Error tracking suspicious activity:', error);
    }
  }

  // Calculate risk score
  async calculateRiskScore(userId, activityType, data) {
    let riskScore = 0;

    try {
      // Base risk by activity type
      const baseRiskScores = {
        rate_limit_violation: 0.3,
        unusual_message_pattern: 0.5,
        failed_login_attempt: 0.4,
        suspicious_content: 0.7,
        ip_anomaly: 0.6,
        device_anomaly: 0.5,
        time_anomaly: 0.3
      };

      riskScore = baseRiskScores[activityType] || 0.2;

      // Get user's historical risk data
      const userRiskProfile = await this.getUserRiskProfile(userId);

      // Adjust based on user history
      if (userRiskProfile.totalViolations > 5) {
        riskScore += 0.2;
      }

      if (userRiskProfile.recentViolations > 2) {
        riskScore += 0.3;
      }

      // Adjust based on specific data patterns
      if (data.messageContent && this.containsSuspiciousContent(data.messageContent)) {
        riskScore += 0.4;
      }

      if (data.frequency && data.frequency > this.suspicionThresholds.rapidMessages) {
        riskScore += 0.3;
      }

      if (data.patternSimilarity && data.patternSimilarity > this.suspicionThresholds.unusualPatterns) {
        riskScore += 0.2;
      }

      return Math.min(1.0, riskScore);

    } catch (error) {
      console.error('Error calculating risk score:', error);
      return 0.5; // Default moderate risk
    }
  }

  // Check for suspicious content
  containsSuspiciousContent(content) {
    if (!content || typeof content !== 'string') return false;

    const lowercaseContent = content.toLowerCase();

    return this.suspicionThresholds.suspiciousKeywords.some(keyword =>
      lowercaseContent.includes(keyword)
    );
  }

  // Get user risk profile
  async getUserRiskProfile(userId) {
    try {
      const riskProfileRef = doc(db, 'userRiskProfiles', userId);
      const riskProfileDoc = await getDoc(riskProfileRef);

      if (riskProfileDoc.exists()) {
        return riskProfileDoc.data();
      }

      // Return default profile
      return {
        userId,
        totalViolations: 0,
        recentViolations: 0,
        overallRiskScore: 0,
        lastUpdated: serverTimestamp(),
        flags: []
      };

    } catch (error) {
      console.error('Error getting user risk profile:', error);
      return { totalViolations: 0, recentViolations: 0, overallRiskScore: 0, flags: [] };
    }
  }

  // Update user risk profile
  async updateUserRiskProfile(userId, activityType, riskScore) {
    try {
      const riskProfileRef = doc(db, 'userRiskProfiles', userId);
      const currentProfile = await this.getUserRiskProfile(userId);

      const updatedProfile = {
        ...currentProfile,
        userId,
        totalViolations: currentProfile.totalViolations + 1,
        recentViolations: currentProfile.recentViolations + 1,
        overallRiskScore: Math.min(1.0, (currentProfile.overallRiskScore + riskScore) / 2),
        lastActivity: {
          type: activityType,
          riskScore,
          timestamp: serverTimestamp()
        },
        lastUpdated: serverTimestamp()
      };

      // Add flags based on risk level
      if (riskScore > 0.7 && !currentProfile.flags.includes('high_risk')) {
        updatedProfile.flags.push('high_risk');
      }

      if (updatedProfile.totalViolations > 10 && !currentProfile.flags.includes('repeat_offender')) {
        updatedProfile.flags.push('repeat_offender');
      }

      await setDoc(riskProfileRef, updatedProfile, { merge: true });

    } catch (error) {
      console.error('Error updating user risk profile:', error);
    }
  }

  // Handle high risk activity
  async handleHighRiskActivity(userId, activity) {
    try {
      // Temporarily restrict user actions
      await this.applyTemporaryRestrictions(userId, activity.riskScore);

      // Alert administrators
      await this.alertAdministrators('high_risk_activity', {
        userId,
        activityType: activity.activityType,
        riskScore: activity.riskScore,
        data: activity.data
      });

      // Log security event
      await addDoc(collection(db, 'securityEvents'), {
        type: 'high_risk_activity_detected',
        userId,
        activity,
        timestamp: serverTimestamp(),
        actionsTaken: ['temporary_restrictions', 'admin_alert']
      });

    } catch (error) {
      console.error('Error handling high risk activity:', error);
    }
  }

  // Apply temporary restrictions
  async applyTemporaryRestrictions(userId, riskScore) {
    try {
      const restrictionLevel = riskScore > 0.9 ? 'severe' : 'moderate';
      const duration = restrictionLevel === 'severe' ? 60 * 60 * 1000 : 30 * 60 * 1000; // 1 hour or 30 minutes

      const restrictions = {
        userId,
        level: restrictionLevel,
        restrictions: {
          messageRateLimit: restrictionLevel === 'severe' ? 5 : 10, // messages per minute
          conversationLimit: restrictionLevel === 'severe' ? 2 : 5, // new conversations per hour
          requireModeration: restrictionLevel === 'severe',
          temporaryBan: riskScore > 0.95
        },
        appliedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + duration),
        reason: 'high_risk_activity_detected',
        autoApplied: true
      };

      await setDoc(doc(db, 'userRestrictions', userId), restrictions);

    } catch (error) {
      console.error('Error applying temporary restrictions:', error);
    }
  }

  // Alert administrators
  async alertAdministrators(alertType, data) {
    try {
      const alert = {
        type: alertType,
        data,
        timestamp: serverTimestamp(),
        severity: 'high',
        status: 'active'
      };

      await addDoc(collection(db, 'adminAlerts'), alert);

      // Get online administrators
      const onlineAdmins = await this.getOnlineAdministrators();

      // Send notifications
      for (const admin of onlineAdmins) {
        await addDoc(collection(db, 'adminNotifications'), {
          adminId: admin.adminId,
          alert,
          timestamp: serverTimestamp(),
          read: false,
          priority: 'high'
        });
      }

    } catch (error) {
      console.error('Error alerting administrators:', error);
    }
  }

  // Get online administrators
  async getOnlineAdministrators() {
    try {
      const adminsQuery = query(
        collection(db, 'enhancedAdmins'),
        where('status.isActive', '==', true)
      );

      const adminsSnapshot = await getDocs(adminsQuery);
      const onlineAdmins = [];

      for (const adminDoc of adminsSnapshot.docs) {
        const adminData = adminDoc.data();
        const presence = await this.getPresence(adminData.adminId);

        if (presence && presence.isOnline) {
          onlineAdmins.push(adminData);
        }
      }

      return onlineAdmins;

    } catch (error) {
      console.error('Error getting online administrators:', error);
      return [];
    }
  }

  // Escalate security threat
  async escalateSecurityThreat(userId, threatType, data) {
    try {
      const securityThreat = {
        userId,
        threatType,
        data,
        timestamp: serverTimestamp(),
        severity: 'critical',
        status: 'active',
        escalatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'securityThreats'), securityThreat);

      // Apply immediate restrictions
      await this.applyImmediateRestrictions(userId, threatType);

      // Send critical alerts
      await this.sendCriticalSecurityAlert(securityThreat);

    } catch (error) {
      console.error('Error escalating security threat:', error);
    }
  }

  // Apply immediate restrictions for threats
  async applyImmediateRestrictions(userId, threatType) {
    try {
      const restrictions = {
        userId,
        level: 'critical',
        restrictions: {
          temporaryBan: true,
          duration: 24 * 60 * 60 * 1000, // 24 hours
          requireManualReview: true,
          blockAllActions: true
        },
        appliedAt: serverTimestamp(),
        reason: threatType,
        autoApplied: true
      };

      await setDoc(doc(db, 'userRestrictions', userId), restrictions);

      // Terminate active sessions
      await this.terminateUserSessions(userId);

    } catch (error) {
      console.error('Error applying immediate restrictions:', error);
    }
  }

  // Terminate user sessions
  async terminateUserSessions(userId) {
    try {
      // Set user as offline
      const presenceRef = doc(db, 'presence', userId);
      await updateDoc(presenceRef, {
        isOnline: false,
        forcedOffline: true,
        terminatedAt: serverTimestamp()
      });

      // Close active conversations
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );

      const conversationsSnapshot = await getDocs(conversationsQuery);
      const batch = writeBatch(db);

      conversationsSnapshot.docs.forEach(conversationDoc => {
        batch.update(conversationDoc.ref, {
          status: 'terminated',
          terminatedAt: serverTimestamp(),
          terminationReason: 'security_violation'
        });
      });

      await batch.commit();

    } catch (error) {
      console.error('Error terminating user sessions:', error);
    }
  }

  // Send critical security alert
  async sendCriticalSecurityAlert(threat) {
    try {
      const criticalAlert = {
        type: 'critical_security_threat',
        threat,
        timestamp: serverTimestamp(),
        requiresImmediateAttention: true
      };

      // This would integrate with external alerting systems
      // For now, log to console and store in database
      console.error('CRITICAL SECURITY ALERT:', criticalAlert);

      await addDoc(collection(db, 'criticalSecurityAlerts'), criticalAlert);

    } catch (error) {
      console.error('Error sending critical security alert:', error);
    }
  }

  // Encrypt sensitive data
  encryptData(data) {
    try {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Error encrypting data:', error);
      return null;
    }
  }

  // Decrypt sensitive data
  decryptData(encryptedData) {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      console.error('Error decrypting data:', error);
      return null;
    }
  }

  // Sanitize message content
  sanitizeMessage(content) {
    if (!content || typeof content !== 'string') return '';

    // Remove potentially dangerous HTML/JS
    const sanitized = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();

    // Limit length
    return sanitized.substring(0, 2000);
  }

  // Validate user input
  validateUserInput(input, type = 'general') {
    const validators = {
      general: (str) => str && typeof str === 'string' && str.length <= 2000,
      email: (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str),
      phone: (str) => /^[\+]?[1-9][\d]{0,15}$/.test(str),
      userId: (str) => /^[a-zA-Z0-9_-]{1,50}$/.test(str),
      conversationId: (str) => /^conv_[a-zA-Z0-9_-]{1,100}$/.test(str)
    };

    const validator = validators[type] || validators.general;
    return validator(input);
  }

  // Check user restrictions
  async checkUserRestrictions(userId) {
    try {
      const restrictionsRef = doc(db, 'userRestrictions', userId);
      const restrictionsDoc = await getDoc(restrictionsRef);

      if (!restrictionsDoc.exists()) {
        return { restricted: false };
      }

      const restrictions = restrictionsDoc.data();
      const now = new Date();

      // Check if restrictions have expired
      if (restrictions.expiresAt && restrictions.expiresAt.toDate() < now) {
        await deleteDoc(restrictionsRef);
        return { restricted: false };
      }

      return {
        restricted: true,
        restrictions: restrictions.restrictions,
        level: restrictions.level,
        reason: restrictions.reason,
        expiresAt: restrictions.expiresAt
      };

    } catch (error) {
      console.error('Error checking user restrictions:', error);
      return { restricted: false, error: error.message };
    }
  }

  // Load rate limit data from database
  async loadRateLimitData() {
    try {
      const rateLimitQuery = query(
        collection(db, 'rateLimitData'),
        limit(1000) // Load most recent rate limit data
      );

      const rateLimitSnapshot = await getDocs(rateLimitQuery);

      rateLimitSnapshot.docs.forEach(doc => {
        this.rateLimitCache.set(doc.id, doc.data());
      });

    } catch (error) {
      console.error('Error loading rate limit data:', error);
    }
  }

  // Persist rate limit data
  async persistRateLimitData(userKey, data) {
    try {
      const rateLimitRef = doc(db, 'rateLimitData', userKey);
      await setDoc(rateLimitRef, {
        ...data,
        lastUpdated: serverTimestamp()
      });

    } catch (error) {
      console.error('Error persisting rate limit data:', error);
    }
  }

  // Start cleanup tasks
  startCleanupTasks() {
    // Clean up expired rate limit data every hour
    setInterval(async () => {
      try {
        await this.cleanupExpiredData();
      } catch (error) {
        console.error('Error in cleanup task:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Clean up old security logs daily
    setInterval(async () => {
      try {
        await this.cleanupOldSecurityLogs();
      } catch (error) {
        console.error('Error cleaning up old security logs:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  // Clean up expired data
  async cleanupExpiredData() {
    try {
      const now = Date.now();

      // Clean rate limit cache
      for (const [key, data] of this.rateLimitCache.entries()) {
        const allExpired = data.minute.resetTime < now &&
                          data.hour.resetTime < now &&
                          data.day.resetTime < now;

        if (allExpired && data.violations.length === 0) {
          this.rateLimitCache.delete(key);

          // Remove from database
          const rateLimitRef = doc(db, 'rateLimitData', key);
          await deleteDoc(rateLimitRef);
        }
      }

    } catch (error) {
      console.error('Error cleaning up expired data:', error);
    }
  }

  // Clean up old security logs
  async cleanupOldSecurityLogs() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Clean old violations
      const oldViolationsQuery = query(
        collection(db, 'rateLimitViolations'),
        where('timestamp', '<', thirtyDaysAgo),
        limit(100)
      );

      const oldViolationsSnapshot = await getDocs(oldViolationsQuery);

      const batch = writeBatch(db);
      oldViolationsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      if (oldViolationsSnapshot.docs.length > 0) {
        await batch.commit();
      }

    } catch (error) {
      console.error('Error cleaning up old security logs:', error);
    }
  }

  // Setup security monitoring
  setupSecurityMonitoring() {
    // Monitor for unusual patterns in real-time
    setInterval(async () => {
      try {
        await this.monitorUnusualPatterns();
      } catch (error) {
        console.error('Error in security monitoring:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Monitor for unusual patterns
  async monitorUnusualPatterns() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Check for rapid message sending
      const rapidMessagesQuery = query(
        collection(db, 'conversationMetrics'),
        where('timestamp', '>=', fiveMinutesAgo),
        where('event', '==', 'message_sent')
      );

      const rapidMessagesSnapshot = await getDocs(rapidMessagesQuery);
      const userMessageCounts = new Map();

      rapidMessagesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const userId = data.data.userId;

        if (userId) {
          userMessageCounts.set(userId, (userMessageCounts.get(userId) || 0) + 1);
        }
      });

      // Check for users exceeding thresholds
      for (const [userId, count] of userMessageCounts.entries()) {
        if (count > this.suspicionThresholds.rapidMessages) {
          await this.trackSuspiciousActivity(userId, 'unusual_message_pattern', {
            messageCount: count,
            timeWindow: '5_minutes',
            frequency: count / 5 // messages per minute
          });
        }
      }

    } catch (error) {
      console.error('Error monitoring unusual patterns:', error);
    }
  }

  // Get presence (helper method)
  async getPresence(userId) {
    try {
      const presenceRef = doc(db, 'presence', userId);
      const presenceDoc = await getDoc(presenceRef);

      if (presenceDoc.exists()) {
        const data = presenceDoc.data();
        return {
          isOnline: data.isOnline && !data.forcedOffline,
          lastSeen: data.lastSeen
        };
      }

      return null;

    } catch (error) {
      console.error('Error getting presence:', error);
      return null;
    }
  }

  // Generate security report
  async generateSecurityReport(dateRange) {
    try {
      const report = {
        id: `security_report_${Date.now()}`,
        dateRange,
        generatedAt: serverTimestamp(),
        summary: {},
        details: {}
      };

      // Rate limit violations
      const violationsQuery = query(
        collection(db, 'rateLimitViolations'),
        where('timestamp', '>=', dateRange.start),
        where('timestamp', '<=', dateRange.end)
      );

      const violationsSnapshot = await getDocs(violationsQuery);
      report.summary.rateLimitViolations = violationsSnapshot.size;

      // Suspicious activities
      const suspiciousQuery = query(
        collection(db, 'suspiciousActivity'),
        where('timestamp', '>=', dateRange.start),
        where('timestamp', '<=', dateRange.end)
      );

      const suspiciousSnapshot = await getDocs(suspiciousQuery);
      report.summary.suspiciousActivities = suspiciousSnapshot.size;

      // Security threats
      const threatsQuery = query(
        collection(db, 'securityThreats'),
        where('timestamp', '>=', dateRange.start),
        where('timestamp', '<=', dateRange.end)
      );

      const threatsSnapshot = await getDocs(threatsQuery);
      report.summary.securityThreats = threatsSnapshot.size;

      // Store report
      await addDoc(collection(db, 'securityReports'), report);

      return report;

    } catch (error) {
      console.error('Error generating security report:', error);
      throw error;
    }
  }

  // Cleanup security service
  cleanup() {
    // Clear caches
    this.rateLimitCache.clear();
    this.suspiciousActivityCache.clear();
  }
}

export default new SecurityRateLimitService();