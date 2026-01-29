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
  startAfter,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  aggregateQuery,
  sum,
  average,
  count
} from 'firebase/firestore';
import { db } from '../firebase';

class AnalyticsMonitoringService {
  constructor() {
    this.metricsCache = new Map();
    this.alertListeners = new Map();
    this.realtimeMetrics = new Map();
    this.collectionInterval = null;
    this.alertThresholds = {
      responseTime: 300000, // 5 minutes in ms
      errorRate: 0.05, // 5%
      connectionIssues: 10, // per hour
      lowSatisfaction: 3.0, // out of 5
      highWorkload: 0.9 // 90% capacity
    };
  }

  // Initialize analytics and monitoring
  async initialize() {
    try {
      await this.setupMetricsCollection();
      this.startRealtimeMonitoring();
      this.scheduleReports();

      return { success: true };
    } catch (error) {
      console.error('Error initializing analytics monitoring service:', error);
      throw error;
    }
  }

  // Track conversation metrics
  async trackConversationMetrics(conversationId, event, data = {}) {
    try {
      const metricData = {
        conversationId,
        event, // 'started', 'message_sent', 'message_read', 'resolved', 'transferred', 'abandoned'
        timestamp: serverTimestamp(),
        data: {
          adminId: data.adminId,
          userId: data.userId,
          messageType: data.messageType,
          responseTime: data.responseTime,
          transferReason: data.transferReason,
          satisfactionScore: data.satisfactionScore,
          platform: data.platform || 'mobile',
          ...data
        },
        metadata: {
          source: 'conversation_tracking',
          version: '2.0'
        }
      };

      await addDoc(collection(db, 'conversationMetrics'), metricData);

      // Update real-time metrics
      await this.updateRealTimeMetrics(event, data);

      // Check for alerts
      await this.checkMetricAlerts(event, data);

    } catch (error) {
      console.error('Error tracking conversation metrics:', error);
    }
  }

  // Track admin performance
  async trackAdminPerformance(adminId, metrics) {
    try {
      const performanceData = {
        adminId,
        timestamp: serverTimestamp(),
        metrics: {
          responseTime: metrics.responseTime,
          conversationsHandled: metrics.conversationsHandled,
          messagesPerConversation: metrics.messagesPerConversation,
          customerSatisfactionScore: metrics.customerSatisfactionScore,
          transferRate: metrics.transferRate,
          resolutionRate: metrics.resolutionRate,
          onlineTime: metrics.onlineTime,
          workloadUtilization: metrics.workloadUtilization
        },
        period: {
          start: metrics.periodStart,
          end: metrics.periodEnd,
          type: metrics.periodType || 'daily'
        }
      };

      await addDoc(collection(db, 'adminPerformance'), performanceData);

      // Update admin profile with latest performance
      const adminRef = doc(db, 'enhancedAdmins', adminId);
      await updateDoc(adminRef, {
        'performance.averageResponseTime': metrics.responseTime,
        'performance.customerSatisfactionScore': metrics.customerSatisfactionScore,
        'performance.conversationsResolved': metrics.conversationsHandled,
        'performance.onlineHours': metrics.onlineTime,
        'metadata.lastPerformanceUpdate': serverTimestamp()
      });

    } catch (error) {
      console.error('Error tracking admin performance:', error);
    }
  }

  // Track system performance
  async trackSystemPerformance(metrics) {
    try {
      const systemMetrics = {
        timestamp: serverTimestamp(),
        metrics: {
          totalActiveUsers: metrics.totalActiveUsers,
          totalActiveAdmins: metrics.totalActiveAdmins,
          totalActiveConversations: metrics.totalActiveConversations,
          averageResponseTime: metrics.averageResponseTime,
          systemLoad: metrics.systemLoad,
          errorRate: metrics.errorRate,
          throughput: metrics.throughput, // messages per minute
          connectionQuality: {
            excellent: metrics.connectionQuality?.excellent || 0,
            good: metrics.connectionQuality?.good || 0,
            fair: metrics.connectionQuality?.fair || 0,
            poor: metrics.connectionQuality?.poor || 0
          },
          platformDistribution: {
            mobile: metrics.platformDistribution?.mobile || 0,
            web: metrics.platformDistribution?.web || 0,
            tablet: metrics.platformDistribution?.tablet || 0
          }
        },
        alerts: metrics.alerts || [],
        period: 'realtime'
      };

      await addDoc(collection(db, 'systemPerformance'), systemMetrics);

      // Cache for quick access
      this.metricsCache.set('system_latest', systemMetrics);

    } catch (error) {
      console.error('Error tracking system performance:', error);
    }
  }

