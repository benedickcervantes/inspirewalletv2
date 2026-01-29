import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Text, StyleSheet, Dimensions, Easing } from "react-native";
import { Colors } from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";
import { auth, firestore } from "../configs/firebase";
import { doc, getDoc } from "firebase/firestore";

const { width, height } = Dimensions.get("window");

const TransferLoadingScreen = ({ message }) => {
  const [userLanguage, setUserLanguage] = useState("English");
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const transferAnim = useRef(new Animated.Value(0)).current;
  const coinAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const waveAnims = Array.from(
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

    // Transfer animation (money moving from left to right)
    Animated.loop(
      Animated.sequence([
        Animated.timing(transferAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(transferAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Coin rotation animation
    Animated.loop(
      Animated.timing(coinAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Progress bar animation
    Animated.loop(
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      })
    ).start();

    // Wave animations for the transfer path
    waveAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            delay: index * 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  // Interpolations
  const transferX = transferAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, width - 150],
  });

  const coinRotation = coinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
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

      {/* Main transfer animation container */}
      <Animated.View
        style={[
          styles.transferContainer,
          {
            transform: [{ scale: pulseAnim }]
          }
        ]}
      >
        {/* Transfer path line */}
        <View style={styles.transferPath}>
          <View style={styles.pathLine} />
          
          {/* Animated dots along the path */}
          {waveAnims.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.pathDot,
                {
                  opacity: anim,
                  transform: [
                    { translateX: 60 + (index * 80) },
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>

        {/* Sender side */}
        <View style={styles.senderSide}>
          <View style={styles.accountCard}>
            <Ionicons name="person-circle" size={24} color={Colors.redTheme.background} />
            <Text style={[styles.accountLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "loadingScreens.transfer.from")}</Text>
          </View>
          
          {/* Moving money/coin */}
          <Animated.View
            style={[
              styles.movingCoin,
              {
                transform: [
                  { translateX: transferX },
                  { rotate: coinRotation },
                  {
                    scale: transferAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 1.2, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="cash" size={20} color="#FFD700" />
          </Animated.View>
        </View>

        {/* Receiver side */}
        <View style={styles.receiverSide}>
          <View style={styles.accountCard}>
            <Ionicons name="person-circle" size={24} color={Colors.redTheme.background} />
            <Text style={[styles.accountLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "loadingScreens.transfer.to")}</Text>
          </View>
        </View>

        {/* Transfer icon in center */}
        <View style={styles.centerIcon}>
          <Animated.View
            style={{
              transform: [{ rotate: coinRotation }],
            }}
          >
            <Ionicons name="swap-horizontal" size={32} color={Colors.redTheme.background} />
          </Animated.View>
        </View>
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
        <Text style={[styles.mainText, getRTLStyles(userLanguage)]}>{t(userLanguage, "loadingScreens.transfer.title")}</Text>
        <Text style={[styles.subText, getRTLStyles(userLanguage)]}>{message || t(userLanguage, "loadingScreens.transfer.subtitle")}</Text>
        <Text style={[styles.statusText, getRTLStyles(userLanguage)]}>{t(userLanguage, "loadingScreens.transfer.status")}</Text>
      </View>

      {/* Floating money particles */}
      <View style={styles.particlesContainer}>
        {[...Array(4)].map((_, index) => {
          const randomX = Math.random() * width;
          const randomY = Math.random() * height * 0.4 + height * 0.3;
          return (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  position: 'absolute',
                  opacity: waveAnims[index % waveAnims.length],
                  transform: [
                    { translateX: randomX },
                    { translateY: randomY },
                    {
                      translateY: waveAnims[index % waveAnims.length].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -15],
                      }),
                    },
                    {
                      rotate: coinRotation,
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="cash-outline" size={12} color="#FFD700" />
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
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(254, 125, 72, 0.08)",
    top: "15%",
    left: "5%",
  },
  circle2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(254, 125, 72, 0.06)",
    bottom: "20%",
    right: "10%",
  },
  transferContainer: {
    width: width * 0.9,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  transferPath: {
    position: "absolute",
    width: "100%",
    height: 4,
    top: "50%",
    left: 0,
    right: 0,
  },
  pathLine: {
    width: "100%",
    height: 2,
    backgroundColor: Colors.redTheme.background,
    borderRadius: 1,
    opacity: 0.3,
  },
  pathDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.redTheme.background,
    top: -3,
  },
  senderSide: {
    position: "absolute",
    left: 20,
    top: "50%",
    transform: [{ translateY: -30 }],
  },
  receiverSide: {
    position: "absolute",
    right: 20,
    top: "50%",
    transform: [{ translateY: -30 }],
  },
  accountCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(254, 125, 72, 0.2)",
  },
  accountLabel: {
    fontSize: 12,
    color: Colors.redTheme.background,
    fontWeight: "600",
    marginTop: 4,
  },
  movingCoin: {
    position: "absolute",
    top: -10,
    left: 0,
    backgroundColor: "white",
    borderRadius: 15,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  centerIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -16 }, { translateY: -16 }],
    backgroundColor: "white",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TransferLoadingScreen;
