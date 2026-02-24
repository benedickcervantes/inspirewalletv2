import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

interface CustomLoaderProps {
  text?: string;
}

export default function CustomLoader({ text = "LOADING" }: CustomLoaderProps) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Spin animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation for "LOADING" text
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Dot bounce animations
    const createBounce = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: -8,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(400),
        ])
      );
    };

    createBounce(dot1, 0).start();
    createBounce(dot2, 200).start();
    createBounce(dot3, 400).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#E15816', '#F48F38']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.loaderBox}>
        <View style={styles.spinnerContainer}>
          <AnimatedSvg
            width={128}
            height={128}
            viewBox="0 0 512 512"
            style={{ transform: [{ rotate: spin }] }}
          >
            {/* Center circle */}
            <Circle cx="256" cy="256" r="45" fill="white" />
            
            {/* Small dots */}
            <G>
              <Circle cx="256" cy="180" r="8" fill="white" />
              <Circle cx="256" cy="332" r="8" fill="white" />
              <Circle cx="180" cy="256" r="8" fill="white" />
              <Circle cx="332" cy="256" r="8" fill="white" />
              <Circle cx="203" cy="203" r="10" fill="white" />
              <Circle cx="309" cy="203" r="10" fill="white" />
              <Circle cx="203" cy="309" r="10" fill="white" />
              <Circle cx="309" cy="309" r="10" fill="white" />
            </G>

            {/* Rays */}
            <G>
              <Path d="M256 40 L275 120 L256 150 L237 120 Z" fill="white" />
              <Path d="M256 472 L237 392 L256 362 L275 392 Z" fill="white" />
              <Path d="M472 256 L392 275 L362 256 L392 237 Z" fill="white" />
              <Path d="M40 256 L120 237 L150 256 L120 275 Z" fill="white" />
              
              <G rotation={45} origin="256, 256">
                <Path d="M256 60 L270 130 L256 155 L242 130 Z" fill="white" />
                <Path d="M256 452 L242 382 L256 357 L270 382 Z" fill="white" />
                <Path d="M452 256 L382 270 L357 256 L382 242 Z" fill="white" />
                <Path d="M60 256 L130 242 L155 256 L130 270 Z" fill="white" />
              </G>
            </G>

            {/* Curved decorations */}
            <G>
              <Path
                d="M220 160 Q200 120 180 140"
                fill="none"
                stroke="white"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <Path
                d="M292 160 Q312 120 332 140"
                fill="none"
                stroke="white"
                strokeWidth="12"
                strokeLinecap="round"
              />
              
              <G rotation={90} origin="256, 256">
                <Path
                  d="M220 160 Q200 120 180 140"
                  fill="none"
                  stroke="white"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <Path
                  d="M292 160 Q312 120 332 140"
                  fill="none"
                  stroke="white"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
              </G>
              
              <G rotation={180} origin="256, 256">
                <Path
                  d="M220 160 Q200 120 180 140"
                  fill="none"
                  stroke="white"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <Path
                  d="M292 160 Q312 120 332 140"
                  fill="none"
                  stroke="white"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
              </G>
              
              <G rotation={270} origin="256, 256">
                <Path
                  d="M220 160 Q200 120 180 140"
                  fill="none"
                  stroke="white"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <Path
                  d="M292 160 Q312 120 332 140"
                  fill="none"
                  stroke="white"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
              </G>
            </G>
          </AnimatedSvg>
        </View>

        <View style={styles.textContainer}>
          <Animated.Text style={[styles.loadingText, { opacity: pulseValue }]}>
            {text}
          </Animated.Text>
          <View style={styles.dotsContainer}>
            <Animated.Text
              style={[styles.dot, { transform: [{ translateY: dot1 }] }]}
            >
              .
            </Animated.Text>
            <Animated.Text
              style={[styles.dot, { transform: [{ translateY: dot2 }] }]}
            >
              .
            </Animated.Text>
            <Animated.Text
              style={[styles.dot, { transform: [{ translateY: dot3 }] }]}
            >
              .
            </Animated.Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
    borderRadius: 12,
  },
  spinnerContainer: {
    position: 'relative',
    width: 128,
    height: 128,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 18,
    letterSpacing: 3,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginLeft: 4,
  },
  dot: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
});
