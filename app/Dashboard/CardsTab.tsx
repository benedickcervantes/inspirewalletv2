import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  buyCard,
  cancelAutoRenewal,
  getCardCatalog,
  getMyCardCollection,
  setActiveCard as setActiveCardApi,
} from "../../configs/api";
import { useLanguage } from "../../context/LanguageContext";
import { getCardTheme } from "../theme/cardThemes";

import ActivityModal from '../components/ActivityModal';
interface CardsTabProps {
  userData: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    accountNumber?: string;
  } | null;
  availableBalance: number;
  isBalanceLoading: boolean;
  formatCurrency: (amount: number) => string;
  flipAnimation: Animated.Value;
  isCardFlipped: boolean;
  flipCard: () => void;
  /** Optional initial design from parent (to avoid default flash on tab switch). */
  initialDesign?: string | null;
  /** Notify parent when active card design changes. */
  onActiveDesignChange?: (design: string | null) => void;
  /** Callback to refresh wallet balance and other data after purchase. */
  onRefresh?: () => Promise<void>;
  /** Locks all card purchasing actions when true. */
  isBuyingCardsLocked?: boolean;
  /** Called when user taps a locked card purchase action. */
  onBuyingCardsLockedPress?: () => void;
}

const getActiveCardStorageKey = (accountNumber?: string) =>
  accountNumber ? `active_card_design_${accountNumber}` : "active_card_design";

