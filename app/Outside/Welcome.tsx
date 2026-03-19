import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
} from '../../constants/locales';
import { useLanguage } from '../../context/LanguageContext';
import { useResponsive } from '../../utils/responsive';
import CustomLoader from '../Loader/CustomLoader';

const GRADIENT_START = '#E15816';
const GRADIENT_END = '#F48F38';
const BUTTON_REGISTER = '#FFC192';
const BUTTON_LOGIN = '#F88A36';
const WHITE = '#FFFFFF';

const USER_PREFERRED_LANGUAGE_KEY = 'user_preferred_language';
let hasShownStartupLoaderThisSession = false;

export default function Welcome() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { horizontalPadding, scale, width, height, isShortScreen, isSmallScreen } = useResponsive();
  const [showStartup, setShowStartup] = useState(!hasShownStartupLoaderThisSession);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const { t, language: contextLanguage, setLanguage } = useLanguage();
  const language = normalizeLanguage(contextLanguage ?? DEFAULT_LANGUAGE);

  const handleSelectLanguage = async (selectedLabel: string) => {
    setLanguage(selectedLabel);
    await AsyncStorage.setItem(USER_PREFERRED_LANGUAGE_KEY, selectedLabel);
    setLanguageModalVisible(false);
  };

  useEffect(() => {
    if (!showStartup) return;
    const t = setTimeout(() => setShowStartup(false), 4000);
    return () => clearTimeout(t);
  }, [showStartup]);

  useEffect(() => {
    if (!showStartup) {
      hasShownStartupLoaderThisSession = true;
    }
  }, [showStartup]);

  if (showStartup) {
    return <CustomLoader text={t('common.loading')} />;
  }

  return (
    <>
    <LinearGradient
      colors={[GRADIENT_START, GRADIENT_END]}
      locations={[0, 1]}
      style={[styles.welcomeContainer, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingHorizontal: horizontalPadding }]}
    >
      <TouchableOpacity
        style={[
          styles.languageButton,
          {
            top: insets.top + 12,
            right: horizontalPadding,
            width: scale(48),
            height: scale(48),
            borderRadius: scale(24),
          },
        ]}
        onPress={() => setLanguageModalVisible(true)}
        accessibilityLabel={t('profile.selectLanguage')}
        accessibilityRole="button"
      >
        <Ionicons name="language-outline" size={isSmallScreen ? 24 : 28} color={WHITE} />
      </TouchableOpacity>
      <View style={[styles.welcomeContent, isShortScreen && { marginTop: -40 }]}>
        <Image
          source={require('../../assets/images/IAFG.png')}
          style={[
            styles.logo,
            isSmallScreen && { height: 340, maxHeight: 380, marginBottom: -50 },
            isShortScreen && { height: 280, maxHeight: 320, marginBottom: -40 },
          ]}
          contentFit="contain"
        />
        <View style={[styles.actions, isSmallScreen && { maxWidth: 280 }]}>
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
              styles.button,
              styles.buttonRegister,
              (isSmallScreen || isShortScreen) && { minHeight: 48, paddingVertical: 14 },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={[styles.buttonText, (isSmallScreen || isShortScreen) && { fontSize: 16 }]}>
              {t('auth.register')}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
              styles.button,
              styles.buttonLogin,
              (isSmallScreen || isShortScreen) && { minHeight: 48, paddingVertical: 14 },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.buttonText, (isSmallScreen || isShortScreen) && { fontSize: 16 }]}>
              {t('auth.login')}
            </Text>
          </Pressable>
        </View>
      </View>
      <Text style={[styles.footer, isShortScreen && { paddingBottom: 16 }]}>{t('auth.createdByInspire')}</Text>
    </LinearGradient>

    <Modal
      visible={languageModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setLanguageModalVisible(false)}
    >
      <TouchableOpacity
        style={[
          welcomeLanguageStyles.overlay,
          { paddingHorizontal: Math.max(16, horizontalPadding) },
        ]}
        activeOpacity={1}
        onPress={() => setLanguageModalVisible(false)}
      >
        <View
          style={[
            welcomeLanguageStyles.content,
            {
              maxWidth: Math.min(360, width - 32),
              maxHeight: isShortScreen ? height * 0.85 : undefined,
              padding: isSmallScreen ? 18 : 24,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={welcomeLanguageStyles.header}>
            <Ionicons name="globe-outline" size={isSmallScreen ? 32 : 40} color={GRADIENT_START} />
            <Text style={[welcomeLanguageStyles.title, isSmallScreen && { fontSize: 16 }]}>
              {t('profile.selectLanguage')}
            </Text>
            <Text style={[welcomeLanguageStyles.subtitle, isSmallScreen && { fontSize: 12 }]}>
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
                  welcomeLanguageStyles.option,
                  isSmallScreen && { paddingVertical: 12, paddingHorizontal: 14 },
                  language === label && welcomeLanguageStyles.optionSelected,
                ]}
                onPress={() => handleSelectLanguage(label)}
                activeOpacity={0.7}
              >
                <Text style={[welcomeLanguageStyles.flag, isSmallScreen && { fontSize: 20 }]}>{flag}</Text>
                <Text
                  style={[
                    welcomeLanguageStyles.optionText,
                    isSmallScreen && { fontSize: 15 },
                    language === label && welcomeLanguageStyles.optionTextSelected,
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
            style={[welcomeLanguageStyles.cancelBtn, isSmallScreen && { marginTop: 8 }]}
            onPress={() => setLanguageModalVisible(false)}
          >
            <Text style={[welcomeLanguageStyles.cancelText, isSmallScreen && { fontSize: 15 }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  welcomeContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  languageButton: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -80,
  },
  logo: {
    width: '100%',
    maxWidth: 700,
    height: 480,
    maxHeight: 520,
    marginBottom: -80,
    alignSelf: 'center',
  },
  actions: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
    paddingHorizontal: 4,
  },
  button: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonRegister: {
    backgroundColor: BUTTON_REGISTER,
  },
  buttonLogin: {
    backgroundColor: BUTTON_LOGIN,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: WHITE,
  },
  footer: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
    textAlign: 'center',
    paddingBottom: 24,
  },
});

const welcomeLanguageStyles = StyleSheet.create({
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
