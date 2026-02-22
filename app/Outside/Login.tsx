import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NavProp } from '../../types/navigation';
import { login } from '../../configs/api';


const GRADIENT_START = '#E15816';
const GRADIENT_END = '#F48F38';
const WHITE = '#FFFFFF';

interface MessageModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  confirmText?: string;
  onConfirm?: (() => void) | null;
  secondaryText?: string;
  onSecondary?: (() => void) | null;
}

function MessageModal({
  visible,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  onConfirm,
  secondaryText,
  onSecondary,
}: MessageModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const icon = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';

  return (
    <Modal transparent animationType="none" visible={visible}>
      <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[modalStyles.box, { transform: [{ scale: scaleAnim }] }]}>
          <View style={modalStyles.iconWrap}>
            <Text style={modalStyles.iconText}>{icon}</Text>
          </View>
          <Text style={modalStyles.title}>{title}</Text>
          <Text style={modalStyles.message}>{message}</Text>
          <View style={modalStyles.buttonsRow}>
            {secondaryText && onSecondary ? (
              <TouchableOpacity
                style={[modalStyles.button, modalStyles.buttonSecondary]}
                onPress={() => {
                  onSecondary();
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.buttonSecondaryText}>{secondaryText}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={modalStyles.button}
              onPress={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={modalStyles.buttonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
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
    paddingVertical: 28,
    paddingHorizontal: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(225,88,22,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
    fontWeight: '800',
    color: GRADIENT_START,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: GRADIENT_START,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: GRADIENT_START,
  },
  buttonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: GRADIENT_START,
    fontSize: 16,
    fontWeight: '600',
  },
});

interface ModalConfig {
  title: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  confirmText: string;
  onConfirm: (() => void) | null;
  secondaryText?: string;
  onSecondary?: (() => void) | null;
}

export default function Login() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    onConfirm: null,
    secondaryText: undefined,
    onSecondary: undefined,
  });

  const showModal = (config: Partial<ModalConfig>) => {
    setModalConfig({
      title: '',
      message: '',
      type: 'info',
      confirmText: 'OK',
      onConfirm: null,
      secondaryText: undefined,
      onSecondary: undefined,
      ...config,
    });
    setModalVisible(true);
  };

  const hideModal = () => setModalVisible(false);

  const SignIn = async () => {
    Keyboard.dismiss();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showModal({
        title: 'Missing Information',
        message: 'Please enter your email address.',
        type: 'warning',
      });
      return;
    }
    if (!password) {
      showModal({
        title: 'Missing Information',
        message: 'Please enter your password.',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await login(trimmedEmail, password);

      if (!result.success) {
        showModal({
          title: 'Login Failed',
          message: result.error || 'Invalid email or password. Please try again.',
          type: 'error',
        });
        return;
      }

      await AsyncStorage.setItem('access_token', result.access_token || '');
      await AsyncStorage.setItem('user', JSON.stringify(result.user || {}));
      await AsyncStorage.removeItem('passcodeLoginComplete');

      const user = result.user as { hasPasscode?: boolean } | undefined;
      if (user?.hasPasscode) {
        (navigation as unknown as NavProp).replace('Passcode');
      } else {
        (navigation as unknown as NavProp).replace('Main');
      }
    } catch (_) {
      showModal({
        title: 'Login Error',
        message: 'An unexpected error occurred. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const isWeb = Platform.OS === 'web';

  return (
    <>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={isWeb ? undefined : Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <LinearGradient
          colors={[GRADIENT_START, GRADIENT_END]}
          locations={[0, 1]}
          style={[styles.gradient, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={26} color={WHITE} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <View style={styles.logoWrap}>
                <Image
                  source={require('../../assets/images/InpireLogo.png')}
                  style={styles.logo}
                  contentFit="contain"
                  accessible={false}
                />
              </View>

              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="rgba(255,255,255,0.85)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  autoComplete="email"
                />

                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter password"
                    placeholderTextColor="rgba(255,255,255,0.85)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword((s) => !s)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={WHITE}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.passcodeLinkWrap}
                  onPress={async () => {
                    const token = await AsyncStorage.getItem('access_token');
                    const userJson = await AsyncStorage.getItem('user');
                    const user = userJson ? (JSON.parse(userJson) as { hasPasscode?: boolean }) : null;
                    if (token && user?.hasPasscode) {
                      (navigation as unknown as NavProp).replace('Passcode');
                    } else if (!token) {
                      showModal({
                        title: 'Passcode Login',
                        message:
                          'To use passcode, you need to sign in with your email and password first. Don\'t have an account? Please register to create one.',
                        type: 'info',
                        confirmText: 'OK',
                        secondaryText: 'Register',
                        onSecondary: () => (navigation as unknown as NavProp).replace('Register'),
                      });
                    } else {
                      showModal({
                        title: 'No Passcode Set',
                        message:
                          'You haven\'t set up a passcode yet. Sign in with your email and password, then you can set up passcode in Settings after logging in.',
                        type: 'info',
                      });
                    }
                  }}
                >
                  <Text style={styles.passcodeLinkText}>Use Passcode Instead</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={SignIn}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={WHITE} size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Login</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forgotWrap}
                  onPress={() => {
                    showModal({
                      title: 'Forgot Password',
                      message: 'Password reset is not supported at this time. Please contact support for assistance.',
                      type: 'info',
                    });
                  }}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.registerWrap}
                  onPress={() => navigation.navigate('Register')}
                >
                  <Text style={styles.registerText}>Don't have an account? </Text>
                  <Text style={styles.registerLink}>Register</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <Text style={styles.footer}>CREATED BY INSPIRE</Text>
          </LinearGradient>
      </KeyboardAvoidingView>

      <MessageModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        secondaryText={modalConfig.secondaryText}
        onSecondary={modalConfig.onSecondary}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    minHeight: '100%',
  },
  logoWrap: {
    marginTop: 8,
    marginBottom: 24,
  },
  logo: {
    width: 280,
    height: 160,
    maxWidth: '100%',
  },
  form: {
    width: '100%',
    maxWidth: 360,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: WHITE,
    marginBottom: 14,
    minHeight: 54,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    minHeight: 54,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: WHITE,
  },
  eyeButton: {
    padding: 14,
  },
  passcodeLinkWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  passcodeLinkText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '400',
  },
  loginButton: {
    backgroundColor: GRADIENT_START,
    borderRadius: 999,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.8,
  },
  loginButtonText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '600',
  },
  forgotWrap: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '400',
  },
  registerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '400',
  },
  registerLink: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.2,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
