import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useMobileAuth } from '../hooks/useMobileAuth';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, error } = useMobileAuth();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);

      if (!result.success) {
        Alert.alert('Sign In Failed', result.error);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(email.trim(), password, displayName.trim());

      if (!result.success) {
        Alert.alert('Sign Up Failed', result.error);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
    setLoading(false);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            <Text style={styles.title}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>

            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Sign up to start chatting with support'
                : 'Sign in to access support chat'
              }
            </Text>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
              {isSignUp && (
                <TextInput
                  style={styles.input}
                  placeholder="Your Name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  textContentType="name"
                />
              )}

              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={isSignUp ? handleSignUp : handleSignIn}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading
                    ? (isSignUp ? 'Creating Account...' : 'Signing In...')
                    : (isSignUp ? 'Create Account' : 'Sign In')
                  }
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isSignUp
                  ? 'Already have an account? '
                  : "Don't have an account? "
                }
              </Text>
              <TouchableOpacity onPress={toggleMode}>
                <Text style={styles.switchLink}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  keyboardView: {
    flex: 1
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  content: {
    padding: 24,
    justifyContent: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center'
  },
  form: {
    marginBottom: 24
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16
  },
  button: {
    backgroundColor: '#2196f3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: {
    backgroundColor: '#cccccc'
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  switchText: {
    fontSize: 14,
    color: '#666'
  },
  switchLink: {
    fontSize: 14,
    color: '#2196f3',
    fontWeight: '600'
  }
};

export default LoginScreen;