  // Update real-time metrics
  async updateRealTimeMetrics(event, data) {
    try {
      const currentHour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
      const metricsKey = `realtime_${currentHour}`;

      let metrics = this.realtimeMetrics.get(metricsKey) || {
        conversations: { started: 0, resolved: 0, abandoned: 0, transferred: 0 },
        messages: { sent: 0, read: 0, avgResponseTime: 0 },
        admins: { active: new Set(), avgWorkload: 0 },
        users: { active: new Set(), satisfaction: [] },
        errors: { count: 0, types: {} }
      };

      // Update based on event type
      switch (event) {
        case 'conversation_started':
          metrics.conversations.started++;
          metrics.users.active.add(data.userId);
          break;

        case 'message_sent':
          metrics.messages.sent++;
          metrics.admins.active.add(data.adminId);
          break;

        case 'message_read':
          metrics.messages.read++;
          if (data.responseTime) {
            metrics.messages.avgResponseTime = (
              (metrics.messages.avgResponseTime + data.responseTime) / 2
            );
          }
          break;

        case 'conversation_resolved':
          metrics.conversations.resolved++;
          if (data.satisfactionScore) {
            metrics.users.satisfaction.push(data.satisfactionScore);
          }
          break;

        case 'conversation_transferred':
          metrics.conversations.transferred++;
          break;

        case 'conversation_abandoned':
          metrics.conversations.abandoned++;
          break;

        case 'error_occurred':
          metrics.errors.count++;
          metrics.errors.types[data.errorType] = (metrics.errors.types[data.errorType] || 0) + 1;
          break;
      }

      this.realtimeMetrics.set(metricsKey, metrics);

      // Persist to database every 5 minutes
      if (Math.random() < 0.1) { // 10% chance to persist
        await this.persistRealTimeMetrics(metricsKey, metrics);
      }

    } catch (error) {
      console.error('Error updating real-time metrics:', error);
    }
  }

  // Persist real-time metrics
  async persistRealTimeMetrics(metricsKey, metrics) {
    try {
      const persistentMetrics = {
        ...metrics,
        admins: {
          active: metrics.admins.active.size,
          avgWorkload: metrics.admins.avgWorkload
        },
        users: {
          active: metrics.users.active.size,
          avgSatisfaction: metrics.users.satisfaction.length > 0
            ? metrics.users.satisfaction.reduce((sum, score) => sum + score, 0) / metrics.users.satisfaction.length
            : 0
        },
        timestamp: serverTimestamp(),
        period: metricsKey
      };

      await addDoc(collection(db, 'hourlyMetrics'), persistentMetrics);

    } catch (error) {
      console.error('Error persisting real-time metrics:', error);
    }
  }

  // Check metric alerts
  async checkMetricAlerts(event, data) {
    try {
      const alerts = [];

      // Response time alert
      if (data.responseTime && data.responseTime > this.alertThresholds.responseTime) {
        alerts.push({
          type: 'high_response_time',
          severity: 'warning',
          value: data.responseTime,
          threshold: this.alertThresholds.responseTime,
          adminId: data.adminId,
          conversationId: data.conversationId
        });
      }

      // Low satisfaction alert
      if (data.satisfactionScore && data.satisfactionScore < this.alertThresholds.lowSatisfaction) {
        alerts.push({
          type: 'low_satisfaction',
          severity: 'warning',
          value: data.satisfactionScore,
          threshold: this.alertThresholds.lowSatisfaction,
          adminId: data.adminId,
          conversationId: data.conversationId
        });
      }

      // Process alerts
      for (const alert of alerts) {
        await this.processAlert(alert);
      }

    } catch (error) {
      console.error('Error checking metric alerts:', error);
    }
  }

  // Process alert
  async processAlert(alert) {
    try {
      const alertData = {
        ...alert,
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: serverTimestamp(),
        status: 'active',
        acknowledged: false
      };

      await addDoc(collection(db, 'systemAlerts'), alertData);

      // Send notification if critical
      if (alert.severity === 'critical') {
        await this.sendCriticalAlert(alertData);
      }

    } catch (error) {
      console.error('Error processing alert:', error);
    }
  }

  // Send critical alert
  async sendCriticalAlert(alert) {
    try {
      // Get admin supervisors or system administrators
      const supervisors = await this.getSupervisors();

      for (const supervisor of supervisors) {
        await addDoc(collection(db, 'criticalAlertNotifications'), {
          recipientId: supervisor.id,
          alert,
          timestamp: serverTimestamp(),
          status: 'pending'
        });
      }

    } catch (error) {
      console.error('Error sending critical alert:', error);
    }
  }

