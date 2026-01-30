import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Image, Text, StyleSheet, Easing, Dimensions } from "react-native";
import { Colors } from "../constants/Colors";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";
import { auth, firestore } from "../configs/firebase";
import { doc, getDoc } from "firebase/firestore";

const { width, height } = Dimensions.get("window");

const LoadingScreen = ({ type = "register" }) => {
  const [userLanguage, setUserLanguage] = useState("English");
  
  // Multiple animation values for complex effects
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const waveAnims = Array.from(
    { length: 5 },
    () => useRef(new Animated.Value(0)).current
  );
  const textAnims = Array.from(
    { length: 3 },
    () => useRef(new Animated.Value(0)).current
  );

  // Fetch user language
  useEffect(() => {
    const fetchUserLanguage = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserLanguage(userData.preferredLanguage || "English");
          }
        }
      } catch (error) {
        console.error("Error fetching user language:", error);
      }
    };
    
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    // Initial fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Scale animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Progress bar animation
    Animated.loop(
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      })
    ).start();

    // Wave animations
    waveAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            delay: index * 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Text animations
    textAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            delay: index * 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  // Interpolations
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.6],
  });

  // Dynamic text content based on type
  const getLoadingText = () => {
    switch (type) {
      case "login":
        return {
          main: t(userLanguage, "loadingScreens.general.login.title"),
          sub: t(userLanguage, "loadingScreens.general.login.subtitle"),
          loading: t(userLanguage, "loadingScreens.general.login.status")
        };
      case "register":
        return {
          main: t(userLanguage, "loadingScreens.general.register.title"),
          sub: t(userLanguage, "loadingScreens.general.register.subtitle"),
          loading: t(userLanguage, "loadingScreens.general.register.status")
        };
      case "passcode":
        return {
          main: t(userLanguage, "loadingScreens.general.passcode.title"),
          sub: t(userLanguage, "loadingScreens.general.passcode.subtitle"),
          loading: t(userLanguage, "loadingScreens.general.passcode.status")
        };
      case "create-passcode":
        return {
          main: t(userLanguage, "loadingScreens.general.createPasscode.title"),
          sub: t(userLanguage, "loadingScreens.general.createPasscode.subtitle"),
          loading: t(userLanguage, "loadingScreens.general.createPasscode.status")
        };
      default:
        return {
          main: t(userLanguage, "loadingScreens.general.default.title"),
          sub: t(userLanguage, "loadingScreens.general.default.subtitle"),
          loading: t(userLanguage, "loadingScreens.general.default.status")
        };
    }
  };

  const loadingTexts = getLoadingText();

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient} />
      
      {/* Animated circles for depth */}
      <Animated.View 
        style={[
          styles.circle1, 
          { 
            transform: [
              { scale: pulseAnim },
              { rotate: rotateInterpolate }
            ] 
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.circle2, 
          { 
            transform: [
              { scale: pulseAnim },
              { rotate: rotateInterpolate }
            ] 
          }
        ]} 
      />

      {/* Main logo with enhanced animation */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [
              { scale: scaleAnim },
              { rotate: rotateInterpolate }
            ]
          }
        ]}
      >
        <Image
          source={require("../assets/images/loadinglogo.png")}
          style={styles.logo}
        />
      </Animated.View>

      {/* Wave indicators */}
      <View style={styles.waveContainer}>
        {waveAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.wave,
              {
                opacity: anim,
                transform: [
                  {
                    scaleY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1.5],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
              },
            ]}
          />
        </View>
      </View>

      {/* Animated text */}
      <View style={styles.textContainer}>
        <Animated.Text
          style={[
            styles.mainText,
            { opacity: textAnims[0] },
            getRTLStyles(userLanguage)
          ]}
        >
          {loadingTexts.main}
        </Animated.Text>
        <Animated.Text
          style={[
            styles.subText,
            { opacity: textAnims[1] },
            getRTLStyles(userLanguage)
          ]}
        >
          {loadingTexts.sub}
        </Animated.Text>
        <Animated.Text
          style={[
            styles.loadingText,
            { opacity: textAnims[2] },
            getRTLStyles(userLanguage)
          ]}
        >
          {loadingTexts.loading}
        </Animated.Text>
      </View>

      {/* Floating particles */}
      <View style={styles.particlesContainer}>
        {[...Array(6)].map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: Math.random() * width,
                top: Math.random() * height * 0.6 + height * 0.2,
                opacity: waveAnims[index % waveAnims.length],
                transform: [
                  {
                    translateY: waveAnims[index % waveAnims.length].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -20],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    position: "relative",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(254, 125, 72, 0.05)",
  },
  circle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    top: "20%",
    left: "10%",
  },
  circle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(254, 125, 72, 0.08)",
    bottom: "25%",
    right: "15%",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    shadowColor: Colors.redTheme.background,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  waveContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    gap: 4,
  },
  wave: {
    width: 6,
    height: 30,
    backgroundColor: Colors.redTheme.background,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  progressContainer: {
    width: width * 0.6,
    marginBottom: 30,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(254, 125, 72, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.redTheme.background,
    borderRadius: 2,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  mainText: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 8,
    textAlign: "center",
  },
  subText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  loadingText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
  },
  particlesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.redTheme.background,
  },
});

export default LoadingScreen;
