import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Text, StyleSheet, Dimensions, Easing } from "react-native";
import { Colors } from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";
import { auth, firestore } from "../configs/firebase";
import { doc, getDoc } from "firebase/firestore";

const { width, height } = Dimensions.get("window");

const BankApplicationLoadingScreen = ({ message }) => {
  const [userLanguage, setUserLanguage] = useState("English");
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bankAnim = useRef(new Animated.Value(0)).current;
  const documentAnim = useRef(new Animated.Value(0)).current;
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
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Pulse animation for the main container
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
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

    // Bank building animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bankAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bankAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Document floating animation
    Animated.loop(
      Animated.timing(documentAnim, {
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
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      })
    ).start();

    // Wave animations for background elements
    waveAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            delay: index * 150,
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

    // Text fade-in animations
    textAnims.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        delay: index * 300,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  // Interpolations
  const documentY = documentAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 15, 30],
  });

  const documentRotation = documentAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 5, 10],
  });

  const bankScale = bankAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1.2],
  });

  const bankOpacity = bankAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1, 1.2],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.6],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Background gradient */}
      <View style={styles.backgroundGradient} />

      {/* Animated background circles */}
      <Animated.View
        style={[
          styles.circle1,
          {
            transform: [
              { scale: pulseAnim },
              { rotate: bankAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }) },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle2,
          {
            transform: [
              { scale: pulseAnim.interpolate({
                inputRange: [1, 1.05],
                outputRange: [1, 0.95],
              }) },
            ],
          },
        ]}
      />

      {/* Main content */}
      <View style={styles.content}>
        {/* Center bank building with animation */}
        <Animated.View
          style={[
            styles.bankContainer,
            {
              transform: [
                { scale: bankScale },
              ],
              opacity: bankOpacity,
            },
          ]}
        >
          <Ionicons
            name="business"
            size={80}
            color={Colors.redTheme.background}
          />
          
          {/* Digital connection rings around bank */}
          {waveAnims.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.connectionRing,
                {
                  opacity: anim,
                  transform: [
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.4],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Floating documents */}
        <Animated.View
          style={[
            styles.floatingDocument1,
            {
              transform: [
                { translateY: documentY.interpolate({
                  inputRange: [0, 15, 30],
                  outputRange: [0, -15, -30],
                }) },
                { rotate: documentRotation.interpolate({
                  inputRange: [0, 5, 10],
                  outputRange: ['0deg', '5deg', '10deg'],
                }) },
              ],
            },
          ]}
        >
          <Ionicons
            name="document-text"
            size={20}
            color="#4CAF50"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.floatingDocument2,
            {
              transform: [
                { translateY: documentY.interpolate({
                  inputRange: [0, 15, 30],
                  outputRange: [0, -10, -20],
                }) },
                { rotate: documentRotation.interpolate({
                  inputRange: [0, 5, 10],
                  outputRange: ['0deg', '-3deg', '-6deg'],
                }) },
              ],
            },
          ]}
        >
          <Ionicons
            name="card"
            size={18}
            color="#2196F3"
          />
        </Animated.View>

        {/* Animated text */}
        <View style={styles.textContainer}>
          <Animated.Text
            style={[
              styles.mainText,
              { opacity: textAnims[0] },
              getRTLStyles(userLanguage)
            ]}
          >
            {t(userLanguage, "loadingScreens.bank.title")}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.subText,
              { opacity: textAnims[1] },
              getRTLStyles(userLanguage)
            ]}
          >
            {t(userLanguage, "loadingScreens.bank.subtitle")}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.loadingText,
              { opacity: textAnims[2] },
              getRTLStyles(userLanguage)
            ]}
          >
            {message || t(userLanguage, "loadingScreens.bank.status")}
          </Animated.Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: progressWidth }
              ]}
            />
          </View>
        </View>

        {/* Bank features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.redTheme.background} />
            <Text style={[styles.featureText, getRTLStyles(userLanguage)]}>{t(userLanguage, "loadingScreens.bank.features.secure")}</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="time" size={20} color={Colors.redTheme.background} />
            <Text style={[styles.featureText, getRTLStyles(userLanguage)]}>{t(userLanguage, "loadingScreens.bank.features.fast")}</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.redTheme.background} />
            <Text style={[styles.featureText, getRTLStyles(userLanguage)]}>{t(userLanguage, "loadingScreens.bank.features.reliable")}</Text>
          </View>
        </View>
      </View>

      {/* Floating digital particles */}
      <View style={styles.particlesContainer}>
        {[...Array(8)].map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                opacity: waveAnims[index % waveAnims.length],
                transform: [
                  {
                    translateY: waveAnims[index % waveAnims.length].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -25],
                    }),
                  },
                  {
                    rotate: bankAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons 
              name={index % 2 === 0 ? "document-text" : "business"} 
              size={10} 
              color={index % 2 === 0 ? "#4CAF50" : "#2196F3"} 
            />
          </Animated.View>
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
    top: height * 0.1,
    left: width * 0.1,
  },
  circle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(254, 125, 72, 0.08)",
    bottom: height * 0.2,
    right: width * 0.1,
  },
  content: {
    alignItems: "center",
    zIndex: 2,
  },
  bankContainer: {
    position: "relative",
    marginBottom: 30,
  },
  connectionRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.redTheme.background,
    top: -20,
    left: -20,
  },
  floatingDocument1: {
    position: "absolute",
    top: -40,
    left: -60,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingDocument2: {
    position: "absolute",
    top: -30,
    right: -50,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  mainText: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    textAlign: "center",
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  progressContainer: {
    width: width * 0.6,
    marginBottom: 30,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(254, 125, 72, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.redTheme.background,
    borderRadius: 2,
  },
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: width * 0.8,
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
  },
  featureText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  particlesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  particle: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default BankApplicationLoadingScreen;