  // Generate comprehensive analytics report
  async generateAnalyticsReport(dateRange, reportType = 'daily') {
    try {
      const report = {
        id: `report_${Date.now()}`,
        type: reportType,
        dateRange,
        generatedAt: serverTimestamp(),
        data: {}
      };

      // Conversation analytics
      report.data.conversations = await this.getConversationAnalytics(dateRange);

      // Admin performance analytics
      report.data.adminPerformance = await this.getAdminPerformanceAnalytics(dateRange);

      // User engagement analytics
      report.data.userEngagement = await this.getUserEngagementAnalytics(dateRange);

      // System performance analytics
      report.data.systemPerformance = await this.getSystemPerformanceAnalytics(dateRange);

      // Response time analytics
      report.data.responseTimes = await this.getResponseTimeAnalytics(dateRange);

      // Satisfaction analytics
      report.data.satisfaction = await this.getSatisfactionAnalytics(dateRange);

      // Platform analytics
      report.data.platforms = await this.getPlatformAnalytics(dateRange);

      // Store report
      await addDoc(collection(db, 'analyticsReports'), report);

      return report;

    } catch (error) {
      console.error('Error generating analytics report:', error);
      throw error;
    }
  }

  // Get conversation analytics
  async getConversationAnalytics(dateRange) {
    try {
      const conversationQuery = query(
        collection(db, 'conversationMetrics'),
        where('timestamp', '>=', dateRange.start),
        where('timestamp', '<=', dateRange.end),
        orderBy('timestamp', 'desc')
      );

      const conversationSnapshot = await getDocs(conversationQuery);
      const metrics = conversationSnapshot.docs.map(doc => doc.data());

      const analytics = {
        total: 0,
        started: 0,
        resolved: 0,
        abandoned: 0,
        transferred: 0,
        averageMessagesPerConversation: 0,
        averageDuration: 0,
        resolutionRate: 0,
        transferRate: 0,
        abandonmentRate: 0
      };

      const conversationData = new Map();

      metrics.forEach(metric => {
        const convId = metric.conversationId;

        if (!conversationData.has(convId)) {
          conversationData.set(convId, {
            messages: 0,
            startTime: null,
            endTime: null,
            status: 'active'
          });
        }

        const conv = conversationData.get(convId);

        switch (metric.event) {
          case 'started':
            analytics.started++;
            conv.startTime = metric.timestamp;
            break;
          case 'message_sent':
            conv.messages++;
            break;
          case 'resolved':
            analytics.resolved++;
            conv.status = 'resolved';
            conv.endTime = metric.timestamp;
            break;
          case 'abandoned':
            analytics.abandoned++;
            conv.status = 'abandoned';
            conv.endTime = metric.timestamp;
            break;
          case 'transferred':
            analytics.transferred++;
            break;
        }
      });

      analytics.total = conversationData.size;

      // Calculate derived metrics
      if (analytics.total > 0) {
        analytics.resolutionRate = (analytics.resolved / analytics.total) * 100;
        analytics.transferRate = (analytics.transferred / analytics.total) * 100;
        analytics.abandonmentRate = (analytics.abandoned / analytics.total) * 100;

        // Calculate averages
        let totalMessages = 0;
        let totalDuration = 0;
        let completedConversations = 0;

        conversationData.forEach(conv => {
          totalMessages += conv.messages;

          if (conv.startTime && conv.endTime) {
            totalDuration += conv.endTime.toMillis() - conv.startTime.toMillis();
            completedConversations++;
          }
        });

        analytics.averageMessagesPerConversation = totalMessages / analytics.total;
        analytics.averageDuration = completedConversations > 0
          ? totalDuration / completedConversations
          : 0;
      }

      return analytics;

    } catch (error) {
      console.error('Error getting conversation analytics:', error);
      return {};
    }
  }