export default function CardsTab({
  userData,
  availableBalance,
  isBalanceLoading,
  formatCurrency,
  flipAnimation,
  isCardFlipped,
  flipCard,
  initialDesign,
  onActiveDesignChange,
  onRefresh,
  isBuyingCardsLocked = false,
  onBuyingCardsLockedPress,
}: CardsTabProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { width, height } = useWindowDimensions();
  // Responsive breakpoints for all mobile sizes
  const isSmallScreen = width < 360;
  const isMediumScreen = width >= 360 && width < 400;
  const horizontalPadding = isSmallScreen ? 12 : isMediumScreen ? 16 : 20;
  const cardItemWidth = (width - horizontalPadding * 2 - 12) / 2;
  const mainCardWidth = width - horizontalPadding * 2;
  const mainCardHeight = mainCardWidth / 1.586; // Credit card aspect ratio
  const mainCardContainerHeight = mainCardHeight + 20;
  // Responsive font scale
  const fontScale = isSmallScreen ? 0.9 : isMediumScreen ? 0.95 : 1;
  const modalCardPreviewWidth = Math.min(width * 0.75, 300);
  const modalPadding = isSmallScreen ? 12 : isMediumScreen ? 16 : 20;
  const modalContentMaxWidth = width - modalPadding * 2;
  const modalTopOffset = Math.max(insets.top, 12) + 56;
  const modalBottomPadding = Math.max(insets.bottom, modalPadding);
  const modalContentMaxHeight =
    height - modalTopOffset - modalBottomPadding - 20;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVipModalVisible, setIsVipModalVisible] = useState(false);
  const [isPurchaseModalVisible, setIsPurchaseModalVisible] = useState(false);
  const [isDesignModalVisible, setIsDesignModalVisible] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [successModalType, setSuccessModalType] = useState<
    "purchase" | "cancelRenewal"
  >("purchase");
  const [selectedDesignCard, setSelectedDesignCard] = useState<{
    id?: string;
    title: string;
    price: number;
    image: any;
    backImage: any;
  }>({
    id: undefined,
    title: "",
    price: 0,
    image: undefined,
    backImage: undefined,
  });

  const [cardCatalog, setCardCatalog] = useState<any[]>([]);
  const [myCollection, setMyCollection] = useState<any[]>([]);
  const [activeCard, setActiveCard] = useState<{
    design?: string;
    id?: string;
  } | null>(initialDesign ? { design: initialDesign } : null);
  const [isLoading, setIsLoading] = useState(true);

  // Animated value for the indicator line
  const scrollIndicatorAnim = useRef(new Animated.Value(0)).current;

  // Derive Diamond Elite eligibility from catalog data
  const diamondCatalog = cardCatalog.find(
    (c: any) => c.design === "DIAMOND_ELITE",
  );
  const isDiamondEligible = diamondCatalog?.isEligible ?? false;
  const isDiamondOwned = diamondCatalog?.isOwned ?? false;
  const isDiamondActive = diamondCatalog?.isActive ?? false;

  // Derive Gold Elite state from catalog data
  const goldCatalog = cardCatalog.find((c: any) => c.design === "GOLD_ELITE");
  const isGoldOwned = goldCatalog?.isOwned ?? false;
  const isGoldActive = goldCatalog?.isActive ?? false;
  const goldExpiryDate = goldCatalog?.expiryDate
    ? new Date(goldCatalog.expiryDate)
    : null;

  // Check if Gold Elite is within 3 days of expiry
  const isGoldRenewalAvailable = (() => {
    if (!isGoldActive || !goldExpiryDate) return false;
    const now = new Date();
    const daysUntilExpiry =
      (goldExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
  })();

  // Derive Design Collection state from catalog data
  const orangeCatalog = cardCatalog.find(
    (c: any) => c.design === "ORANGE_ELITE",
  );
  const royalCatalog = cardCatalog.find((c: any) => c.design === "ROYAL_CURVE");
  const isOrangeOwned = orangeCatalog?.isOwned ?? false;
  const isRoyalOwned = royalCatalog?.isOwned ?? false;

  const fetchCardsData = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) return;

      const [catalogRes, collectionRes] = await Promise.all([
        getCardCatalog(token),
        getMyCardCollection(token),
      ]);

      if (catalogRes.success && catalogRes.catalog) {
        setCardCatalog(catalogRes.catalog);
      }

      if (collectionRes.success && collectionRes.data) {
        const nextCollection = collectionRes.data.collection || [];
        const nextActive: { design?: string; id?: string } | null =
          collectionRes.data.activeCard || null;
        setMyCollection(nextCollection);
        setActiveCard(nextActive);

        // Notify parent about the resolved active design
        if (onActiveDesignChange) {
          onActiveDesignChange(
            (nextActive?.design as string | undefined) ?? null,
          );
        }

        // Persist active design so we can show correct skin immediately on next app load.
        const designToCache =
          (nextActive?.design as string | undefined) || null;
        const storageKey = getActiveCardStorageKey(userData?.accountNumber);
        if (designToCache) {
          await AsyncStorage.setItem(storageKey, designToCache);
        } else {
          await AsyncStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      console.error("Failed to fetch cards data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // On mount, try to use cached active design so card skin is instant,
    // then refresh from backend.
    const init = async () => {
      try {
        const storageKey = getActiveCardStorageKey(userData?.accountNumber);
        const cachedDesign = await AsyncStorage.getItem(storageKey);
        if (cachedDesign && !activeCard) {
          setActiveCard({ design: cachedDesign });
        }
      } catch (e) {
        console.error("Failed to load cached active card", e);
      }
      await fetchCardsData();
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuyCard = async (designSlug: string, price: number) => {
    if (isBuyingCardsLocked) {
      onBuyingCardsLockedPress?.();
      return;
    }
    if (availableBalance < price) {
      alert(t("ct.insufficientBalance") || "Insufficient Balance");
      return;
    }

    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) return;

      const res = await buyCard(token, designSlug);
      if (res.success) {
        setIsDesignModalVisible(false);
        setIsPurchaseModalVisible(false);
        setIsVipModalVisible(false);
        setSuccessModalType("purchase");
        setIsSuccessModalVisible(true);
        await fetchCardsData();
        // Refresh wallet balance from parent
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        alert(res.error || "Failed to purchase card");
      }
    } catch (e) {
      console.error(e);
      alert(t("ct.purchaseError") || "An error occurred during purchase");
    } finally {
      setIsLoading(false);
    }
  };

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
    outputRange: ["0deg", "180deg"],
  });
  const vipBackInterpolate = vipFlipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const designFrontInterpolate = designFlipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const designBackInterpolate = designFlipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
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

  const getDesignFrontImage = (design?: string) => {
    switch (design) {
      case "DIAMOND_ELITE":
        return require("../../assets/cards/vip_collection/vp2/front.png");
      case "GOLD_ELITE":
        return require("../../assets/cards/vip_collection/vp1/front.png");
      case "ORANGE_ELITE":
        return require("../../assets/cards/design_collection/dc1/front.png");
      case "ROYAL_CURVE":
        return require("../../assets/cards/design_collection/dc2/front.png");
      default:
        return require("../../assets/images/Eecard_2.0.png");
    }
  };

  const getDesignBackImage = (design?: string) => {
    switch (design) {
      case "DIAMOND_ELITE":
        return require("../../assets/cards/vip_collection/vp2/back.png");
      case "GOLD_ELITE":
        return require("../../assets/cards/vip_collection/vp1/back.png");
      case "ORANGE_ELITE":
        return require("../../assets/cards/design_collection/dc1/back.png");
      case "ROYAL_CURVE":
        return require("../../assets/cards/design_collection/dc2/back.png");
      default:
        return require("../../assets/cards/default/card2.0_back.png");
    }
  };

  const getCardFrontImage = () => getDesignFrontImage(activeCard?.design);
  const getCardBackImage = () => getDesignBackImage(activeCard?.design);

  const handleSelectActiveCard = async (
    cardCollectionItemId: string | null,
  ) => {
    if (!cardCollectionItemId) return;

    // Optimistic update: switch active card immediately in UI
    const localItem = myCollection.find(
      (i: any) => i.id === cardCollectionItemId,
    );
    if (localItem) {
      setActiveCard(localItem);
      if (onActiveDesignChange) {
        onActiveDesignChange(localItem.design as string);
      }
    }

    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) return;
      setIsLoading(true);
      const res = await setActiveCardApi(token, cardCollectionItemId);
      if (res.success && res.data) {
        const nextCollection = res.data.collection || [];
        const nextActive: { design?: string; id?: string } | null =
          res.data.activeCard || null;
        setMyCollection(nextCollection);
        setActiveCard(nextActive);

        // Persist active design for instant card skin on next load.
        const storageKey = getActiveCardStorageKey(userData?.accountNumber);
        const designToCache =
          (nextActive?.design as string | undefined) ||
          (localItem?.design as string | undefined) ||
          null;
        if (designToCache) {
          await AsyncStorage.setItem(storageKey, designToCache);
        } else {
          await AsyncStorage.removeItem(storageKey);
        }

        if (onActiveDesignChange) {
          onActiveDesignChange(designToCache);
        }
      }
    } catch (e) {
      console.error("Failed to set active card", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDefaultCard = () => {
    // Locally revert to default skin (no activeCard). This is not yet
    // persisted to backend, but gives immediate UX for this session.
    setActiveCard(null);
    const storageKey = getActiveCardStorageKey(userData?.accountNumber);
    AsyncStorage.removeItem(storageKey).catch(() => {});
    if (onActiveDesignChange) {
      onActiveDesignChange(null);
    }
  };

  const theme = getCardTheme(activeCard?.design as string | null | undefined);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { fontSize: 18 * fontScale }]}>
            {t("ct.yourInspireCard")}
          </Text>
          <Text style={[styles.sectionSubtitle, { fontSize: 12 * fontScale }]}>
            {t("ct.defaultCard")}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.mainCardContainer,
          {
            paddingHorizontal: horizontalPadding,
            height: mainCardContainerHeight,
          },
        ]}
      >
        <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
          <TouchableOpacity activeOpacity={0.8} onPress={flipCard}>
            <ImageBackground
              source={getCardFrontImage()}
              style={[
                styles.mainCard,
                { width: mainCardWidth, height: mainCardHeight },
              ]}
              imageStyle={styles.mainCardImage}
              resizeMode="cover"
            >
              <View
                style={[
                  styles.mainCardContent,
                  { padding: isSmallScreen ? 16 : 24 },
                ]}
              >
                <View style={styles.cardDetailsBottom}>
                  <Text
                    style={[
                      styles.cardNumber,
                      {
                        color: theme.primaryText,
                        fontSize: Math.round(16 * fontScale),
                      },
                    ]}
                  >
                    {userData?.accountNumber || t("ct.placeholderAccount")}
                  </Text>
                  <Text
                    style={[
                      styles.cardName,
                      {
                        color: theme.primaryText,
                        fontSize: Math.round(16 * fontScale),
                      },
                    ]}
                  >
                    {[userData?.firstName, userData?.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .toUpperCase() || t("ct.placeholderName")}
                  </Text>
                  {userData?.companyName ? (
                    <Text
                      style={[
                        styles.cardCompanyName,
                        {
                          color: theme.secondaryText,
                          fontSize: Math.round(11 * fontScale),
                        },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {String(userData.companyName).toUpperCase()}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.cardBalanceLabel,
                      {
                        color: theme.secondaryText,
                        fontSize: Math.round(11 * fontScale),
                      },
                    ]}
                  >
                    {t("ct.availableBalance")}
                  </Text>
                  <Text
                    style={[
                      styles.cardBalanceAmount,
                      {
                        color: theme.primaryText,
                        fontSize: Math.round(18 * fontScale),
                      },
                    ]}
                  >
                    {isBalanceLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.primaryText}
                      />
                    ) : (
                      `₱ ${formatCurrency(availableBalance)}`
                    )}
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}
          pointerEvents={isCardFlipped ? "auto" : "none"}
        >
          <TouchableOpacity activeOpacity={0.8} onPress={flipCard}>
            <ImageBackground
              source={getCardBackImage()}
              style={[
                styles.mainCard,
                { width: mainCardWidth, height: mainCardHeight },
              ]}
              imageStyle={styles.mainCardImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View
        style={[
          styles.collectionSection,
          { paddingHorizontal: horizontalPadding },
        ]}
      >
        <View style={styles.collectionHeader}>
          <View style={styles.collectionTitleRow}>
            <MaterialCommunityIcons
              name="crown"
              size={isSmallScreen ? 18 : 20}
              color="#FFD700"
            />
            <Text style={styles.collectionTitle}>{t("ct.vipCollection")}</Text>
          </View>
          <Text style={styles.collectionSubtitle}>
            {t("ct.vipPhysicalRequired")}
          </Text>
        </View>

        <View style={styles.cardsGrid}>
          {isLoading ? (
            <>
              {[0, 1].map((idx) => (
                <View key={`vip-skeleton-${idx}`} style={styles.cardItem}>
                  <View style={[styles.cardPreview, styles.cardPreviewSkeleton]} />
                  <View style={styles.cardInfo}>
                    <View style={styles.cardItemTitleSkeleton} />
                    <View style={styles.cardItemSubtitleSkeleton} />
                    <View style={styles.cardActionSkeleton} />
                  </View>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={styles.cardItem}>
            <View style={styles.cardPreview}>
              <ImageBackground
                source={require("../../assets/cards/vip_collection/vp2/front.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover"
              >
                <View style={styles.vipBadge}>
                  <Text style={styles.vipBadgeText}>{t("ct.vip")}</Text>
                </View>
                {!isDiamondOwned && (
                  <View style={styles.lockedOverlay}>
                    <Ionicons name="lock-closed" size={30} color="#E0E0E0" />
                  </View>
                )}
              </ImageBackground>
            </View>

            <View style={styles.cardInfo}>
              <Text style={styles.cardItemTitle}>{t("ct.diamondElite")}</Text>
              <Text style={styles.cardItemSubtitle}>{t("ct.deposit10M")}</Text>

              {isDiamondActive ? (
                <View style={[styles.upgradeButton, styles.claimedButton]}>
                  <Text
                    style={[styles.upgradeButtonText, styles.claimedButtonText]}
                  >
                    ✓ {t("Already Claimed")}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.upgradeButton,
                    isDiamondEligible && styles.activeUpgradeButton,
                  ]}
                  onPress={() => {
                    if (isBuyingCardsLocked) {
                      onBuyingCardsLockedPress?.();
                      return;
                    }
                    setIsVipModalVisible(true);
                  }}
                >
                  <Text
                    style={[
                      styles.upgradeButtonText,
                      isDiamondEligible && styles.activeUpgradeButtonText,
                    ]}
                  >
                    {isDiamondEligible
                      ? t("ct.claimCard") || "Claim Card"
                      : t("ct.upgradeRequired")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
              </View>
              <View style={styles.cardItem}>
            <View style={styles.cardPreview}>
              <ImageBackground
                source={require("../../assets/cards/vip_collection/vp1/front.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover"
              >
                <View style={styles.vipBadge}>
                  <Text style={styles.vipBadgeText}>{t("ct.vip")}</Text>
                </View>
                {!isGoldOwned && (
                  <View style={styles.lockedOverlay}>
                    <Ionicons name="lock-closed" size={30} color="#E0E0E0" />
                  </View>
                )}
              </ImageBackground>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardItemTitle}>{t("ct.goldElite")}</Text>
              <Text style={styles.cardItemSubtitle}>
                {t("ct.sub10KMonthly")}
              </Text>

              <TouchableOpacity
                style={[
                  styles.getStartedButton,
                  isGoldOwned && { backgroundColor: "#E0E0E0" },
                ]}
                onPress={() => {
                  if (isBuyingCardsLocked) {
                    onBuyingCardsLockedPress?.();
                    return;
                  }
                  setIsPurchaseModalVisible(true);
                }}
              >
                <Text style={styles.getStartedButtonText}>
                  {isGoldOwned
                    ? (t("ct.renewPlan") || "Renew Plan")
                    : t("ct.getStarted")}
                </Text>
              </TouchableOpacity>
            </View>
              </View>
            </>
          )}
        </View>
      </View>

      <View
        style={[
          styles.collectionSection,
          { paddingHorizontal: horizontalPadding },
        ]}
      >
        <View style={styles.collectionHeader}>
          <View style={styles.collectionTitleRow}>
            <MaterialCommunityIcons
              name="palette"
              size={isSmallScreen ? 18 : 20}
              color="#E15816"
            />
            <Text style={styles.collectionTitle}>
              {t("ct.designCollection")}
            </Text>
          </View>
          <Text style={styles.collectionSubtitle}>
            {t("ct.premiumVisualStyles")}
          </Text>
        </View>

        <View style={styles.cardsGrid}>
          {isLoading ? (
            <>
              {[0, 1].map((idx) => (
                <View key={`design-skeleton-${idx}`} style={styles.cardItem}>
                  <View style={[styles.cardPreview, styles.cardPreviewSkeleton]} />
                  <View style={styles.cardInfo}>
                    <View style={styles.cardItemTitleSkeleton} />
                    <View style={styles.cardItemSubtitleSkeleton} />
                    <View style={styles.cardActionSkeleton} />
                  </View>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={styles.cardItem}>
            <View style={styles.cardPreview}>
              <ImageBackground
                source={require("../../assets/cards/design_collection/dc1/front.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover"
              >
                <View style={styles.premiumGradient}>
                  <Text style={styles.premiumLabel}>
                    {t("ct.premiumBadge")}
                  </Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>₱ {formatCurrency(250)}</Text>
                </View>
                {!isOrangeOwned && (
                  <View style={styles.lockedOverlay}>
                    <Ionicons name="lock-closed" size={30} color="#E0E0E0" />
                  </View>
                )}
              </ImageBackground>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardItemTitle}>{t("ct.orangeElite")}</Text>
              {isOrangeOwned ? (
                <View style={styles.upgradeButton}>
                  <Text style={styles.upgradeButtonText}>
                    {t("ct.inCollection") || "Lifetime card"}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.upgradeButton,
                    availableBalance >= 250 && styles.activeUpgradeButton,
                  ]}
                  onPress={() => {
                    if (isBuyingCardsLocked) {
                      onBuyingCardsLockedPress?.();
                      return;
                    }
                    setSelectedDesignCard({
                      id: "ORANGE_ELITE",
                      title: t("ct.orangeElite") || "Orange Elite",
                      price: 250,
                      image: require("../../assets/cards/design_collection/dc1/front.png"),
                      backImage: require("../../assets/cards/design_collection/dc1/back.png"),
                    });
                    setIsDesignModalVisible(true);
                  }}
                >
                  <Text
                    style={[
                      styles.upgradeButtonText,
                      availableBalance >= 250 && styles.activeUpgradeButtonText,
                    ]}
                  >
                    {t("ct.tapToBuy")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
              </View>
              <View style={styles.cardItem}>
            <View style={styles.cardPreview}>
              <ImageBackground
                source={require("../../assets/cards/design_collection/dc2/front.png")}
                style={styles.cardPreviewImage}
                imageStyle={styles.cardPreviewImageStyle}
                resizeMode="cover"
              >
                <View style={styles.premiumGradientGold}>
                  <Text style={styles.premiumLabel}>
                    {t("ct.premiumBadge")}
                  </Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>₱ {formatCurrency(5000)}</Text>
                </View>
                {!isRoyalOwned && (
                  <View style={styles.lockedOverlay}>
                    <Ionicons name="lock-closed" size={30} color="#E0E0E0" />
                  </View>
                )}
              </ImageBackground>
            </View>

            <View style={styles.cardInfo}>
              <Text style={styles.cardItemTitle}>{t("ct.royalCurve")}</Text>

              {isRoyalOwned ? (
                <View style={styles.upgradeButton}>
                  <Text style={styles.upgradeButtonText}>
                    {t("ct.inCollection") || "In your collection"}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.upgradeButton,
                    availableBalance >= 5000 && styles.activeUpgradeButton,
                  ]}
                  onPress={() => {
                    if (isBuyingCardsLocked) {
                      onBuyingCardsLockedPress?.();
                      return;
                    }
                    setSelectedDesignCard({
                      id: "ROYAL_CURVE",
                      title: t("ct.royalCurve") || "Royal Curve",
                      price: 5000,
                      image: require("../../assets/cards/design_collection/dc2/front.png"),
                      backImage: require("../../assets/cards/design_collection/dc2/back.png"),
                    });
                    setIsDesignModalVisible(true);
                  }}
                >
                  <Text
                    style={[
                      styles.upgradeButtonText,
                      availableBalance >= 5000 &&
                        styles.activeUpgradeButtonText,
                    ]}
                  >
                    {t("ct.tapToBuy")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
              </View>
            </>
          )}
        </View>
      </View>

      <View
        style={[
          styles.collectionSection,
          { paddingHorizontal: horizontalPadding },
        ]}
      >
        <View style={styles.collectionHeader}>
          <Text
            style={[styles.yourCollectionTitle, { fontSize: 14 * fontScale }]}
          >
            {t("ct.yourCollection")}
          </Text>
          <Text style={styles.collectionCount}>
            {myCollection.length + 1}/5
          </Text>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardItemWidth + 12}
          decelerationRate="fast"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollIndicatorAnim } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.x / (cardItemWidth + 12),
            );
            setCurrentIndex(index);
          }}
          contentContainerStyle={{ paddingRight: 12 }}
        >
          {/* Default card slot (always present) */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.yourCollectionItem,
              { width: cardItemWidth, marginRight: 12 },
            ]}
            onPress={handleSelectDefaultCard}
          >
            <ImageBackground
              source={getDesignFrontImage("DEFAULT")}
              style={styles.yourCollectionCard}
              imageStyle={styles.yourCollectionCardImage}
              resizeMode="cover"
            >
              {!activeCard && (
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
              )}
            </ImageBackground>
          </TouchableOpacity>

          {/* Owned collection items */}
          {myCollection.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              style={[
                styles.yourCollectionItem,
                { width: cardItemWidth, marginRight: 12 },
              ]}
              onPress={() => handleSelectActiveCard(item.id)}
            >
              <ImageBackground
                source={getDesignFrontImage(item.design)}
                style={styles.yourCollectionCard}
                imageStyle={styles.yourCollectionCardImage}
                resizeMode="cover"
              >
                {activeCard?.id === item.id && (
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
                )}
              </ImageBackground>
            </TouchableOpacity>
          ))}

          {/* Empty slots to reach total of 5 cards (Default + 4 designs) */}
          {Array.from({
            length: Math.max(
              0,
              (cardCatalog.length || 5) - (1 + myCollection.length), // +1 for Default slot
            ),
          }).map((_, idx) => (
            <View
              key={`empty-${idx}`}
              style={[
                styles.yourCollectionItem,
                { width: cardItemWidth, marginRight: 12 },
              ]}
            >
              <View style={styles.emptySlot}>
                <Ionicons name="add-circle-outline" size={32} color="#CCC" />
                <Text style={styles.emptySlotText}>{t("ct.emptySlot")}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Animated indicator line */}
        <View style={styles.indicatorContainer}>
          <View style={styles.indicatorTrack}>
            <Animated.View
              style={[
                styles.indicatorLine,
                {
                  width: `${100 / (myCollection.length + 1 + Math.max(0, (cardCatalog.length || 5) - (1 + myCollection.length)))}%`,
                  transform: [
                    {
                      translateX: scrollIndicatorAnim.interpolate({
                        inputRange: [
                          0,
                          (cardItemWidth + 12) *
                            (myCollection.length +
                              Math.max(
                                0,
                                (cardCatalog.length || 5) -
                                  (1 + myCollection.length),
                              )),
                        ],
                        outputRange: [0, width - horizontalPadding * 2],
                        extrapolate: "clamp",
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />

      <ActivityModal
        animationType="fade"
        transparent={true}
        visible={isVipModalVisible}
        onRequestClose={() => setIsVipModalVisible(false)}
      >
        <View
          style={[styles.modalOverlay, { padding: isSmallScreen ? 12 : 20 }]}
        >
          <View
            style={[
              styles.diamondModalContent,
              { maxWidth: width - (isSmallScreen ? 24 : 40) },
            ]}
          >
            <View style={styles.diamondModalHeader}>
              <View style={styles.diamondHeaderLeft}>
                <View style={styles.diamondIconContainer}>
                  <Ionicons name="card" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.diamondModalTitle}>
                    {t("ct.cardPurchaseTitle")}
                  </Text>
                  <Text style={styles.diamondModalSubtitle}>
                    {t("ct.reviewYourSelection")}
                  </Text>
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
              <Text style={styles.diamondCardPreviewLabel}>
                {t("ct.cardPreviewLabel")}
              </Text>

              <View style={styles.diamondCardPreviewContainer}>
                <ImageBackground
                  source={require("../../assets/cards/vip_collection/vp2/front.png")}
                  style={[
                    styles.diamondCardPreview,
                    { width: modalCardPreviewWidth, aspectRatio: 1.586 },
                  ]}
                  imageStyle={styles.diamondCardPreviewImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.diamondTitleContainer}>
                <Text style={styles.diamondCardName}>
                  {t("ct.diamondElite")}
                </Text>
                <View style={styles.diamondBadgesRow}>
                  <View style={styles.diamondVipBadge}>
                    <MaterialCommunityIcons
                      name="crown"
                      size={12}
                      color="#D4B106"
                    />
                    <Text style={styles.diamondVipText}>{t("ct.vip")}</Text>
                  </View>
                  <View style={styles.diamondExclusiveBadge}>
                    <Text style={styles.diamondExclusiveText}>
                      {t("ct.exclusiveClaimable")}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.diamondInfoBox}>
                <View style={styles.diamondInfoHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.diamondInfoTitle}>
                    {t("ct.howToGetCard")}
                  </Text>
                </View>
                <Text style={styles.diamondInfoText}>
                  {t("ct.claimDescription")}
                </Text>
              </View>

              <View style={styles.diamondInfoBox}>
                <View style={styles.diamondInfoHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.diamondInfoTitle}>
                    {t("ct.requirementsTitle")}
                  </Text>
                </View>
                <Text style={styles.diamondListItem}>
                  {t("ct.reqDepositAmount")}
                </Text>
                <Text style={styles.diamondListItem}>
                  {t("ct.reqClickClaim")}
                </Text>
                <Text style={styles.diamondListItem}>
                  {t("ct.reqNoPurchase")}
                </Text>
              </View>

              {!isDiamondEligible && !isDiamondOwned && (
                <View style={styles.diamondWarningBox}>
                  <Ionicons name="warning" size={18} color="#F44336" />
                  <Text style={styles.diamondWarningText}>
                    {t("ct.needWarningText")}
                  </Text>
                </View>
              )}

              {isDiamondEligible && !isDiamondActive && (
                <View
                  style={[
                    styles.diamondInfoBox,
                    { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" },
                  ]}
                >
                  <View style={styles.diamondInfoHeader}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#4CAF50"
                    />
                    <Text
                      style={[styles.diamondInfoTitle, { color: "#2E7D32" }]}
                    >
                      {t("ct.eligibleTitle")}
                    </Text>
                  </View>
                  <Text style={styles.diamondInfoText}>
                    {t("ct.eligibleDesc")}
                  </Text>
                </View>
              )}

              {isDiamondEligible && !isDiamondActive ? (
                <TouchableOpacity
                  style={styles.diamondGotItButton}
                  onPress={() => {
                    if (isBuyingCardsLocked) {
                      onBuyingCardsLockedPress?.();
                      return;
                    }
                    handleBuyCard("DIAMOND_ELITE", 0);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.diamondGotItButtonText}>
                    {t("ct.claimCard")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.diamondGotItButton}
                  onPress={() => setIsVipModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.diamondGotItButtonText}>
                    {isDiamondActive ? t("ct.alreadyClaimed") : t("ct.gotIt")}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </ActivityModal>

      <ActivityModal
        animationType="fade"
        transparent={true}
        visible={isPurchaseModalVisible}
        onRequestClose={() => setIsPurchaseModalVisible(false)}
        onDismiss={() => {
          vipFlipAnim.setValue(0);
          setIsVipCardFlipped(false);
        }}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor: "transparent",
              paddingHorizontal: modalPadding,
              paddingTop: modalTopOffset,
              paddingBottom: modalBottomPadding,
              width,
              height,
            },
          ]}
        >
          <View
            style={[
              styles.vipModalContent,
              {
                width: modalContentMaxWidth,
                maxWidth: modalContentMaxWidth,
                maxHeight: modalContentMaxHeight,
              },
            ]}
          >
            <View
              style={[
                styles.vipModalHeader,
                {
                  paddingHorizontal: modalPadding,
                  paddingVertical: isSmallScreen ? 14 : 18,
                },
              ]}
            >
              <View style={styles.vipHeaderLeft}>
                <View style={styles.vipIconContainer}>
                  <Ionicons name="card" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text
                    style={[
                      styles.vipModalTitle,
                      { fontSize: isSmallScreen ? 16 : 18 },
                    ]}
                  >
                    {t("ct.cardPurchaseTitle")}
                  </Text>
                  <Text
                    style={[
                      styles.vipModalSubtitle,
                      { fontSize: isSmallScreen ? 11 : 12 },
                    ]}
                  >
                    {t("ct.reviewYourSelection")}
                  </Text>
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
              contentContainerStyle={[
                styles.vipModalBody,
                { paddingHorizontal: modalPadding },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.vipCardPreviewLabel}>
                {t("ct.cardPreviewLabel")}
              </Text>

              <View style={styles.vipCardPreviewContainer}>
                <TouchableOpacity activeOpacity={0.9} onPress={flipVipCard}>
                  <View
                    style={[
                      styles.vipModalFlipContainer,
                      { width: modalCardPreviewWidth, aspectRatio: 1.586 },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.modalCardFace,
                        { transform: [{ rotateY: vipFrontInterpolate }] },
                      ]}
                    >
                      <ImageBackground
                        source={require("../../assets/cards/vip_collection/vp1/front.png")}
                        style={styles.vipCardPreview}
                        imageStyle={styles.vipCardPreviewImage}
                        resizeMode="contain"
                      />
                    </Animated.View>
                    <Animated.View
                      style={[
                        styles.modalCardFace,
                        styles.modalCardBack,
                        { transform: [{ rotateY: vipBackInterpolate }] },
                      ]}
                    >
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
                <Text
                  style={[
                    styles.vipCardName,
                    { fontSize: isSmallScreen ? 16 : 18 },
                  ]}
                >
                  {t("ct.goldName")}
                </Text>
                <View style={styles.vipPremiumBadge}>
                  <MaterialCommunityIcons
                    name="crown"
                    size={14}
                    color="#D4B106"
                  />
                  <Text style={styles.vipPremiumText}>{t("ct.vip")}</Text>
                </View>
              </View>

              <View style={styles.vipPriceSection}>
                <Text style={styles.vipTotalPriceLabel}>
                  {t("ct.totalPrice")}
                </Text>
                <Text
                  style={[
                    styles.vipTotalPrice,
                    { fontSize: isSmallScreen ? 28 : 36 },
                  ]}
                >
                  ₱ 10,000.00
                </Text>
              </View>

              <View style={styles.vipBalanceRow}>
                <Text style={styles.vipBalanceLabel}>
                  {t("ct.yourBalance")}
                </Text>
                <Text style={styles.vipBalanceAmount}>
                  {isBalanceLoading ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    `₱ ${formatCurrency(availableBalance || 0)}`
                  )}
                </Text>
              </View>

              {isGoldActive && !isGoldRenewalAvailable && (
                <View style={styles.vipWarningBox}>
                  <Ionicons name="warning" size={18} color="#F44336" />
                  <Text style={styles.vipWarningText}>
                    {t(
                      "You already have an active Gold Elite plan. Use the renewal option when your plan is expiring soon.",
                    )}
                  </Text>
                </View>
              )}

              {isGoldRenewalAvailable && (
                <View style={styles.vipWarningBox}>
                  <Ionicons name="alert-circle" size={18} color="#FF9800" />
                  <Text style={styles.vipWarningText}>
                    {t("ct.renewalAvailable") ||
                      "Your plan is expiring soon. Renew now to maintain your benefits."}
                  </Text>
                </View>
              )}

              <View style={styles.vipSubscriptionBox}>
                <View style={styles.vipSubscriptionHeaderRow}>
                  <Text style={styles.vipSubscriptionTitle}>
                    {t("ct.subscriptionType")}
                  </Text>
                  <View style={styles.vipMonthlyBadge}>
                    <Ionicons
                      name="calendar-outline"
                      size={12}
                      color="#D4B106"
                    />
                    <Text style={styles.vipMonthlyText}>{t("ct.monthly")}</Text>
                  </View>
                </View>

                <View style={styles.vipSubscriptionDetailRow}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.vipSubscriptionDetailText}>
                    {t("ct.duration30Days")}
                  </Text>
                </View>
                <View style={styles.vipSubscriptionDetailRow}>
                  <Ionicons name="refresh-outline" size={16} color="#666" />
                  <Text style={styles.vipSubscriptionDetailText}>
                    {t("ct.autoRenewalManual")}
                  </Text>
                </View>
                <View style={styles.vipSubscriptionDetailRow}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color="#666"
                  />
                  <Text style={styles.vipSubscriptionDetailText}>
                    {t("ct.accessExpires")}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View
              style={[
                styles.vipActionButtons,
                { paddingHorizontal: modalPadding },
              ]}
            >
              <TouchableOpacity
                style={styles.vipCancelButton}
                onPress={async () => {
                  if (isGoldActive) {
                    try {
                      setIsLoading(true);
                      const token = await AsyncStorage.getItem("access_token");
                      if (!token) return;
                      const res = await cancelAutoRenewal(token, "GOLD_ELITE");
                      if (res.success) {
                        setIsPurchaseModalVisible(false);
                        setSuccessModalType("cancelRenewal");
                        setIsSuccessModalVisible(true);
                        await fetchCardsData();
                      } else {
                        Alert.alert(
                          "Error",
                          res.error || "Failed to cancel auto-renewal",
                        );
                      }
                    } catch (err) {
                      console.error(err);
                      Alert.alert("Error", "Failed to cancel auto-renewal");
                    } finally {
                      setIsLoading(false);
                    }
                  } else {
                    setIsPurchaseModalVisible(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.vipCancelButtonText}>
                  {isGoldActive
                    ? t("ct.cancelRenewal") || "Cancel Renewal"
                    : t("ct.cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.vipBuyButton,
                  (availableBalance < 10000 ||
                    (isGoldActive && !isGoldRenewalAvailable) ||
                    isBuyingCardsLocked) &&
                    styles.vipBuyButtonDisabled,
                ]}
                disabled={
                  availableBalance < 10000 ||
                  (isGoldActive && !isGoldRenewalAvailable) ||
                  isBuyingCardsLocked
                }
                activeOpacity={0.7}
                onPress={async () => {
                  if (isBuyingCardsLocked) {
                    onBuyingCardsLockedPress?.();
                    return;
                  }
                  if (isGoldActive && !isGoldRenewalAvailable) {
                    Alert.alert(
                      t("Already Have Plan"),
                      t(
                        "You already have an active Gold Elite plan. Please use the renewal option when your plan is expiring soon.",
                      ),
                      [{ text: "OK" }],
                    );
                    return;
                  }
                  try {
                    await handleBuyCard("GOLD_ELITE", 10000);
                  } catch (err) {
                    console.error(err);
                    Alert.alert(
                      "Error",
                      isGoldRenewalAvailable
                        ? "Failed to renew Gold Elite."
                        : "Failed to subscribe to Gold Elite.",
                    );
                  }
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  {isGoldActive && (
                    <MaterialCommunityIcons
                      name="autorenew"
                      size={16}
                      color="#FFFFFF"
                    />
                  )}
                  <Text style={styles.vipBuyButtonText}>
                    {isGoldActive ? t("Renew Now") : t("ct.buyCard")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ActivityModal>

      <ActivityModal
        animationType="fade"
        transparent={true}
        visible={isDesignModalVisible}
        onRequestClose={() => setIsDesignModalVisible(false)}
        onDismiss={() => {
          designFlipAnim.setValue(0);
          setIsDesignCardFlipped(false);
        }}
      >
        <View
          style={[styles.modalOverlay, { padding: isSmallScreen ? 12 : 20 }]}
        >
          <View
            style={[
              styles.designModalContent,
              { maxWidth: width - (isSmallScreen ? 24 : 40) },
            ]}
          >
            <View style={styles.designModalHeader}>
              <View style={styles.designHeaderLeft}>
                <View style={styles.designIconContainer}>
                  <Ionicons name="card" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.designModalTitle}>
                    {t("ct.cardPurchaseTitle")}
                  </Text>
                  <Text style={styles.designModalSubtitle}>
                    {t("ct.reviewYourSelection")}
                  </Text>
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
              <Text style={styles.designCardPreviewLabel}>
                {t("ct.cardPreviewLabel")}
              </Text>

              <View style={styles.designCardPreviewContainer}>
                <TouchableOpacity activeOpacity={0.9} onPress={flipDesignCard}>
                  <View
                    style={[
                      styles.designModalFlipContainer,
                      { width: modalCardPreviewWidth, aspectRatio: 1.586 },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.modalCardFace,
                        { transform: [{ rotateY: designFrontInterpolate }] },
                      ]}
                    >
                      <ImageBackground
                        source={selectedDesignCard.image}
                        style={styles.designCardPreview}
                        imageStyle={styles.designCardPreviewImage}
                        resizeMode="contain"
                      />
                    </Animated.View>
                    <Animated.View
                      style={[
                        styles.modalCardFace,
                        styles.modalCardBack,
                        { transform: [{ rotateY: designBackInterpolate }] },
                      ]}
                    >
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
                <Text style={styles.designCardName}>
                  {selectedDesignCard.title}
                </Text>
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
                <Text style={styles.designTotalPriceLabel}>
                  {t("ct.totalPrice")}
                </Text>
                <Text
                  style={[
                    styles.designTotalPrice,
                    { fontSize: isSmallScreen ? 32 : 40 },
                  ]}
                >
                  ₱ {formatCurrency(selectedDesignCard.price || 0)}
                </Text>
              </View>

              <View style={styles.designBalanceRow}>
                <Text style={styles.designBalanceLabel}>
                  {t("ct.yourBalance")}
                </Text>
                <Text style={styles.designBalanceAmount}>
                  {isBalanceLoading ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    `₱ ${formatCurrency(availableBalance || 0)}`
                  )}
                </Text>
              </View>

              {availableBalance < selectedDesignCard.price && (
                <View style={styles.designWarningBox}>
                  <Ionicons name="warning" size={18} color="#F44336" />
                  <Text style={styles.designWarningText}>
                    {t("ct.needMoreAmount").replace(
                      "{amount}",
                      `₱${formatCurrency(selectedDesignCard.price - availableBalance)}`,
                    )}
                  </Text>
                </View>
              )}

              <View style={styles.designActionButtons}>
                <TouchableOpacity
                  style={styles.designCancelButton}
                  onPress={() => setIsDesignModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.designCancelButtonText}>
                    {t("ct.cancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.designBuyButton,
                    (availableBalance < selectedDesignCard.price ||
                      isBuyingCardsLocked) &&
                      styles.designBuyButtonDisabled,
                  ]}
                  disabled={
                    availableBalance < selectedDesignCard.price ||
                    isBuyingCardsLocked
                  }
                  activeOpacity={0.7}
                  onPress={async () => {
                    if (isBuyingCardsLocked) {
                      onBuyingCardsLockedPress?.();
                      return;
                    }
                    try {
                      await handleBuyCard(
                        selectedDesignCard.id as string,
                        selectedDesignCard.price,
                      );
                    } catch (err) {
                      console.error(err);
                      Alert.alert("Error", "Failed to buy design card.");
                    }
                  }}
                >
                  <Text style={styles.designBuyButtonText}>{t("ct.buy")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ActivityModal>

      {/* Success Modal */}
      <ActivityModal
        animationType="fade"
        transparent={true}
        visible={isSuccessModalVisible}
        onRequestClose={() => setIsSuccessModalVisible(false)}
      >
        <View style={styles.successModalOverlay}>
          <View
            style={[
              styles.successModalContent,
              { width: Math.min(width * 0.9, 400) },
            ]}
          >
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.successModalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>
                {successModalType === "cancelRenewal"
                  ? t("ct.success") || "Success"
                  : t("ct.purchaseSuccessTitle") ||
                    "Card successfully activated"}
              </Text>
              <Text style={styles.successMessage}>
                {successModalType === "cancelRenewal"
                  ? t("ct.autoRenewalCancelled") ||
                    "Auto-renewal has been cancelled. Your subscription will expire on the scheduled date."
                  : t("ct.purchaseSuccess") ||
                    "Your card has been successfully issued and is now available in your collection."}
              </Text>
              <TouchableOpacity
                style={styles.successButton}
                onPress={() => setIsSuccessModalVisible(false)}
              >
                <Text style={styles.successButtonText}>
                  {t("common.ok") || "OK"}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </ActivityModal>
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
    marginBottom: 28,
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
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  mainCardImage: {
    borderRadius: 20,
  },
  mainCardContent: {
    flex: 1,
    padding: 24,
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
  cardCompanyName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D9D9D9",
    marginBottom: 4,
    letterSpacing: 0.3,
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
  cardPreviewSkeleton: {
    backgroundColor: "#E8E8E8",
  },

  cardPreviewImage: {
    flex: 1,
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
  cardItemTitleSkeleton: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#E3E3E3",
    marginBottom: 8,
    width: "70%",
  },
  cardItemSubtitle: {
    fontSize: 11,
    color: "#999",
    marginBottom: 8,
  },
  cardItemSubtitleSkeleton: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E8E8E8",
    marginBottom: 10,
    width: "90%",
  },
  cardActionSkeleton: {
    height: 34,
    borderRadius: 10,
    backgroundColor: "#DCDCDC",
    width: "100%",
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
    maxHeight: "100%",
  },
  purchaseModalScrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  cardPreviewLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 1,
  },
  purchaseCardPreviewContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    alignItems: "center",
  },
  purchaseCardPreview: {
    width: "100%",
    aspectRatio: 1.6,
    borderRadius: 12,
  },
  purchaseCardPreviewImage: {
    borderRadius: 12,
  },
  purchaseTitleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  purchaseCardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#Fe7e43",
  },
  purchaseVipBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FDE047",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: "#fff",
    gap: 4,
  },
  purchaseVipBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D4B106",
  },
  priceContainer: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
    marginBottom: 8,
    letterSpacing: 1,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#B8860B",
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4CAF50",
  },
  textRed: {
    color: "#F44336",
  },
  amountNeededBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  amountNeededText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F44336",
  },
  subscriptionBox: {
    backgroundColor: "#FFFAEB",
    borderWidth: 1,
    borderColor: "#FFF1B8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  subscriptionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  subscriptionBoxTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
  },
  monthlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBE6",
    borderWidth: 1,
    borderColor: "#FFE58F",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  monthlyBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D4B106",
  },
  subscriptionDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  subscriptionDetailText: {
    fontSize: 14,
    color: "#666",
  },
  purchaseActionContainer: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
  },
  confirmPurchaseButton: {
    flex: 1.5,
    flexDirection: "row",
    paddingVertical: 14,
    backgroundColor: "#Fe7e43",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledPurchaseButton: {
    backgroundColor: "#CCCCCC",
  },
  confirmPurchaseText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  disabledPurchaseText: {
    color: "#FFFFFF",
  },
  designCardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#Fe7e43",
  },
  designPriceAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#Fe7e43",
  },
  activeUpgradeButton: {
    backgroundColor: "#DE5212",
  },
  activeUpgradeButtonText: {
    color: "#FFFFFF",
  },
  claimedButton: {
    backgroundColor: "#4CAF50",
  },
  claimedButtonText: {
    color: "#FFFFFF",
  },
  purchaseCardOverlay: {
    flex: 1,
    padding: 16,
    paddingLeft: 22,
    paddingBottom: 22,
    justifyContent: "flex-end",
  },
  purchaseCardNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0,
    marginBottom: 0,
  },
  purchaseCardName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 0,
  },
  purchaseCardBalanceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 0,
  },
  purchaseCardBalanceAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalFlipContainer: {
    width: "100%",
    aspectRatio: 1.6,
  },
  modalCardFace: {
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
  },
  modalCardBack: {
    position: "absolute",
    top: 0,
  },
  // New Design Modal Styles
  designModalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
  },
  designModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  designHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  designIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#DE5212",
    justifyContent: "center",
    alignItems: "center",
  },
  designModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  designModalSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  designCloseButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  designModalBody: {
    padding: 24,
    paddingTop: 20,
  },
  designCardPreviewLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 1.5,
  },
  designCardPreviewContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: "#000",
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
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  designCardPreviewImage: {
    borderRadius: 12,
  },
  designTitleContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  designCardName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  designPremiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#666",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  designDiamondIcon: {
    width: 14,
    height: 14,
    tintColor: "#FFFFFF",
  },
  designPremiumText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  designPriceSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  designTotalPriceLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  designTotalPrice: {
    fontSize: 48,
    fontWeight: "700",
    color: "#DE5212",
  },
  designBalanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  designBalanceLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  designBalanceAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  designWarningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  designWarningText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F44336",
    flex: 1,
  },
  designActionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  designCancelButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#DDDDDD",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  designCancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
  },
  designBuyButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: "#DE5212",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  designBuyButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  designBuyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // VIP Modal Styles
  vipModalContent: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
  },
  vipModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  vipHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  vipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#DE5212",
    justifyContent: "center",
    alignItems: "center",
  },
  vipModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  vipModalSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  vipCloseButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  vipModalScrollView: {
    maxHeight: "100%",
  },
  vipModalBody: {
    padding: 20,
    paddingTop: 16,
  },
  vipCardPreviewLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  vipCardPreviewContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  vipModalFlipContainer: {
    width: 220,
    aspectRatio: 1.586,
  },
  vipCardPreview: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  vipCardPreviewImage: {
    borderRadius: 12,
  },
  vipTitleContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  vipCardName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  vipPremiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    borderWidth: 1,
    borderColor: "#FFE58F",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  vipPremiumText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D4B106",
  },
  vipPriceSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  vipTotalPriceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    marginBottom: 4,
    letterSpacing: 1.2,
  },
  vipTotalPrice: {
    fontSize: 36,
    fontWeight: "700",
    color: "#DE5212",
  },
  vipBalanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  vipBalanceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  vipBalanceAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
  vipSubscriptionBox: {
    backgroundColor: "#FFF9E6",
    borderWidth: 1,
    borderColor: "#FFE58F",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  vipSubscriptionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  vipSubscriptionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },
  vipMonthlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFE58F",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  vipMonthlyText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D4B106",
  },
  vipSubscriptionDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  vipSubscriptionDetailText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  vipActionButtons: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 16,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  vipCancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#DDDDDD",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  vipCancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#666",
  },
  vipBuyButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#DE5212",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  vipBuyButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  vipBuyButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Diamond Elite Modal Styles
  diamondModalContent: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
  },
  diamondModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  diamondHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  diamondIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#DE5212",
    justifyContent: "center",
    alignItems: "center",
  },
  diamondModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  diamondModalSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  diamondCloseButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  diamondModalScrollView: {
    maxHeight: "100%",
  },
  diamondModalBody: {
    padding: 20,
    paddingTop: 16,
  },
  diamondCardPreviewLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  diamondCardPreviewContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
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
    alignItems: "center",
    marginBottom: 20,
  },
  diamondCardName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  diamondBadgesRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  diamondVipBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    borderWidth: 1,
    borderColor: "#FFE58F",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  diamondVipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D4B106",
  },
  diamondExclusiveBadge: {
    backgroundColor: "#8B6914",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  diamondExclusiveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  diamondInfoBox: {
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  diamondInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  diamondInfoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
  diamondInfoText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  diamondListItem: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  diamondWarningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  diamondWarningText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F44336",
    flex: 1,
  },
  vipWarningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  vipWarningText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F44336",
    flex: 1,
  },
  diamondGotItButton: {
    backgroundColor: "#DE5212",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  diamondGotItButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Indicator line styles
  indicatorContainer: {
    marginTop: 16,
    overflow: "hidden",
  },
  indicatorTrack: {
    height: 3,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    position: "relative",
  },
  indicatorLine: {
    height: "100%",
    backgroundColor: "#666666",
    borderRadius: 2,
    position: "absolute",
    left: 0,
  },
  // Success Modal styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContent: {
    width: "85%",
    maxWidth: 400,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successModalGradient: {
    padding: 32,
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 13,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    opacity: 0.95,
  },
  successButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E15816",
  },
});
