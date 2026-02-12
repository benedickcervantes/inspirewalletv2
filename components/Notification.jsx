import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const Notification = ({ language = 'English' }) => {
  const router = useRouter();
  
  // Sample notifications data
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'referral_request',
      title: 'New Referral Request',
      message: 'Person A wants to register as an agent under your referral. Please confirm if you want to be the...',
      timestamp: 'Feb 5, 2026 at 2:56 PM',
      isNew: true,
      icon: 'person',
    },
    {
      id: '2',
      type: 'referral_request',
      title: 'New Referral Request',
      message: 'Person B wants to register as an agent under your referral. Please confirm if you want to be the...',
      timestamp: 'Feb 5, 2026 at 3:33 PM',
      isNew: true,
      icon: 'person',
    },
    {
      id: '3',
      type: 'referral_approved',
      title: 'Referral Approved',
      message: 'Your referral request has been approved! Your agent code is now active: ABCDE-FGHIJ-00000',
      timestamp: 'Feb 6, 2026 at 4:55 PM',
      isNew: false,
      icon: 'person',
      hasCheckmark: true,
    },
  ]);

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.notificationCard}
      onPress={() => {
        // Navigate to notification detail if needed
      }}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon} size={24} color="#E25A17" />
        </View>
        
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            {item.hasCheckmark && (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            )}
            {item.isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.notificationMessage} numberOfLines={3}>
            {item.message}
          </Text>
          
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        
        {!item.isNew && !item.hasCheckmark && (
          <Ionicons name="chevron-forward" size={20} color="#CCC" style={styles.chevron} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#E25A17", "#F28934"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Notifications</Text>
        
        <TouchableOpacity style={styles.refreshButton}>
          <Ionicons name="refresh" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  listContent: {
    padding: 16,
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
});

export default Notification;
