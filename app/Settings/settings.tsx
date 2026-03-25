import {
  Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { unregisterIndieDevice } from 'native-notify';
import { useCallback,
  useEffect,
  useState } from 'react';
import {
    ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { disableBiometric, enableBiometric, getReferralCode, resendVerification, verifyEmail } from '../../configs/api';
import { useIdleTimeout } from '../../context/IdleTimeoutContext';
import { useLanguage } from '../../context/LanguageContext';
import { useResponsive } from '../../utils/responsive';
import AccountDeletionModal from '../AccountDeletion/AccountDeletionModal';
import Loader from '../Loader/Loader';
import { TouchableOpacity } from "react-native-gesture-handler";
interface UserData {
  email?: string;
  emailVerified?: boolean;
  biometricEnabled?: boolean;
}

const Settings = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { stopIdleSession } = useIdleTimeout();
  const { width: screenWidth, scale: scaleFn } = useResponsive();
  const scaled = (n: number) => Math.round(scaleFn(n));

  const [userData, setUserData] = useState<UserData | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [emailVerifyModalVisible, setEmailVerifyModalVisible] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [emailVerifyError, setEmailVerifyError] = useState<string | null>(null);
  const [emailVerifySuccess, setEmailVerifySuccess] = useState(false);
  const [emailVerifyFromBiometric, setEmailVerifyFromBiometric] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Biometric state
  const [hasBiometricHardware, setHasBiometricHardware] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometrics');
  const [biometricModalVisible, setBiometricModalVisible] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState('');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);

  // Language state
  const { language, setLanguage } = useLanguage();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const SUPPORTED_LANGUAGES = [
    { label: "English", flag: "🇺🇸" },
    { label: "Arabic", flag: "🇸🇦" },
    { label: "Japanese", flag: "🇯🇵" },
    { label: "Korean", flag: "🇰🇷" },
  ];

  const loadUser = useCallback(async () => {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as UserData;
        setUserData({
          email: user.email,
          emailVerified: user.emailVerified,
          biometricEnabled: user.biometricEnabled || false // Handle legacy data
        });
      } catch (_) { }
    } else {
      // If no user data in AsyncStorage, set empty user object so we don't show loading screen
      setUserData({ email: undefined, emailVerified: false, biometricEnabled: false });
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

    // Check if user is still authenticated
    const checkAuth = async () => {
      const accessToken = await AsyncStorage.getItem('access_token');
      if (!accessToken) {
        // User is not authenticated, redirect to Passcode
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'Passcode' }],
        });
      }
    };

    checkAuth();
  }, [loadUser, navigation]);

  useEffect(() => {
    loadReferralCode();
  }, [loadReferralCode]);

  useEffect(() => {
    // Check if device supports biometrics
    const checkBiometrics = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

        setHasBiometricHardware(compatible && enrolled);

        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType(Platform.OS === 'ios' ? 'Touch ID' : 'Biometrics');
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('Iris Scanner');
        }
      } catch (e) {
        console.error("LocalAuthentication Error:", e);
      }
    };
    checkBiometrics();
  }, []);

  /** Sign out: navigate to Passcode page while keeping session active (tokens remain). */
  const handleSignOut = async () => {
    // Stop the idle session timer
    await stopIdleSession();

    try {
      // Clear the passcode login flag
      await AsyncStorage.removeItem('passcodeLoginComplete');

      // Unregister Push Notifications and save email
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj?.email) {
          await AsyncStorage.setItem('lastLoggedEmail', userObj.email.toLowerCase());
        }

        const userId = userObj?.id || userObj?._id;
        const appId = process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_ID;
        const appToken = process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_TOKEN;
        if (userId && appId && appToken) {
          unregisterIndieDevice(String(userId), Number(appId), appToken);
        }
      }

      // Clear user data
      await AsyncStorage.removeItem('user');
    } catch (_) { }

    // Navigate to Passcode screen
    (navigation as any).reset({
      index: 0,
      routes: [{ name: 'Passcode' }],
    });
  };

  const handleReferralCodeAction = async () => {
    if (referralLoading) return;
    if (referralCode) {
      await Clipboard.setStringAsync(referralCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
      if (Platform.OS === 'android') {
        ToastAndroid.show(t('settings.copySuccess'), ToastAndroid.SHORT);
      }
      return;
    }
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

  const openEmailVerifyModal = (fromBiometric = false) => {
    setEmailVerifyModalVisible(true);
    setEmailOtp('');
    setEmailVerifyError(null);
    setEmailVerifySuccess(false);
    setEmailVerifyFromBiometric(fromBiometric);
  };

  const closeEmailVerifyModal = () => {
    setEmailVerifyModalVisible(false);
    setEmailOtp('');
    setEmailVerifyError(null);
    setEmailVerifySuccess(false);
    setEmailVerifyFromBiometric(false);
  };

  const handleEmailVerifyDone = () => {
    const shouldOpenBiometric = emailVerifyFromBiometric;
    closeEmailVerifyModal();
    if (shouldOpenBiometric) {
      setBiometricPassword('');
      setBiometricError(null);
      setBiometricModalVisible(true);
    }
  };

  const handleToggleBiometric = async () => {
    if (userData?.biometricEnabled) {
      // Disable biometric
      const accessToken = await AsyncStorage.getItem('access_token');
      if (!accessToken) return;

      try {
        await SecureStore.deleteItemAsync('biometricToken');
        const res = await disableBiometric(accessToken);
        if (res.success) {
          setUserData(prev => prev ? { ...prev, biometricEnabled: false } : null);
          const userJson = await AsyncStorage.getItem('user');
          if (userJson) {
            const user = JSON.parse(userJson);
            await AsyncStorage.setItem('user', JSON.stringify({ ...user, biometricEnabled: false }));
          }
        }
      } catch (e) {
        console.error("Failed to disable biometric", e);
      }
    } else {
      // Check if email is verified
      if (!userData?.emailVerified) {
        openEmailVerifyModal(true);
        return;
      }

      // Open setup modal
      setBiometricPassword('');
      setBiometricError(null);
      setBiometricModalVisible(true);
    }
  };

  const handleEnableBiometric = async () => {
    if (!biometricPassword.trim() || !userData?.email) {
      setBiometricError(t('settings.enterPassword'));
      return;
    }

    setBiometricLoading(true);
    setBiometricError(null);

    try {
      // 1. Authenticate with local biometrics first
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate to enable ${biometricType}`,
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (!authResult.success) {
        setBiometricError('Biometric authentication failed or was cancelled.');
        setBiometricLoading(false);
        return;
      }

      // 2. Call backend to enable
      const accessToken = await AsyncStorage.getItem('access_token');
      if (!accessToken) throw new Error("No access token");

      const res = await enableBiometric(accessToken, userData.email, biometricPassword);

      if (res.success && res.token) {
        // 3. Store token securely
        await SecureStore.setItemAsync('biometricToken', res.token);
        await AsyncStorage.setItem('biometricEmail', userData.email.toLowerCase());

        // 4. Update UI state
        setUserData(prev => prev ? { ...prev, biometricEnabled: true } : null);

        // 5. Update async storage
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          await AsyncStorage.setItem('user', JSON.stringify({ ...user, biometricEnabled: true }));
        }

        setBiometricModalVisible(false);
      } else {
        setBiometricError(res.error || 'Failed to enable biometric authentication on the server.');
      }
    } catch (e: any) {
      setBiometricError(e.message || 'An unexpected error occurred.');
    } finally {
      setBiometricLoading(false);
    }
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

  const supportOptions = [
    { id: 1, icon: 'information-circle-outline' as const, titleKey: 'settings.aboutUs', onPress: () => (navigation as { navigate: (name: string) => void }).navigate('Aboutus') },
    { id: 2, icon: 'shield-outline' as const, titleKey: 'settings.privacyPolicy', onPress: () => (navigation as { navigate: (name: string) => void }).navigate('PrivacyPolicy') },
    { id: 3, icon: 'document-text-outline' as const, titleKey: 'settings.termsAndCondition', onPress: () => (navigation as { navigate: (name: string) => void }).navigate('TermsConditions') }
  ];

  const preferencesOptions = [
    { id: 4, icon: 'calculator-outline' as const, titleKey: 'settings.currencyCalculator', subtitleKey: 'settings.currencyCalculatorSubtitle', onPress: () => (navigation as { navigate: (name: string) => void }).navigate('CurrencyCalculator') },
    { id: 5, icon: 'language-outline' as const, titleKey: 'profile.language', subtitleKey: '', onPress: () => setLanguageModalVisible(true) },
  ];

  const securityOptionsWithLabels = securityOptions.map((o) => {
    const opt = o as { title?: string; titleKey?: string };
    return {
      ...o,
      title: opt.title ?? (opt.titleKey ? t(opt.titleKey) : ''),
      subtitle: o.subtitleKey ? t(o.subtitleKey) : '',
    };
  });

  const supportOptionsWithLabels = supportOptions.map((o) => ({
    ...o,
    title: t(o.titleKey ?? ''),
  }));

  const preferencesOptionsWithLabels = preferencesOptions.map((o) => {
    let titleStr = t(o.titleKey ?? '');
    // Capitalize the first letter of the Language option and lowercase the rest
    if (o.id === 5 && titleStr) {
      titleStr = titleStr.charAt(0).toUpperCase() + titleStr.slice(1).toLowerCase();
    }
    return {
      ...o,
      title: titleStr,
      subtitle: o.id === 5 ? language : t(o.subtitleKey ?? ''), // Show selected language explicitly
    };
  });

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
    passwordInput: {
      paddingHorizontal: scaled(16),
      paddingVertical: scaled(14),
      fontSize: scaled(16),
      marginBottom: scaled(16),
      borderRadius: scaled(8),
    },
  };

  if (!userData) {
    return <Loader text={t("common.loading")} />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#DE5212" />
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
              onPress={handleReferralCodeAction}
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
                <Text style={[styles.generateButtonText, r.generateButtonText]}>
                  {copySuccess ? t('settings.copySuccess') : t('settings.copy')}
                </Text>
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
                  (index !== securityOptions.length - 1 || hasBiometricHardware) && styles.optionBorder,
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

            {hasBiometricHardware && (
              <TouchableOpacity
                style={[styles.optionItem, r.optionItem]}
                onPress={handleToggleBiometric}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.iconContainer, r.iconContainer]}>
                    <Ionicons
                      name={Platform.OS === 'ios' ? 'scan' : 'finger-print'}
                      size={r.iconSize}
                      color="#F38B35"
                    />
                  </View>
                  <View style={[styles.optionText, r.optionText]}>
                    <Text style={[styles.optionTitle, r.optionTitle]} numberOfLines={1}>
                      {t('settings.biometricLogin', { type: biometricType })}
                    </Text>
                    <Text style={[styles.optionSubtitle, r.optionSubtitle]} numberOfLines={2}>
                      {t('settings.biometricSubtitle', { type: biometricType })}
                    </Text>
                  </View>
                </View>
                <View style={[styles.toggleSwitch, userData?.biometricEnabled && styles.toggleSwitchActive]}>
                  <View style={[styles.toggleThumb, userData?.biometricEnabled && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.sectionTitle, r.sectionTitle]}>{t('settings.preferences')}</Text>
          <View style={[styles.sectionCard, r.sectionCard]}>
            {preferencesOptionsWithLabels.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionItem,
                  r.optionItem,
                  index !== preferencesOptions.length - 1 && styles.optionBorder,
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

          <Text style={[styles.sectionTitle, r.sectionTitle]}>{t('settings.supportAndLegal')}</Text>

          <View style={[styles.sectionCard, r.sectionCard]}>
            {supportOptionsWithLabels.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionItem,
                  r.optionItem,
                  index !== supportOptions.length - 1 && styles.optionBorder,
                ]}
                onPress={option.onPress}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.iconContainer, r.iconContainer]}>
                    <Ionicons name={option.icon} size={r.iconSize} color="#F38B35" />
                  </View>
                  <View style={[styles.optionText, r.optionText]}>
                    <Text style={[styles.optionTitle, r.optionTitle]} numberOfLines={1}>{option.title}</Text>
                  </View>
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
                  <TouchableOpacity
                    style={[styles.modalButton, r.modalButton, styles.modalDoneButton]}
                    onPress={handleEmailVerifyDone}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalButtonText, r.modalButtonText, styles.modalDoneButtonText]}>{t('settings.done')}</Text>
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

        {/* Biometric Setup Modal */}
        <Modal
          visible={biometricModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setBiometricModalVisible(false)}
        >
          <View style={[styles.modalOverlay, r.modalOverlay]}>
            <View style={[styles.emailVerifyModalContent, r.modalContent]}>
              <View style={[styles.modalHeader, r.modalHeader]}>
                <Text style={[styles.modalTitle, r.modalTitle]} numberOfLines={1}>
                  {t('settings.enableBiometric', { type: biometricType })}
                </Text>
                <TouchableOpacity onPress={() => setBiometricModalVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={r.iconSize} color="#333" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalSubtitle, r.modalSubtitle]} numberOfLines={3}>
                {t('settings.biometricSetupSubtitle', { type: biometricType })}
              </Text>

              <TextInput
                style={[styles.passwordInput, r.passwordInput]}
                placeholder={t('settings.passwordPlaceholder')}
                placeholderTextColor="#999"
                value={biometricPassword}
                onChangeText={(val) => {
                  setBiometricPassword(val);
                  setBiometricError(null);
                }}
                secureTextEntry
                autoCapitalize="none"
              />

              {biometricError ? (
                <Text style={[styles.referralErrorText, r.referralErrorText, { marginBottom: 12 }]}>{biometricError}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.modalButton, r.modalButton, biometricLoading && styles.modalButtonDisabled]}
                onPress={handleEnableBiometric}
                disabled={biometricLoading || !biometricPassword}
              >
                {biometricLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, r.modalButtonText]}>{t('settings.enable')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Language Modal */}
        <Modal
          visible={languageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLanguageModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.languageModalOverlay}
            activeOpacity={1}
            onPress={() => setLanguageModalVisible(false)}
          >
            <View
              style={styles.languageModalContentOuter}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.languageModalHeader}>
                <View style={styles.languageMapGlobe}>
                  <Ionicons name="globe-outline" size={40} color="#DE5212" />
                </View>
                <Text style={styles.languageModalTitle}>
                  {t("profile.selectLanguage")}
                </Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {SUPPORTED_LANGUAGES.map(({ label, flag }) => (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.languageOption,
                      language === label && styles.languageOptionSelected,
                    ]}
                    onPress={() => {
                      setLanguage(label);
                      setLanguageModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.languageOptionFlag}>{flag}</Text>
                    <Text
                      style={[
                        styles.languageOptionText,
                        language === label && styles.languageOptionTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                    {language === label && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#DE5212"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.languageModalCancel}
                onPress={() => setLanguageModalVisible(false)}
              >
                <Text style={styles.languageModalCancelText}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <AccountDeletionModal />
      </SafeAreaView>
    </>
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
  modalDoneButton: {
    width: '100%',
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: 12,
    marginTop: 4,
    paddingHorizontal: 20,
  },
  modalDoneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  recentTransactionText: {
    color: '#8e8e93',
    fontSize: 14,
    fontFamily: 'SF-Pro-Rounded-Medium',
  },
  // Language Modal Styles
  languageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  languageModalContentOuter: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  languageModalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  languageMapGlobe: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(222, 82, 18, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(222, 82, 18, 0.3)",
  },
  languageModalTitle: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk-Bold",
    color: "#333333",
    textAlign: "center",
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  languageOptionSelected: {
    backgroundColor: "#FFF0E8",
    borderColor: "#E15816",
  },
  languageOptionFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageOptionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "SF-Pro-Rounded-Medium",
    color: "#333333",
  },
  languageOptionTextSelected: {
    fontFamily: "SF-Pro-Rounded-Bold",
    color: "#E15816",
  },
  languageModalCancel: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
  },
  languageModalCancelText: {
    color: "#666666",
    fontSize: 16,
    fontFamily: "SF-Pro-Rounded-Semibold",
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
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#DE5212', // Orange theme
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 0 }],
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
});

export default Settings;
