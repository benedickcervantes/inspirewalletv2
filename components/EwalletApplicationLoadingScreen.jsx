import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Text, StyleSheet, Dimensions, Easing } from "react-native";
import { Colors } from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";
import { auth, firestore } from "../configs/firebase";
import { doc, getDoc } from "firebase/firestore";

const { width, height } = Dimensions.get("window");

const EwalletApplicationLoadingScreen = ({ message }) => {
  const [userLanguage, setUserLanguage] = useState("English");
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const walletAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
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

    // Wallet opening animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(walletAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(walletAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Card floating animation
    Animated.loop(
      Animated.timing(cardAnim, {
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
  const cardY = cardAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 15, 30],
  });

  const cardRotation = cardAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 5, 10],
  });

  const walletScale = walletAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1.2],
  });

  const walletOpacity = walletAnim.interpolate({
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
              { rotate: walletAnim.interpolate({
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
        {/* Center wallet with opening animation */}
        <Animated.View
          style={[
            styles.walletContainer,
            {
              transform: [
                { scale: walletScale },
              ],
              opacity: walletOpacity,
            },
          ]}
        >
          <Ionicons
            name="wallet"
            size={80}
            color={Colors.redTheme.background}
          />
          
          {/* Digital connection rings around wallet */}
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

        {/* Floating e-wallet cards */}
        <Animated.View
          style={[
            styles.floatingCard1,
            {
              transform: [
                { translateY: cardY.interpolate({
                  inputRange: [0, 15, 30],
                  outputRange: [0, -15, -30],
                }) },
                { rotate: cardRotation.interpolate({
                  inputRange: [0, 5, 10],
                  outputRange: ['0deg', '5deg', '10deg'],
                }) },
              ],
            },
          ]}
        >
          <Ionicons
            name="card"
            size={20}
            color="#00D4AA"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.floatingCard2,
            {
              transform: [
                { translateY: cardY.interpolate({
                  inputRange: [0, 15, 30],
                  outputRange: [0, -10, -20],
                }) },
                { rotate: cardRotation.interpolate({
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
            color="#FF6B35"
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
            {t(userLanguage, "loadingScreens.ewallet.title")}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.subText,
              { opacity: textAnims[1] },
              getRTLStyles(userLanguage)
            ]}
          >
            {t(userLanguage, "loadingScreens.ewallet.subtitle")}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.loadingText,
              { opacity: textAnims[2] },
              getRTLStyles(userLanguage)
            ]}
          >
            {message || t(userLanguage, "loadingScreens.ewallet.status")}
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

        {/* E-wallet features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="phone-portrait" size={20} color={Colors.redTheme.background} />
            <Text style={[styles.featureText, getRTLStyles(userLanguage)]}>{t(userLanguage, "loadingScreens.ewallet.features.mobile")}</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="card" size={20} color={Colors.redTheme.background} />
            <Text style={[styles.featureText, getRTLStyles(userLanguage)]}>{t(userLanguage, "loadingScreens.ewallet.features.cards")}</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="cash" size={20} color={Colors.redTheme.background} />
            <Text style={[styles.featureText, getRTLStyles(userLanguage)]}>{t(userLanguage, "loadingScreens.ewallet.features.cashless")}</Text>
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
                    rotate: walletAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons 
              name={index % 2 === 0 ? "card" : "wallet"} 
              size={10} 
              color={index % 2 === 0 ? "#00D4AA" : "#FF6B35"} 
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
  walletContainer: {
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
  floatingCard1: {
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
  floatingCard2: {
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

export default EwalletApplicationLoadingScreen;
