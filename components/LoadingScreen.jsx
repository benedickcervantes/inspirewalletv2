import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Text, StyleSheet, Easing, Dimensions } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { Colors } from "../constants/Colors";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";
import { auth, firestore } from "../configs/firebase";
import { doc, getDoc } from "firebase/firestore";

const { width, height } = Dimensions.get("window");

const LoadingScreen = ({ type = "register" }) => {
  const [userLanguage, setUserLanguage] = useState("English");
  
  // Animation values for star loader
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

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
    // Rotation animation - 4 seconds per rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation - 2 seconds cycle
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Interpolations
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Dynamic text content based on type
  const getLoadingText = () => {
    switch (type) {
      case "login":
        return {
          main: t(userLanguage, "loadingScreens.general.login.title"),
          sub: t(userLanguage, "loadingScreens.general.login.subtitle"),
        };
      case "register":
        return {
          main: t(userLanguage, "loadingScreens.general.register.title"),
          sub: t(userLanguage, "loadingScreens.general.register.subtitle"),
        };
      case "passcode":
        return {
          main: t(userLanguage, "loadingScreens.general.passcode.title"),
          sub: t(userLanguage, "loadingScreens.general.passcode.subtitle"),
        };
      case "create-passcode":
        return {
          main: t(userLanguage, "loadingScreens.general.createPasscode.title"),
          sub: t(userLanguage, "loadingScreens.general.createPasscode.subtitle"),
        };
      default:
        return {
          main: t(userLanguage, "loadingScreens.general.default.title"),
          sub: t(userLanguage, "loadingScreens.general.default.subtitle"),
        };
    }
  };

  const loadingTexts = getLoadingText();

  return (
    <View style={styles.container}>
      {/* Star loader */}
      <Animated.View
        style={[
          styles.loaderContainer,
          {
            transform: [
              { rotate: rotateInterpolate }
            ]
          }
        ]}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Svg width="80" height="80" viewBox="0 0 100 100">
            {/* Center circles */}
            <Circle cx="50" cy="50" r="8" fill="#ffc107" />
            <Circle cx="50" cy="35" r="3" fill="#ffc107" />
            <Circle cx="50" cy="65" r="3" fill="#ffc107" />
            <Circle cx="35" cy="50" r="3" fill="#ffc107" />
            <Circle cx="65" cy="50" r="3" fill="#ffc107" />
            
            {/* Spikes */}
            <Path d="M50 5 L55 20 L50 25 L45 20 Z" fill="#ffc107" />
            <Path d="M50 95 L55 80 L50 75 L45 80 Z" fill="#ffc107" />
            <Path d="M95 50 L80 55 L75 50 L80 45 Z" fill="#ffc107" />
            <Path d="M5 50 L20 55 L25 50 L20 45 Z" fill="#ffc107" />
            <Path d="M82 18 L70 30 L65 25 L77 13 Z" fill="#ffc107" />
            <Path d="M18 82 L30 70 L25 65 L13 77 Z" fill="#ffc107" />
            <Path d="M82 82 L70 70 L65 75 L77 87 Z" fill="#ffc107" />
            <Path d="M18 18 L30 30 L25 35 L13 23 Z" fill="#ffc107" />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* Text */}
      <View style={styles.textContainer}>
        <Text style={[styles.mainText, getRTLStyles(userLanguage)]}>
          {loadingTexts.main}
        </Text>
        <Text style={[styles.subText, getRTLStyles(userLanguage)]}>
          {loadingTexts.sub}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loaderContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  textContainer: {
    alignItems: "center",
  },
  mainText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#E15816",
    marginBottom: 8,
    textAlign: "center",
  },
  subText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
});

export default LoadingScreen;
