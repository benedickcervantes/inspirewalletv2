import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet } from 'react-native';

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
      {/* image in centre */}
      <Image
        source={require('../../assets/icons/loader.gif')}
        style={styles.image}
      />
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
});
