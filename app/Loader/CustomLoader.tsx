import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text } from 'react-native';

interface CustomLoaderProps {
  text?: string;
}

export default function CustomLoader({ text = 'LOADING' }: CustomLoaderProps) {
  return (
    <LinearGradient
      colors={['#E15816', '#F48F38']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Image
        source={require('../../assets/icons/loader.gif')}
        style={styles.image}
        resizeMode="contain"
      />
      {text ? <Text style={styles.text}>{text}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 128,
    height: 128,
  },
  text: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 1,
  },
});
