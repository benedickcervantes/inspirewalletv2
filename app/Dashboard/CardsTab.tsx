import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { useLanguage } from "../../context/LanguageContext";

interface CardsTabProps {
  userData: {
    firstName?: string;
    lastName?: string;
    accountNumber?: string;
  } | null;
  availableBalance: number;
  formatCurrency: (amount: number) => string;
  flipAnimation: Animated.Value;
  isCardFlipped: boolean;
  flipCard: () => void;
}

export default function CardsTab({
  userData,
  availableBalance,
  formatCurrency,
  flipAnimation,
  isCardFlipped,
  flipCard,
}: CardsTabProps) {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 375 ? 16 : 20;
  const cardItemWidth = (width - horizontalPadding * 2 - 12) / 2;
  const ownedCards = 1;
  const totalCards = 5;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVipModalVisible, setIsVipModalVisible] = useState(false);
  const [isPurchaseModalVisible, setIsPurchaseModalVisible] = useState(false);
  const [isDesignModalVisible, setIsDesignModalVisible] = useState(false);
  const [selectedDesignCard, setSelectedDesignCard] = useState<{
    title: string;
    price: number;
    image: any;
    backImage: any;
  }>({
    title: '',
    price: 0,
    image: undefined,
    backImage: undefined,
  });

  // VIP Purchase modal flip animation
  const vipFlipAnim = useRef(new Animated.Value(0)).current;
  const [isVipCardFlipped, setIsVipCardFlipped] = useState(false);

  const flipVipCard = () => {
    Animated.spring(vipFlipAnim, {
      toValue: isVipCardFlipped ? 0 : 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsVipCardFlipped(!isVipCardFlipped);
  };

  // Design Purchase modal flip animation
  const designFlipAnim = useRef(new Animated.Value(0)).current;
  const [isDesignCardFlipped, setIsDesignCardFlipped] = useState(false);

  const flipDesignCard = () => {
    Animated.spring(designFlipAnim, {
      toValue: isDesignCardFlipped ? 0 : 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsDesignCardFlipped(!isDesignCardFlipped);
  };

  const vipFrontInterpolate = vipFlipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const vipBackInterpolate = vipFlipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const designFrontInterpolate = designFlipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const designBackInterpolate = designFlipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

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
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("ct.yourInspireCard")}</Text>
          <Text style={styles.sectionSubtitle}>{t("ct.defaultCard")}</Text>
        </View>
      </View>

      <View style={styles.mainCardContainer}>
        <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
          <TouchableOpacity activeOpacity={0.8} onPress={flipCard}>
            <ImageBackground
              source={require("../../assets/images/Eecard 2.0.png")}
              style={styles.mainCard}
              imageStyle={styles.mainCardImage}
              resizeMode="cover">
              <View style={styles.mainCardContent}>
                <View style={styles.cardDetailsBottom}>
                  <Text style={styles.cardNumber}>
                    {userData?.accountNumber || t("ct.placeholderAccount")}
                  </Text>
                  <Text style={styles.cardName}>
                    {[userData?.firstName, userData?.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .toUpperCase() || t("ct.placeholderName")}
                  </Text>
                  <Text style={styles.cardBalanceLabel}>
                    {t("ct.availableBalance")}
                  </Text>
                  <Text style={styles.cardBalanceAmount}>
                    ₱ {formatCurrency(availableBalance)}
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}
          pointerEvents={isCardFlipped ? "auto" : "none"}>
          <TouchableOpacity activeOpacity={0.8} onPress={flipCard}>
            <ImageBackground
              source={require("../../assets/cards/default/card2.0 back.png")}
              style={styles.mainCard}
              imageStyle={styles.mainCardImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.collectionSection}>
        <View style={styles.collectionHeader}>
          <View style={styles.collectionTitleRow}>
            <MaterialCommunityIcons name="crown" size={20} color="#FFD700" />
            <Text style={styles.collectionTitle}>
              {t("ct.vipCollection")}
            </Text>
          </View>
          <Text style={styles.collectionSubtitle}>
            {t("ct.vipPhysicalRequired")}
          </Text>
        </View>

        <View style={styles.cardsGrid}>
          <View style={styles.cardItem}>
            <View style={styles.cardPreview}>
              <ImageBackground
                source={require("../../assets/cards/vip_collection/vp2/front.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover">
                <View style={styles.vipBadge}>
                  <Text style={styles.vipBadgeText}>{t("ct.vip")}</Text>
                </View>
                <View style={styles.lockedOverlay}>
                  <Ionicons name="lock-closed" size={30} color="#E0E0E0" />
                </View>
              </ImageBackground>
            </View>

            <View style={styles.cardInfo}>
              <Text style={styles.cardItemTitle}>
                {t("ct.diamondElite")}
              </Text>
              <Text style={styles.cardItemSubtitle}>{t("ct.deposit10M")}</Text>

              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => setIsVipModalVisible(true)}>
                <Text style={styles.upgradeButtonText}>
                  {t("ct.upgradeRequired")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.cardItem}>
            <View style={styles.cardPreview}>
              <ImageBackground
                source={require("../../assets/cards/vip_collection/vp1/front.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover">
                <View style={styles.vipBadge}>
                  <Text style={styles.vipBadgeText}>{t("ct.vip")}</Text>
                </View>
              </ImageBackground>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardItemTitle}>{t("ct.goldElite")}</Text>
              <Text style={styles.cardItemSubtitle}>{t("ct.sub10KMonthly")}</Text>

              <TouchableOpacity
                style={styles.getStartedButton}
                onPress={() => setIsPurchaseModalVisible(true)}>
                <Text style={styles.getStartedButtonText}>
                  {t("ct.getStarted")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.collectionSection}>
        <View style={styles.collectionHeader}>
          <View style={styles.collectionTitleRow}>
            <MaterialCommunityIcons name="palette" size={20} color="#E15816" />
            <Text style={styles.collectionTitle}>
              {t("ct.designCollection")}
            </Text>
          </View>
          <Text style={styles.collectionSubtitle}>
            {t("ct.premiumVisualStyles")}
          </Text>
        </View>

        <View style={styles.cardsGrid}>
          <View style={styles.cardItem}>
            <View style={styles.cardPreview}>
              <ImageBackground
                source={require("../../assets/cards/design_collection/dc1/front.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover">
                <View style={styles.premiumGradient}>
                  <Text style={styles.premiumLabel}>{t("ct.premiumBadge")}</Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>₱ {formatCurrency(250)}</Text>
                </View>
              </ImageBackground>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardItemTitle}>{t("ct.orangeElite")}</Text>
              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  availableBalance >= 250 && styles.activeUpgradeButton
                ]}
                onPress={() => {
                  setSelectedDesignCard({
                    title: t("ct.orangeElite") || "Orange Elite",
                    price: 250,
                    image: require("../../assets/cards/design_collection/dc1/front.png"),
                    backImage: require("../../assets/cards/design_collection/dc1/back.png")
                  });
                  setIsDesignModalVisible(true);
                }}>
                <Text style={[
                  styles.upgradeButtonText,
                  availableBalance >= 250 && styles.activeUpgradeButtonText
                ]}>{t("ct.tapToBuy")}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.cardItem}>
            <View style={styles.cardPreview}>
              <ImageBackground
                source={require("../../assets/cards/design_collection/dc2/front.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover">
                <View style={styles.premiumGradientGold}>
                  <Text style={styles.premiumLabel}>{t("ct.premiumBadge")}</Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>₱ {formatCurrency(5000)}</Text>
                </View>
              </ImageBackground>
            </View>

            <View style={styles.cardInfo}>
              <Text style={styles.cardItemTitle}>{t("ct.royalCurve")}</Text>

              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  availableBalance >= 5000 && styles.activeUpgradeButton
                ]}
                onPress={() => {
                  setSelectedDesignCard({
                    title: t("ct.royalCurve") || "Royal Curve",
                    price: 5000,
                    image: require("../../assets/cards/design_collection/dc2/front.png"),
                    backImage: require("../../assets/cards/design_collection/dc2/back.png")
                  });
                  setIsDesignModalVisible(true);
                }}>
                <Text style={[
                  styles.upgradeButtonText,
                  availableBalance >= 5000 && styles.activeUpgradeButtonText
                ]}>{t("ct.tapToBuy")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.collectionSection}>
        <View style={styles.collectionHeader}>
          <Text style={styles.yourCollectionTitle}>
            {t("ct.yourCollection")}
          </Text>
          <Text style={styles.collectionCount}>
            {ownedCards}/{totalCards}
          </Text>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardItemWidth + 12}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.x / (cardItemWidth + 12),
            );
            setCurrentIndex(index);
          }}
          contentContainerStyle={{ paddingRight: 12 }}>
          <View
            style={[
              styles.yourCollectionItem,
              { width: cardItemWidth, marginRight: 12 },
            ]}>
            <ImageBackground
              source={require("../../assets/images/Eecard 2.0.png")}
              style={styles.yourCollectionCard}
              imageStyle={styles.yourCollectionCardImage}
              resizeMode="cover">
              <View style={styles.activeCardBadge}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={16}
                  color="#4CAF50"
                />
                <Text style={styles.activeCardText}>
                  {t("ct.activeCard")}
                </Text>
              </View>
            </ImageBackground>
          </View>

          {[1, 2, 3, 4].map((item) => (
            <View
              key={item}
              style={[
                styles.yourCollectionItem,
                { width: cardItemWidth, marginRight: 12 },
              ]}>
              <View style={styles.emptySlot}>
                <Ionicons name="add-circle-outline" size={32} color="#CCC" />
                <Text style={styles.emptySlotText}>{t("ct.emptySlot")}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={{ height: 40 }} />

      <Modal
        animationType="fade"
        transparent={true}
        visible={isVipModalVisible}
        onRequestClose={() => setIsVipModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.diamondModalContent}>
            <View style={styles.diamondModalHeader}>
              <View style={styles.diamondHeaderLeft}>
                <View style={styles.diamondIconContainer}>
                  <Ionicons name="card" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.diamondModalTitle}>Card purchase</Text>
                  <Text style={styles.diamondModalSubtitle}>Review your selection</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.diamondCloseButton} 
                onPress={() => setIsVipModalVisible(false)} 
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.diamondModalScrollView}
              contentContainerStyle={styles.diamondModalBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.diamondCardPreviewLabel}>CARD PREVIEW</Text>

              <View style={styles.diamondCardPreviewContainer}>
                <ImageBackground
                  source={require("../../assets/cards/vip_collection/vp2/front.png")}
                  style={styles.diamondCardPreview}
                  imageStyle={styles.diamondCardPreviewImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.diamondTitleContainer}>
                <Text style={styles.diamondCardName}>Diamond Elite</Text>
                <View style={styles.diamondBadgesRow}>
                  <View style={styles.diamondVipBadge}>
                    <MaterialCommunityIcons name="crown" size={12} color="#D4B106" />
                    <Text style={styles.diamondVipText}>VIP</Text>
                  </View>
                  <View style={styles.diamondExclusiveBadge}>
                    <Text style={styles.diamondExclusiveText}>Exclusive Claimable Card</Text>
                  </View>
                </View>
              </View>

              <View style={styles.diamondInfoBox}>
                <View style={styles.diamondInfoHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.diamondInfoTitle}>How to get this card</Text>
                </View>
                <Text style={styles.diamondInfoText}>
                  This exclusive VIP card can be claimed by users with ₱10,000,000 or more in time deposits. Click the "Claim" button to add it to your collection.
                </Text>
              </View>

              <View style={styles.diamondInfoBox}>
                <View style={styles.diamondInfoHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.diamondInfoTitle}>Requirements</Text>
                </View>
                <Text style={styles.diamondListItem}>• Time Deposit Amount:</Text>
                <Text style={styles.diamondListItem}>• Click "Claim" button to add to your collection.</Text>
                <Text style={styles.diamondListItem}>• No purchase required.</Text>
              </View>

              <View style={styles.diamondWarningBox}>
                <Ionicons name="warning" size={18} color="#F44336" />
                <Text style={styles.diamondWarningText}>
                  You need ₱10,000,000+ in time deposits.
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.diamondGotItButton} 
                onPress={() => setIsVipModalVisible(false)} 
                activeOpacity={0.7}
              >
                <Text style={styles.diamondGotItButtonText}>Got it</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isPurchaseModalVisible}
        onRequestClose={() => setIsPurchaseModalVisible(false)}
        onDismiss={() => { vipFlipAnim.setValue(0); setIsVipCardFlipped(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.vipModalContent}>
            <View style={styles.vipModalHeader}>
              <View style={styles.vipHeaderLeft}>
                <View style={styles.vipIconContainer}>
                  <Ionicons name="card" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.vipModalTitle}>Card purchase</Text>
                  <Text style={styles.vipModalSubtitle}>Review your selection</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.vipCloseButton} 
                onPress={() => setIsPurchaseModalVisible(false)} 
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.vipModalScrollView}
              contentContainerStyle={styles.vipModalBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.vipCardPreviewLabel}>CARD PREVIEW</Text>

              <View style={styles.vipCardPreviewContainer}>
                <TouchableOpacity activeOpacity={0.9} onPress={flipVipCard}>
                  <View style={styles.vipModalFlipContainer}>
                    <Animated.View style={[styles.modalCardFace, { transform: [{ rotateY: vipFrontInterpolate }] }]}>
                      <ImageBackground
                        source={require("../../assets/cards/vip_collection/vp1/front.png")}
                        style={styles.vipCardPreview}
                        imageStyle={styles.vipCardPreviewImage}
                        resizeMode="contain"
                      />
                    </Animated.View>
                    <Animated.View style={[styles.modalCardFace, styles.modalCardBack, { transform: [{ rotateY: vipBackInterpolate }] }]}>
                      <ImageBackground
                        source={require("../../assets/cards/vip_collection/vp1/back.png")}
                        style={styles.vipCardPreview}
                        imageStyle={styles.vipCardPreviewImage}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.vipTitleContainer}>
                <Text style={styles.vipCardName}>Gold Elite</Text>
                <View style={styles.vipPremiumBadge}>
                  <MaterialCommunityIcons name="crown" size={14} color="#D4B106" />
                  <Text style={styles.vipPremiumText}>VIP</Text>
                </View>
              </View>

              <View style={styles.vipPriceSection}>
                <Text style={styles.vipTotalPriceLabel}>TOTAL PRICE</Text>
                <Text style={styles.vipTotalPrice}>₱ 10,000.00</Text>
              </View>

              <View style={styles.vipBalanceRow}>
                <Text style={styles.vipBalanceLabel}>Your Balance:</Text>
                <Text style={styles.vipBalanceAmount}>₱ {formatCurrency(availableBalance || 0)}</Text>
              </View>

              <View style={styles.vipSubscriptionBox}>
                <View style={styles.vipSubscriptionHeaderRow}>
                  <Text style={styles.vipSubscriptionTitle}>Subscription Type</Text>
                  <View style={styles.vipMonthlyBadge}>
                    <Ionicons name="calendar-outline" size={12} color="#D4B106" />
                    <Text style={styles.vipMonthlyText}>Monthly</Text>
                  </View>
                </View>

                <View style={styles.vipSubscriptionDetailRow}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.vipSubscriptionDetailText}>Duration: 30 days</Text>
                </View>
                <View style={styles.vipSubscriptionDetailRow}>
                  <Ionicons name="refresh-outline" size={16} color="#666" />
                  <Text style={styles.vipSubscriptionDetailText}>Auto-renewal: Manual (renew each month)</Text>
                </View>
                <View style={styles.vipSubscriptionDetailRow}>
                  <Ionicons name="information-circle-outline" size={16} color="#666" />
                  <Text style={styles.vipSubscriptionDetailText}>Access expires after 30 days</Text>
                </View>
              </View>

              <View style={styles.vipActionButtons}>
                <TouchableOpacity 
                  style={styles.vipCancelButton} 
                  onPress={() => setIsPurchaseModalVisible(false)} 
                  activeOpacity={0.7}
                >
                  <Text style={styles.vipCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.vipBuyButton,
                    availableBalance < 10000 && styles.vipBuyButtonDisabled
                  ]}
                  disabled={availableBalance < 10000}
                  activeOpacity={0.7}
                >
                  <Text style={styles.vipBuyButtonText}>Buy Card</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isDesignModalVisible}
        onRequestClose={() => setIsDesignModalVisible(false)}
        onDismiss={() => { designFlipAnim.setValue(0); setIsDesignCardFlipped(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.designModalContent}>
            <View style={styles.designModalHeader}>
              <View style={styles.designHeaderLeft}>
                <View style={styles.designIconContainer}>
                  <Ionicons name="card" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.designModalTitle}>Card purchase</Text>
                  <Text style={styles.designModalSubtitle}>Review your selection</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.designCloseButton} 
                onPress={() => setIsDesignModalVisible(false)} 
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.designModalBody}>
              <Text style={styles.designCardPreviewLabel}>CARD PREVIEW</Text>

              <View style={styles.designCardPreviewContainer}>
                <TouchableOpacity activeOpacity={0.9} onPress={flipDesignCard}>
                  <View style={styles.designModalFlipContainer}>
                    <Animated.View style={[styles.modalCardFace, { transform: [{ rotateY: designFrontInterpolate }] }]}>
                      <ImageBackground
                        source={selectedDesignCard.image}
                        style={styles.designCardPreview}
                        imageStyle={styles.designCardPreviewImage}
                        resizeMode="contain"
                      />
                    </Animated.View>
                    <Animated.View style={[styles.modalCardFace, styles.modalCardBack, { transform: [{ rotateY: designBackInterpolate }] }]}>
                      <ImageBackground
                        source={selectedDesignCard.backImage}
                        style={styles.designCardPreview}
                        imageStyle={styles.designCardPreviewImage}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.designTitleContainer}>
                <Text style={styles.designCardName}>{selectedDesignCard.title}</Text>
                <View style={styles.designPremiumBadge}>
                  <Image 
                    source={require("../../assets/images/diadesu.png.png")} 
                    style={styles.designDiamondIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.designPremiumText}>Premium</Text>
                </View>
              </View>

              <View style={styles.designPriceSection}>
                <Text style={styles.designTotalPriceLabel}>TOTAL PRICE</Text>
                <Text style={styles.designTotalPrice}>₱ {formatCurrency(selectedDesignCard.price || 0)}</Text>
              </View>

              <View style={styles.designBalanceRow}>
                <Text style={styles.designBalanceLabel}>Your Balance:</Text>
                <Text style={styles.designBalanceAmount}>₱ {formatCurrency(availableBalance || 0)}</Text>
              </View>

              {availableBalance < selectedDesignCard.price && (
                <View style={styles.designWarningBox}>
                  <Ionicons name="warning" size={18} color="#F44336" />
                  <Text style={styles.designWarningText}>
                    Need ₱{formatCurrency(selectedDesignCard.price - availableBalance)} more
                  </Text>
                </View>
              )}

              <View style={styles.designActionButtons}>
                <TouchableOpacity 
                  style={styles.designCancelButton} 
                  onPress={() => setIsDesignModalVisible(false)} 
                  activeOpacity={0.7}
                >
                  <Text style={styles.designCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.designBuyButton,
                    availableBalance < selectedDesignCard.price && styles.designBuyButtonDisabled
                  ]}
                  disabled={availableBalance < selectedDesignCard.price}
                  activeOpacity={0.7}
                >
                  <Text style={styles.designBuyButtonText}>Buy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  cardPreview: {
    width: "100%",
    aspectRatio: 1.4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },

  cardPreviewImage: {
    flex: 1,
    padding: 12,
    justifyContent: "flex-start",
  },
  cardPreviewImageStyle: {
    borderRadius: 8,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.21)",
    justifyContent: "center",
    alignItems: "center",
  },
  vipBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F6C344",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vipBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.5,
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
    backgroundColor: "#EDEDED",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#777",
  },
  getStartedButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 10,
    borderRadius: 10,
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
    gap: 12,
  },
  yourCollectionItem: {
    aspectRatio: 1.6,
  },
  yourCollectionCard: {
    flex: 1,
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
    flex: 1,
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
  cardInfo: {
    padding: 14,
    backgroundColor: "#FAFAFA",
  },
  overlayGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  premiumGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  premiumGradientGold: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,165,0,0.15)",
  },
  premiumLabel: {
    position: "absolute",
    top: 12,
    left: 12,
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(0,0,0,0.4)",
    letterSpacing: 1,
  },
  premiumLogo: {
    position: "absolute",
    top: 10,
    right: 12,
  },
  cardBase: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    overflow: "hidden",
  },
  priceBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    backgroundColor: "#Fe7e43",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.9,
    marginTop: 2,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#Fe7e43",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  listItem: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
    paddingLeft: 8,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F0",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE0E0",
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: "#F44336",
    fontWeight: "600",
  },
  gotItButton: {
    backgroundColor: "#Fe7e43",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  gotItButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  purchaseModalBody: {
    maxHeight: '100%',
  },
  purchaseModalScrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  cardPreviewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  purchaseCardPreviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'center',
  },
  purchaseCardPreview: {
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: 12,
  },
  purchaseCardPreviewImage: {
    borderRadius: 12,
  },
  purchaseTitleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  purchaseCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#Fe7e43',
  },
  purchaseVipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE047',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#fff',
    gap: 4,
  },
  purchaseVipBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D4B106',
  },
  priceContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
    letterSpacing: 1,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#B8860B',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  textRed: {
    color: '#F44336',
  },
  amountNeededBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  amountNeededText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F44336',
  },
  subscriptionBox: {
    backgroundColor: '#FFFAEB',
    borderWidth: 1,
    borderColor: '#FFF1B8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  subscriptionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscriptionBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  monthlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBE6',
    borderWidth: 1,
    borderColor: '#FFE58F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  monthlyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D4B106',
  },
  subscriptionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  subscriptionDetailText: {
    fontSize: 14,
    color: '#666',
  },
  purchaseActionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  confirmPurchaseButton: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 14,
    backgroundColor: '#Fe7e43',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledPurchaseButton: {
    backgroundColor: '#CCCCCC',
  },
  confirmPurchaseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledPurchaseText: {
    color: '#FFFFFF',
  },
  designCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#Fe7e43',
  },
  designPriceAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#Fe7e43',
  },
  activeUpgradeButton: {
    backgroundColor: '#DE5212',
  },
  activeUpgradeButtonText: {
    color: '#FFFFFF',
  },
  purchaseCardOverlay: {
    flex: 1,
    padding: 16,
    paddingLeft: 22,
    paddingBottom: 22,
    justifyContent: 'flex-end',
  },
  purchaseCardNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0,
    marginBottom: 0,
  },
  purchaseCardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 0,
  },
  purchaseCardBalanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 0,
  },
  purchaseCardBalanceAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalFlipContainer: {
    width: '100%',
    aspectRatio: 1.6,
  },
  modalCardFace: {
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
  modalCardBack: {
    position: 'absolute',
    top: 0,
  },
  // New Design Modal Styles
  designModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  designModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  designHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  designIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DE5212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  designModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  designModalSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  designCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  designModalBody: {
    padding: 24,
    paddingTop: 20,
  },
  designCardPreviewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1.5,
  },
  designCardPreviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  designModalFlipContainer: {
    width: 300,
    aspectRatio: 1.586,
  },
  designCardPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  designCardPreviewImage: {
    borderRadius: 12,
  },
  designTitleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  designCardName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  designPremiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#666',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  designDiamondIcon: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
  },
  designPremiumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  designPriceSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  designTotalPriceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  designTotalPrice: {
    fontSize: 48,
    fontWeight: '700',
    color: '#DE5212',
  },
  designBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  designBalanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  designBalanceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  designWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  designWarningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
    flex: 1,
  },
  designActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  designCancelButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DDDDDD',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  designCancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  designBuyButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#DE5212',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  designBuyButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  designBuyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // VIP Modal Styles
  vipModalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  vipModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  vipHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DE5212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vipModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  vipModalSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  vipCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vipModalScrollView: {
    maxHeight: '100%',
  },
  vipModalBody: {
    padding: 20,
    paddingTop: 16,
  },
  vipCardPreviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  vipCardPreviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  vipModalFlipContainer: {
    width: 220,
    aspectRatio: 1.586,
  },
  vipCardPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  vipCardPreviewImage: {
    borderRadius: 12,
  },
  vipTitleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  vipCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  vipPremiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FFE58F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  vipPremiumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D4B106',
  },
  vipPriceSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  vipTotalPriceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    marginBottom: 4,
    letterSpacing: 1.2,
  },
  vipTotalPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#DE5212',
  },
  vipBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  vipBalanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  vipBalanceAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  vipSubscriptionBox: {
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FFE58F',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  vipSubscriptionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vipSubscriptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  vipMonthlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFE58F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  vipMonthlyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D4B106',
  },
  vipSubscriptionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  vipSubscriptionDetailText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  vipActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 0,
  },
  vipCancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DDDDDD',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipCancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
  },
  vipBuyButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#DE5212',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipBuyButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  vipBuyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Diamond Elite Modal Styles
  diamondModalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  diamondModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  diamondHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  diamondIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DE5212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diamondModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  diamondModalSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  diamondCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diamondModalScrollView: {
    maxHeight: '100%',
  },
  diamondModalBody: {
    padding: 20,
    paddingTop: 16,
  },
  diamondCardPreviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  diamondCardPreviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  diamondCardPreview: {
    width: 280,
    aspectRatio: 1.586,
    borderRadius: 12,
  },
  diamondCardPreviewImage: {
    borderRadius: 12,
  },
  diamondTitleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  diamondCardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  diamondBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  diamondVipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FFE58F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  diamondVipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D4B106',
  },
  diamondExclusiveBadge: {
    backgroundColor: '#8B6914',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  diamondExclusiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  diamondInfoBox: {
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  diamondInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  diamondInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  diamondInfoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  diamondListItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  diamondWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  diamondWarningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F44336',
    flex: 1,
  },
  diamondGotItButton: {
    backgroundColor: '#DE5212',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondGotItButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
