import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Text, StyleSheet, Dimensions, Easing } from "react-native";
import { Colors } from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";
import { auth, firestore } from "../configs/firebase";
import { doc, getDoc } from "firebase/firestore";

const { width, height } = Dimensions.get("window");

const TravelProtectionLoadingScreen = ({ message }) => {
  const [userLanguage, setUserLanguage] = useState("English");
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shieldAnim = useRef(new Animated.Value(0)).current;
  const planeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const waveAnims = Array.from(
    { length: 4 },
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

    // Shield protection animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shieldAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shieldAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Plane flying animation
    Animated.loop(
      Animated.timing(planeAnim, {
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
  const planeX = planeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, width + 50],
  });

  const planeY = planeAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [height * 0.3, height * 0.25, height * 0.3],
  });

  const shieldScale = shieldAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 1],
  });

  const shieldOpacity = shieldAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1, 0.7],
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
              { rotate: shieldAnim.interpolate({
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
        {/* Center shield with protection animation */}
        <Animated.View
          style={[
            styles.shieldContainer,
            {
              transform: [
                { scale: shieldScale },
              ],
              opacity: shieldOpacity,
            },
          ]}
        >
          <Ionicons
            name="shield-checkmark"
            size={80}
            color={Colors.redTheme.background}
          />
          
          {/* Protection rings around shield */}
          {waveAnims.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.protectionRing,
                {
                  opacity: anim,
                  transform: [
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.5],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Flying plane animation */}
        <Animated.View
          style={[
            styles.flyingPlane,
            {
              transform: [
                { translateX: planeX },
                { translateY: planeY },
                { rotate: planeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '5deg'],
                }) },
              ],
            },
          ]}
        >
          <Ionicons
            name="airplane"
            size={24}
            color={Colors.redTheme.background}
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
            {t(userLanguage, "loadingScreens.travelProtection.title")}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.subText,
              { opacity: textAnims[1] },
              getRTLStyles(userLanguage)
            ]}
          >
            {t(userLanguage, "loadingScreens.travelProtection.subtitle")}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.loadingText,
              { opacity: textAnims[2] },
              getRTLStyles(userLanguage)
            ]}
          >
            {message || t(userLanguage, "loadingScreens.travelProtection.status")}
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

        {/* Travel protection features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="medical" size={20} color={Colors.redTheme.background} />
            <Text style={[styles.featureText, getRTLStyles(userLanguage)]}>{t(userLanguage, "loadingScreens.travelProtection.features.medical")}</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="bag-check" size={20} color={Colors.redTheme.background} />
            <Text style={[styles.featureText, getRTLStyles(userLanguage)]}>{t(userLanguage, "loadingScreens.travelProtection.features.baggage")}</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="time" size={20} color={Colors.redTheme.background} />
            <Text style={[styles.featureText, getRTLStyles(userLanguage)]}>{t(userLanguage, "loadingScreens.travelProtection.features.cancellation")}</Text>
          </View>
        </View>
      </View>

      {/* Floating protection particles */}
      <View style={styles.particlesContainer}>
        {[...Array(6)].map((_, index) => (
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
                      outputRange: [0, -20],
                    }),
                  },
                  {
                    rotate: shieldAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="shield" size={12} color="#FFD700" />
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
  shieldContainer: {
    position: "relative",
    marginBottom: 30,
  },
  protectionRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.redTheme.background,
    top: -20,
    left: -20,
  },
  flyingPlane: {
    position: "absolute",
    top: -50,
    left: 0,
    right: 0,
    alignItems: "center",
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 215, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TravelProtectionLoadingScreen;
