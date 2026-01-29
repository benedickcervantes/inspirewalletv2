import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Colors } from "../constants/Colors";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";
import { auth, firestore } from "../configs/firebase";
import { doc, getDoc } from "firebase/firestore";

const SimpleLoadingScreen = ({ message }) => {
  const [userLanguage, setUserLanguage] = useState("English");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Simple pulse animation for the spinner
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View
        style={[
          styles.spinnerContainer,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <ActivityIndicator size="large" color={Colors.redTheme.background} />
      </Animated.View>
      <Text style={[styles.message, getRTLStyles(userLanguage)]}>{message || t(userLanguage, "loadingScreens.simple.default")}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  spinnerContainer: {
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
});

export default SimpleLoadingScreen;
