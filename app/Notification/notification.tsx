import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { markNotificationAsRead as apiMarkNotificationAsRead, getNotifications } from '../../configs/api';
import { auth } from '../../configs/firebase';
import { useLanguage } from '../../context/LanguageContext';
import notificationService, { type NotificationItem } from './notificationService';

interface NotificationItemBackend {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const Notification = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [backendNotifications, setBackendNotifications] = useState<NotificationItemBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [useBackend, setUseBackend] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (accessToken) {
        setUseBackend(true);
        fetchBackendNotifications();
      } else if (auth) {
        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
          setUser(currentUser);
          if (!currentUser) {
            setNotifications([]);
            setLoading(false);
          }
        });
        return () => unsubscribeAuth();
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const fetchBackendNotifications = async () => {
    try {
      setLoading(true);
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) return;

      const result = await getNotifications(accessToken, { limit: 50 });
      if (result.success && result.data) {
        setBackendNotifications(result.data as NotificationItemBackend[]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = notificationService.subscribeToNotifications(
      user.uid,
      (notificationsList: NotificationItem[]) => {
        setNotifications(notificationsList);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (useBackend) {
      fetchBackendNotifications();
    } else {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  const handleNotificationPress = async (notification: NotificationItem | NotificationItemBackend) => {
    if (useBackend) {
      const notif = notification as NotificationItemBackend;
      if (!notif.isRead) {
        try {
          const accessToken = await AsyncStorage.getItem("access_token");
          if (accessToken) {
            await apiMarkNotificationAsRead(accessToken, notif.id);
            setBackendNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
          }
        } catch (error) {
          console.error('Error marking backend notification as read:', error);
        }
      }
      return;
    }
    
    const notif = notification as NotificationItem;
    if (!notif.read && user) {
      try {
        await notificationService.markAsRead(user.uid, notif.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'referral_request':
        return 'person-add';
      case 'referral_approved':
        return 'checkmark-circle';
      case 'transaction':
        return 'cash';
      case 'system':
        return 'notifications';
      default:
        return 'information-circle';
    }
  };

  const formatTimestamp = (timestamp: NotificationItem['timestamp']) => {
    if (!timestamp) return '';
    
    const date = (timestamp as { toDate?: () => Date }).toDate ? (timestamp as { toDate: () => Date }).toDate() : new Date(timestamp as Date);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    
    return date.toLocaleString('en-US', options);
  };

  const renderBackendNotification = ({ item }: { item: NotificationItemBackend }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !item.isRead && styles.unreadCard,
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.cardContent}>
        <View style={[
          styles.iconContainer,
          !item.isRead && styles.unreadIconContainer,
        ]}>
          <Ionicons
            name="notifications"
            size={24}
            color="#E25A17"
          />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.notificationTitle}>
              {item.title}
            </Text>
            {!item.isRead && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>{t('notification.newBadge')}</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <Text style={styles.notificationMessage} numberOfLines={3}>
            {item.message}
          </Text>

          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {item.isRead && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#CCC"
            style={styles.chevron}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !item.read && styles.unreadCard,
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.cardContent}>
        <View style={[
          styles.iconContainer,
          !item.read && styles.unreadIconContainer,
        ]}>
          <Ionicons
            name={getNotificationIcon(item.type ?? 'system') as 'information-circle'}
            size={24}
            color="#E25A17"
          />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            {item.type === 'referral_approved' && (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            )}
            {!item.read && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>{t('notification.newBadge')}</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <Text style={styles.notificationMessage} numberOfLines={3}>
            {item.message}
          </Text>

          <Text style={styles.timestamp}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>

        {item.read && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#CCC"
            style={styles.chevron}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color="#CCC" />
      <Text style={styles.emptyText}>{t('notification.noNotifications')}</Text>
      <Text style={styles.emptySubtext}>{t('notification.noNotificationsSubtext')}</Text>
    </View>
  );

  if (!user && !useBackend) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#E25A17', '#F28934']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notification.title')}</Text>
          <View style={styles.refreshButton} />
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('notification.loginToView')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E25A17', '#F28934']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notification.title')}</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons name="refresh" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E25A17" />
        </View>
      ) : useBackend ? (
        <FlatList<NotificationItemBackend>
          data={backendNotifications}
          renderItem={renderBackendNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            backendNotifications.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#E25A17']}
              tintColor="#E25A17"
            />
          }
        />
      ) : (
        <FlatList<NotificationItem>
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#E25A17']}
              tintColor="#E25A17"
            />
          }
        />
      )}
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#E25A17',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  unreadIconContainer: {
    backgroundColor: '#FFE8D6',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  newBadge: {
    backgroundColor: '#FFE8D6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E25A17',
  },
  divider: {
    height: 1,
    backgroundColor: '#E25A17',
    marginBottom: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  chevron: {
    alignSelf: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default Notification;
