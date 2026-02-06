import React from "react";
import { View, Text, TouchableOpacity, ImageBackground, Animated, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function CardsTab({ 
  userData, 
  availableBalance, 
  formatCurrency, 
  flipAnimation,
  isCardFlipped,
  flipCard 
}) {
  const router = useRouter();

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  return (
    <View style={styles.balanceCardContainer}>
      {/* Front of Card */}
      <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
        <ImageBackground
          source={require("../assets/cards/default/card2.1.png")}
          style={styles.balanceCard}
          imageStyle={styles.balanceCardImage}
          resizeMode="cover"
        >
          <View style={styles.balanceCardInner}>
            <TouchableOpacity
              onPress={flipCard}
              activeOpacity={0.8}
              style={styles.cardFlipAreaCards}
            >
              <View style={styles.cardInfoBottomLeft}>
                <Text style={styles.cardAccountNumber}>
                  {userData?.accountNumber || "N/A"}
                </Text>
                <Text style={styles.cardUsername}>
                  {userData?.firstName?.toUpperCase() || userData?.fullName?.toUpperCase() || "USER"}
                </Text>
                <View style={styles.cardBalanceSection}>
                  <Text style={styles.cardBalanceLabel}>AVAILABLE BALANCE:</Text>
                  <Text style={styles.cardBalanceAmount}>
                    ₱ {formatCurrency(availableBalance)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </Animated.View>

      {/* Back of Card */}
      <Animated.View
        style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}
        pointerEvents={isCardFlipped ? "auto" : "none"}
      >
        <TouchableOpacity 
          onPress={flipCard}
          activeOpacity={0.8}
          style={styles.cardBackTouchable}
        >
          <ImageBackground
            source={require("../assets/cards/default/card2.0 back.png")}
            style={styles.balanceCard}
            imageStyle={styles.balanceCardImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceCardContainer: {
    margin: 20,
    marginBottom: 10,
    height: 200,
  },
  cardFace: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
  },
  cardBack: {
    position: "absolute",
    top: 0,
  },
  cardBackTouchable: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  balanceCard: {
    padding: 20,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    position: "relative",
    height: 200,
  },
  balanceCardImage: {
    borderRadius: 24,
  },
  balanceCardInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardFlipAreaCards: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  cardInfoBottomLeft: {
    paddingBottom: 0,
  },
  cardAccountNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
    marginBottom: 2,
    fontFamily: "Questrial_400Regular",
  },
  cardUsername: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
    fontFamily: "Questrial_400Regular",
  },
  cardBalanceSection: {
    marginTop: 0,
  },
  cardBalanceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
    letterSpacing: 0.5,
    fontFamily: "Questrial_400Regular",
  },
  cardBalanceAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Questrial_400Regular",
  },
});
