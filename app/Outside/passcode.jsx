import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    Dimensions,
    Keyboard,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { auth, firestore, signInWithEmailAndPassword, doc, getDoc, setDoc } from '../../configs/firebase';

const GRADIENT_START = '#E15816';
const GRADIENT_END = '#F48F38';
const WHITE = '#FFFFFF';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const btnSize = isTablet ? 70 : 70;
const padWidth = isTablet ? '60%' : '80%';
const maxPadWidth = isTablet ? 380 : 300;

// Simple message modal
function MessageModal({ visible, onClose, title, message, type, confirmText = 'OK', onConfirm }) {
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

export default function Passcode() {
  const navigation = useNavigation();

  const [checkPasscode, setCheckPasscode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: '', message: '', type: 'info', confirmText: 'OK', onConfirm: null });
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState('auth');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmNewPasscode, setConfirmNewPasscode] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [loadingPasscode, setLoadingPasscode] = useState(true);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const showModal = (config) => {
    setModalConfig({ title: '', message: '', type: 'info', confirmText: 'OK', onConfirm: null, ...config });
    setModalVisible(true);
  };
  const hideModal = () => setModalVisible(false);

  useEffect(() => {
    const backAction = () => true;
    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, []);

  // Load passcode from Firebase: ensure user is signed in, then read users/{uid}.passcode
  useEffect(() => {
    let cancelled = false;

    const loadPasscode = async () => {
      if (!auth || !firestore) {
        if (!cancelled) {
          setLoadingPasscode(false);
          navigation.replace('Login');
        }
        return;
      }

      let user = auth.currentUser;
      if (!user) {
        const email = await AsyncStorage.getItem('userEmail');
        const password = await AsyncStorage.getItem('userPassword');
        if (email && password) {
          try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            user = cred.user;
          } catch (_) {
            if (!cancelled) {
              setLoadingPasscode(false);
              navigation.replace('Login');
            }
            return;
          }
        } else {
          if (!cancelled) {
            setLoadingPasscode(false);
            navigation.replace('Login');
          }
          return;
        }
      }

      if (!user || cancelled) return;

      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!cancelled) {
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (data.passcode) {
              setCheckPasscode(data.passcode);
            } else {
              navigation.replace('Login');
            }
          } else {
            navigation.replace('Login');
          }
        }
      } catch (err) {
        console.warn('Passcode load error:', err?.message);
        if (!cancelled) navigation.replace('Login');
      } finally {
        if (!cancelled) setLoadingPasscode(false);
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

  const handlePress = (value) => {
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
      if (next === checkPasscode) {
        setPasscode('');
        AsyncStorage.setItem('passcodeLoginComplete', 'true').catch(() => {});
        navigation.replace('Main');
      } else {
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
      try {
        if (!auth) {
          showModal({ title: 'Error', message: 'Firebase is not configured.', type: 'error' });
          setResetLoading(false);
          return;
        }
        await signInWithEmailAndPassword(auth, resetEmail.trim(), resetPassword);
        setResetStep('newPasscode');
      } catch (e) {
        const msg = e?.code === 'auth/invalid-credential' || e?.code === 'auth/wrong-password'
          ? 'Invalid email or password.'
          : (e?.message || 'Please try again.');
        showModal({ title: 'Authentication Failed', message: msg, type: 'error' });
      }
      setResetLoading(false);
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
      setResetLoading(true);
      try {
        const user = auth?.currentUser;
        if (!firestore || !user) {
          showModal({ title: 'Update Failed', message: 'You must be signed in to update passcode.', type: 'error' });
          setResetLoading(false);
          return;
        }
        await setDoc(doc(firestore, 'users', user.uid), { passcode: newPasscode }, { merge: true });
        setCheckPasscode(newPasscode);
        setResetModalVisible(false);
        setResetEmail('');
        setResetPassword('');
        setNewPasscode('');
        setConfirmNewPasscode('');
        setResetStep('auth');
        showModal({ title: 'Passcode Updated!', message: 'Your passcode has been updated.', type: 'success' });
      } catch (e) {
        showModal({ title: 'Update Failed', message: e?.message || 'Please try again.', type: 'error' });
      }
      setResetLoading(false);
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
      <LinearGradient
        colors={[GRADIENT_START, GRADIENT_END]}
        locations={[0, 1]}
        style={styles.gradient}
      >
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/images/InpireLogo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        {loadingPasscode ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={WHITE} />
            <Text style={styles.loadingText}>Loading...</Text>
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
                  style={styles.padButton}
                  onPress={() => handlePress(key)}
                >
                  <Text style={styles.padButtonText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.padRowLast}>
            <TouchableOpacity style={styles.padButton} onPress={() => handlePress('0')}>
              <Text style={styles.padButtonText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.padButton, styles.padButtonDel]} onPress={() => handlePress('Del')}>
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
      </LinearGradient>

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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={resetStyles.overlay}>
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
                  />
                  <TextInput
                    style={resetStyles.input}
                    placeholder="Password"
                    placeholderTextColor="#666"
                    secureTextEntry
                    value={resetPassword}
                    onChangeText={setResetPassword}
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
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoWrap: {
    marginBottom: 50,
    alignItems: 'center',
  },
  logo: {
    width: isTablet ? 280 : 240,
    height: isTablet ? 100 : 88,
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
  enterText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 50,
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
    width: btnSize,
    height: btnSize,
    borderRadius: btnSize / 2,
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
    borderColor: 'rgba(255,255,255,0.5)',
    position: 'absolute',
    right: 0,
  },
  padButtonText: {
    fontSize: 26,
    fontWeight: '600',
    color: WHITE,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    position: 'absolute',
    bottom: 40,
  },
  bottomLink: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.9)',
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
