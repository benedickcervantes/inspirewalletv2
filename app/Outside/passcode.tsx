import {
    Ionicons
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
    useEffect,
    useRef,
    useState
} from 'react';
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { login, resetPasscode, verifyBiometric, verifyPasscode } from '../../configs/api';
import {
    DEFAULT_LANGUAGE,
    normalizeLanguage,
    SUPPORTED_LANGUAGES,
} from '../../constants/locales';
import { useLanguage } from '../../context/LanguageContext';
import type { NavProp } from '../../types/navigation';
import { useResponsive } from '../../utils/responsive';
import Loader from '../Loader/Loader';

const GRADIENT_START = '#E15816';
const GRADIENT_END = '#F48F38';
const WHITE = '#FFFFFF';

interface MessageModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: string;
  confirmText?: string;
  onConfirm?: (() => void) | null;
}

function MessageModal({ visible, onClose, title, message, confirmText = 'OK', onConfirm }: MessageModalProps) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <Pressable style={msgStyles.overlay} onPress={onClose}>
        <View style={msgStyles.box}>
          <Text style={msgStyles.title}>{title}</Text>
          <Text style={msgStyles.message}>{message}</Text>
          <TouchableOpacity
            style={msgStyles.button}
            onPress={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
          >
            <Text style={msgStyles.buttonText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const msgStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 10, textAlign: 'center' },
  message: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  button: {
    backgroundColor: GRADIENT_START,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: { color: WHITE, fontSize: 16, fontWeight: '600' },
});

interface ModalConfig {
  title: string;
  message: string;
  type: string;
  confirmText: string;
  onConfirm: (() => void) | null;
}

