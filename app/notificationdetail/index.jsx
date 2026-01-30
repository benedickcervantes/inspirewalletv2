import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../../configs/firebase';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../../utils/languageUtils';

const { width, height } = Dimensions.get('window');

const NotificationDetail = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [userLanguage, setUserLanguage] = useState('English');
  const [notification, setNotification] = useState({
    id: params.id || '',
    title: params.title || '',
    message: params.message || '',
    createdAt: params.createdAt || new Date().toISOString()
  });

  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserLanguage(data.preferredLanguage || 'English');
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return t(userLanguage, 'notifications.invalidDate');
    }
  };

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
        <Text style={styles.headerTitle}>{t(userLanguage, 'notifications.detailTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.notificationCard}>
          <View style={styles.notificationHeader}>
            <View style={styles.notificationIcon}>
              <Ionicons 
                name="notifications" 
                size={24} 
                color={Colors.redTheme.background} 
              />
            </View>
            <View style={styles.notificationMeta}>
              <Text style={styles.notificationDate}>
                {formatDate(notification.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.notificationBody}>
            <Text style={styles.notificationTitle}>
              {notification.title || t(userLanguage, 'notifications.noTitle')}
            </Text>
            
            <View style={styles.messageContainer}>
              <Text style={styles.notificationMessage}>
                {notification.message || t(userLanguage, 'notifications.noMessage')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.back()}
          >
            <Ionicons 
              name="arrow-back" 
              size={20} 
              color="white" 
              style={styles.actionButtonIcon}
            />
            <Text style={styles.actionButtonText}>{t(userLanguage, 'notifications.backToNotifications')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.redTheme.background + '10',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.redTheme.background,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderLeftWidth: 5,
    borderLeftColor: Colors.redTheme.background,
    marginBottom: 20,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationIcon: {
    backgroundColor: Colors.redTheme.background + '10',
    borderRadius: 25,
    padding: 12,
  },
  notificationMeta: {
    flex: 1,
    alignItems: 'flex-end',
  },
  notificationDate: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  notificationBody: {
    padding: 20,
    paddingTop: 16,
  },
  notificationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    lineHeight: 28,
  },
  messageContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notificationMessage: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
    textAlign: 'justify',
  },
  actionsContainer: {
    paddingHorizontal: 4,
  },
  actionButton: {
    backgroundColor: Colors.redTheme.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NotificationDetail;
