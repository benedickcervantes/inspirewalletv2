import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useMobileAuth } from '../hooks/useMobileAuth';
import { useMobileChat } from '../hooks/useMobileChat';
import { mobilePresenceService } from '../services/mobilePresenceService';
import ChatScreen from '../components/mobile/ChatScreen';
import LoginScreen from './LoginScreen';
import LoadingScreen from './LoadingScreen';

const MobileChatApp = () => {
  const { user, isAuthenticated, loading: authLoading } = useMobileAuth();
  const { isConnected, chatRoom } = useMobileChat();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize presence detection when user is authenticated
      mobilePresenceService.initializePresence(user.uid, {
        platform: 'mobile',
        appVersion: '1.0.0'
      }).catch(error => {
        console.error('Failed to initialize presence:', error);
      });
    }

    return () => {
      // Cleanup presence service when component unmounts
      mobilePresenceService.cleanup();
    };
  }, [isAuthenticated, user]);

  // Show loading screen while authenticating
  if (authLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Show loading screen while connecting to chat
  if (!isConnected || !chatRoom) {
    return <LoadingScreen message="Connecting to support..." />;
  }

  // Show main chat interface
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ChatScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  }
});

export default MobileChatApp;