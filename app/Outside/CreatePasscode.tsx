import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setPasscode as setPasscodeApi } from '../../configs/api';
import type { NavProp } from '../../types/navigation';

const GRADIENT_START = '#E15816';
const GRADIENT_END = '#F48F38';
const WHITE = '#FFFFFF';


interface MessageModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
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

export default function CreatePasscode() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const btnSize = width >= 768 ? 70 : Math.min(60, Math.max(44, width * 0.18));
  const padWidth = width >= 768 ? '60%' : '85%';
  const maxPadWidth = width >= 768 ? 380 : Math.min(320, width - 48);

  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    confirmText: string;
    onConfirm: (() => void) | null;
  }>({ title: '', message: '', confirmText: 'OK', onConfirm: null });

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const backAction = () => true;
    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, []);

  const showModal = (config: Partial<typeof modalConfig>) => {
    setModalConfig({
      title: '',
      message: '',
      confirmText: 'OK',
      onConfirm: null,
      ...config,
    });
    setModalVisible(true);
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

  const currentPin = step === 'create' ? pin : confirmPin;

  const handlePress = async (value: string) => {
    if (value === 'Del') {
      if (step === 'create') {
        setPin((p) => p.slice(0, -1));
      } else {
        setConfirmPin((p) => p.slice(0, -1));
      }
      setError('');
      return;
    }

    const len = step === 'create' ? pin.length : confirmPin.length;
    if (len >= 4) return;

    const next = step === 'create' ? pin + value : confirmPin + value;
    if (step === 'create') {
      setPin(next);
    } else {
      setConfirmPin(next);
    }
    setError('');

    if (next.length === 4) {
      if (step === 'create') {
        setStep('confirm');
      } else {
        if (next !== pin) {
          setError('PINs do not match. Please try again.');
          setConfirmPin('');
          triggerShake();
          return;
        }
        await submitPasscode(pin);
      }
    }
  };

  const submitPasscode = async (passcode: string) => {
    const accessToken = await AsyncStorage.getItem('access_token');
    if (!accessToken) {
      showModal({
        title: 'Session Expired',
        message: 'Please log in again.',
        onConfirm: () => (navigation as unknown as NavProp).replace('Login'),
      });
      return;
    }

    setLoading(true);
    const result = await setPasscodeApi(accessToken, passcode);
    setLoading(false);

    if (!result.success) {
      showModal({
        title: 'Error',
        message: result.error || 'Failed to set passcode. Please try again.',
        onConfirm: () => {
          setStep('create');
          setPin('');
          setConfirmPin('');
        },
      });
      return;
    }

    const userJson = await AsyncStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : {};
    user.hasPasscode = true;
    await AsyncStorage.setItem('user', JSON.stringify(user));
    await AsyncStorage.removeItem('registrationPasscodePending');
    await AsyncStorage.setItem('passcodeLoginComplete', 'true');

    (navigation as unknown as NavProp).replace('Main');
  };

  const handleHelp = () => {
    showModal({
      title: 'Create PIN',
      message: 'Create a 4-digit PIN for quick and secure access to your account. You will need this PIN when logging in or performing sensitive operations.',
    });
  };

  return (
    <>
      <LinearGradient
        colors={[GRADIENT_START, GRADIENT_END]}
        locations={[0, 1]}
        style={[styles.gradient, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/images/InpireLogo.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <TouchableOpacity style={styles.helpButton} onPress={handleHelp}>
            <Ionicons name="help-circle" size={28} color={WHITE} />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Animated.View style={[styles.dotsWrap, { transform: [{ translateX: shakeAnim }] }]}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                currentPin.length > i && styles.dotFilled,
              ]}
            />
          ))}
        </Animated.View>

        <Text style={styles.instructionText}>
          {step === 'create' ? 'Create a 4-digit PIN' : 'Confirm your 4-digit PIN'}
        </Text>

        <View style={[styles.padContainer, { width: padWidth, maxWidth: maxPadWidth }]}>
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, ri) => (
            <View key={ri} style={styles.padRow}>
              {row.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.padButton, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }]}
                  onPress={() => handlePress(key)}
                  disabled={loading}
                >
                  <Text style={styles.padButtonText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.padRowLast}>
            <TouchableOpacity
              style={[styles.padButton, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }]}
              onPress={() => handlePress('0')}
              disabled={loading}
            >
              <Text style={styles.padButtonText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.padButton, styles.padButtonDel]}
              onPress={() => handlePress('Del')}
              disabled={loading}
            >
              <Ionicons name="backspace-outline" size={24} color={WHITE} />
            </TouchableOpacity>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Setting up your PIN...</Text>
          </View>
        )}
      </LinearGradient>

      <MessageModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  headerSpacer: { width: 44 },
  logoWrap: { flex: 1, alignItems: 'center' },
  logo: {
    width: 140,
    height: 50,
  },
  helpButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  dotsWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 12,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: WHITE,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotFilled: {
    backgroundColor: WHITE,
  },
  instructionText: {
    fontSize: 18,
    color: WHITE,
    fontWeight: '500',
    marginBottom: 50,
    textAlign: 'center',
  },
  padContainer: {
    marginBottom: 20,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  padRowLast: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  padButton: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  padButtonDel: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    position: 'absolute',
    right: 0,
  },
  padButtonText: {
    fontSize: 26,
    fontWeight: '600',
    color: WHITE,
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
});
