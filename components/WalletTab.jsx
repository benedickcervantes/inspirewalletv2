import React from "react";
import { View, Text, TouchableOpacity, ImageBackground, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function WalletTab({ 
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
          source={require("../assets/cards/default/card2.0.png")}
          style={styles.balanceCard}
          imageStyle={styles.balanceCardImage}
          resizeMode="cover"
        >
          <View style={styles.balanceCardInner}>
            <TouchableOpacity
              onPress={flipCard}
              activeOpacity={1}
              disabled={true}
              style={styles.cardFlipArea}
            >
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.balanceAmountContainer}>
                <Text style={styles.currency}>PHP </Text>
                <Text style={styles.balanceAmount}>{formatCurrency(availableBalance)}</Text>
              </View>
              <View style={styles.cardSeparator} />
            </TouchableOpacity>
            
            {/* Deposit & Withdraw buttons */}
            <View style={styles.cardActionsRow} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.cardButtonDeposit}
                onPress={() => router.push("/deposit")}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-down-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.cardButtonDepositText}>Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardButtonWithdraw}
                onPress={() => router.push("/withdraw")}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-up-circle-outline" size={20} color="#FC821D" />
                <Text style={styles.cardButtonWithdrawText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </Animated.View>

      {/* Back of Card */}
      <Animated.View
        style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}
        pointerEvents="none"
      >
        <TouchableOpacity 
          onPress={flipCard}
          activeOpacity={1}
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
  cardFlipArea: {
    flex: 1,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "400",
    fontFamily: "Questrial_400Regular",
  },
  balanceAmountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  currency: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
    marginRight: 4,
    fontFamily: "Questrial_400Regular",
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: "Questrial_400Regular",
  },
  cardSeparator: {
    height: 1,
    backgroundColor: "#FFFFFF",
    marginVertical: 12,
    opacity: 0.9,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  cardButtonDeposit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingVertical: 12,
    borderRadius: 24,
  },
  cardButtonDepositText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cardButtonWithdraw: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 24,
  },
  cardButtonWithdrawText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FC821D",
  },
});
