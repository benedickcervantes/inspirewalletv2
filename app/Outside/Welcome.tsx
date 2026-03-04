import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import CustomLoader from '../Loader/CustomLoader';

const GRADIENT_START = '#E15816';
const GRADIENT_END = '#F48F38';
const BUTTON_REGISTER = '#FFC192';
const BUTTON_LOGIN = '#F88A36';
const WHITE = '#FFFFFF';

export default function Welcome() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useResponsive();
  const [showStartup, setShowStartup] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowStartup(false), 4000);
    return () => clearTimeout(t);
  }, []);

  if (showStartup) {
    return <CustomLoader text="LOADING" />;
  }

  return (
    <LinearGradient
      colors={[GRADIENT_START, GRADIENT_END]}
      locations={[0, 1]}
      style={[styles.welcomeContainer, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingHorizontal: horizontalPadding }]}
    >
      <View style={styles.welcomeContent}>
        <Image
          source={require('../../assets/images/IAFG.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
              styles.button,
              styles.buttonRegister,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.buttonText}>Register</Text>
          </Pressable>
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
              styles.button,
              styles.buttonLogin,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>Login</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.footer}>CREATED BY INSPIRE</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  welcomeContainer: {
    flex: 1,
    justifyContent: 'space-between',
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
