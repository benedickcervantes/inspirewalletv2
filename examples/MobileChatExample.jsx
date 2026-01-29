import React, { useEffect, useState } from 'react';
import { View, Text, Alert, TouchableOpacity, SafeAreaView } from 'react-native';
import { useMobileAuth } from '../hooks/useMobileAuth';
import { useMobileChat } from '../hooks/useMobileChat';
import { mobilePresenceService } from '../services/mobilePresenceService';
import ChatScreen from '../components/mobile/ChatScreen';
import AdminStatus from '../components/mobile/AdminStatus';

const MobileChatExample = () => {
  const {
    user,
    loading: authLoading,
    signIn,
    signUp,
    logout,
    isAuthenticated
  } = useMobileAuth();

  const {
    chatRoom,
    messages,
    loading: chatLoading,
    error: chatError,
    isConnected,
    adminInfo,
    sendMessage,
    markMessagesAsRead,
    initializeChat
  } = useMobileChat();

  const [testingStatus, setTestingStatus] = useState('Ready to test');

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize presence detection
      mobilePresenceService.initializePresence(user.uid, {
        platform: 'mobile',
        appVersion: '1.0.0'
      });

      // Set presence change callback for chat room updates
      mobilePresenceService.setPresenceChangeCallback(async (isOnline) => {
        if (chatRoom) {
          // This would update the chat room presence
          console.log('User presence changed:', isOnline);
        }
      });
    }

    return () => {
      mobilePresenceService.cleanup();
    };
  }, [isAuthenticated, user, chatRoom]);

  // Test authentication flow
  const testSignUp = async () => {
    try {
      setTestingStatus('Testing sign up...');
      const result = await signUp(
        'testuser@example.com',
        'password123',
        'Test User'
      );

      if (result.success) {
        setTestingStatus('Sign up successful!');
        Alert.alert('Success', 'Account created successfully!');
      } else {
        setTestingStatus(`Sign up failed: ${result.error}`);
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      setTestingStatus(`Sign up error: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  };

  // Test sign in flow
  const testSignIn = async () => {
    try {
      setTestingStatus('Testing sign in...');
      const result = await signIn('testuser@example.com', 'password123');

      if (result.success) {
        setTestingStatus('Sign in successful!');
        Alert.alert('Success', 'Signed in successfully!');
      } else {
        setTestingStatus(`Sign in failed: ${result.error}`);
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      setTestingStatus(`Sign in error: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  };

  // Test chat initialization
  const testChatInit = async () => {
    try {
      setTestingStatus('Testing chat initialization...');
      await initializeChat();
      setTestingStatus('Chat initialized successfully!');
      Alert.alert('Success', 'Chat initialized successfully!');
    } catch (error) {
      setTestingStatus(`Chat init error: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  };

  // Test sending message
  const testSendMessage = async () => {
    try {
      setTestingStatus('Testing message send...');
      const result = await sendMessage('Hello, this is a test message from mobile app!');

      if (result.success) {
        setTestingStatus('Message sent successfully!');
        Alert.alert('Success', 'Message sent successfully!');
      } else {
        setTestingStatus(`Message send failed: ${result.error}`);
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      setTestingStatus(`Message send error: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  };

  // Test logout
  const testLogout = async () => {
    try {
      setTestingStatus('Testing logout...');
      const result = await logout();

      if (result.success) {
        setTestingStatus('Logout successful!');
        Alert.alert('Success', 'Logged out successfully!');
      } else {
        setTestingStatus(`Logout failed: ${result.error}`);
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      setTestingStatus(`Logout error: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text>Loading authentication...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Mobile Chat Test</Text>
          <Text style={styles.status}>{testingStatus}</Text>

          <TouchableOpacity style={styles.button} onPress={testSignUp}>
            <Text style={styles.buttonText}>Test Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testSignIn}>
            <Text style={styles.buttonText}>Test Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!isConnected || !chatRoom) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Chat Setup</Text>
          <Text style={styles.status}>{testingStatus}</Text>

          <Text style={styles.userInfo}>
            Logged in as: {user.displayName || user.email}
          </Text>

          {chatLoading ? (
            <Text>Initializing chat...</Text>
          ) : (
            <TouchableOpacity style={styles.button} onPress={testChatInit}>
              <Text style={styles.buttonText}>Initialize Chat</Text>
            </TouchableOpacity>
          )}

          {chatError && (
            <Text style={styles.error}>Chat Error: {chatError}</Text>
          )}

          <TouchableOpacity style={styles.button} onPress={testLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mobile Chat Connected</Text>
        <Text style={styles.userInfo}>
          User: {user.displayName || user.email}
        </Text>

        {adminInfo && (
          <AdminStatus
            adminName={adminInfo.adminName}
            isOnline={adminInfo.adminOnline}
          />
        )}

        <View style={styles.testControls}>
          <TouchableOpacity style={styles.smallButton} onPress={testSendMessage}>
            <Text style={styles.smallButtonText}>Send Test Message</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallButton} onPress={testLogout}>
            <Text style={styles.smallButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.status}>{testingStatus}</Text>
      </View>

      <View style={styles.chatContainer}>
        <ChatScreen />
      </View>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center'
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center'
  },
  status: {
    fontSize: 14,
    color: '#2196f3',
    marginBottom: 16,
    textAlign: 'center'
  },
  error: {
    fontSize: 14,
    color: '#f44336',
    marginBottom: 16,
    textAlign: 'center'
  },
  button: {
    backgroundColor: '#2196f3',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center'
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  testControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8
  },
  smallButton: {
    backgroundColor: '#4caf50',
    padding: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center'
  },
  smallButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  chatContainer: {
    flex: 1
  }
};

export default MobileChatExample;