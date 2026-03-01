import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRef, useState } from "react";
import {
  Animated,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
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
                source={require("../../assets/cards/design_collection/dc2/front.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover">
                <View style={styles.premiumGradientGold}>
                  <Text style={styles.premiumLabel}>{t("ct.premiumBadge")}</Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>₱ {formatCurrency(250)}</Text>
                </View>
              </ImageBackground>
            </View>

            <View style={styles.cardInfo}>
              <Text style={styles.cardItemTitle}>{t("ct.royalCurve")}</Text>

              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  availableBalance >= 250 && styles.activeUpgradeButton
                ]}
                onPress={() => {
                  setSelectedDesignCard({
                    title: t("ct.royalCurve") || "Royal Curve",
                    price: 250,
                    image: require("../../assets/cards/design_collection/dc2/front.png"),
                    backImage: require("../../assets/cards/design_collection/dc2/back.png")
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
                source={require("../../assets/cards/design_collection/dc1/front.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover">
                <View style={styles.premiumGradient}>
                  <Text style={styles.premiumLabel}>{t("ct.premiumBadge")}</Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>₱ {formatCurrency(5000)}</Text>
                </View>
              </ImageBackground>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardItemTitle}>{t("ct.orangeElite")}</Text>
              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  availableBalance >= 5000 && styles.activeUpgradeButton
                ]}
                onPress={() => {
                  setSelectedDesignCard({
                    title: t("ct.orangeElite") || "Orange Elite",
                    price: 5000,
                    image: require("../../assets/cards/design_collection/dc1/front.png"),
                    backImage: require("../../assets/cards/design_collection/dc1/back.png")
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.headerIconContainer}>
                  <MaterialCommunityIcons name="diamond" size={24} color="#FFD700" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{t("ct.vipDiamondEliteTitle")}</Text>
                  <Text style={styles.modalSubtitle}>{t("ct.exclusiveClaimable")}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setIsVipModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#Fe7e43" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.infoSection}>
                <View style={styles.infoHeader}>
                  <Ionicons name="information-circle" size={20} color="#4CAF50" />
                  <Text style={styles.infoTitle}>{t("ct.howToGet")}</Text>
                </View>
                <Text style={styles.infoText}>
                  {t("ct.claimDescription")}
                </Text>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.infoHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.infoTitle}>{t("ct.requirementsTitle")}</Text>
                </View>
                <Text style={styles.listItem}>{t("ct.reqDepositAmount")}</Text>
                <Text style={styles.listItem}>{t("ct.reqClickClaim")}</Text>
                <Text style={styles.listItem}>{t("ct.reqNoPurchase")}</Text>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.infoHeader}>
                  <Ionicons name="star" size={20} color="#FFD700" />
                  <Text style={styles.infoTitle}>{t("ct.yourStatusTitle")}</Text>
                </View>
                <View style={styles.statusBox}>
                  <Ionicons name="close-circle" size={20} color="#F44336" />
                  <Text style={styles.statusText}>{t("ct.needDepositStatus")}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.gotItButton} onPress={() => setIsVipModalVisible(false)} activeOpacity={0.8}>
                <Text style={styles.gotItButtonText}>{t("ct.gotIt")}</Text>
              </TouchableOpacity>
            </View>
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
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.headerIconContainer}>
                  <Ionicons name="trophy" size={24} color="#FFD700" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{t("ct.vipCardPurchase")}</Text>
                  <Text style={styles.modalSubtitle}>{t("ct.previewConfirm")}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setIsPurchaseModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#Fe7e43" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.purchaseModalBody} contentContainerStyle={styles.purchaseModalScrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.cardPreviewLabel}>{t("ct.cardPreviewLabel")}</Text>

              <View style={styles.purchaseCardPreviewContainer}>
                <TouchableOpacity activeOpacity={0.9} onPress={flipVipCard}>
                  <View style={styles.modalFlipContainer}>
                    <Animated.View style={[styles.modalCardFace, { transform: [{ rotateY: vipFrontInterpolate }] }]}>
                      <ImageBackground
                        source={require("../../assets/cards/vip_collection/vp1/front.png")}
                        style={styles.purchaseCardPreview}
                        imageStyle={styles.purchaseCardPreviewImage}
                        resizeMode="contain"
                      >
                        <View style={styles.purchaseCardOverlay}>
                          <Text style={[styles.purchaseCardNumber, { color: '#555' }]}>
                            {userData?.accountNumber ? userData.accountNumber.replace(/(.{4})/g, '$1 ').trim() : t("ct.placeholderAccount")}
                          </Text>
                          <Text style={[styles.purchaseCardName, { color: '#555' }]}>
                            {[userData?.firstName, userData?.lastName]
                              .filter(Boolean)
                              .join(" ")
                              .toUpperCase() || t("ct.placeholderName")}
                          </Text>
                          <Text style={[styles.purchaseCardBalanceLabel, { color: '#555' }]}>
                            {t("ct.availableBalance")}
                          </Text>
                          <Text style={[styles.purchaseCardBalanceAmount, { color: '#555' }]}>
                            ₱ {formatCurrency(availableBalance || 0)}
                          </Text>
                        </View>
                      </ImageBackground>
                    </Animated.View>
                    <Animated.View style={[styles.modalCardFace, styles.modalCardBack, { transform: [{ rotateY: vipBackInterpolate }] }]}>
                      <ImageBackground
                        source={require("../../assets/cards/vip_collection/vp1/back.png")}
                        style={styles.purchaseCardPreview}
                        imageStyle={styles.purchaseCardPreviewImage}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.purchaseTitleRow}>
                <Text style={styles.purchaseCardTitle}>{t("ct.goldElite") || "Golden Elite"}</Text>
                <View style={styles.purchaseVipBadge}>
                  <MaterialCommunityIcons name="diamond-outline" size={14} color="#D4B106" />
                  <Text style={styles.purchaseVipBadgeText}>{t("ct.vip")}</Text>
                </View>
              </View>

              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>{t("ct.priceLabel")}</Text>
                <Text style={styles.priceAmount}>₱ {formatCurrency(10000)}</Text>
              </View>

              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>{t("ct.availableBalanceLabel")}</Text>
                <Text style={[styles.balanceAmount, availableBalance < 10000 && styles.textRed]}>
                  ₱{formatCurrency(availableBalance || 0)}
                </Text>
              </View>

              {availableBalance < 10000 && (
                <View style={styles.amountNeededBox}>
                  <Ionicons name="warning" size={16} color="#F44336" />
                  <Text style={styles.amountNeededText}>
                    {t("ct.needMoreAmount").replace("{amount}", formatCurrency(10000 - availableBalance))}
                  </Text>
                </View>
              )}

              <View style={styles.subscriptionBox}>
                <View style={styles.subscriptionHeaderRow}>
                  <Text style={styles.subscriptionBoxTitle}>{t("ct.subscriptionType")}</Text>
                  <View style={styles.monthlyBadge}>
                    <Ionicons name="calendar" size={12} color="#D4B106" />
                    <Text style={styles.monthlyBadgeText}>{t("ct.monthly")}</Text>
                  </View>
                </View>

                <View style={styles.subscriptionDetailRow}>
                  <Ionicons name="time" size={14} color="#666" />
                  <Text style={styles.subscriptionDetailText}>{t("ct.duration30Days")}</Text>
                </View>
                <View style={styles.subscriptionDetailRow}>
                  <Ionicons name="refresh" size={14} color="#666" />
                  <Text style={styles.subscriptionDetailText}>{t("ct.autoRenewalManual")}</Text>
                </View>
                <View style={styles.subscriptionDetailRow}>
                  <Ionicons name="information-circle" size={14} color="#666" />
                  <Text style={styles.subscriptionDetailText}>{t("ct.accessExpires")}</Text>
                </View>
              </View>

              <View style={styles.purchaseActionContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsPurchaseModalVisible(false)} activeOpacity={0.7}>
                  <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmPurchaseButton,
                    availableBalance < 10000 && styles.disabledPurchaseButton
                  ]}
                  disabled={availableBalance < 10000}
                  activeOpacity={0.7}
                >

                  <Text style={[
                    styles.confirmPurchaseText,
                    availableBalance < 10000 && styles.disabledPurchaseText
                  ]}>
                    {availableBalance < 10000 ? t("ct.insufficientBalance") : t("ct.purchaseCard")}
                  </Text>
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
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.headerIconContainer}>
                  <Ionicons name="card" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{t("ct.cardPurchase")}</Text>
                  <Text style={styles.modalSubtitle}>{t("ct.previewConfirm")}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setIsDesignModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#Fe7e43" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.purchaseModalBody} contentContainerStyle={styles.purchaseModalScrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.cardPreviewLabel}>{t("ct.cardPreviewLabel")}</Text>

              <View style={styles.purchaseCardPreviewContainer}>
                <TouchableOpacity activeOpacity={0.9} onPress={flipDesignCard}>
                  <View style={styles.modalFlipContainer}>
                    <Animated.View style={[styles.modalCardFace, { transform: [{ rotateY: designFrontInterpolate }] }]}>
                      <ImageBackground
                        source={selectedDesignCard.image}
                        style={styles.purchaseCardPreview}
                        imageStyle={styles.purchaseCardPreviewImage}
                        resizeMode="contain"
                      >
                        <View style={styles.purchaseCardOverlay}>
                          <Text style={styles.purchaseCardNumber}>
                            {userData?.accountNumber ? userData.accountNumber.replace(/(.{4})/g, '$1 ').trim() : t("ct.placeholderAccount")}
                          </Text>
                          <Text style={styles.purchaseCardName}>
                            {[userData?.firstName, userData?.lastName]
                              .filter(Boolean)
                              .join(" ")
                              .toUpperCase() || t("ct.placeholderName")}
                          </Text>
                          <Text style={styles.purchaseCardBalanceLabel}>
                            {t("ct.availableBalance")}
                          </Text>
                          <Text style={styles.purchaseCardBalanceAmount}>
                            ₱ {formatCurrency(availableBalance || 0)}
                          </Text>
                        </View>
                      </ImageBackground>
                    </Animated.View>
                    <Animated.View style={[styles.modalCardFace, styles.modalCardBack, { transform: [{ rotateY: designBackInterpolate }] }]}>
                      <ImageBackground
                        source={selectedDesignCard.backImage}
                        style={styles.purchaseCardPreview}
                        imageStyle={styles.purchaseCardPreviewImage}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.purchaseTitleRow}>
                <Text style={styles.designCardTitle}>{selectedDesignCard.title}</Text>
              </View>

              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>{t("ct.priceLabel")}</Text>
                <Text style={styles.designPriceAmount}>₱{formatCurrency(selectedDesignCard.price || 0)}</Text>
              </View>

              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>{t("ct.availableBalanceLabel")}</Text>
                <Text style={[styles.balanceAmount, availableBalance < selectedDesignCard.price && styles.textRed]}>
                  ₱{formatCurrency(availableBalance || 0)}
                </Text>
              </View>

              {availableBalance < selectedDesignCard.price && (
                <View style={styles.amountNeededBox}>
                  <Ionicons name="warning" size={16} color="#F44336" />
                  <Text style={styles.amountNeededText}>
                    {t("ct.needMoreAmount").replace("{amount}", formatCurrency(selectedDesignCard.price - availableBalance))}
                  </Text>
                </View>
              )}

              <View style={styles.purchaseActionContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsDesignModalVisible(false)} activeOpacity={0.7}>
                  <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmPurchaseButton,
                    availableBalance < selectedDesignCard.price && styles.disabledPurchaseButton
                  ]}
                  disabled={availableBalance < selectedDesignCard.price}
                  activeOpacity={0.7}
                >

                  <Text style={[
                    styles.confirmPurchaseText,
                    availableBalance < selectedDesignCard.price && styles.disabledPurchaseText
                  ]}>
                    {availableBalance < selectedDesignCard.price ? t("ct.insufficientBalance") : t("ct.purchaseCard")}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    backgroundColor: '#Fe7e43',
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
});
