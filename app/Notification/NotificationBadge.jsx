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
const NotificationBadge = ({ hidden = false }) => {
  const { unreadCount: backendUnreadCount, refetchUnreadCount } =
    useUnreadNotifications();
  const [firebaseUnreadCount, setFirebaseUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const [useBackend, setUseBackend] = useState(false);

  // Decide backend vs Firebase once based on presence of JWT token.
  // This ensures backend users always see the real-time badge even
  // if they are not logged in via Firebase auth.
  useEffect(() => {
    let isMounted = true;

    const initBackend = async () => {
      try {
        const accessToken = await AsyncStorage.getItem("access_token");
        const hasBackend = !!accessToken;
        if (!isMounted) return;
        setUseBackend(hasBackend);
        if (hasBackend) {
          // Initial fetch so the badge is up to date immediately.
          refetchUnreadCount();
        } else {
          // No backend auth, rely solely on Firebase path.
          setUseBackend(false);
        }
      } catch {
        if (isMounted) {
          setUseBackend(false);
        }
      }
    };

    initBackend();

    return () => {
      isMounted = false;
    };
  }, [refetchUnreadCount]);

  // Separate Firebase auth subscription for the legacy notifications path.
  useEffect(() => {
    if (!auth) return () => {};
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!useBackend) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refetchUnreadCount();
    });
    return () => sub.remove();
  }, [useBackend, refetchUnreadCount]);

  useEffect(() => {
    if (!user || useBackend) {
      if (!useBackend) setFirebaseUnreadCount(0);
      return;
    }
    const unsubscribe = notificationService.subscribeToUnreadCount(
      user.uid,
      (count) => {
        setFirebaseUnreadCount(count);
      },
    );
    return () => unsubscribe();
  }, [user, useBackend]);

  const unreadCount = useBackend ? backendUnreadCount : firebaseUnreadCount;

  if (hidden || unreadCount === 0) {
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
