import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, getDocs, orderBy, query, onSnapshot, doc, updateDoc, addDoc, increment, deleteDoc, where } from 'firebase/firestore';
import { firestore, auth } from '../configs/firebase';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { t } from '../utils/languageUtils';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

const Notification = ({ language = 'English' }) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingReferral, setProcessingReferral] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Real-time listener for global notifications
    const globalNotificationsRef = collection(firestore, 'notifications');
    const globalQuery = query(globalNotificationsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribeGlobal = onSnapshot(
      globalQuery,
      (snapshot) => {
        const globalNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: 'global',
          read: true, // Global notifications are always considered read
        }));
        
        // Update state with global notifications
        setNotifications(prev => {
          const userNotifs = prev.filter(n => n.source === 'user');
          const combined = [...globalNotifications, ...userNotifs];
          return combined.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });
        });
      },
      (error) => {
        console.error('Error fetching global notifications:', error);
      }
    );

    // Real-time listener for user-specific notifications
    const userNotificationsRef = collection(firestore, 'users', user.uid, 'notifications');
    const userQuery = query(userNotificationsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribeUser = onSnapshot(
      userQuery,
      (snapshot) => {
        const userNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: 'user',
        }));
        
        // Update state with user notifications
        setNotifications(prev => {
          const globalNotifs = prev.filter(n => n.source === 'global');
          const combined = [...globalNotifs, ...userNotifications];
          return combined.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });
        });
        
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching user notifications:', error);
        setError(t(language, 'notifications.errorMessage'));
        setLoading(false);
      }
    );

    // Cleanup listeners
    return () => {
      unsubscribeGlobal();
      unsubscribeUser();
    };
  }, []);

  // Delete notification
  const handleDeleteNotification = async (notification) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Only allow deleting user-specific notifications
      if (notification.source === 'user') {
        const notificationRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
        await deleteDoc(notificationRef);
        console.log('Notification deleted:', notification.id);
      } else {
        Alert.alert('Cannot Delete', 'Global notifications cannot be deleted.');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification.');
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userNotificationsRef = collection(firestore, 'users', user.uid, 'notifications');
      const unreadQuery = query(userNotificationsRef, where('read', '==', false));
      const unreadSnapshot = await getDocs(unreadQuery);

      // Update all unread notifications
      const updatePromises = unreadSnapshot.docs.map(doc => 
        updateDoc(doc.ref, { read: true })
      );

      await Promise.all(updatePromises);
      console.log(`Marked ${unreadSnapshot.size} notifications as read`);
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read.');
    }
  };

  // Handle referral acceptance
  const handleAcceptReferral = async (notification) => {
    try {
      setProcessingReferral(notification.id);
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to accept referrals.');
        return;
      }

      console.log('🔄 Accepting referral request...');
      console.log('New User ID:', notification.newUserId);
      console.log('Referrer ID:', user.uid);
      
      // Get the new user's document
      const newUserRef = doc(firestore, 'users', notification.newUserId);
      
      // Update the new user's agent code and clear pending status
      await updateDoc(newUserRef, {
        agentCode: notification.requestedAgentCode,
        'pendingReferral.status': 'approved',
        refferedAgent: notification.referrerAgentCode || user.uid,
      });
      
      console.log('✅ Updated new user agent code');

      // Register agent in API system
      try {
        console.log('🔄 Registering agent in API system...');
        const apiPayload = {
          referrerCode: notification.referrerAgentCode,
          agentNumber: notification.newUserAgentNumber,
        };

        const response = await fetch(process.env.EXPO_PUBLIC_INSPIRE_AGENT_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.EXPO_PUBLIC_INSPIRE_AGENT_API_KEY,
          },
          body: JSON.stringify(apiPayload),
        });

        const apiResult = await response.json();
        console.log('✅ API Response:', apiResult);

        if (apiResult.success && apiResult.data.agentCode) {
          // Update with API-confirmed agent code if different
          await updateDoc(newUserRef, {
            agentCode: apiResult.data.agentCode,
          });
          console.log('✅ Updated with API-confirmed agent code:', apiResult.data.agentCode);
        }
      } catch (apiError) {
        console.error('⚠️ API registration failed (non-blocking):', apiError);
        // Don't block the referral acceptance if API fails
      }

      // Award points to referrer
      const referrerRef = doc(firestore, 'users', user.uid);
      await updateDoc(referrerRef, {
        accumulatedPoints: increment(10),
      });
      
      console.log('✅ Awarded points to referrer');

      // Add points transaction for referrer
      await addDoc(
        collection(firestore, 'users', user.uid, 'pointsTransactions'),
        {
          points: 10,
          date: new Date(),
          type: 'Referral Bonus',
          description: `Earned 10 points from agent referral: ${notification.newUserName}`,
          referredName: notification.newUserName,
          referredEmail: notification.newUserEmail,
          referredType: 'agent',
        }
      );
      
      console.log('✅ Added points transaction');

      // Send notification to new user
      await addDoc(
        collection(firestore, 'users', notification.newUserId, 'notifications'),
        {
          title: 'Referral Approved',
          message: `Your referral request has been approved! Your agent code is now active: ${notification.requestedAgentCode}`,
          type: 'referral_approved',
          createdAt: new Date(),
          read: false,
        }
      );
      
      console.log('✅ Sent approval notification to new user');

      // Send push notification to new user
      try {
        await axios.post('https://app.nativenotify.com/api/indie/notification', {
          subID: notification.newUserId,
          appId: 28259,
          appToken: process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY,
          title: 'Referral Approved',
          message: `Your referral request has been approved! Your agent code is now active.`,
        });
        console.log('✅ Push notification sent to new user');
      } catch (pushError) {
        console.error('⚠️ Error sending push notification (non-blocking):', pushError);
      }

      // Update the notification status
      const notificationRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
      await updateDoc(notificationRef, {
        status: 'approved',
        processedAt: new Date(),
      });
      
      console.log('✅ Updated notification status');

      Alert.alert(
        'Referral Accepted',
        `You have successfully accepted ${notification.newUserName} as your referral. You earned 10 points!`,
        [{ text: 'OK', onPress: () => fetchNotifications() }]
      );
      
    } catch (error) {
      console.error('❌ Error accepting referral:', error);
      Alert.alert('Error', 'Failed to accept referral. Please try again.');
    } finally {
      setProcessingReferral(null);
    }
  };

  // Handle referral rejection
  const handleRejectReferral = async (notification) => {
    try {
      setProcessingReferral(notification.id);
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to reject referrals.');
        return;
      }

      Alert.alert(
        'Reject Referral',
        `Are you sure you want to reject ${notification.newUserName}'s referral request?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setProcessingReferral(null) },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🔄 Rejecting referral request...');
                
                // Update the new user's document to clear pending status
                const newUserRef = doc(firestore, 'users', notification.newUserId);
                await updateDoc(newUserRef, {
                  agentCode: '0',
                  'pendingReferral.status': 'rejected',
                });
                
                console.log('✅ Updated new user status to rejected');

                // Send notification to new user
                await addDoc(
                  collection(firestore, 'users', notification.newUserId, 'notifications'),
                  {
                    title: 'Referral Declined',
                    message: `Your referral request was declined. You can register without a referrer or try with a different referral code.`,
                    type: 'referral_rejected',
                    createdAt: new Date(),
                    read: false,
                  }
                );
                
                console.log('✅ Sent rejection notification to new user');

                // Send push notification to new user
                try {
                  await axios.post('https://app.nativenotify.com/api/indie/notification', {
                    subID: notification.newUserId,
                    appId: 28259,
                    appToken: process.env.EXPO_PUBLIC_NATIVENOTIFY_API_KEY,
                    title: 'Referral Declined',
                    message: `Your referral request was declined. You can try registering with a different referrer.`,
                  });
                  console.log('✅ Push notification sent to new user');
                } catch (pushError) {
                  console.error('⚠️ Error sending push notification (non-blocking):', pushError);
                }

                // Update the notification status
                const notificationRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
                await updateDoc(notificationRef, {
                  status: 'rejected',
                  processedAt: new Date(),
                });
                
                console.log('✅ Updated notification status');

                Alert.alert(
                  'Referral Rejected',
                  `You have declined ${notification.newUserName}'s referral request.`,
                  [{ text: 'OK', onPress: () => fetchNotifications() }]
                );
                
              } catch (error) {
                console.error('❌ Error rejecting referral:', error);
                Alert.alert('Error', 'Failed to reject referral. Please try again.');
              } finally {
                setProcessingReferral(null);
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Error in reject handler:', error);
      setProcessingReferral(null);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch global notifications
      const globalNotificationsRef = collection(firestore, 'notifications');
      const globalQuery = query(globalNotificationsRef, orderBy('createdAt', 'desc'));
      const globalSnapshot = await getDocs(globalQuery);
      
      const globalNotifications = globalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'global'
      }));

      // Fetch user-specific notifications
      const userNotificationsRef = collection(firestore, 'users', user.uid, 'notifications');
      const userQuery = query(userNotificationsRef, orderBy('createdAt', 'desc'));
      const userSnapshot = await getDocs(userQuery);
      
      const userNotifications = userSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'user'
      }));

      // Combine and sort all notifications
      const allNotifications = [...globalNotifications, ...userNotifications];
      
      // Additional client-side sorting as fallback to ensure latest to oldest
      const sortedNotifications = allNotifications.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA; // Latest first (descending order)
      });
      
      setNotifications(sortedNotifications);
      console.log('Fetched notifications:', {
        global: globalNotifications.length,
        user: userNotifications.length,
        total: sortedNotifications.length
      });
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(t(language, 'notifications.errorMessage'));
      Alert.alert(t(language, 'notifications.errorTitle'), t(language, 'notifications.errorMessage') + '. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const truncateMessage = (message, maxLength = 100) => {
    if (!message) return '';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleNotificationPress = async (notification) => {
    // Mark notification as read if it's unread
    if (!notification.read && notification.source === 'user') {
      try {
        const user = auth.currentUser;
        if (user) {
          const notificationRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
          await updateDoc(notificationRef, {
            read: true,
          });
          console.log('Notification marked as read:', notification.id);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate to detail page
    router.push({
      pathname: '/notificationdetail',
      params: {
        id: notification.id,
        title: notification.title || '',
        message: notification.message || '',
        createdAt: notification.createdAt ? notification.createdAt.toDate().toISOString() : new Date().toISOString()
      }
    });
  };

  const renderNotificationItem = ({ item }) => {
    const isReferralRequest = item.type === 'referral_request' && item.status === 'pending';
    const isProcessing = processingReferral === item.id;
    const isRead = item.read === true;
    const isApproved = item.type === 'referral_approved';
    
    return (
      <View style={styles.notificationWrapper}>
        <TouchableOpacity
          style={[
            styles.notificationCard,
            !isRead && styles.unreadNotificationCard,
            isReferralRequest && styles.referralRequestCard
          ]}
          onPress={() => !isReferralRequest && handleNotificationPress(item)}
          activeOpacity={isReferralRequest ? 1 : 0.7}
          disabled={isReferralRequest}
        >
          <View style={styles.cardContent}>
            {/* Icon */}
            <View style={[
              styles.iconCircle,
              isReferralRequest && styles.iconCircleOrange,
              isApproved && styles.iconCircleGreen
            ]}>
              <Ionicons 
                name={isReferralRequest ? 'person-add' : (isApproved ? 'checkmark-circle' : 'person')} 
                size={24} 
                color="#FFFFFF" 
              />
            </View>

            {/* Content */}
            <View style={styles.contentArea}>
              <View style={styles.titleRow}>
                <Text style={styles.notificationTitle} numberOfLines={1}>
                  {item.title || t(language, 'notifications.noTitle')}
                </Text>
                {!isRead && !isReferralRequest && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
                {isApproved && (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                )}
              </View>

              {/* Orange separator line */}
              <View style={styles.separator} />

              <Text style={styles.notificationMessage} numberOfLines={isReferralRequest ? 10 : 3}>
                {truncateMessage(item.message, isReferralRequest ? 500 : 100)}
              </Text>

              {isReferralRequest && (
                <View style={styles.referralDetails}>
                  <Text style={styles.referralDetailText}>Name: {item.newUserName}</Text>
                  <Text style={styles.referralDetailText}>Email: {item.newUserEmail}</Text>
                  <Text style={styles.referralDetailText}>Agent #: {item.newUserAgentNumber}</Text>
                  <Text style={styles.referralDetailText}>Requested Code: {item.requestedAgentCode}</Text>
                </View>
              )}

              <Text style={styles.notificationDate}>
                {formatDate(item.createdAt)}
              </Text>
              
              {isReferralRequest && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.acceptButton, isProcessing && styles.disabledButton]}
                    onPress={() => handleAcceptReferral(item)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.rejectButton, isProcessing && styles.disabledButton]}
                    onPress={() => handleRejectReferral(item)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Arrow for approved notifications */}
            {isApproved && (
              <View style={styles.arrowContainer}>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color="#E15816" 
                />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Delete Button (X) - Only for user notifications */}
        {item.source === 'user' && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteNotification(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name="notifications-outline" 
        size={64} 
        color={Colors.redTheme.background} 
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyTitle}>{t(language, 'notifications.emptyTitle')}</Text>
      <Text style={styles.emptyMessage}>
        {t(language, 'notifications.emptyMessage')}
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons 
        name="alert-circle-outline" 
        size={64} 
        color="#ff6b6b" 
        style={styles.errorIcon}
      />
      <Text style={styles.errorTitle}>{t(language, 'notifications.errorTitle')}</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={fetchNotifications}
      >
        <Text style={styles.retryButtonText}>{t(language, 'notifications.retryButton')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={Colors.redTheme.background} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t(language, 'notifications.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={Colors.redTheme.background} 
          />
          <Text style={styles.loadingText}>{t(language, 'notifications.loadingText')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Orange Gradient Header */}
      <LinearGradient
        colors={["#E15816", "#F48F38"]}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(language, 'notifications.title')}</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleMarkAllAsRead}
        >
          <Ionicons 
            name="checkmark-done" 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>
        {error ? (
          renderErrorState()
        ) : notifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshing={loading}
            onRefresh={fetchNotifications}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  notificationWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  unreadNotificationCard: {
    backgroundColor: '#FFF9F0',
    borderLeftWidth: 4,
    borderLeftColor: '#E15816',
  },
  referralRequestCard: {
    borderWidth: 2,
    borderColor: '#E15816',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E15816',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconCircleOrange: {
    backgroundColor: '#E15816',
  },
  iconCircleGreen: {
    backgroundColor: '#4CAF50',
  },
  contentArea: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  newBadge: {
    backgroundColor: '#FFE5D9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E15816',
  },
  separator: {
    height: 2,
    backgroundColor: '#E15816',
    marginBottom: 12,
    width: '100%',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationDate: {
    fontSize: 12,
    color: '#999',
  },
  referralDetails: {
    backgroundColor: '#FFF5F0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#E15816',
  },
  referralDetailText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.redTheme.background,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Notification;
