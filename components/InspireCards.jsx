import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Animated,
  TouchableWithoutFeedback,
  StyleSheet,
  Image,
  SafeAreaView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import { auth, firestore } from "../configs/firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { useFonts } from "expo-font";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";

export default function InspCard({ selectedCardId = "default" }) {
  const navigation = useNavigation();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [availBalance, setAvailBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLanguage, setUserLanguage] = useState("english");

  // Function to fetch user language
  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserLanguage(userData.preferredLanguage || "english");
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
      setUserLanguage("english");
    }
  };

  // Function to get card images based on selected card ID
  const getCardImages = (cardId) => {
    const cardPaths = {
      // Default card (unchanged)
      default: {
        front: require("../assets/cards/default/front.png"),
        back: require("../assets/cards/default/back.png"),
      },

      // Design cards (organized in /design folder)
      cd2: {
        front: require("../assets/cards/design/cd2/front.png"),
        back: require("../assets/cards/design/cd2/back.png"),
      },

      // VIP cards (organized in /vip folder)
      vip2: {
        front: require("../assets/cards/vip/vip2/front.png"),
        back: require("../assets/cards/vip/vip2/back.png"),
      },
      vip4: {
        front: require("../assets/cards/vip/vip4/front.png"),
        back: require("../assets/cards/vip/vip4/back.png"),
      },
      vip7: {
        front: require("../assets/cards/vip/vip7/front.png"),
        back: require("../assets/cards/vip/vip7/back.png"),
      },
    };
    return cardPaths[cardId] || cardPaths.default;
  };

  const [currentCardId, setCurrentCardId] = useState(selectedCardId);
  const cardImages = getCardImages(currentCardId);

  // Fetch user language on component mount and listen for real-time changes
  useEffect(() => {
    fetchUserLanguage();
    
    // Set up real-time listener for language changes
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(firestore, "users", user.uid);
      const unsubscribeLanguage = onSnapshot(userRef, (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const newLanguage = userData.preferredLanguage || "english";
          setUserLanguage(prevLanguage => {
            // Only update if the language actually changed
            if (prevLanguage !== newLanguage) {
              console.log(`InspireCards: Language changed from ${prevLanguage} to ${newLanguage}`);
              return newLanguage;
            }
            return prevLanguage;
          });
        }
      });

      return () => unsubscribeLanguage();
    }
  }, []);

  // Update card when selectedCardId prop changes (Real-time card switching)
  useEffect(() => {
    setCurrentCardId(selectedCardId);
    // console.log("🎴 InspireCards card changed in real-time:", {
    //   from: currentCardId,
    //   to: selectedCardId,
    //   timestamp: new Date().toISOString(),
    // });
  }, [selectedCardId]);

  // Monitor all real-time changes
  useEffect(() => {
    // console.log("🎴 InspireCards complete state:", {
    //   currentCardId,
    //   userName,
    //   availBalance,
    //   loading,
    //   isFlipped,
    //   timestamp: new Date().toISOString(),
    // });
  }, [currentCardId, userName, availBalance, loading, isFlipped]);
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  // Device type detection
  const getDeviceType = (width, height) => {
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);

    // iPad Air 13-inch: ~1032x1376 points (2064x2752 pixels at 2x)
    // Standard iPad sizes: ~768x1024, ~834x1194, ~1024x1366
    if (minDimension >= 768) {
      if (maxDimension >= 1300) {
        return "large-tablet"; // iPad Air 13-inch and similar
      } else if (maxDimension >= 1024) {
        return "tablet"; // Standard iPad sizes
      }
      return "small-tablet"; // iPad mini and similar
    } else if (minDimension >= 600) {
      return "large-phone"; // Large phones/phablets
    } else if (minDimension >= 375) {
      return "phone"; // Standard phones
    }
    return "small-phone"; // Small phones
  };

  // Real-time user data listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setUserName("");
      setCompanyName("");
      setAccountNumber("");
      setAvailBalance(0);
      setLoading(false);
      return;
    }

    const userDocRef = doc(firestore, "users", user.uid);

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      userDocRef,
      (userDocSnap) => {
        try {
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const name =
              (data.firstName || "") +
              (data.lastName ? ` ${data.lastName}` : "");
            setUserName(name.trim());
            setCompanyName(data.company || "");
            setAccountNumber(data.accountNumber || "");
            setAvailBalance(data.availBalanceAmount ?? 0);
            // console.log("🎴 InspireCards real-time update:", {
            //   name: name.trim(),
            //   accountNumber: data.accountNumber || "",
            //   availBalance: data.availBalanceAmount ?? 0,
            //   timestamp: new Date().toISOString(),
            // });
          } else {
            setUserName("");
            setCompanyName("");
            setAccountNumber("");
            setAvailBalance(0);
          }
        } catch (e) {
          // console.error("❌ Error in InspireCards real-time listener:", e);
          setUserName("");
          setCompanyName("");
          setAccountNumber("");
          setAvailBalance(0);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        // console.error("❌ InspireCards listener error:", error);
        setUserName("");
        setCompanyName("");
        setAccountNumber("");
        setAvailBalance(0);
        setLoading(false);
      }
    );

    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, []); // Only run once on mount

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions({
        width: window.width,
        height: window.height,
      });
    });

    return () => subscription?.remove();
  }, []);

  const flipCard = () => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      duration: 800,
      useNativeDriver: true,
    }).start(() => setIsFlipped(!isFlipped));
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const formatCurrency = (value) => {
    if (typeof value !== "number") value = Number(value);
    if (isNaN(value)) return "₱0.00";
    return `₱${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getResponsiveStyles = () => {
    const { width, height } = dimensions;
    const deviceType = getDeviceType(width, height);
    const isLandscape = width > height;

    // Responsive card dimensions based on device type
    let cardWidth, cardHeight, scaleFactor;

    switch (deviceType) {
      case "large-tablet": // iPad Air 13-inch
        scaleFactor = isLandscape ? 1.8 : 1.6;
        cardWidth = 340 * scaleFactor;
        cardHeight = 212 * scaleFactor;
        break;
      case "tablet": // Standard iPads
        scaleFactor = isLandscape ? 1.5 : 1.3;
        cardWidth = 340 * scaleFactor;
        cardHeight = 212 * scaleFactor;
        break;
      case "small-tablet": // iPad mini
        scaleFactor = isLandscape ? 1.3 : 1.1;
        cardWidth = 340 * scaleFactor;
        cardHeight = 212 * scaleFactor;
        break;
      case "large-phone": // Large phones
        scaleFactor = 1.05;
        cardWidth = Math.min(width * 0.9, 360);
        cardHeight = cardWidth * 0.625; // Maintain aspect ratio
        break;
      case "phone": // Standard phones
        cardWidth = Math.min(width * 0.85, 340);
        cardHeight = cardWidth * 0.625;
        break;
      default: // Small phones
        cardWidth = Math.min(width * 0.8, 300);
        cardHeight = cardWidth * 0.625;
        break;
    }

    // Responsive text sizes
    const getTextSizes = () => {
      const baseNameSize = 16;
      const baseAccountNumberSize = 16;
      const baseBalanceNameSize = 12;
      const baseBalanceSize = 14;

      switch (deviceType) {
        case "large-tablet":
          return {
            nameSize: baseNameSize * 2,
            accountNumberSize: baseAccountNumberSize * 1.8,
            balanceNameSize: baseBalanceNameSize * 1.8,
            balanceSize: baseBalanceSize * 1.8,
          };
        case "tablet":
          return {
            nameSize: baseNameSize * 1.6,
            accountNumberSize: baseAccountNumberSize * 1.4,
            balanceNameSize: baseBalanceNameSize * 1.4,
            balanceSize: baseBalanceSize * 1.4,
          };
        case "small-tablet":
          return {
            nameSize: baseNameSize * 1.3,
            accountNumberSize: baseAccountNumberSize * 1.2,
            balanceNameSize: baseBalanceNameSize * 1.2,
            balanceSize: baseBalanceSize * 1.2,
          };
        case "large-phone":
          return {
            nameSize: baseNameSize * 1.1,
            accountNumberSize: baseAccountNumberSize * 1.05,
            balanceNameSize: baseBalanceNameSize * 1.05,
            balanceSize: baseBalanceSize * 1.05,
          };
        default:
          return {
            nameSize: Math.max(baseNameSize, width * 0.04),
            accountNumberSize: Math.max(baseAccountNumberSize, width * 0.035),
            balanceNameSize: Math.max(baseBalanceNameSize, width * 0.03),
            balanceSize: Math.max(baseBalanceSize, width * 0.035),
          };
      }
    };

    const textSizes = getTextSizes();

    // Conditional text color based on selected card
    let textColor = "#fff"; // Default color
    let textShadowColor = "rgba(0,0,0,0.8)"; // Stronger shadow for better contrast

    if (currentCardId === "vip7") {
      textColor = "#bc9c22"; // Special color for vip7
      textShadowColor = "rgba(0,0,0,0.9)";
    }

    // Responsive overlay positioning - adjusted for better visibility
    const getOverlayTop = () => {
      // Position text at the bottom of the card
      let baseBottom;
      if (currentCardId === "vip7") {
        baseBottom = 40; // Distance from bottom for vip7
      } else {
        // For default card, position text at bottom
        baseBottom = 35; // Distance from bottom
      }

      switch (deviceType) {
        case "large-tablet":
          return baseBottom * 1.5;
        case "tablet":
          return baseBottom * 1.3;
        case "small-tablet":
          return baseBottom * 1.1;
        case "large-phone":
          return baseBottom * 0.9; // Slightly closer to bottom for large phones
        case "phone":
          return baseBottom * 0.8; // Closer to bottom for standard phones
        default: // small-phone
          return baseBottom * 0.7; // Closest to bottom for small phones
      }
    };

    // Responsive padding and margins
    const getSpacing = () => {
      switch (deviceType) {
        case "large-tablet":
          return {
            containerPadding: width * 0.08,
            cardMarginBottom: height * 0.08,
            overlayPadding: 35,
            nameMarginBottom: 8,
            balanceNameMarginBottom: 4,
          };
        case "tablet":
          return {
            containerPadding: width * 0.06,
            cardMarginBottom: height * 0.06,
            overlayPadding: 28,
            nameMarginBottom: 6,
            balanceNameMarginBottom: 3,
          };
        case "small-tablet":
          return {
            containerPadding: width * 0.05,
            cardMarginBottom: height * 0.05,
            overlayPadding: 24,
            nameMarginBottom: 5,
            balanceNameMarginBottom: 2,
          };
        case "large-phone":
          return {
            containerPadding: width * 0.05,
            cardMarginBottom: height * 0.05,
            overlayPadding: 18,
            nameMarginBottom: 3,
            balanceNameMarginBottom: 2,
          };
        case "phone":
          return {
            containerPadding: width * 0.05,
            cardMarginBottom: height * 0.05,
            overlayPadding: 16,
            nameMarginBottom: 3,
            balanceNameMarginBottom: 1,
          };
        default: // small-phone
          return {
            containerPadding: width * 0.05,
            cardMarginBottom: height * 0.05,
            overlayPadding: 14,
            nameMarginBottom: 2,
            balanceNameMarginBottom: 1,
          };
      }
    };

    const spacing = getSpacing();
    const overlayBottom = getOverlayTop();

    return StyleSheet.create({
      container: {
        flex: 1,
      },
      content: {
        flex: 1,
        padding: spacing.containerPadding,
        justifyContent: deviceType.includes("tablet") ? "center" : "flex-start",
      },
      cardContainer: {
        alignItems: "center",
        marginBottom: spacing.cardMarginBottom,
      },
      cardWrapper: {
        position: "relative",
        width: cardWidth,
        height: cardHeight,
      },
      card: {
        position: "absolute",
        width: "100%",
        height: "100%",
        backfaceVisibility: "hidden",
        borderRadius: deviceType.includes("tablet")
          ? 24
          : Platform.OS === "ios"
          ? 16
          : 12,
        overflow: "hidden",
      },
      frontCard: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: deviceType.includes("tablet") ? 8 : 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: deviceType.includes("tablet") ? 16 : 8,
        elevation: deviceType.includes("tablet") ? 12 : 6,
      },
      backCard: {
        zIndex: -1,
      },
      cardImage: {
        width: "100%",
        height: "100%",
      },
      backCardImage: {},
      overlayContainer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: overlayBottom,
        alignItems: "flex-start",
        paddingHorizontal: spacing.overlayPadding,
        // Add background for debugging (remove this later)
        // backgroundColor: 'rgba(255,0,0,0.2)',
      },
      overlayAccountNumber: {
        color: textColor,
        fontWeight: Platform.OS === "ios" ? "600" : "bold",
        fontSize: textSizes.accountNumberSize,
        fontFamily: "BebasNeue-Regular",
        textTransform: "uppercase",
        textShadowColor: textShadowColor,
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: deviceType.includes("tablet") ? 6 : 3,
        zIndex: 10,
        marginBottom: spacing.nameMarginBottom,
        lineHeight: textSizes.accountNumberSize * 1.1,
      },
      overlayName: {
        color: textColor,
        fontWeight: Platform.OS === "ios" ? "700" : "bold",
        fontSize: textSizes.nameSize,
        fontFamily: "BebasNeue-Regular",
        textTransform: "uppercase",
        textShadowColor: textShadowColor,
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: deviceType.includes("tablet") ? 6 : 3,
        zIndex: 10,
        marginBottom: spacing.nameMarginBottom,
        lineHeight: textSizes.nameSize * 1.1,
      },
      overlayCompany: {
        color: textColor,
        fontWeight: Platform.OS === "ios" ? "700" : "bold",
        fontSize: textSizes.nameSize,
        fontFamily: "BebasNeue-Regular",
        textTransform: "uppercase",
        textShadowColor: textShadowColor,
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: deviceType.includes("tablet") ? 6 : 3,
        zIndex: 10,
        marginBottom: spacing.nameMarginBottom,
        lineHeight: textSizes.nameSize * 1.1,
      },
      overlayBalanceName: {
        color: textColor,
        fontWeight: Platform.OS === "ios" ? "600" : "bold",
        fontSize: textSizes.balanceNameSize,
        fontFamily: "BebasNeue-Regular",
        textTransform: "uppercase",
        textShadowColor: textShadowColor,
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: deviceType.includes("tablet") ? 6 : 3,
        zIndex: 10,
        marginBottom: spacing.balanceNameMarginBottom,
        lineHeight: textSizes.balanceNameSize * 1.2,
      },
      overlayBalance: {
        color: textColor,
        fontWeight: Platform.OS === "ios" ? "700" : "bold",
        fontSize: textSizes.balanceSize,
        fontFamily: "BebasNeue-Regular",
        textTransform: "uppercase",
        textShadowColor: textShadowColor,
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: deviceType.includes("tablet") ? 6 : 3,
        zIndex: 10,
        lineHeight: textSizes.balanceSize * 1.1,
      },
      overlayLoading: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: overlayBottom,
        alignItems: "center",
        zIndex: 10,
      },
    });
  };

  const styles = getResponsiveStyles();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Card Container */}
        <View style={styles.cardContainer}>
          <TouchableWithoutFeedback
            onPress={flipCard}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.cardWrapper}>
              {/* Front of the card (shown first) */}
              <Animated.View
                style={[
                  styles.card,
                  styles.frontCard,
                  {
                    transform: [
                      { perspective: 1000 },
                      { rotateY: frontInterpolate },
                    ],
                  },
                ]}
              >
                <Image
                  source={cardImages.front}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                {/* Container for overlay content */}
                {!loading && (
                  <View style={styles.overlayContainer}>
                    {/* Account Number above the name */}
                    {accountNumber && (
                      <Text style={styles.overlayAccountNumber}>
                        {accountNumber}
                      </Text>
                    )}
                    {/* Name above 'founder ceo' */}
                    <Text style={styles.overlayName}>{userName}</Text>
                    {/* Company name below user name if exists */}
                    {companyName && (
                      <Text style={styles.overlayCompany}>{companyName}</Text>
                    )}
                    {/* Balance above 'hello@reallygreatsite.com' */}
                    <Text style={[styles.overlayBalanceName, getRTLStyles(userLanguage)]}>
                      {t(userLanguage, "inspireCards.content.availableBalance")}
                    </Text>
                    <Text style={styles.overlayBalance}>
                      {formatCurrency(availBalance)}
                    </Text>
                  </View>
                )}
                {loading && (
                  <View style={styles.overlayLoading}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                )}
              </Animated.View>

              {/* Back of the card (shown after flip) */}
              <Animated.View
                style={[
                  styles.card,
                  styles.backCard,
                  {
                    transform: [
                      { perspective: 1000 },
                      { rotateY: backInterpolate },
                    ],
                  },
                ]}
              >
                <Image
                  source={cardImages.back}
                  style={[styles.cardImage, styles.backCardImage]}
                  resizeMode="cover"
                />
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    </SafeAreaView>
  );
}
