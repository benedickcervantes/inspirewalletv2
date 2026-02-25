import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getReferralCode, resendVerification, verifyEmail } from '../../configs/api';
import type { NavProp } from '../../types/navigation';

interface UserData {
  email?: string;
  emailVerified?: boolean;
}

const Settings = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [emailVerifyModalVisible, setEmailVerifyModalVisible] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [emailVerifyError, setEmailVerifyError] = useState<string | null>(null);
  const [emailVerifySuccess, setEmailVerifySuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const loadUser = useCallback(async () => {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as UserData;
        setUserData({ email: user.email, emailVerified: user.emailVerified });
      } catch (_) {}
    }
  }, []);

  const loadReferralCode = useCallback(async () => {
    const accessToken = await AsyncStorage.getItem('access_token');
    if (!accessToken) return;
    setReferralError(null);
    setReferralLoading(true);
    try {
      const result = await getReferralCode(accessToken);
      if (result.success && result.referralCode) {
        setReferralCode(result.referralCode);
      } else if (result.error) {
        setReferralError(result.error);
      }
    } catch (_) {
      setReferralError('Failed to load referral code');
    } finally {
      setReferralLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    loadReferralCode();
  }, [loadReferralCode]);

  const handleSignOut = async () => {
    try {
      await AsyncStorage.multiRemove(['access_token', 'user', 'userEmail', 'userPassword', 'passcodeLoginComplete', 'registrationPasscodePending']);
    } catch (_) {}
    (navigation as unknown as NavProp).replace('Login');
  };

  const handleRefreshReferralCode = () => {
    loadReferralCode();
  };

  const handleVerifyEmail = async () => {
    const email = userData?.email?.trim();
    if (!email) {
      setEmailVerifyError('Email not found. Please sign in again.');
      return;
    }
    const otp = emailOtp.trim();
    if (!/^\d{6}$/.test(otp)) {
      setEmailVerifyError('Enter the 6-digit code from your email');
      return;
    }
    setEmailVerifyError(null);
    setEmailVerifyLoading(true);
    try {
      const result = await verifyEmail(email, otp);
      if (result.success) {
        setEmailVerifySuccess(true);
        setUserData((prev) => (prev ? { ...prev, emailVerified: true } : null));
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson) as UserData;
          await AsyncStorage.setItem('user', JSON.stringify({ ...user, emailVerified: true }));
        }
      } else {
        setEmailVerifyError(result.error || 'Verification failed');
      }
    } catch (_) {
      setEmailVerifyError('An unexpected error occurred');
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const email = userData?.email?.trim();
    if (!email) return;
    setEmailVerifyError(null);
    setResendLoading(true);
    try {
      const result = await resendVerification(email);
      if (result.success) {
        setEmailVerifyError(null);
        setEmailOtp('');
      } else {
        setEmailVerifyError(result.error || 'Failed to resend');
      }
    } catch (_) {
      setEmailVerifyError('Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  const openEmailVerifyModal = () => {
    setEmailVerifyModalVisible(true);
    setEmailOtp('');
    setEmailVerifyError(null);
    setEmailVerifySuccess(false);
  };

  const closeEmailVerifyModal = () => {
    setEmailVerifyModalVisible(false);
    setEmailOtp('');
    setEmailVerifyError(null);
    setEmailVerifySuccess(false);
  };

  const securityOptions = [
    {
      id: 1,
      icon: 'lock-closed-outline' as const,
      title: 'Passcode',
      subtitle: 'Change your PIN',
      onPress: () => {},
    },
    {
      id: 2,
      icon: 'close-circle-outline' as const,
      title: 'Delete Account',
      subtitle: '',
      onPress: () => (navigation as { navigate: (name: string) => void }).navigate('DeleteAccount'),
    },
  ];

  const customerRelationshipOptions = [
    {
      id: 1,
      icon: 'information-circle-outline' as const,
      title: 'About us',
      onPress: () => (navigation as { navigate: (name: string) => void }).navigate('Aboutus'),
    },
    {
      id: 2,
      icon: 'people-outline' as const,
      title: 'Agent Dashboard',
      onPress: () => (navigation as { navigate: (name: string) => void }).navigate('AgentRequest'),
    },
    {
      id: 3,
      icon: 'headset-outline' as const,
      title: 'Help Center',
      onPress: () => (navigation as { navigate: (name: string) => void }).navigate('HelpCenter'),
    },
    {
      id: 4,
      icon: 'shield-outline' as const,
      title: 'Privacy Policy',
      onPress: () => (navigation as { navigate: (name: string) => void }).navigate('PrivacyPolicy'),
    },
    {
      id: 5,
      icon: 'document-text-outline' as const,
      title: 'Terms and Condition',
      onPress: () => (navigation as { navigate: (name: string) => void }).navigate('TermsConditions'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#DE5212', '#F38B35']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        locations={[0.01, 1]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Referral</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.referralOptionItem}
            onPress={handleRefreshReferralCode}
            disabled={referralLoading}
          >
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="gift-outline" size={24} color="#F38B35" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>My Referral Code</Text>
                <Text style={styles.optionSubtitle}>
                  {referralLoading ? 'Loading...' : referralCode || 'Tap to refresh'}
                </Text>
              </View>
            </View>
            {referralLoading ? (
              <ActivityIndicator size="small" color="#F38B35" />
            ) : (
              <Text style={styles.generateButtonText}>Refresh</Text>
            )}
          </TouchableOpacity>
          {referralError ? (
            <View style={styles.referralError}>
              <Text style={styles.referralErrorText}>{referralError}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Email Verification</Text>
        <View style={styles.sectionCard}>
          <View style={styles.referralOptionItem}>
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={24} color="#F38B35" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>
                  {userData?.email || 'Loading...'}
                </Text>
                <Text style={styles.optionSubtitle}>
                  {userData?.emailVerified ? 'Verified' : 'Not verified'}
                </Text>
              </View>
            </View>
            {!userData?.emailVerified && userData?.email ? (
              <TouchableOpacity onPress={openEmailVerifyModal}>
                <Text style={styles.generateButtonText}>Verify</Text>
              </TouchableOpacity>
            ) : (
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.sectionCard}>
          {securityOptions.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionItem,
                index !== securityOptions.length - 1 && styles.optionBorder,
              ]}
              onPress={option.onPress}
            >
              <View style={styles.optionLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name={option.icon} size={24} color="#F38B35" />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  {option.subtitle ? (
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Customer Relationship</Text>
        <View style={styles.sectionCard}>
          {customerRelationshipOptions.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionItem,
                index !== customerRelationshipOptions.length - 1 && styles.optionBorder,
              ]}
              onPress={option.onPress}
            >
              <View style={styles.optionLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name={option.icon} size={24} color="#F38B35" />
                </View>
                <Text style={styles.optionTitle}>{option.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#666" />
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={emailVerifyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEmailVerifyModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.emailVerifyModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Email</Text>
              <TouchableOpacity onPress={closeEmailVerifyModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {emailVerifySuccess ? (
              <View style={styles.emailVerifySuccess}>
                <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
                <Text style={styles.emailVerifySuccessText}>Email verified successfully</Text>
                <TouchableOpacity style={styles.modalButton} onPress={closeEmailVerifyModal}>
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>
                  Enter the 6-digit code sent to {userData?.email}
                </Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="000000"
                  placeholderTextColor="#999"
                  value={emailOtp}
                  onChangeText={(t) => {
                    setEmailOtp(t.replace(/\D/g, '').slice(0, 6));
                    setEmailVerifyError(null);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {emailVerifyError ? (
                  <Text style={styles.referralErrorText}>{emailVerifyError}</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.modalButton, emailVerifyLoading && styles.modalButtonDisabled]}
                  onPress={handleVerifyEmail}
                  disabled={emailVerifyLoading || emailOtp.length !== 6}
                >
                  {emailVerifyLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalButtonText}>Verify</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendVerification}
                  disabled={resendLoading}
                >
                  {resendLoading ? (
                    <ActivityIndicator size="small" color="#F38B35" />
                  ) : (
                    <Text style={styles.resendButtonText}>Resend verification email</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#FFF1E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    opacity: 0.7,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  referralOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  generateButtonText: {
    fontSize: 14,
    color: '#F38B35',
    fontWeight: '600',
  },
  referralError: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  referralErrorText: {
    fontSize: 12,
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emailVerifyModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalButton: {
    backgroundColor: '#F38B35',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    fontSize: 14,
    color: '#F38B35',
    fontWeight: '500',
  },
  emailVerifySuccess: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emailVerifySuccessText: {
    fontSize: 16,
    color: '#22C55E',
    marginTop: 12,
    marginBottom: 20,
  },
  signOutButton: {
    backgroundColor: '#E8E8E8',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 8,
    letterSpacing: 1,
  },
});

export default Settings;
