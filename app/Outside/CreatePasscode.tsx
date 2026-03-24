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
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setPasscode as setPasscodeApi } from '../../configs/api';
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
} from '../../constants/locales';
import { useLanguage } from '../../context/LanguageContext';
import type { NavProp } from '../../types/navigation';

const USER_PREFERRED_LANGUAGE_KEY = 'user_preferred_language';

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
  const { t, language: contextLanguage, setLanguage } = useLanguage();
  const language = normalizeLanguage(contextLanguage ?? DEFAULT_LANGUAGE);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const btnSize = width >= 768 ? 80 : Math.min(72, Math.max(56, width * 0.22));
  const delBtnSize = width >= 768 ? 80 : Math.min(72, Math.max(56, width * 0.22));
  const padWidth = width >= 768 ? '65%' : '88%';
  const maxPadWidth = width >= 768 ? 420 : Math.min(360, width - 48);

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
  }>({ title: '', message: '', confirmText: t('common.ok'), onConfirm: null });

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
      confirmText: t('common.ok'),
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
          setError(t('passcode.errorMismatch'));
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
        title: t('common.sessionExpiredTitle'),
        message: t('common.sessionExpiredMessage'),
        onConfirm: () => (navigation as unknown as NavProp).replace('Login'),
      });
      return;
    }

    setLoading(true);
    const result = await setPasscodeApi(accessToken, passcode);
    setLoading(false);

    if (!result.success) {
      showModal({
        title: t('common.error'),
        message: result.error || t('passcode.errorChangeFailed'),
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
      title: t('passcode.createTitle'),
      message: t('passcode.helpMessage'),
    });
  };

  const handleSelectLanguage = async (selectedLabel: string) => {
    setLanguage(selectedLabel);
    await AsyncStorage.setItem(USER_PREFERRED_LANGUAGE_KEY, selectedLabel);
    setLanguageModalVisible(false);
  };

  return (
    <>
      <LinearGradient
        colors={[GRADIENT_START, GRADIENT_END]}
        locations={[0, 1]}
        style={[styles.gradient, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <TouchableOpacity
          style={[styles.languageButton, { top: insets.top + 12 }]}
          onPress={() => setLanguageModalVisible(true)}
        >
          <Ionicons name="language-outline" size={28} color={WHITE} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.helpButtonTopRight, { top: insets.top + 12 }]}
          onPress={handleHelp}
        >
          <Ionicons name="help-circle" size={28} color={WHITE} />
        </TouchableOpacity>

        <View style={styles.centerContent}>
          <View style={styles.logoWrapCentered}>
            <Image
              source={require('../../assets/images/InpireLogo.png')}
              style={styles.logo}
              contentFit="contain"
            />
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
            {step === 'create' ? t('passcode.createInstruction') : t('passcode.confirmInstruction')}
          </Text>

          {step === 'confirm' ? (
            <TouchableOpacity
              style={styles.startOverLink}
              onPress={() => {
                setStep('create');
                setPin('');
                setConfirmPin('');
                setError('');
              }}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color={WHITE} />
              <Text style={styles.startOverText}>{t('passcode.startOver')}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={[styles.padContainer, { width: padWidth, maxWidth: maxPadWidth }]}>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, ri) => (
              <View key={ri} style={styles.padRow}>
                {row.map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.padButton, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }]}
                    onPress={() => handlePress(key)}
                    disabled={loading}
                    activeOpacity={0.8}
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
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.padButtonText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.padButton, styles.padButtonDel, { width: delBtnSize, height: delBtnSize, borderRadius: delBtnSize / 2 }]}
                onPress={() => handlePress('Del')}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="backspace-outline" size={28} color={WHITE} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>{t('passcode.settingUp')}</Text>
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
          <View style={styles.languageModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.languageMapHeader}>
              <View style={styles.languageMapGlobe}>
                <Ionicons name="globe-outline" size={40} color={GRADIENT_START} />
              </View>
              <Text style={styles.languageModalTitle}>{t('profile.selectLanguage')}</Text>
              <Text style={styles.languageModalSubtitle}>{t('profile.defaultIsEnglish')}</Text>
            </View>
            {SUPPORTED_LANGUAGES.map(({ label, flag }) => (
              <TouchableOpacity
                key={label}
                style={[styles.languageOption, language === label && styles.languageOptionSelected]}
                onPress={() => handleSelectLanguage(label)}
                activeOpacity={0.7}
              >
                <Text style={styles.languageOptionFlag}>{flag}</Text>
                <Text style={[styles.languageOptionText, language === label && styles.languageOptionTextSelected]}>
                  {label}
                </Text>
                {language === label && <Ionicons name="checkmark-circle" size={22} color={GRADIENT_START} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.languageModalCancel} onPress={() => setLanguageModalVisible(false)}>
              <Text style={styles.languageModalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  languageButton: {
    position: 'absolute',
    left: 24,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButtonTopRight: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapCentered: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 200,
    height: 72,
  },
  centerContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  dotsWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 20,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: WHITE,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotFilled: {
    backgroundColor: WHITE,
  },
  instructionText: {
    fontSize: 20,
    color: WHITE,
    fontWeight: '500',
    marginBottom: 40,
    marginTop: 4,
    textAlign: 'center',
  },
  startOverLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  startOverText: {
    fontSize: 16,
    color: WHITE,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  padContainer: {
    marginTop: 8,
    marginBottom: 24,
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
    marginBottom: 0,
  },
  padButton: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  padButtonDel: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  padButtonText: {
    fontSize: 28,
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
  languageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  languageModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  languageMapHeader: { alignItems: 'center', marginBottom: 20 },
  languageMapGlobe: { marginBottom: 12 },
  languageModalTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 4, textAlign: 'center' },
  languageModalSubtitle: { fontSize: 13, color: '#666', textAlign: 'center' },
  languageOption: {
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
  languageOptionSelected: { backgroundColor: '#FFF0E8', borderWidth: 2, borderColor: GRADIENT_START },
  languageOptionFlag: { fontSize: 22, marginRight: 12 },
  languageOptionText: { fontSize: 16, color: '#333', flex: 1 },
  languageOptionTextSelected: { fontWeight: '600', color: GRADIENT_START },
  languageModalCancel: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  languageModalCancelText: { fontSize: 16, color: '#666' },
});