  // Get admin performance analytics
  async getAdminPerformanceAnalytics(dateRange) {
    try {
      const performanceQuery = query(
        collection(db, 'adminPerformance'),
        where('timestamp', '>=', dateRange.start),
        where('timestamp', '<=', dateRange.end),
        orderBy('timestamp', 'desc')
      );

      const performanceSnapshot = await getDocs(performanceQuery);
      const performances = performanceSnapshot.docs.map(doc => doc.data());

      const adminStats = new Map();
      const analytics = {
        totalAdmins: 0,
        averageResponseTime: 0,
        averageSatisfactionScore: 0,
        topPerformers: [],
        performanceDistribution: {
          excellent: 0,
          good: 0,
          average: 0,
          poor: 0
        }
      };

      performances.forEach(perf => {
        const adminId = perf.adminId;

        if (!adminStats.has(adminId)) {
          adminStats.set(adminId, {
            adminId,
            responseTimes: [],
            satisfactionScores: [],
            conversationsHandled: 0,
            onlineTime: 0
          });
        }

        const stats = adminStats.get(adminId);
        stats.responseTimes.push(perf.metrics.responseTime);
        stats.satisfactionScores.push(perf.metrics.customerSatisfactionScore);
        stats.conversationsHandled += perf.metrics.conversationsHandled || 0;
        stats.onlineTime += perf.metrics.onlineTime || 0;
      });

      analytics.totalAdmins = adminStats.size;

      let totalResponseTime = 0;
      let totalSatisfaction = 0;
      let adminCount = 0;

      adminStats.forEach(stats => {
        const avgResponseTime = stats.responseTimes.reduce((sum, time) => sum + time, 0) / stats.responseTimes.length;
        const avgSatisfaction = stats.satisfactionScores.reduce((sum, score) => sum + score, 0) / stats.satisfactionScores.length;

        totalResponseTime += avgResponseTime;
        totalSatisfaction += avgSatisfaction;
        adminCount++;

        // Categorize performance
        if (avgSatisfaction >= 4.5 && avgResponseTime <= 120000) {
          analytics.performanceDistribution.excellent++;
        } else if (avgSatisfaction >= 4.0 && avgResponseTime <= 300000) {
          analytics.performanceDistribution.good++;
        } else if (avgSatisfaction >= 3.5 && avgResponseTime <= 600000) {
          analytics.performanceDistribution.average++;
        } else {
          analytics.performanceDistribution.poor++;
        }

        // Add to top performers if excellent
        if (avgSatisfaction >= 4.5) {
          analytics.topPerformers.push({
            adminId: stats.adminId,
            avgResponseTime,
            avgSatisfaction,
            conversationsHandled: stats.conversationsHandled
          });
        }
      });

      analytics.averageResponseTime = adminCount > 0 ? totalResponseTime / adminCount : 0;
      analytics.averageSatisfactionScore = adminCount > 0 ? totalSatisfaction / adminCount : 0;

      // Sort top performers
      analytics.topPerformers.sort((a, b) => b.avgSatisfaction - a.avgSatisfaction);
      analytics.topPerformers = analytics.topPerformers.slice(0, 10);

      return analytics;

    } catch (error) {
      console.error('Error getting admin performance analytics:', error);
      return {};
    }
  }

  // Get user engagement analytics
  async getUserEngagementAnalytics(dateRange) {
    try {
      const engagementQuery = query(
        collection(db, 'conversationMetrics'),
        where('timestamp', '>=', dateRange.start),
        where('timestamp', '<=', dateRange.end),
        orderBy('timestamp', 'desc')
      );

      const engagementSnapshot = await getDocs(engagementQuery);
      const metrics = engagementSnapshot.docs.map(doc => doc.data());

      const analytics = {
        totalUsers: new Set(),
        activeUsers: new Set(),
        newUsers: new Set(),
        returningUsers: new Set(),
        averageSessionDuration: 0,
        messageFrequency: {
          high: 0, // >10 messages per conversation
          medium: 0, // 5-10 messages
          low: 0 // <5 messages
        },
        platformUsage: {
          mobile: 0,
          web: 0,
          tablet: 0
        }
      };

      const userSessions = new Map();

      metrics.forEach(metric => {
        const userId = metric.data.userId;
        const platform = metric.data.platform || 'mobile';

        analytics.totalUsers.add(userId);
        analytics.platformUsage[platform]++;

        if (metric.event === 'started') {
          if (!userSessions.has(userId)) {
            analytics.newUsers.add(userId);
            userSessions.set(userId, { conversations: 0, messages: 0, startTime: metric.timestamp });
          } else {
            analytics.returningUsers.add(userId);
          }

          userSessions.get(userId).conversations++;
        }

        if (metric.event === 'message_sent') {
          if (userSessions.has(userId)) {
            userSessions.get(userId).messages++;
          }
        }
      });

      // Calculate message frequency distribution
      userSessions.forEach(session => {
        const avgMessagesPerConv = session.messages / session.conversations;

        if (avgMessagesPerConv > 10) {
          analytics.messageFrequency.high++;
        } else if (avgMessagesPerConv >= 5) {
          analytics.messageFrequency.medium++;
        } else {
          analytics.messageFrequency.low++;
        }
      });

      analytics.totalUsers = analytics.totalUsers.size;
      analytics.activeUsers = analytics.activeUsers.size;
      analytics.newUsers = analytics.newUsers.size;
      analytics.returningUsers = analytics.returningUsers.size;

      return analytics;

    } catch (error) {
      console.error('Error getting user engagement analytics:', error);
      return {};
    }
  }