export default function Passcode() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { horizontalPadding, isShortScreen, isSmallScreen } = useResponsive();
  const isSmallPhone = width < 380;
  const compact = isShortScreen || height < 650;
  const tiny = height < 600;
  const btnSize = width >= 768 ? 80 : tiny ? 40 : compact ? Math.min(56, Math.max(46, width * 0.18)) : Math.min(72, Math.max(52, width * 0.22));
  const delBtnSize = width >= 768 ? 80 : tiny ? 40 : compact ? Math.min(56, Math.max(46, width * 0.18)) : Math.min(72, Math.max(52, width * 0.22));
  const padWidth = width >= 768 ? '65%' : width < 340 ? '92%' : '88%';
  const maxPadWidth = width >= 768 ? 420 : Math.min(360, width - horizontalPadding * 2);
  const logoWidth = tiny ? 88 : compact ? Math.min(140, Math.max(100, width * 0.38)) : Math.min(200, Math.max(160, width * 0.52));
  const logoHeight = Math.round(logoWidth * (72 / 200));
  const dotSize = tiny ? 14 : compact ? 18 : isSmallPhone ? 20 : 22;
  const dotGap = tiny ? 10 : compact ? 14 : isSmallPhone ? 20 : 24;
  const enterTextSize = tiny ? 13 : compact ? 15 : isSmallPhone ? 16 : 18;
  const padButtonTextSize = tiny ? 18 : compact ? 22 : isSmallPhone ? 26 : 30;
  const logoTopMargin = tiny ? 4 : compact ? Math.min(12, Math.round(height * 0.02)) : Math.min(40, Math.round(height * 0.04));
  const backspaceIconSize = tiny ? 16 : compact ? 20 : isSmallPhone ? 24 : 28;
  const logoWrapMarginBottom = tiny ? 6 : compact ? 12 : 32;
  const dotsWrapMarginBottom = tiny ? 6 : compact ? 10 : 20;
  const enterTextMarginBottom = tiny ? 8 : compact ? 16 : 40;
  const padRowMarginBottom = tiny ? 4 : compact ? 10 : 20;
  const bottomRowMarginTop = tiny ? 4 : compact ? 8 : 16;

  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ title: '', message: '', type: 'info', confirmText: 'OK', onConfirm: null });
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState<'auth' | 'newPasscode'>('auth');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmNewPasscode, setConfirmNewPasscode] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [loadingPasscode, setLoadingPasscode] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const { t, language: contextLanguage, setLanguage } = useLanguage();
  const language = normalizeLanguage(contextLanguage ?? DEFAULT_LANGUAGE);
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);
  
  // Biometric state
  const [hasBiometricToken, setHasBiometricToken] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometrics');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const showModal = (config: Partial<ModalConfig>) => {
    setModalConfig({ title: '', message: '', type: 'info', confirmText: t('common.ok'), onConfirm: null, ...config });
    setModalVisible(true);
  };
  const hideModal = () => setModalVisible(false);

  useEffect(() => {
    const backAction = () => true;
    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPasscode = async () => {
      const accessToken = await AsyncStorage.getItem('access_token');
      if (!cancelled) {
        if (!accessToken) {
          setNeedsAuth(true);
        } else {
          // Check for biometric token and support
          try {
            const token = await SecureStore.getItemAsync('biometricToken');
            if (token) {
              const compatible = await LocalAuthentication.hasHardwareAsync();
              const enrolled = await LocalAuthentication.isEnrolledAsync();
              if (compatible && enrolled) {
                setHasBiometricToken(true);
                const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
                if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                  setBiometricType('Face ID');
                } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                  setBiometricType(Platform.OS === 'ios' ? 'Touch ID' : 'fingerprint');
                }
              }
            }
          } catch (e) {
            console.error("Biometric init error:", e);
          }
        }
        // If access token exists, show passcode entry screen (don't redirect to Main)
        setLoadingPasscode(false);
      }
    };

    loadPasscode();
    return () => { cancelled = true; };
  }, [navigation]);

  // Handle Biometric Login Flow
  const handleBiometricAuth = async () => {
    try {
      setVerifyingPasscode(true);
      setError('');

      const token = await SecureStore.getItemAsync('biometricToken');
      if (!token) {
        throw new Error(t("passcode.noTokenFound"));
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: t("passcode.biometricPrompt", { type: biometricType }),
        fallbackLabel: t("passcode.useFallback"),
        disableDeviceFallback: false,
      });

      if (authResult.success) {
        const result = await verifyBiometric(token);
        
        if (result.success && result.access_token) {
          await AsyncStorage.setItem('access_token', result.access_token);
          if (result.user) {
            await AsyncStorage.setItem('user', JSON.stringify(result.user));
            if ((result.user as any).email) {
              await AsyncStorage.setItem('lastLoggedEmail', (result.user as any).email.toLowerCase());
            }
          }
          await AsyncStorage.setItem('passcodeLoginComplete', 'true');
          (navigation as unknown as NavProp).replace('Main');
        } else {
          setError(result.error || t("passcode.biometricLoginFailed"));
          setVerifyingPasscode(false);
          triggerShake();
        }
      } else {
        // User cancelled or failed local auth
        setVerifyingPasscode(false);
      }
    } catch (e: any) {
      console.error("Biometric auth error:", e);
      setError(t("passcode.biometricAuthError"));
      setVerifyingPasscode(false);
    }
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = async (value: string) => {
    if (value === 'Del') {
      setPasscode((p) => p.slice(0, -1));
      setError('');
      return;
    }
    if (passcode.length >= 4) return;
    const next = passcode + value;
    setPasscode(next);
    setError('');
    if (next.length === 4) {
      setVerifyingPasscode(true);
      const loaderStart = Date.now();
      const MIN_LOADER_MS = 3000;

      const accessToken = await AsyncStorage.getItem('access_token');
      if (!accessToken) {
        setVerifyingPasscode(false);
        (navigation as unknown as NavProp).replace('Login');
        return;
      }

      const result = await verifyPasscode(accessToken, next);

      const elapsed = Date.now() - loaderStart;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      await new Promise((r) => setTimeout(r, remaining));

      if (result.success) {
        setPasscode('');
        AsyncStorage.setItem('passcodeLoginComplete', 'true').catch(() => {});
        (navigation as unknown as NavProp).replace('Main');
      } else {
        setVerifyingPasscode(false);
        setError(t('passcode.incorrect'));
        setPasscode('');
        triggerShake();
      }
    }
  };

  const handleResetPasscode = async () => {
    if (resetStep === 'auth') {
      if (!resetEmail.trim() || !resetPassword.trim()) {
        showModal({ title: t('auth.missingInfo'), message: t('passcode.enterBothEmailPassword'), type: 'warning' });
        return;
      }
      setResetLoading(true);
      const result = await login(resetEmail.trim(), resetPassword);
      setResetLoading(false);
      if (result.success && result.access_token) {
        await AsyncStorage.setItem('access_token', result.access_token);
        await AsyncStorage.setItem('user', JSON.stringify(result.user || {}));
        setResetStep('newPasscode');
      } else {
        showModal({ title: t('passcode.authFailed'), message: result.error || t('auth.invalidCredentials'), type: 'error' });
      }
      return;
    }
    if (resetStep === 'newPasscode') {
      if (!newPasscode.trim() || !confirmNewPasscode.trim()) {
        showModal({ title: t('auth.missingInfo'), message: t('passcode.enterConfirmPasscode'), type: 'warning' });
        return;
      }
      if (newPasscode !== confirmNewPasscode) {
        showModal({ title: t('passcode.mismatchTitle'), message: t('passcode.passcodesDoNotMatch'), type: 'error' });
        return;
      }
      if (newPasscode.length !== 4 || !/^\d{4}$/.test(newPasscode)) {
        showModal({ title: t('passcode.invalidTitle'), message: t('passcode.invalidPasscodeLength'), type: 'warning' });
        return;
      }
      setResetLoading(true);
      const accessToken = await AsyncStorage.getItem('access_token');
      if (!accessToken) {
        setResetLoading(false);
        showModal({
          title: t('common.sessionExpiredTitle'),
          message: t('common.sessionExpiredMessage'),
          onConfirm: () => {
            closeResetModal();
            (navigation as unknown as NavProp).replace('Login');
          },
        });
        return;
      }
      const result = await resetPasscode(accessToken, newPasscode);
      setResetLoading(false);
      if (!result.success) {
        showModal({ title: t('passcode.authFailed'), message: result.error || t('passcode.errorChangeFailed'), type: 'error' });
        return;
      }
      const userJson = await AsyncStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : {};
      user.hasPasscode = true;
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('passcodeLoginComplete', 'true');
      setResetModalVisible(false);
      setResetEmail('');
      setResetPassword('');
      setNewPasscode('');
      setConfirmNewPasscode('');
      setResetStep('auth');
      (navigation as unknown as NavProp).replace('Main');
    }
  };

  const handleSelectLanguage = async (selectedLabel: string) => {
    setLanguage(selectedLabel);
    await AsyncStorage.setItem('user_preferred_language', selectedLabel);
    setLanguageModalVisible(false);
  };

  const closeResetModal = () => {
    setResetModalVisible(false);
    setResetStep('auth');
    setResetEmail('');
    setResetPassword('');
    setNewPasscode('');
    setConfirmNewPasscode('');
  };

  return (
    <>
      {loadingPasscode || verifyingPasscode ? (
        <Loader text={t('auth.loggingIn')} />
      ) : (
        <LinearGradient
          colors={[GRADIENT_START, GRADIENT_END]}
          locations={[0, 1]}
          style={[styles.gradient, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingHorizontal: horizontalPadding }]}
        >
        {!needsAuth ? (
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 12 }]}
            onPress={() => (navigation as unknown as NavProp).replace('Login')}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={26} color={WHITE} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.languageButton, { top: insets.top + 12, right: horizontalPadding }]}
          onPress={() => setLanguageModalVisible(true)}
          accessibilityLabel={t('profile.selectLanguage')}
          accessibilityRole="button"
        >
          <Ionicons name="language-outline" size={isSmallScreen ? 24 : 26} color={WHITE} />
        </TouchableOpacity>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            (compact || tiny) && { paddingVertical: tiny ? 4 : 12, paddingBottom: tiny ? 12 : 24, flexGrow: 1, justifyContent: 'center' },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.centerContent}>
          <View style={[styles.logoWrap, { marginTop: logoTopMargin, marginBottom: logoWrapMarginBottom }]}>
            <Image
              source={require('../../assets/images/InpireLogo.png')}
              style={[styles.logo, { width: logoWidth, height: logoHeight }]}
              contentFit="contain"
            />
          </View>

          {needsAuth ? (
            <View style={[
              styles.needsAuthWrap,
              isSmallScreen && { paddingHorizontal: 16 },
              (compact || tiny) && { marginTop: tiny ? -16 : -20 },
            ]}>
              <Text style={[styles.needsAuthTitle, isSmallScreen && { fontSize: 20 }, compact && { fontSize: 18, marginBottom: 12 }, tiny && { fontSize: 16, marginBottom: 8 }]}>
                {t('passcode.loginTitle')}
              </Text>
              <Text style={[styles.needsAuthMessage, isSmallScreen && { fontSize: 15 }, compact && { marginBottom: 20, lineHeight: 22 }, tiny && { fontSize: 14, marginBottom: 12, lineHeight: 20 }]}>
                {t('passcode.loginMessage')}
              </Text>
              <View style={[styles.needsAuthButtons, isSmallScreen && { maxWidth: 260 }, compact && { gap: 10 }, tiny && { gap: 8 }]}>
                <TouchableOpacity
                  style={[styles.needsAuthBtn, styles.needsAuthBtnSecondary, isSmallScreen && { minHeight: 48 }, tiny && { minHeight: 40, paddingVertical: 10 }]}
                  onPress={() => (navigation as unknown as NavProp).replace('Register')}
                >
                  <Text style={[styles.needsAuthBtnText, isSmallScreen && { fontSize: 16 }, tiny && { fontSize: 14 }]}>{t('auth.register')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.needsAuthBtn, styles.needsAuthBtnPrimary, isSmallScreen && { minHeight: 48 }, tiny && { minHeight: 40, paddingVertical: 10 }]}
                  onPress={() => (navigation as unknown as NavProp).replace('Login')}
                >
                  <Text style={[styles.needsAuthBtnText, isSmallScreen && { fontSize: 16 }, tiny && { fontSize: 14 }]}>{t('auth.login')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {error ? <Text style={[styles.errorText, compact && { marginBottom: 14, paddingVertical: 8 }, tiny && { marginBottom: 6, paddingVertical: 4, fontSize: 13 }]}>{error}</Text> : null}

              <Animated.View style={[styles.dotsWrap, { gap: dotGap, marginBottom: dotsWrapMarginBottom, transform: [{ translateX: shakeAnim }] }]}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
                      passcode.length > i && styles.dotFilled,
                    ]}
                  />
                ))}
              </Animated.View>

              <Text style={[styles.enterText, { fontSize: enterTextSize, marginBottom: enterTextMarginBottom }]}>{t('passcode.enterPasscode')}</Text>

              <View style={[styles.padContainer, { width: padWidth, maxWidth: maxPadWidth }]}>
                {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, ri) => (
                  <View key={ri} style={[styles.padRow, { marginBottom: padRowMarginBottom }]}>
                    {row.map((key) => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.padButton, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }]}
                        onPress={() => handlePress(key)}
                      >
                        <Text style={[styles.padButtonText, { fontSize: padButtonTextSize }]}>{key}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
                <View style={[styles.padRowLast, { marginBottom: tiny ? 4 : compact ? 8 : 20 }]}>
                  {hasBiometricToken ? (
                    <TouchableOpacity
                      style={[styles.padButton, styles.padButtonBiometric, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }]}
                      onPress={handleBiometricAuth}
                    >
                      <Ionicons 
                        name={Platform.OS === 'ios' ? 'scan' : 'finger-print'} 
                        size={backspaceIconSize + 4} 
                        color={WHITE} 
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: btnSize }} />
                  )}
                  <TouchableOpacity
                    style={[styles.padButton, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }]}
                    onPress={() => handlePress('0')}
                  >
                    <Text style={[styles.padButtonText, { fontSize: padButtonTextSize }]}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.padButton, styles.padButtonDel, { width: delBtnSize, height: delBtnSize, borderRadius: delBtnSize / 2 }]}
                    onPress={() => handlePress('Del')}
                  >
                    <Ionicons name="backspace-outline" size={backspaceIconSize} color={WHITE} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.bottomRow, { maxWidth: Math.min(280, width - horizontalPadding * 2), marginTop: bottomRowMarginTop }]}>
                <TouchableOpacity style={[styles.bottomButton, styles.bottomButtonPrimary, isSmallScreen && { minHeight: 48 }, tiny && { minHeight: 40, paddingVertical: 8 }]} onPress={() => (navigation as unknown as NavProp).replace('Login')}>
                  <Text style={[styles.bottomButtonTextPrimary, isSmallScreen && { fontSize: 16 }]}>{t('passcode.useEmail')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.forgotLinkWrap, tiny && { marginTop: 4 }]} onPress={() => setResetModalVisible(true)}>
                  <Text style={[styles.forgotLink, isSmallScreen && { fontSize: 15 }, tiny && { fontSize: 13 }]}>{t('passcode.forgotPasscode')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          </View>
        </ScrollView>
      </LinearGradient>
      )}

      <MessageModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
      />

      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <TouchableOpacity
          style={[
            passcodeLanguageStyles.overlay,
            { paddingHorizontal: Math.max(16, horizontalPadding) },
          ]}
          activeOpacity={1}
          onPress={() => setLanguageModalVisible(false)}
        >
          <View
            style={[
              passcodeLanguageStyles.content,
              {
                maxWidth: Math.min(360, width - 32),
                maxHeight: isShortScreen ? height * 0.85 : undefined,
                padding: isSmallScreen ? 18 : 24,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={passcodeLanguageStyles.header}>
              <Ionicons name="globe-outline" size={isSmallScreen ? 32 : 40} color={GRADIENT_START} />
              <Text style={[passcodeLanguageStyles.title, isSmallScreen && { fontSize: 16 }]}>
                {t('profile.selectLanguage')}
              </Text>
              <Text style={[passcodeLanguageStyles.subtitle, isSmallScreen && { fontSize: 12 }]}>
                {t('profile.defaultIsEnglish')}
              </Text>
            </View>
            <ScrollView
              style={isShortScreen ? { maxHeight: 200 } : undefined}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {SUPPORTED_LANGUAGES.map(({ label, flag }) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    passcodeLanguageStyles.option,
                    isSmallScreen && { paddingVertical: 12, paddingHorizontal: 14 },
                    language === label && passcodeLanguageStyles.optionSelected,
                  ]}
                  onPress={() => handleSelectLanguage(label)}
                  activeOpacity={0.7}
                >
                  <Text style={[passcodeLanguageStyles.flag, isSmallScreen && { fontSize: 20 }]}>{flag}</Text>
                  <Text
                    style={[
                      passcodeLanguageStyles.optionText,
                      isSmallScreen && { fontSize: 15 },
                      language === label && passcodeLanguageStyles.optionTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                  {language === label && (
                    <Ionicons name="checkmark-circle" size={isSmallScreen ? 20 : 22} color={GRADIENT_START} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[passcodeLanguageStyles.cancelBtn, isSmallScreen && { marginTop: 8 }]}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={[passcodeLanguageStyles.cancelText, isSmallScreen && { fontSize: 15 }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal transparent animationType="fade" visible={resetModalVisible} onRequestClose={closeResetModal}>
        <TouchableOpacity
          style={[
            resetStyles.overlay,
            { paddingHorizontal: Math.max(16, horizontalPadding) },
          ]}
          activeOpacity={1}
          onPress={closeResetModal}
        >
          <View
            onStartShouldSetResponder={() => true}
            style={[
              resetStyles.box,
              {
                maxWidth: Math.min(400, width - 32),
                maxHeight: isShortScreen ? height * 0.9 : undefined,
                padding: isSmallScreen ? 18 : 24,
              },
            ]}
          >
            <ScrollView
              style={isShortScreen ? { maxHeight: height * 0.7 } : undefined}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <Text style={[resetStyles.title, isSmallScreen && { fontSize: 20 }, isShortScreen && { fontSize: 20, marginBottom: 10 }]}>
                {resetStep === 'auth' ? t('passcode.resetTitle') : t('passcode.setNewTitle')}
              </Text>
              <Text style={[resetStyles.message, isSmallScreen && { fontSize: 15 }, isShortScreen && { marginBottom: 16 }]}>
                {resetStep === 'auth'
                  ? t('passcode.resetMessage')
                  : t('passcode.setNewMessage')}
              </Text>
              {resetStep === 'auth' ? (
                <>
                  <TextInput
                    style={[resetStyles.input, isSmallScreen && { paddingVertical: 10, fontSize: 15 }]}
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor="#666"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                  <TextInput
                    style={[resetStyles.input, isSmallScreen && { paddingVertical: 10, fontSize: 15 }]}
                    placeholder={t('auth.passwordPlaceholder')}
                    placeholderTextColor="#666"
                    secureTextEntry
                    value={resetPassword}
                    onChangeText={setResetPassword}
                    autoComplete="password"
                  />
                </>
              ) : (
                <>
                  <TextInput
                    style={[resetStyles.input, isSmallScreen && { paddingVertical: 10, fontSize: 15 }]}
                    placeholder={t('passcode.newPasscodePlaceholder')}
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    value={newPasscode}
                    onChangeText={setNewPasscode}
                  />
                  <TextInput
                    style={[resetStyles.input, isSmallScreen && { paddingVertical: 10, fontSize: 15 }]}
                    placeholder={t('passcode.confirmPasscodePlaceholder')}
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    value={confirmNewPasscode}
                    onChangeText={setConfirmNewPasscode}
                  />
                </>
              )}
              <View style={[resetStyles.buttons, isSmallScreen && { gap: 10 }]}>
                <TouchableOpacity
                  style={[resetStyles.btn, resetStyles.cancelBtn, isSmallScreen && { minHeight: 44 }]}
                  onPress={closeResetModal}
                >
                  <Text style={[resetStyles.cancelBtnText, isSmallScreen && { fontSize: 15 }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[resetStyles.btn, resetStyles.confirmBtn, isSmallScreen && { minHeight: 44 }]}
                  onPress={handleResetPasscode}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator size="small" color={WHITE} />
                  ) : (
                    <Text style={[resetStyles.confirmBtnText, isSmallScreen && { fontSize: 15 }]}>
                      {resetStep === 'auth' ? t('passcode.verify') : t('passcode.updatePasscode')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
          </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  languageButton: {
    position: 'absolute',
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1, width: '100%' },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoWrap: {
    alignItems: 'center',
  },
  logo: {
    /* width/height set inline for responsiveness */
  },
  loadingWrap: {
    alignItems: 'center',
    marginVertical: 40,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginTop: 12,
  },
  needsAuthWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  needsAuthTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: WHITE,
    marginBottom: 16,
    textAlign: 'center',
  },
  needsAuthMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  needsAuthButtons: {
    width: '100%',
    maxWidth: 280,
    gap: 14,
  },
  needsAuthBtn: {
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    minHeight: 52,
  },
  needsAuthBtnPrimary: {
    backgroundColor: GRADIENT_START,
  },
  needsAuthBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  needsAuthBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: WHITE,
  },
  errorText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  dotsWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dot: {
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: WHITE,
    borderColor: WHITE,
    transform: [{ scale: 1.1 }],
  },
  enterText: {
    fontSize: 18,
    fontWeight: '500',
    color: WHITE,
    letterSpacing: 0.5,
  },
  padContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  padRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  padButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  padButtonBiometric: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  padButtonDel: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  padButtonText: {
    fontSize: 30,
    fontWeight: '500',
    color: WHITE,
  },
  bottomRow: {
    width: '100%',
    maxWidth: 280,
    marginTop: 16,
    alignItems: 'center',
    gap: 16,
  },
  bottomButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  bottomButtonPrimary: {
    backgroundColor: GRADIENT_START,
  },
  bottomButtonTextPrimary: {
    fontSize: 17,
    fontWeight: '600',
    color: WHITE,
  },
  forgotLinkWrap: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  forgotLink: {
    fontSize: 16,
    fontWeight: '500',
    color: WHITE,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.8)',
  },
});

const resetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 20,
  },
  box: {
    backgroundColor: WHITE,
    borderRadius: 20,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: GRADIENT_START,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 16, color: '#666', marginBottom: 20, textAlign: 'center', lineHeight: 22 },
  input: {
    borderWidth: 2,
    borderColor: 'rgba(225,88,22,0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', minHeight: 48 },
  cancelBtn: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  confirmBtn: { backgroundColor: GRADIENT_START },
  cancelBtnText: { color: '#666', fontSize: 16, fontWeight: '600' },
  confirmBtnText: { color: WHITE, fontSize: 16, fontWeight: '600' },
});

const passcodeLanguageStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  content: {
    width: '100%',
    backgroundColor: WHITE,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: GRADIENT_START,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 12, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: { backgroundColor: '#FFF0E8', borderWidth: 2, borderColor: GRADIENT_START },
  flag: { fontSize: 22, marginRight: 12 },
  optionText: { fontSize: 16, color: '#333', flex: 1 },
  optionTextSelected: { fontWeight: '600', color: GRADIENT_START },
  cancelBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontSize: 16, color: '#666' },
});

