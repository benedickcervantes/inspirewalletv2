import React, { useRef } from "react";
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet, ScrollView, Dimensions, Animated } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Your Inspire Card Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Inspire Card</Text>
          <Text style={styles.sectionSubtitle}>Default Card</Text>
        </View>
        <TouchableOpacity style={styles.viewDetailsButton}>
          <Ionicons name="eye-outline" size={16} color="#E15816" />
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>

      {/* Main Card Display with Flip Animation */}
      <View style={styles.mainCardContainer}>
        {/* Front of Card */}
        <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={flipCard}
          >
            <ImageBackground
              source={require("../assets/cards/default/card2.1.png")}
              style={styles.mainCard}
              imageStyle={styles.mainCardImage}
              resizeMode="cover"
            >
              <View style={styles.mainCardContent}>
                <View style={styles.cardDetailsBottom}>
                  <Text style={styles.cardNumber}>
                    {userData?.accountNumber || "00001729819"}
                  </Text>
                  <Text style={styles.cardName}>
                    {userData?.firstName?.toUpperCase() || "ARIES"}
                  </Text>
                  <Text style={styles.cardBalanceLabel}>AVAILABLE BALANCE:</Text>
                  <Text style={styles.cardBalanceAmount}>
                    ₱ {formatCurrency(availableBalance)}
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </Animated.View>

        {/* Back of Card */}
        <Animated.View
          style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}
          pointerEvents={isCardFlipped ? "auto" : "none"}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={flipCard}
          >
            <ImageBackground
              source={require("../assets/cards/default/card2.0 back.png")}
              style={styles.mainCard}
              imageStyle={styles.mainCardImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* VIP Collection */}
      <View style={styles.collectionSection}>
        <View style={styles.collectionHeader}>
          <View style={styles.collectionTitleRow}>
            <MaterialCommunityIcons name="crown" size={20} color="#FFD700" />
            <Text style={styles.collectionTitle}>VIP Collection</Text>
          </View>
          <Text style={styles.collectionSubtitle}>VIP PHYSICAL CARD REQUIRED</Text>
        </View>

        <View style={styles.cardsGrid}>
          {/* Diamond Elite Card */}
          <View style={styles.cardItem}>
            <View style={styles.cardPreview}>
              <ImageBackground
                source={require("../assets/cards/vip/vip2/front.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover"
              >
                <View style={styles.lockedOverlay}>
                  <Ionicons name="lock-closed" size={32} color="#FFFFFF" />
                </View>
              </ImageBackground>
            </View>
            <Text style={styles.cardItemTitle}>Diamond Elite</Text>
            <Text style={styles.cardItemSubtitle}>VIP Upgrade</Text>
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Upgrade Required</Text>
            </TouchableOpacity>
          </View>

          {/* Gold Elite Card */}
          <View style={styles.cardItem}>
            <View style={styles.cardPreview}>
              <ImageBackground
                source={require("../assets/cards/vip/vip4/front.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover"
              >
                <View style={styles.vipBadge}>
                  <Text style={styles.vipBadgeText}>VIP</Text>
                </View>
                <Text style={styles.cardPreviewTitle}>INSPIRE MEMBERS</Text>
              </ImageBackground>
            </View>
            <Text style={styles.cardItemTitle}>Gold Elite</Text>
            <Text style={styles.cardItemSubtitle}>Emerging Millionaire</Text>
            <TouchableOpacity style={styles.getStartedButton}>
              <Text style={styles.getStartedButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Design Collection */}
      <View style={styles.collectionSection}>
        <View style={styles.collectionHeader}>
          <View style={styles.collectionTitleRow}>
            <MaterialCommunityIcons name="palette" size={20} color="#E15816" />
            <Text style={styles.collectionTitle}>Design Collection</Text>
          </View>
          <Text style={styles.collectionSubtitle}>PREMIUM VISUAL STYLES</Text>
        </View>

        <View style={styles.cardsGrid}>
          {/* Royal Curve Card */}
          <View style={styles.cardItem}>
            <View style={styles.cardPreview}>
              <ImageBackground
                source={require("../assets/cards/design/cd2/front.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover"
              >
                <View style={styles.vipBadge}>
                  <Text style={styles.vipBadgeText}>VIP</Text>
                </View>
              </ImageBackground>
            </View>
            <Text style={styles.cardItemTitle}>Royal Curve</Text>
            <Text style={styles.cardItemSubtitle}>Sign Up Only</Text>
          </View>

          {/* Orange Elite Card */}
          <View style={styles.cardItem}>
            <View style={styles.cardPreview}>
              <ImageBackground
                source={require("../assets/cards/default/card2.1.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover"
              >
                <View style={styles.vipBadge}>
                  <Text style={styles.vipBadgeText}>VIP</Text>
                </View>
              </ImageBackground>
            </View>
            <Text style={styles.cardItemTitle}>Orange Elite</Text>
            <Text style={styles.cardItemSubtitle}>Sign Up Only</Text>
          </View>
        </View>
      </View>

      {/* Your Collection */}
      <View style={styles.collectionSection}>
        <View style={styles.collectionHeader}>
          <Text style={styles.yourCollectionTitle}>YOUR COLLECTION</Text>
          <Text style={styles.collectionCount}>1/5</Text>
        </View>

        <View style={styles.yourCollectionGrid}>
          {/* Active Card */}
          <View style={styles.yourCollectionItem}>
            <ImageBackground
              source={require("../assets/cards/default/card2.1.png")}
              style={styles.yourCollectionCard}
              imageStyle={styles.yourCollectionCardImage}
              resizeMode="cover"
            >
              <View style={styles.activeCardBadge}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.activeCardText}>Active Card</Text>
              </View>
            </ImageBackground>
          </View>

          {/* Empty Slots */}
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.yourCollectionItem}>
              <View style={styles.emptySlot}>
                <Ionicons name="add-circle-outline" size={32} color="#CCC" />
                <Text style={styles.emptySlotText}>Empty Slot</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionHeader: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#999",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    color: "#E15816",
    fontWeight: "600",
  },
  mainCardContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    height: 200,
    alignItems: "center",
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
  mainCard: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  mainCardImage: {
    borderRadius: 16,
  },
  mainCardContent: {
    flex: 1,
    padding: 20,
    justifyContent: "flex-end",
  },
  cardDetailsBottom: {
    gap: 0,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cardBalanceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  cardBalanceAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  collectionSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  collectionHeader: {
    marginBottom: 16,
  },
  collectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  collectionSubtitle: {
    fontSize: 11,
    color: "#999",
    letterSpacing: 0.5,
  },
  cardsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  cardItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardPreview: {
    width: "100%",
    aspectRatio: 1.6,
    marginBottom: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  cardPreviewImage: {
    width: "100%",
    height: "100%",
    justifyContent: "space-between",
    padding: 12,
  },
  cardPreviewImageStyle: {
    borderRadius: 8,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  vipBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  vipBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#333",
  },
  cardPreviewTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  cardItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  cardItemSubtitle: {
    fontSize: 11,
    color: "#999",
    marginBottom: 8,
  },
  upgradeButton: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
  },
  getStartedButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  getStartedButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  yourCollectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 1,
  },
  collectionCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  yourCollectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  yourCollectionItem: {
    width: (width - 52) / 2,
    aspectRatio: 1.6,
  },
  yourCollectionCard: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    overflow: "hidden",
    padding: 12,
    justifyContent: "flex-end",
  },
  yourCollectionCardImage: {
    borderRadius: 12,
  },
  activeCardBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 4,
  },
  activeCardText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4CAF50",
  },
  emptySlot: {
    width: "100%",
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  emptySlotText: {
    fontSize: 12,
    color: "#CCC",
    marginTop: 8,
  },
});