  // Get system performance analytics
  async getSystemPerformanceAnalytics(dateRange) {
    try {
      const performanceQuery = query(
        collection(db, 'systemPerformance'),
        where('timestamp', '>=', dateRange.start),
        where('timestamp', '<=', dateRange.end),
        orderBy('timestamp', 'desc')
      );

      const performanceSnapshot = await getDocs(performanceQuery);
      const metrics = performanceSnapshot.docs.map(doc => doc.data());

      if (metrics.length === 0) {
        return { message: 'No system performance data available for the specified date range' };
      }

      const analytics = {
        averageSystemLoad: 0,
        averageErrorRate: 0,
        averageThroughput: 0,
        peakUsers: 0,
        peakAdmins: 0,
        connectionQuality: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0
        },
        alerts: {
          total: 0,
          critical: 0,
          warning: 0,
          info: 0
        },
        uptime: 100 // percentage
      };

      let totalSystemLoad = 0;
      let totalErrorRate = 0;
      let totalThroughput = 0;
      let maxUsers = 0;
      let maxAdmins = 0;

      metrics.forEach(metric => {
        totalSystemLoad += metric.metrics.systemLoad || 0;
        totalErrorRate += metric.metrics.errorRate || 0;
        totalThroughput += metric.metrics.throughput || 0;

        maxUsers = Math.max(maxUsers, metric.metrics.totalActiveUsers || 0);
        maxAdmins = Math.max(maxAdmins, metric.metrics.totalActiveAdmins || 0);

        // Aggregate connection quality
        if (metric.metrics.connectionQuality) {
          analytics.connectionQuality.excellent += metric.metrics.connectionQuality.excellent || 0;
          analytics.connectionQuality.good += metric.metrics.connectionQuality.good || 0;
          analytics.connectionQuality.fair += metric.metrics.connectionQuality.fair || 0;
          analytics.connectionQuality.poor += metric.metrics.connectionQuality.poor || 0;
        }

        // Count alerts
        if (metric.alerts && metric.alerts.length > 0) {
          analytics.alerts.total += metric.alerts.length;
          metric.alerts.forEach(alert => {
            analytics.alerts[alert.severity]++;
          });
        }
      });

      const metricsCount = metrics.length;

      analytics.averageSystemLoad = totalSystemLoad / metricsCount;
      analytics.averageErrorRate = totalErrorRate / metricsCount;
      analytics.averageThroughput = totalThroughput / metricsCount;
      analytics.peakUsers = maxUsers;
      analytics.peakAdmins = maxAdmins;

      // Calculate uptime (100% - error rate)
      analytics.uptime = Math.max(0, 100 - (analytics.averageErrorRate * 100));

      return analytics;

    } catch (error) {
      console.error('Error getting system performance analytics:', error);
      return {};
    }
  }

  // Get response time analytics
  async getResponseTimeAnalytics(dateRange) {
    try {
      const responseQuery = query(
        collection(db, 'conversationMetrics'),
        where('timestamp', '>=', dateRange.start),
        where('timestamp', '<=', dateRange.end),
        where('event', '==', 'message_read'),
        orderBy('timestamp', 'desc')
      );

      const responseSnapshot = await getDocs(responseQuery);
      const responses = responseSnapshot.docs.map(doc => doc.data());

      const analytics = {
        averageResponseTime: 0,
        medianResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        distributionByTime: {
          under1min: 0,
          '1to5min': 0,
          '5to15min': 0,
          '15to30min': 0,
          over30min: 0
        },
        distributionByAdmin: new Map()
      };

      const responseTimes = responses
        .filter(r => r.data.responseTime)
        .map(r => r.data.responseTime)
        .sort((a, b) => a - b);

      if (responseTimes.length === 0) {
        return analytics;
      }

      // Calculate averages and percentiles
      analytics.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      analytics.medianResponseTime = responseTimes[Math.floor(responseTimes.length / 2)];
      analytics.p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
      analytics.p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];

      // Distribution by time ranges
      responseTimes.forEach(time => {
        const timeInMinutes = time / (1000 * 60);

        if (timeInMinutes < 1) {
          analytics.distributionByTime.under1min++;
        } else if (timeInMinutes < 5) {
          analytics.distributionByTime['1to5min']++;
        } else if (timeInMinutes < 15) {
          analytics.distributionByTime['5to15min']++;
        } else if (timeInMinutes < 30) {
          analytics.distributionByTime['15to30min']++;
        } else {
          analytics.distributionByTime.over30min++;
        }
      });

      // Distribution by admin
      responses.forEach(response => {
        const adminId = response.data.adminId;
        if (adminId && response.data.responseTime) {
          if (!analytics.distributionByAdmin.has(adminId)) {
            analytics.distributionByAdmin.set(adminId, {
              count: 0,
              totalTime: 0,
              averageTime: 0
            });
          }

          const adminStats = analytics.distributionByAdmin.get(adminId);
          adminStats.count++;
          adminStats.totalTime += response.data.responseTime;
          adminStats.averageTime = adminStats.totalTime / adminStats.count;
        }
      });

      // Convert Map to object for JSON serialization
      analytics.distributionByAdmin = Object.fromEntries(analytics.distributionByAdmin);

      return analytics;

    } catch (error) {
      console.error('Error getting response time analytics:', error);
      return {};
    }
  }

  // Get satisfaction analytics
  async getSatisfactionAnalytics(dateRange) {
    try {
      const satisfactionQuery = query(
        collection(db, 'conversationMetrics'),
        where('timestamp', '>=', dateRange.start),
        where('timestamp', '<=', dateRange.end),
        where('event', '==', 'resolved'),
        orderBy('timestamp', 'desc')
      );

      const satisfactionSnapshot = await getDocs(satisfactionQuery);
      const satisfactions = satisfactionSnapshot.docs
        .map(doc => doc.data())
        .filter(data => data.data.satisfactionScore);

      const analytics = {
        averageScore: 0,
        totalRatings: satisfactions.length,
        distributionByScore: {
          5: 0, // Excellent
          4: 0, // Good
          3: 0, // Average
          2: 0, // Poor
          1: 0  // Very Poor
        },
        distributionByAdmin: new Map(),
        trendAnalysis: {
          improving: false,
          declining: false,
          stable: true
        }
      };

      if (satisfactions.length === 0) {
        return analytics;
      }

      let totalScore = 0;

      satisfactions.forEach(satisfaction => {
        const score = satisfaction.data.satisfactionScore;
        const adminId = satisfaction.data.adminId;

        totalScore += score;
        analytics.distributionByScore[Math.floor(score)]++;

        // Track by admin
        if (adminId) {
          if (!analytics.distributionByAdmin.has(adminId)) {
            analytics.distributionByAdmin.set(adminId, {
              count: 0,
              totalScore: 0,
              averageScore: 0
            });
          }

          const adminStats = analytics.distributionByAdmin.get(adminId);
          adminStats.count++;
          adminStats.totalScore += score;
          adminStats.averageScore = adminStats.totalScore / adminStats.count;
        }
      });

      analytics.averageScore = totalScore / satisfactions.length;

      // Convert Map to object
      analytics.distributionByAdmin = Object.fromEntries(analytics.distributionByAdmin);

      // Simple trend analysis (compare first half vs second half)
      const halfPoint = Math.floor(satisfactions.length / 2);
      const firstHalfAvg = satisfactions.slice(0, halfPoint)
        .reduce((sum, s) => sum + s.data.satisfactionScore, 0) / halfPoint;
      const secondHalfAvg = satisfactions.slice(halfPoint)
        .reduce((sum, s) => sum + s.data.satisfactionScore, 0) / (satisfactions.length - halfPoint);

      const difference = secondHalfAvg - firstHalfAvg;

      if (Math.abs(difference) > 0.2) {
        if (difference > 0) {
          analytics.trendAnalysis.improving = true;
          analytics.trendAnalysis.stable = false;
        } else {
          analytics.trendAnalysis.declining = true;
          analytics.trendAnalysis.stable = false;
        }
      }

      return analytics;

    } catch (error) {
      console.error('Error getting satisfaction analytics:', error);
      return {};
    }
  }

  // Get platform analytics
  async getPlatformAnalytics(dateRange) {
    try {
      const platformQuery = query(
        collection(db, 'conversationMetrics'),
        where('timestamp', '>=', dateRange.start),
        where('timestamp', '<=', dateRange.end),
        orderBy('timestamp', 'desc')
      );

      const platformSnapshot = await getDocs(platformQuery);
      const metrics = platformSnapshot.docs.map(doc => doc.data());

      const analytics = {
        totalUsage: 0,
        platformDistribution: {
          mobile: 0,
          web: 0,
          tablet: 0,
          other: 0
        },
        performanceByPlatform: {
          mobile: { avgResponseTime: 0, avgSatisfaction: 0, count: 0 },
          web: { avgResponseTime: 0, avgSatisfaction: 0, count: 0 },
          tablet: { avgResponseTime: 0, avgSatisfaction: 0, count: 0 }
        }
      };

      const platformData = new Map();

      metrics.forEach(metric => {
        const platform = metric.data.platform || 'other';
        analytics.totalUsage++;
        analytics.platformDistribution[platform]++;

        if (!platformData.has(platform)) {
          platformData.set(platform, { responseTimes: [], satisfactionScores: [] });
        }

        const data = platformData.get(platform);

        if (metric.data.responseTime) {
          data.responseTimes.push(metric.data.responseTime);
        }

        if (metric.data.satisfactionScore) {
          data.satisfactionScores.push(metric.data.satisfactionScore);
        }
      });

      // Calculate performance metrics by platform
      platformData.forEach((data, platform) => {
        if (analytics.performanceByPlatform[platform]) {
          const stats = analytics.performanceByPlatform[platform];

          stats.count = data.responseTimes.length + data.satisfactionScores.length;

          if (data.responseTimes.length > 0) {
            stats.avgResponseTime = data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length;
          }

          if (data.satisfactionScores.length > 0) {
            stats.avgSatisfaction = data.satisfactionScores.reduce((sum, score) => sum + score, 0) / data.satisfactionScores.length;
          }
        }
      });

      return analytics;

    } catch (error) {
      console.error('Error getting platform analytics:', error);
      return {};
    }
  }

  // Setup metrics collection
  async setupMetricsCollection() {
    try {
      // Start collecting system metrics every minute
      this.collectionInterval = setInterval(async () => {
        try {
          await this.collectSystemMetrics();
        } catch (error) {
          console.error('Error in metrics collection interval:', error);
        }
      }, 60000); // 1 minute

      return { success: true };

    } catch (error) {
      console.error('Error setting up metrics collection:', error);
      throw error;
    }
  }

  // Collect current system metrics
  async collectSystemMetrics() {
    try {
      // Get current system state
      const [activeUsers, activeAdmins, activeConversations] = await Promise.all([
        this.getActiveUserCount(),
        this.getActiveAdminCount(),
        this.getActiveConversationCount()
      ]);

      // Calculate current metrics
      const metrics = {
        totalActiveUsers: activeUsers,
        totalActiveAdmins: activeAdmins,
        totalActiveConversations: activeConversations,
        systemLoad: this.calculateSystemLoad(activeUsers, activeAdmins, activeConversations),
        errorRate: await this.calculateCurrentErrorRate(),
        throughput: await this.calculateCurrentThroughput(),
        connectionQuality: await this.getConnectionQualityDistribution(),
        platformDistribution: await this.getPlatformDistribution()
      };

      await this.trackSystemPerformance(metrics);

    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  // Get active user count
  async getActiveUserCount() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const activeUsersQuery = query(
        collection(db, 'presence'),
        where('isOnline', '==', true),
        where('lastSeen', '>=', fiveMinutesAgo)
      );

      const activeUsersSnapshot = await getDocs(activeUsersQuery);
      return activeUsersSnapshot.size;

    } catch (error) {
      console.error('Error getting active user count:', error);
      return 0;
    }
  }

  // Get active admin count
  async getActiveAdminCount() {
    try {
      const activeAdminsQuery = query(
        collection(db, 'enhancedAdmins'),
        where('status.isActive', '==', true)
      );

      const activeAdminsSnapshot = await getDocs(activeAdminsQuery);
      let onlineCount = 0;

      for (const adminDoc of activeAdminsSnapshot.docs) {
        const adminId = adminDoc.id;
        const presence = await this.getUserPresence(adminId);

        if (presence && presence.isOnline) {
          onlineCount++;
        }
      }

      return onlineCount;

    } catch (error) {
      console.error('Error getting active admin count:', error);
      return 0;
    }
  }

  // Get active conversation count
  async getActiveConversationCount() {
    try {
      const activeConversationsQuery = query(
        collection(db, 'conversations'),
        where('status', '==', 'active')
      );

      const activeConversationsSnapshot = await getDocs(activeConversationsQuery);
      return activeConversationsSnapshot.size;

    } catch (error) {
      console.error('Error getting active conversation count:', error);
      return 0;
    }
  }

  // Calculate system load (simple metric)
  calculateSystemLoad(users, admins, conversations) {
    if (admins === 0) return 1.0; // Maximum load if no admins

    const averageUsersPerAdmin = users / admins;
    const averageConversationsPerAdmin = conversations / admins;

    // Normalize to 0-1 scale (assuming max 15 users per admin is 100% load)
    const userLoad = Math.min(1.0, averageUsersPerAdmin / 15);
    const conversationLoad = Math.min(1.0, averageConversationsPerAdmin / 12);

    return Math.max(userLoad, conversationLoad);
  }

  // Calculate current error rate
  async calculateCurrentErrorRate() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const errorQuery = query(
        collection(db, 'conversationMetrics'),
        where('timestamp', '>=', oneHourAgo),
        where('event', '==', 'error_occurred')
      );

      const totalQuery = query(
        collection(db, 'conversationMetrics'),
        where('timestamp', '>=', oneHourAgo)
      );

      const [errorSnapshot, totalSnapshot] = await Promise.all([
        getDocs(errorQuery),
        getDocs(totalQuery)
      ]);

      const errorCount = errorSnapshot.size;
      const totalCount = totalSnapshot.size;

      return totalCount > 0 ? errorCount / totalCount : 0;

    } catch (error) {
      console.error('Error calculating error rate:', error);
      return 0;
    }
  }

  // Calculate current throughput (messages per minute)
  async calculateCurrentThroughput() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const messageQuery = query(
        collection(db, 'conversationMetrics'),
        where('timestamp', '>=', oneHourAgo),
        where('event', '==', 'message_sent')
      );

      const messageSnapshot = await getDocs(messageQuery);
      const messageCount = messageSnapshot.size;

      return messageCount / 60; // messages per minute

    } catch (error) {
      console.error('Error calculating throughput:', error);
      return 0;
    }
  }

  // Get connection quality distribution
  async getConnectionQualityDistribution() {
    try {
      const presenceQuery = query(
        collection(db, 'presence'),
        where('isOnline', '==', true)
      );

      const presenceSnapshot = await getDocs(presenceQuery);
      const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };

      presenceSnapshot.docs.forEach(doc => {
        const quality = doc.data().connectionQuality || 'good';
        if (distribution.hasOwnProperty(quality)) {
          distribution[quality]++;
        }
      });

      return distribution;

    } catch (error) {
      console.error('Error getting connection quality distribution:', error);
      return { excellent: 0, good: 0, fair: 0, poor: 0 };
    }
  }

  // Get platform distribution
  async getPlatformDistribution() {
    try {
      const presenceQuery = query(
        collection(db, 'presence'),
        where('isOnline', '==', true)
      );

      const presenceSnapshot = await getDocs(presenceQuery);
      const distribution = { mobile: 0, web: 0, tablet: 0 };

      presenceSnapshot.docs.forEach(doc => {
        const platform = doc.data().platform || 'mobile';
        if (distribution.hasOwnProperty(platform)) {
          distribution[platform]++;
        }
      });

      return distribution;

    } catch (error) {
      console.error('Error getting platform distribution:', error);
      return { mobile: 0, web: 0, tablet: 0 };
    }
  }

  // Get user presence (helper method)
  async getUserPresence(userId) {
    try {
      const presenceRef = doc(db, 'presence', userId);
      const presenceDoc = await getDoc(presenceRef);

      if (presenceDoc.exists()) {
        const data = presenceDoc.data();
        const now = Date.now();
        const lastHeartbeat = data.heartbeat || 0;

        return {
          isOnline: data.isOnline && (now - lastHeartbeat) < 60000,
          lastSeen: data.lastSeen,
          connectionQuality: data.connectionQuality
        };
      }

      return null;

    } catch (error) {
      console.error('Error getting user presence:', error);
      return null;
    }
  }

  // Get supervisors
  async getSupervisors() {
    try {
      const supervisorQuery = query(
        collection(db, 'enhancedAdmins'),
        where('role', '==', 'supervisor')
      );

      const supervisorSnapshot = await getDocs(supervisorQuery);
      return supervisorSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      console.error('Error getting supervisors:', error);
      return [];
    }
  }

  // Start real-time monitoring
  startRealtimeMonitoring() {
    // Monitor critical metrics for immediate alerts
    const criticalMetricsQuery = query(
      collection(db, 'systemAlerts'),
      where('status', '==', 'active'),
      where('severity', '==', 'critical'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(criticalMetricsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const alertData = change.doc.data();
          this.handleCriticalAlert(alertData);
        }
      });
    });

    this.alertListeners.set('criticalAlerts', unsubscribe);
  }

  // Handle critical alert
  async handleCriticalAlert(alert) {
    console.warn('CRITICAL ALERT:', alert);

    // Implement immediate response actions here
    // For example: scale up resources, notify administrators, etc.

    try {
      await this.sendCriticalAlert(alert);
    } catch (error) {
      console.error('Error handling critical alert:', error);
    }
  }

  // Schedule reports
  scheduleReports() {
    // Daily reports
    setInterval(async () => {
      try {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        await this.generateAnalyticsReport({
          start: yesterday,
          end: now
        }, 'daily');

      } catch (error) {
        console.error('Error generating daily report:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily

    // Weekly reports
    setInterval(async () => {
      try {
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        await this.generateAnalyticsReport({
          start: lastWeek,
          end: now
        }, 'weekly');

      } catch (error) {
        console.error('Error generating weekly report:', error);
      }
    }, 7 * 24 * 60 * 60 * 1000); // Weekly
  }

  // Cleanup analytics service
  cleanup() {
    // Clear collection interval
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    // Cleanup listeners
    this.alertListeners.forEach(unsubscribe => unsubscribe());
    this.alertListeners.clear();

    // Clear caches
    this.metricsCache.clear();
    this.realtimeMetrics.clear();
  }
}

export default new AnalyticsMonitoringService();