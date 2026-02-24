import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomLoader from '../Loader/CustomLoader';
import { login, verifyPasscode } from '../../configs/api';
import type { NavProp } from '../../types/navigation';

const GRADIENT_START = '#E15816';
const GRADIENT_END = '#F48F38';
const WHITE = '#FFFFFF';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const btnSize = isTablet ? 70 : Math.min(60, width * 0.18);
const padWidth = isTablet ? '60%' : '85%';
const maxPadWidth = isTablet ? 380 : Math.min(320, width - 48);

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
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const showModal = (config: Partial<ModalConfig>) => {
    setModalConfig({ title: '', message: '', type: 'info', confirmText: 'OK', onConfirm: null, ...config });
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
      const userJson = await AsyncStorage.getItem('user');
      const user = userJson ? (JSON.parse(userJson) as { hasPasscode?: boolean }) : null;
      if (!cancelled) {
        if (!accessToken) {
          setNeedsAuth(true);
        } else if (!user?.hasPasscode) {
          (navigation as unknown as NavProp).replace('Main');
        }
        setLoadingPasscode(false);
      }
    };

    loadPasscode();
    return () => { cancelled = true; };
  }, [navigation]);

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
      const accessToken = await AsyncStorage.getItem('access_token');
      if (!accessToken) {
        setVerifyingPasscode(false);
        (navigation as unknown as NavProp).replace('Login');
        return;
      }
      const result = await verifyPasscode(accessToken, next);
      if (result.success) {
        setPasscode('');
        AsyncStorage.setItem('passcodeLoginComplete', 'true').catch(() => {});
        (navigation as unknown as NavProp).replace('Main');
      } else {
        setVerifyingPasscode(false);
        setError('Incorrect. Please try again');
        setPasscode('');
        triggerShake();
      }
    }
  };

  const handleResetPasscode = async () => {
    if (resetStep === 'auth') {
      if (!resetEmail.trim() || !resetPassword.trim()) {
        showModal({ title: 'Missing Information', message: 'Please enter both email and password.', type: 'warning' });
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
        showModal({ title: 'Authentication Failed', message: result.error || 'Invalid email or password.', type: 'error' });
      }
      return;
    }
    if (resetStep === 'newPasscode') {
      if (!newPasscode.trim() || !confirmNewPasscode.trim()) {
        showModal({ title: 'Missing Information', message: 'Enter and confirm your new 4-digit passcode.', type: 'warning' });
        return;
      }
      if (newPasscode !== confirmNewPasscode) {
        showModal({ title: 'Passcode Mismatch', message: 'The passcodes do not match.', type: 'error' });
        return;
      }
      if (newPasscode.length !== 4 || !/^\d{4}$/.test(newPasscode)) {
        showModal({ title: 'Invalid Passcode', message: 'Passcode must be exactly 4 digits.', type: 'warning' });
        return;
      }
      setResetModalVisible(false);
      setResetEmail('');
      setResetPassword('');
      setNewPasscode('');
      setConfirmNewPasscode('');
      setResetStep('auth');
      showModal({
        title: 'Reset Passcode',
        message: 'To change your passcode, go to Settings in the app after logging in.',
        type: 'info',
      });
    }
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
        <CustomLoader text="LOGGING IN" />
      ) : (
        <LinearGradient
          colors={[GRADIENT_START, GRADIENT_END]}
          locations={[0, 1]}
          style={[styles.gradient, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/images/InpireLogo.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          {needsAuth ? (
            <View style={styles.needsAuthWrap}>
              <Text style={styles.needsAuthTitle}>Passcode Login</Text>
              <Text style={styles.needsAuthMessage}>
                To use passcode, you need to sign in with your email and password first. Don't have an account?
              </Text>
              <View style={styles.needsAuthButtons}>
                <TouchableOpacity
                  style={[styles.needsAuthBtn, styles.needsAuthBtnSecondary]}
                  onPress={() => (navigation as unknown as NavProp).replace('Register')}
                >
                  <Text style={styles.needsAuthBtnText}>Register</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.needsAuthBtn, styles.needsAuthBtnPrimary]}
                  onPress={() => (navigation as unknown as NavProp).replace('Login')}
                >
                  <Text style={styles.needsAuthBtnText}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Animated.View style={[styles.dotsWrap, { transform: [{ translateX: shakeAnim }] }]}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      passcode.length > i && styles.dotFilled,
                    ]}
                  />
                ))}
              </Animated.View>

              <Text style={styles.enterText}>Enter your passcode</Text>

              <View style={[styles.padContainer, { width: padWidth, maxWidth: maxPadWidth }]}>
                {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, ri) => (
                  <View key={ri} style={styles.padRow}>
                    {row.map((key) => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.padButton, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }]}
                        onPress={() => handlePress(key)}
                      >
                        <Text style={styles.padButtonText}>{key}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
                <View style={styles.padRowLast}>
                  <View style={{ width: btnSize }} />
                  <TouchableOpacity 
                    style={[styles.padButton, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }]} 
                    onPress={() => handlePress('0')}
                  >
                    <Text style={styles.padButtonText}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.padButton, styles.padButtonDel, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }]} 
                    onPress={() => handlePress('Del')}
                  >
                    <Text style={styles.padButtonText}>⌫</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.bottomRow}>
                <TouchableOpacity onPress={() => setResetModalVisible(true)}>
                  <Text style={styles.bottomLink}>Reset Passcode</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.bottomLink}>Use Email</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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

      <Modal transparent animationType="slide" visible={resetModalVisible} onRequestClose={closeResetModal}>
        <View style={resetStyles.overlay}>
          <Pressable style={[StyleSheet.absoluteFill, resetStyles.backdrop]} onPress={closeResetModal} />
          <ScrollView
            style={resetStyles.modalScroll}
            contentContainerStyle={resetStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={resetStyles.box}>
              <Text style={resetStyles.title}>
                {resetStep === 'auth' ? 'Reset Passcode' : 'Set New Passcode'}
              </Text>
              <Text style={resetStyles.message}>
                {resetStep === 'auth'
                  ? 'Enter your email and password to verify your identity.'
                  : 'Enter your new 4-digit passcode and confirm it.'}
              </Text>
              {resetStep === 'auth' ? (
                <>
                  <TextInput
                    style={resetStyles.input}
                    placeholder="Email Address"
                    placeholderTextColor="#666"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                  <TextInput
                    style={resetStyles.input}
                    placeholder="Password"
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
                    style={resetStyles.input}
                    placeholder="New Passcode (4 digits)"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={4}
                    value={newPasscode}
                    onChangeText={setNewPasscode}
                  />
                  <TextInput
                    style={resetStyles.input}
                    placeholder="Confirm Passcode"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={4}
                    value={confirmNewPasscode}
                    onChangeText={setConfirmNewPasscode}
                  />
                </>
              )}
              <View style={resetStyles.buttons}>
                <TouchableOpacity style={[resetStyles.btn, resetStyles.cancelBtn]} onPress={closeResetModal}>
                  <Text style={resetStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[resetStyles.btn, resetStyles.confirmBtn]}
                  onPress={handleResetPasscode}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator size="small" color={WHITE} />
                  ) : (
                    <Text style={resetStyles.confirmBtnText}>
                      {resetStep === 'auth' ? 'Verify' : 'Update Passcode'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
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
  scroll: { flex: 1, width: '100%' },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  logoWrap: {
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  logo: {
    width: isTablet ? 280 : 180,
    height: isTablet ? 100 : 64,
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
    gap: 16,
    marginBottom: 16,
    paddingVertical: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
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
    marginBottom: 40,
    letterSpacing: 0.5,
  },
  padContainer: {
    marginBottom: 16,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  padRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  padButton: {
    width: btnSize,
    height: btnSize,
    borderRadius: btnSize / 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  padButtonDel: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  padButtonText: {
    fontSize: 28,
    fontWeight: '500',
    color: WHITE,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    marginTop: 32,
    paddingHorizontal: 8,
  },
  bottomLink: {
    fontSize: 16,
    fontWeight: '500',
    color: WHITE,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.6)',
  },
});

const resetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
  },
  backdrop: { zIndex: 0 },
  modalScroll: { flex: 1, width: '100%', zIndex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  box: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
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
