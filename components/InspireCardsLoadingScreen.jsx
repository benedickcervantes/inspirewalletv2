import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Text, StyleSheet, Dimensions, Easing } from "react-native";
import { Colors } from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";
import { auth, firestore } from "../configs/firebase";
import { doc, getDoc } from "firebase/firestore";

const { width, height } = Dimensions.get("window");

const InspireCardsLoadingScreen = ({ message }) => {
  const [userLanguage, setUserLanguage] = useState("English");
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cardFlipAnim = useRef(new Animated.Value(0)).current;
  const chipAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnims = Array.from(
    { length: 6 },
    () => useRef(new Animated.Value(0)).current
  );
  const cardFloatAnim = useRef(new Animated.Value(0)).current;

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
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Card flip animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardFlipAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardFlipAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Chip glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(chipAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(chipAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Card floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardFloatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardFloatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
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

    // Sparkle animations
    sparkleAnims.forEach((anim, index) => {
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
  }, []);

  // Interpolations
  const cardRotation = cardFlipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const chipGlow = chipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const cardFloatY = cardFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.7],
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
            transform: [{ scale: pulseAnim }] 
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.circle2, 
          { 
            transform: [{ scale: pulseAnim }] 
          }
        ]} 
      />

      {/* Main card animation container */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [
              { scale: pulseAnim },
              { translateY: cardFloatY }
            ]
          }
        ]}
      >
        {/* Credit Card */}
        <Animated.View
          style={[
            styles.creditCard,
            {
              transform: [
                { rotateY: cardRotation },
                { perspective: 1000 }
              ]
            }
          ]}
        >
          {/* Card background gradient */}
          <View style={styles.cardGradient} />
          
          {/* Card chip */}
          <Animated.View
            style={[
              styles.cardChip,
              {
                opacity: chipGlow,
                transform: [
                  {
                    scale: chipGlow.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="card" size={20} color="#FFD700" />
          </Animated.View>

          {/* Card number placeholder */}
          <View style={styles.cardNumberContainer}>
            <View style={styles.cardNumberLine} />
            <View style={styles.cardNumberLine} />
            <View style={styles.cardNumberLine} />
            <View style={styles.cardNumberLine} />
          </View>

          {/* Card holder name placeholder */}
          <View style={styles.cardHolderContainer}>
            <View style={styles.cardHolderLine} />
          </View>

          {/* Card logo */}
          <View style={styles.cardLogo}>
            <Ionicons name="diamond" size={24} color="white" />
          </View>
        </Animated.View>

        {/* Floating sparkles around the card */}
        {sparkleAnims.map((anim, index) => {
          const angle = (index * 60) * (Math.PI / 180);
          const radius = 80;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <Animated.View
              key={index}
              style={[
                styles.sparkle,
                {
                  opacity: anim,
                  transform: [
                    { translateX: x },
                    { translateY: y },
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1.5],
                      }),
                    },
                    {
                      rotate: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "180deg"],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="star" size={12} color="#FFD700" />
            </Animated.View>
          );
        })}
      </Animated.View>

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

      {/* Status text */}
      <View style={styles.textContainer}>
        <Text style={[styles.mainText, getRTLStyles(userLanguage)]}>
          {t(userLanguage, "loadingScreens.inspireCards.title") || "Processing Your Card"}
        </Text>
        <Text style={[styles.subText, getRTLStyles(userLanguage)]}>
          {message || t(userLanguage, "loadingScreens.inspireCards.subtitle") || "Setting up your Inspire Card..."}
        </Text>
        <Text style={[styles.statusText, getRTLStyles(userLanguage)]}>
          {t(userLanguage, "loadingScreens.inspireCards.status") || "Please wait while we prepare your card"}
        </Text>
      </View>

      {/* Floating card particles */}
      <View style={styles.particlesContainer}>
        {[...Array(5)].map((_, index) => {
          const randomX = Math.random() * width;
          const randomY = Math.random() * height * 0.4 + height * 0.3;
          return (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  position: 'absolute',
                  opacity: sparkleAnims[index % sparkleAnims.length],
                  transform: [
                    { translateX: randomX },
                    { translateY: randomY },
                    {
                      translateY: sparkleAnims[index % sparkleAnims.length].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -20],
                      }),
                    },
                    {
                      rotate: cardRotation,
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="card-outline" size={16} color={Colors.redTheme.background} />
            </Animated.View>
          );
        })}
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
    backgroundColor: "rgba(254, 125, 72, 0.08)",
    top: "10%",
    left: "3%",
  },
  circle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(254, 125, 72, 0.06)",
    bottom: "15%",
    right: "8%",
  },
  cardContainer: {
    width: width * 0.8,
    height: 250,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  creditCard: {
    width: 280,
    height: 180,
    borderRadius: 16,
    backgroundColor: Colors.redTheme.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  cardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.redTheme.background,
    borderRadius: 16,
  },
  cardChip: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 40,
    height: 30,
    backgroundColor: "rgba(255, 215, 0, 0.9)",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  cardNumberContainer: {
    position: "absolute",
    top: 70,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardNumberLine: {
    width: 50,
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 4,
  },
  cardHolderContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    width: 120,
  },
  cardHolderLine: {
    width: 100,
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 3,
  },
  cardLogo: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sparkle: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    width: width * 0.7,
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
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 8,
    textAlign: "center",
  },
  subText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  statusText: {
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default InspireCardsLoadingScreen;
