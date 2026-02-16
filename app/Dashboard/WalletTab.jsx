import React from "react";
import { View, Text, TouchableOpacity, ImageBackground, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function WalletTab({
  userData,
  availableBalance,
  formatCurrency,
  flipAnimation,
  isCardFlipped,
  flipCard,
}) {
  const navigation = useNavigation();

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
          source={require("../../assets/cards/default/card2.1.png")}
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
                <Ionicons name="eye-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.balanceAmountContainer}>
                <Text style={styles.currency}>PHP</Text>
                <Text style={styles.balanceAmount}>{formatCurrency(availableBalance)}</Text>
              </View>
              <View style={styles.cardSeparator} />
            </TouchableOpacity>

            {/* Deposit & Withdraw buttons */}
            <View style={styles.cardActionsRow} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.cardButtonDeposit}
                onPress={() => navigation.navigate("Deposit")}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-down-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.cardButtonDepositText}>Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardButtonWithdraw}
                onPress={() => navigation.navigate("Withdraw")}
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
            source={require("../../assets/cards/default/card2.0 back.png")}
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
    height: 220,
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
    height: 220,
  },
  balanceCardImage: {
    borderRadius: 24,
  },
  balanceCardInner: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 50,
  },
  cardFlipArea: {
    flex: 1,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 1,
  },
  balanceLabel: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "400",
    letterSpacing: 0.3,
  },
  balanceAmountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: -9,
  },
  currency: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "400",
    marginRight: 6,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  cardSeparator: {
    height: 1.5,
    backgroundColor: "#FFFFFF",
    marginVertical: 14,
    opacity: 0.9,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  cardButtonDeposit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingVertical: 14,
    borderRadius: 28,
  },
  cardButtonDepositText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cardButtonWithdraw: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 28,
  },
  cardButtonWithdrawText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FC821D",
  },
});
