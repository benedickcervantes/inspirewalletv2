import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { auth } from '../../configs/firebase';
import { useUnreadNotifications } from '../../context/UnreadNotificationsContext';
import notificationService from './notificationService';

/**
 * NotificationBadge component - displays unread notification count.
 * Uses backend (UnreadNotificationsContext) when access_token exists;
 * otherwise uses Firebase (notificationService).
 * Refetches on app focus so every activity is reflected.
 */
const NotificationBadge = () => {
  const { unreadCount: backendUnreadCount, refetchUnreadCount } = useUnreadNotifications();
  const [firebaseUnreadCount, setFirebaseUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const [useBackend, setUseBackend] = useState(false);

  useEffect(() => {
    const checkAuth = async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUseBackend(false);
        return;
      }
      const accessToken = await AsyncStorage.getItem('access_token');
      const backend = !!accessToken;
      setUseBackend(backend);
      if (backend) refetchUnreadCount();
    };
    const unsubscribeAuth = auth.onAuthStateChanged(checkAuth);
    return () => unsubscribeAuth();
  }, [refetchUnreadCount]);

  useEffect(() => {
    if (!useBackend) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetchUnreadCount();
    });
    return () => sub.remove();
  }, [useBackend, refetchUnreadCount]);

  useEffect(() => {
    if (!user || useBackend) {
      if (!useBackend) setFirebaseUnreadCount(0);
      return;
    }
    const unsubscribe = notificationService.subscribeToUnreadCount(user.uid, (count) => {
      setFirebaseUnreadCount(count);
    });
    return () => unsubscribe();
  }, [user, useBackend]);

  const unreadCount = useBackend ? backendUnreadCount : firebaseUnreadCount;

  if (unreadCount === 0) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default NotificationBadge;
