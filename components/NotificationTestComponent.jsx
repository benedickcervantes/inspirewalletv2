import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { auth } from '../configs/firebase';
import realTimeNotificationService from '../services/realTimeNotificationService';

const NotificationTestComponent = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    console.log('🧪 Test Component - Setting up notification listener for user:', user.uid);

    const unsubscribe = realTimeNotificationService.subscribeToUnreadNotifications(
      user.uid,
      (count) => {
        console.log('🧪 Test Component - Received unread count update:', count);
        setUnreadCount(count);
      }
    );

    return () => {
      console.log('🧪 Test Component - Cleaning up notification listener');
      unsubscribe();
    };
  }, [user]);

  const markAsRead = async () => {
    if (!user) return;
    
    try {
      await realTimeNotificationService.markMessagesAsRead(user.uid);
      Alert.alert('Success', 'Messages marked as read!');
    } catch (error) {
      Alert.alert('Error', 'Failed to mark messages as read');
      console.error('Error marking messages as read:', error);
    }
  };

  const testConversationPath = async () => {
    if (!user) return;
    
    try {
      const path = await realTimeNotificationService.findConversationPath(user.uid);
      if (path) {
        Alert.alert('Conversation Path Found', path);
      } else {
        Alert.alert('No Conversation Found', 'No conversation path found for this user');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to find conversation path');
      console.error('Error finding conversation path:', error);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Please log in to test notifications</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Test</Text>
      <Text style={styles.text}>User: {user.email}</Text>
      <Text style={styles.text}>Unread Count: {unreadCount}</Text>
      
      <TouchableOpacity style={styles.button} onPress={markAsRead}>
        <Text style={styles.buttonText}>Mark as Read</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, styles.testButton]} onPress={testConversationPath}>
        <Text style={styles.buttonText}>Test Conversation Path</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#34C759',
  },
});

export default NotificationTestComponent;

