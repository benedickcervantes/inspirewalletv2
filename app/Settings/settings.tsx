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
import { useLanguage } from '../../context/LanguageContext';
import type { NavProp } from '../../types/navigation';
import { useResponsive } from '../../utils/responsive';
import CustomLoader from '../Loader/CustomLoader';

interface UserData {
  email?: string;
  emailVerified?: boolean;
}

const Settings = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { width: screenWidth, scale: scaleFn } = useResponsive();
  const scaled = (n: number) => Math.round(scaleFn(n));

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
  const [signingOut, setSigningOut] = useState(false);

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
      setReferralError(t('settings.failedToLoadReferral'));
    } finally {
      setReferralLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    loadReferralCode();
  }, [loadReferralCode]);

  /** Sign out: always full sign out and go directly to Welcome (login/register), no Passcode/PIN screen. */
  const handleSignOut = async () => {
    setSigningOut(true);
    const loaderStart = Date.now();
    const MIN_LOADER_MS = 4000;

    try {
      await AsyncStorage.multiRemove([
        'access_token',
        'user',
        'userEmail',
        'userPassword',
        'passcodeLoginComplete',
        'registrationPasscodePending',
      ]);
    } catch (_) {}

    const elapsed = Date.now() - loaderStart;
    const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
    await new Promise((r) => setTimeout(r, remaining));

    (navigation as unknown as NavProp).reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const handleRefreshReferralCode = () => {
    loadReferralCode();
  };

  const handleVerifyEmail = async () => {
    const email = userData?.email?.trim();
    if (!email) {
      setEmailVerifyError(t('settings.emailNotFound'));
      return;
    }
    const otp = emailOtp.trim();
    if (!/^\d{6}$/.test(otp)) {
      setEmailVerifyError(t('settings.enter6DigitCode'));
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
        setEmailVerifyError(result.error || t('settings.verificationFailed'));
      }
    } catch (_) {
      setEmailVerifyError(t('settings.unexpectedError'));
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
        setEmailVerifyError(result.error || t('settings.failedToResend'));
      }
    } catch (_) {
      setEmailVerifyError(t('settings.failedToResend'));
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
      titleKey: 'settings.changePasscode',
      subtitleKey: 'settings.updatePinSubtitle',
      onPress: () => (navigation as { navigate: (name: string) => void }).navigate('ChangePasscode'),
    },
    {
      id: 2,
      icon: 'close-circle-outline' as const,
      titleKey: 'settings.deleteAccount',
      subtitleKey: '',
      onPress: () => (navigation as { navigate: (name: string) => void }).navigate('DeleteAccount'),
    },
  ];

  const customerRelationshipOptions = [
    { id: 1, icon: 'information-circle-outline' as const, titleKey: 'settings.aboutUs', onPress: () => (navigation as { navigate: (name: string) => void }).navigate('Aboutus') },
    { id: 2, icon: 'people-outline' as const, titleKey: 'settings.agentDashboard', onPress: () => (navigation as { navigate: (name: string) => void }).navigate('AgentRequest') },
    { id: 3, icon: 'headset-outline' as const, titleKey: 'settings.helpCenter', onPress: () => (navigation as { navigate: (name: string) => void }).navigate('HelpCenter') },
    { id: 4, icon: 'shield-outline' as const, titleKey: 'settings.privacyPolicy', onPress: () => (navigation as { navigate: (name: string) => void }).navigate('PrivacyPolicy') },
    { id: 5, icon: 'document-text-outline' as const, titleKey: 'settings.termsAndCondition', onPress: () => (navigation as { navigate: (name: string) => void }).navigate('TermsConditions') },
  ];

  const securityOptionsWithLabels = securityOptions.map((o) => {
    const opt = o as { title?: string; titleKey?: string };
    return {
      ...o,
      title: opt.title ?? (opt.titleKey ? t(opt.titleKey) : ''),
      subtitle: o.subtitleKey ? t(o.subtitleKey) : '',
    };
  });
  const customerRelationshipOptionsWithLabels = customerRelationshipOptions.map((o) => ({
    ...o,
    title: t(o.titleKey ?? ''),
  }));

  const r = {
    header: {
      paddingHorizontal: scaled(16),
      paddingTop: scaled(14),
      paddingBottom: scaled(16),
    },
    backButton: {
      padding: scaled(8),
      minWidth: scaled(44),
      minHeight: scaled(44),
    },
    headerTitle: { fontSize: scaled(18) },
    headerSpacer: { width: scaled(44) },
    content: { paddingHorizontal: scaled(16) },
    contentContainer: { paddingBottom: scaled(40) },
    sectionTitle: { fontSize: scaled(18), marginBottom: scaled(12), marginTop: scaled(8) },
    sectionCard: { borderRadius: scaled(12), marginBottom: scaled(18) },
    optionItem: { paddingVertical: scaled(14), paddingHorizontal: scaled(16) },
    optionText: { marginRight: scaled(8) },
    iconContainer: { width: scaled(40), height: scaled(40), borderRadius: scaled(12), marginRight: scaled(12) },
    optionTitle: { fontSize: scaled(15) },
    optionSubtitle: { fontSize: scaled(12), marginTop: scaled(2) },
    referralOptionItem: { paddingVertical: scaled(14), paddingHorizontal: scaled(16) },
    generateButtonText: { fontSize: scaled(14) },
    referralError: { paddingHorizontal: scaled(16), paddingBottom: scaled(12) },
    referralErrorText: { fontSize: scaled(12) },
    signOutButton: { borderRadius: scaled(12), paddingVertical: scaled(16), marginBottom: scaled(32) },
    signOutText: { fontSize: scaled(14), marginLeft: scaled(8) },
    modalOverlay: { padding: scaled(20) },
    modalContent: {
      padding: scaled(20),
      borderRadius: scaled(16),
      width: Math.min(screenWidth - scaled(40), 400),
    },
    modalHeader: { marginBottom: scaled(16) },
    modalTitle: { fontSize: scaled(18) },
    modalSubtitle: { fontSize: scaled(14), marginBottom: scaled(12) },
    otpInput: {
      paddingHorizontal: scaled(16),
      paddingVertical: scaled(14),
      fontSize: scaled(18),
      marginBottom: scaled(12),
      borderRadius: scaled(8),
    },
    modalButton: { borderRadius: scaled(8), paddingVertical: scaled(14), marginBottom: scaled(8) },
    modalButtonText: { fontSize: scaled(16) },
    resendButton: { paddingVertical: scaled(12) },
    resendButtonText: { fontSize: scaled(14) },
    emailVerifySuccess: { paddingVertical: scaled(20) },
    emailVerifySuccessText: { fontSize: scaled(16), marginTop: scaled(12), marginBottom: scaled(20) },
    iconSize: scaled(24),
    iconSizeSmall: scaled(20),
    iconSizeLarge: scaled(48),
    backIconSize: scaled(28),
  };

  if (signingOut) {
    return <CustomLoader text="SIGNING OUT" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#DE5212', '#F38B35']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        locations={[0.01, 1]}
        style={[styles.header, r.header]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Main')}
            style={[styles.backButton, r.backButton]}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={r.backIconSize} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, r.headerTitle]} numberOfLines={1}>{t('settings.title')}</Text>
          <View style={[styles.headerSpacer, r.headerSpacer]} />
        </View>
      </LinearGradient>

      <ScrollView
        style={[styles.content, r.content]}
        contentContainerStyle={r.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, r.sectionTitle]}>{t('settings.referral')}</Text>
        <View style={[styles.sectionCard, r.sectionCard]}>
          <TouchableOpacity
            style={[styles.referralOptionItem, r.referralOptionItem]}
            onPress={handleRefreshReferralCode}
            disabled={referralLoading}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.iconContainer, r.iconContainer]}>
                <Ionicons name="gift-outline" size={r.iconSize} color="#F38B35" />
              </View>
              <View style={[styles.optionText, r.optionText]}>
                <Text style={[styles.optionTitle, r.optionTitle]} numberOfLines={1}>{t('settings.myReferralCode')}</Text>
                <Text style={[styles.optionSubtitle, r.optionSubtitle]} numberOfLines={1}>
                  {referralLoading ? t('settings.loading') : referralCode || t('settings.tapToRefresh')}
                </Text>
              </View>
            </View>
            {referralLoading ? (
              <ActivityIndicator size="small" color="#F38B35" />
            ) : (
              <Text style={[styles.generateButtonText, r.generateButtonText]}>{t('settings.refresh')}</Text>
            )}
          </TouchableOpacity>
          {referralError ? (
            <View style={[styles.referralError, r.referralError]}>
              <Text style={[styles.referralErrorText, r.referralErrorText]}>{referralError}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.sectionTitle, r.sectionTitle]}>{t('settings.emailVerification')}</Text>
        <View style={[styles.sectionCard, r.sectionCard]}>
          <View style={[styles.referralOptionItem, r.referralOptionItem]}>
            <View style={styles.optionLeft}>
              <View style={[styles.iconContainer, r.iconContainer]}>
                <Ionicons name="mail-outline" size={r.iconSize} color="#F38B35" />
              </View>
              <View style={[styles.optionText, r.optionText]}>
                <Text style={[styles.optionTitle, r.optionTitle]} numberOfLines={1} ellipsizeMode="tail">
                  {userData?.email || t('settings.loading')}
                </Text>
                <Text style={[styles.optionSubtitle, r.optionSubtitle]}>
                  {userData?.emailVerified ? t('settings.verified') : t('settings.notVerified')}
                </Text>
              </View>
            </View>
            {!userData?.emailVerified && userData?.email ? (
              <TouchableOpacity onPress={openEmailVerifyModal}>
                <Text style={[styles.generateButtonText, r.generateButtonText]}>{t('settings.verify')}</Text>
              </TouchableOpacity>
            ) : (
              <Ionicons name="checkmark-circle" size={r.iconSize} color="#22C55E" />
            )}
          </View>
        </View>

        <Text style={[styles.sectionTitle, r.sectionTitle]}>{t('settings.security')}</Text>
        <View style={[styles.sectionCard, r.sectionCard]}>
          {securityOptionsWithLabels.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionItem,
                r.optionItem,
                index !== securityOptions.length - 1 && styles.optionBorder,
              ]}
              onPress={option.onPress}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.iconContainer, r.iconContainer]}>
                  <Ionicons name={option.icon} size={r.iconSize} color="#F38B35" />
                </View>
                <View style={[styles.optionText, r.optionText]}>
                  <Text style={[styles.optionTitle, r.optionTitle]} numberOfLines={1}>{option.title}</Text>
                  {option.subtitle ? (
                    <Text style={[styles.optionSubtitle, r.optionSubtitle]} numberOfLines={1}>{option.subtitle}</Text>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={r.iconSizeSmall} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, r.sectionTitle]}>{t('settings.customerRelationship')}</Text>
        <View style={[styles.sectionCard, r.sectionCard]}>
          {customerRelationshipOptionsWithLabels.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionItem,
                r.optionItem,
                index !== customerRelationshipOptions.length - 1 && styles.optionBorder,
              ]}
              onPress={option.onPress}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.iconContainer, r.iconContainer]}>
                  <Ionicons name={option.icon} size={r.iconSize} color="#F38B35" />
                </View>
                <Text style={[styles.optionTitle, r.optionTitle]} numberOfLines={1}>{option.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={r.iconSizeSmall} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.signOutButton, r.signOutButton]} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={r.iconSizeSmall} color="#666" />
          <Text style={[styles.signOutText, r.signOutText]}>{t('settings.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={emailVerifyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEmailVerifyModal}
      >
        <View style={[styles.modalOverlay, r.modalOverlay]}>
          <View style={[styles.emailVerifyModalContent, r.modalContent]}>
            <View style={[styles.modalHeader, r.modalHeader]}>
              <Text style={[styles.modalTitle, r.modalTitle]} numberOfLines={1}>{t('settings.verifyEmail')}</Text>
              <TouchableOpacity onPress={closeEmailVerifyModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={r.iconSize} color="#333" />
              </TouchableOpacity>
            </View>
            {emailVerifySuccess ? (
              <View style={[styles.emailVerifySuccess, r.emailVerifySuccess]}>
                <Ionicons name="checkmark-circle" size={r.iconSizeLarge} color="#22C55E" />
                <Text style={[styles.emailVerifySuccessText, r.emailVerifySuccessText]}>{t('settings.emailVerifiedSuccess')}</Text>
                <TouchableOpacity style={[styles.modalButton, r.modalButton]} onPress={closeEmailVerifyModal}>
                  <Text style={[styles.modalButtonText, r.modalButtonText]}>{t('settings.done')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[styles.modalSubtitle, r.modalSubtitle]} numberOfLines={2}>
                  {t('settings.enterCodeSentTo')} {userData?.email}
                </Text>
                <TextInput
                  style={[styles.otpInput, r.otpInput]}
                  placeholder={t('settings.otpPlaceholder')}
                  placeholderTextColor="#999"
                  value={emailOtp}
                  onChangeText={(val) => {
                    setEmailOtp(val.replace(/\D/g, '').slice(0, 6));
                    setEmailVerifyError(null);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {emailVerifyError ? (
                  <Text style={[styles.referralErrorText, r.referralErrorText]}>{emailVerifyError}</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.modalButton, r.modalButton, emailVerifyLoading && styles.modalButtonDisabled]}
                  onPress={handleVerifyEmail}
                  disabled={emailVerifyLoading || emailOtp.length !== 6}
                >
                  {emailVerifyLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.modalButtonText, r.modalButtonText]}>{t('settings.verify')}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.resendButton, r.resendButton]}
                  onPress={handleResendVerification}
                  disabled={resendLoading}
                >
                  {resendLoading ? (
                    <ActivityIndicator size="small" color="#F38B35" />
                  ) : (
                    <Text style={[styles.resendButtonText, r.resendButtonText]}>{t('settings.resendVerificationEmail')}</Text>
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
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    minWidth: 0,
  },
  headerSpacer: {
    width: 44,
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
    minWidth: 0,
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