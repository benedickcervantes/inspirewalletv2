import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  ToastAndroid,
  ImageBackground,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { auth, firestore } from "../../configs/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  increment,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc,
  arrayUnion,
} from "firebase/firestore";
import InspCard from "../../components/InspireCards";
import AmountContent from "../../components/AmountContent";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { checkAccountTypeAccess } from "../../utils/accountTypeUtils";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Responsive constants
const isSmallDevice = screenWidth < 375;
const isMediumDevice = screenWidth >= 375 && screenWidth < 768;
const isLargeDevice = screenWidth >= 768;
const isTablet = screenWidth >= 768;

// Responsive utilities
const getResponsiveValue = (small, medium, large) => {
  if (isSmallDevice) return small;
  if (isMediumDevice) return medium;
  return large;
};

const getResponsivePadding = () => getResponsiveValue(15, 20, 25);
const getResponsiveFontSize = (baseSize) =>
  getResponsiveValue(baseSize - 2, baseSize, baseSize + 2);
const getResponsiveCardWidth = () =>
  getResponsiveValue(
    (screenWidth - 60) / 2,
    (screenWidth - 75) / 2,
    (screenWidth - 90) / 2
  );

// Card categories and pricing
const CARD_CATEGORIES = {
  DESIGN: "design",
  VIP: "vip",
  VVIP: "vvip", // New VVIP category
  DEFAULT: "default",
};

const CARD_PRICES = {
  [CARD_CATEGORIES.DEFAULT]: 0, // Free
  [CARD_CATEGORIES.DESIGN]: 250, // Regular design cards
  [CARD_CATEGORIES.VIP]: 1000, // VIP cards (premium pricing)
  [CARD_CATEGORIES.VVIP]: 1000, // VVIP cards (same pricing as VIP for now)
};

// Function to get card types based on current language
const getCardTypes = (userLanguage) => [
  // Default Card
  {
    id: "default",
    name: t(userLanguage, 'buyCards.cardTypes.default'),
    category: CARD_CATEGORIES.DEFAULT,
    price: CARD_PRICES[CARD_CATEGORIES.DEFAULT],
    path: require("../../assets/cards/default/front.png"),
    isVip: false,
  },

  // VVIP Cards (Ultra Premium) - New section
  {
    id: "vip7",
    name: t(userLanguage, 'buyCards.cardTypes.diamondElite'),
    category: CARD_CATEGORIES.VVIP,
    price: 0, // Not for sale
    path: require("../../assets/cards/vip/vip7/front.png"),
    isVip: true,
    isVvip: true, // New flag for VVIP cards
    requiresVipStatus: true, // Special flag for vip7
    autoGrant: false, // Changed to false - now requires manual claim
    requiredDeposit: 10000000, // 10,000,000 pesos deposit required
  },

  // VIP Cards (Premium) - Organized in /vip folder
  {
    id: "vip2",
    name: t(userLanguage, 'buyCards.cardTypes.royalCurve'),
    category: CARD_CATEGORIES.DESIGN,
    price: 5000,
    path: require("../../assets/cards/vip/vip2/front.png"),
    isVip: false,
  },
  {
    id: "vip4",
    name: t(userLanguage, 'buyCards.cardTypes.goldenElite'),
    category: CARD_CATEGORIES.VIP,
    price: 10000, // Monthly subscription price of ₱10,000
    path: require("../../assets/cards/vip/vip4/front.png"),
    isVip: true,
    isVvip: true, // Add this flag to show in VIP Collection
    isSubscription: true, // New flag for subscription cards
    subscriptionDuration: 30, // Duration in days (1 month)
    subscriptionType: "monthly", // Type of subscription
    autoRenewal: true, // Enable auto-renewal
  },
  // Design Cards (Regular) - Organized in /design folder
  {
    id: "cd2",
    name: t(userLanguage, 'buyCards.cardTypes.silverElite'),
    category: CARD_CATEGORIES.DESIGN,
    price: CARD_PRICES[CARD_CATEGORIES.DESIGN],
    path: require("../../assets/cards/design/cd2/front.png"),
    isVip: false,
  },
];

export default function BuyCards() {
  const navigation = useNavigation();
  const router = useRouter();
  const [selectedCard, setSelectedCard] = useState("default");
  const [availableBalance, setAvailableBalance] = useState(0);
  const [dollarBalance, setDollarBalance] = useState(0);
  const [cryptoBalance, setCryptoBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedCardForPurchase, setSelectedCardForPurchase] = useState(null);
  const [userData, setUserData] = useState({});
  const [purchasedCards, setPurchasedCards] = useState([]);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showVip7InfoModal, setShowVip7InfoModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedSubscriptionCard, setSelectedSubscriptionCard] = useState(null);
  const [userLanguage, setUserLanguage] = useState('English');
  const scrollViewRef = useRef(null);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, 'buyCards.navigation.headerTitle'),
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [navigation, userLanguage]);

  useEffect(() => {
    checkAccessAndInitialize();
  }, []);

  const checkAccessAndInitialize = async () => {
    try {
      const { hasAccess, userAccountType } = await checkAccountTypeAccess(t(userLanguage, 'common.accountTypes.premium'));
      
      if (!hasAccess) {
        setLoading(false);
        showModal({
          title: t(userLanguage, 'buyCards.titles.accessRestricted'),
          message: t(userLanguage, 'buyCards.messages.accessRestricted').replace('{accountType}', userAccountType || t(userLanguage, 'common.accountTypes.basic')),
          type: "warning",
          onConfirm: () => {
            router.push("/main");
          },
        });
        return;
      }
      
      await fetchUserData();
    } catch (error) {
      console.error("Error checking account access:", error);
      setLoading(false);
      showModal({
        title: t(userLanguage, 'buyCards.titles.error'),
        message: t(userLanguage, 'buyCards.messages.unableToVerify'),
        type: "error",
        onConfirm: () => {
          router.push("/main");
        },
      });
    }
  };

  // Check for expired subscriptions and handle auto-renewal or deletion
  useEffect(() => {
    const checkExpiredSubscriptions = async () => {
      if (purchasedCards.length === 0) return;

      const now = new Date();
      const expiredSubscriptions = purchasedCards.filter(card => {
        if (!card.isSubscription) return false;
        
        const endDate = card.subscriptionEndDate?.toDate ? card.subscriptionEndDate.toDate() : new Date(card.subscriptionEndDate);
        return now >= endDate;
      });

      for (const expiredCard of expiredSubscriptions) {
        console.log("🔄 Found expired subscription:", expiredCard.purchaseCardsId);
        
        if (expiredCard.autoRenewal) {
          // Handle auto-renewal for active subscriptions
          await handleAutoRenewal(expiredCard);
        } else {
          // Delete expired subscription that doesn't have auto-renewal
          await handleExpiredSubscriptionDeletion(expiredCard);
        }
      }
    };

    checkExpiredSubscriptions();
  }, [purchasedCards, availableBalance]);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        showModal({
          title: t(userLanguage, 'buyCards.titles.error'),
          message: t(userLanguage, 'buyCards.messages.userNotAuthenticated'),
          type: "error",
        });
        return;
      }

      // Fetch user data
      const userDocRef = doc(firestore, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUserData(data);
        setAvailableBalance(data.availBalanceAmount || 0);
        setDollarBalance(data.dollarAvailBalanceAmount || 0);
        setCryptoBalance(data.cryptoAvailBalanceAmount || 0);
        
        // Set user language preference
        setUserLanguage(data.preferredLanguage || 'English');
      } else {
        showModal({
          title: t(userLanguage, 'buyCards.titles.error'),
          message: t(userLanguage, 'buyCards.messages.userDataNotFound'),
          type: "error",
        });
      }

      // Fetch purchased cards from subcollection
      console.log("🔍 Fetching purchased cards from subcollection...");
      const purchasedCardsRef = collection(
        firestore,
        "users",
        user.uid,
        "purchasedCards"
      );
      const purchasedCardsSnap = await getDocs(purchasedCardsRef);

      const purchasedCardsData = [];
      console.log(
        "📦 Found purchased cards documents:",
        purchasedCardsSnap.size
      );

      purchasedCardsSnap.forEach((doc) => {
        console.log("📄 Card document:", doc.id, "->", doc.data());
        purchasedCardsData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log("✅ Final purchased cards data:", purchasedCardsData);

      // 🎁 Auto-grant default card for existing users who don't have any cards
      if (purchasedCardsSnap.size === 0) {
        console.log(
          "🎁 No cards found - granting default card to existing user"
        );
        await grantDefaultCardToExistingUser(user.uid);

        // Add the default card to local state immediately
        const defaultCard = {
          id: "default",
          purchaseCardsId: "default",
          isActive: true,
          purchaseDate: new Date(),
          cardName: t(userLanguage, 'buyCards.cardTypes.default'),
          isDefaultCard: true,
        };
        setPurchasedCards([defaultCard]);
        setSelectedCard("default"); // Set default as preview
      } else {
        setPurchasedCards(purchasedCardsData);

        // Set the active card as the preview
        const activeCard = purchasedCardsData.find((card) => card.isActive);
        if (activeCard) {
          setSelectedCard(activeCard.purchaseCardsId);
          console.log(
            "🎯 Set active card as preview:",
            activeCard.purchaseCardsId
          );
        }
      }

      // 🚫 Auto-remove vip7 card if user no longer qualifies (keep this for existing card holders)
      const timeDepositAmount = userDocSnap.exists()
        ? userDocSnap.data().timeDepositAmount || 0
        : 0;
      const vip7Card = getCardTypes(userLanguage).find((card) => card.id === "vip7");
      const hasVip7 = purchasedCardsData.some(
        (card) => card.purchaseCardsId === "vip7"
      );

      if (hasVip7 && timeDepositAmount < vip7Card.requiredDeposit) {
        console.log("🚫 User no longer qualifies for vip7 card - removing");
        await removeVip7CardFromUser(user.uid);

        // Remove vip7 from local state
        setPurchasedCards((prev) =>
          prev.filter((card) => card.purchaseCardsId !== "vip7")
        );

        // If vip7 was active, switch to default card
        const activeCard = purchasedCardsData.find((card) => card.isActive);
        if (activeCard && activeCard.purchaseCardsId === "vip7") {
          console.log("🔄 Switching from removed vip7 to default card");
          await switchActiveCard("default");
          setSelectedCard("default");
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      showModal({
        title: t(userLanguage, 'buyCards.titles.error'),
        message: t(userLanguage, 'buyCards.messages.failedToFetchData'),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCardSelect = (cardId) => {
    setSelectedCard(cardId);
  };

  // Helper function to check if user has VIP status based on timeDepositAmount
  const hasVipStatus = () => {
    const timeDepositAmount = userData.timeDepositAmount || 0;
    return timeDepositAmount >= 10000000; // 10,000,000 pesos
  };

  // Helper function to check if card can be purchased
  const canPurchaseCard = (cardId) => {
    const card = getCardTypes(userLanguage).find((c) => c.id === cardId);
    if (!card) return false;

    // Vip7 is not for purchase - it's auto-granted based on deposit
    if (cardId === "vip7") {
      return false;
    }

    // If card requires VIP status, check if user has it
    if (card.requiresVipStatus && !hasVipStatus()) {
      return false;
    }

    return true;
  };

  const handleCardPurchase = (cardId) => {
    const cardData = getCardTypes(userLanguage).find((card) => card.id === cardId);

    // Check if user can purchase this card
    if (!canPurchaseCard(cardId)) {
      if (cardId === "vip7") {
        setShowVip7InfoModal(true);
      } else if (cardData?.requiresVipStatus) {
        showModal({
          title: t(userLanguage, 'buyCards.titles.timeDepositRequired'),
          message: t(userLanguage, 'buyCards.messages.timeDepositRequired'),
          type: "warning",
        });
      } else {
        showModal({
          title: t(userLanguage, 'buyCards.titles.error'),
          message: t(userLanguage, 'buyCards.messages.cardCannotBePurchased'),
          type: "error",
        });
      }
      return;
    }

    setSelectedCardForPurchase(cardData);
    setShowPurchaseModal(true);
  };

  const handleClaimVip7 = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        showModal({
          title: t(userLanguage, 'buyCards.titles.error'),
          message: t(userLanguage, 'buyCards.messages.userNotAuthenticated'),
          type: "error",
        });
        return;
      }

      // Double-check qualification
      if (!hasVipStatus()) {
        showModal({
          title: t(userLanguage, 'buyCards.titles.notQualified'),
          message: t(userLanguage, 'buyCards.messages.notQualified'),
          type: "warning",
        });
        return;
      }

      // Check if already claimed
      if (isCardPurchased("vip7")) {
        showModal({
          title: t(userLanguage, 'buyCards.titles.alreadyClaimed'),
          message: t(userLanguage, 'buyCards.messages.alreadyClaimed'),
          type: "info",
        });
        return;
      }

      console.log("🎁 User claiming vip7 card");

      // Add to purchasedCards collection in Firestore
      const vip7CardRef = doc(
        firestore,
        "users",
        user.uid,
        "purchasedCards",
        "vip7"
      );

      const now = new Date();
      const vip7CardData = {
        purchaseCardsId: "vip7",
        isActive: false, // Don't make it active automatically
        purchaseDate: now,
        cardName: t(userLanguage, 'buyCards.cardTypes.diamondElite'),
        isAutoGranted: false, // Mark as manually claimed
        claimedByUser: true,
        grantedForDeposit: true,
      };

      await setDoc(vip7CardRef, vip7CardData);

      // Add transaction record
      await addDoc(collection(firestore, "users", user.uid, "transactions"), {
        amount: 0, // Free card
        date: now,
        type: t(userLanguage, 'buyCards.messages.claimedVipCard'),
        cardType: "vip7",
        description:
          t(userLanguage, 'buyCards.messages.vipCardClaimedDescription'),
      });

      // Add vip7 to local state
      setPurchasedCards((prev) => [
        ...prev,
        {
          id: "vip7",
          ...vip7CardData,
        },
      ]);

      // Close the modal
      setShowVip7InfoModal(false);

      // Show success message
      showModal({
        title: t(userLanguage, 'buyCards.titles.success'),
        message: t(userLanguage, 'buyCards.messages.vipCardClaimed'),
        type: "success",
      });
    } catch (error) {
      console.error("❌ Error claiming vip7 card:", error);
      showModal({
        title: t(userLanguage, 'buyCards.titles.error'),
        message: t(userLanguage, 'buyCards.messages.failedToClaimVip'),
        type: "error",
      });
    }
  };

  const confirmPurchase = async () => {
    setPurchasing(true);
    setShowPurchaseModal(false);

    try {
      const user = auth.currentUser;
      const cardToPurchase = selectedCardForPurchase;
      const cardPrice = cardToPurchase?.price || 0;

      console.log("🔥 Starting purchase process for user:", user?.uid);
      console.log("💳 Card to purchase:", cardToPurchase?.id);
      console.log("💰 Current balance:", availableBalance);
      console.log("💵 Card price:", cardPrice);
      console.log("📦 Current purchased cards:", purchasedCards);

      if (!user) {
        showModal({
          title: t(userLanguage, 'buyCards.titles.error'),
          message: t(userLanguage, 'buyCards.messages.userNotAuthenticated'),
          type: "error",
        });
        return;
      }

      const userDocRef = doc(firestore, "users", user.uid);
      console.log("📝 Updating user balance...");

      // Update user's available balance
      await updateDoc(userDocRef, {
        availBalanceAmount: increment(-cardPrice),
        selectedCardType: cardToPurchase?.id, // Store the selected card type
      });

      console.log("✅ User balance updated successfully");

      // Check if this is the first card purchase to set as active
      const isFirstCard = purchasedCards.length === 0;
      console.log("🎯 Is first card?", isFirstCard);

      // Add card to purchased cards subcollection
      const purchasedCardRef = doc(
        firestore,
        "users",
        user.uid,
        "purchasedCards",
        cardToPurchase?.id
      );

      const cardData = {
        purchaseCardsId: cardToPurchase?.id,
        isActive: isFirstCard, // Set first card as active, others as inactive
        purchaseDate: new Date(),
        cardName: cardToPurchase?.name || t(userLanguage, 'buyCards.cardTypes.unknown'),
        // Add subscription data if it's a subscription card
        ...(cardToPurchase?.isSubscription && {
          isSubscription: true,
          subscriptionType: cardToPurchase.subscriptionType,
          subscriptionDuration: cardToPurchase.subscriptionDuration,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: new Date(Date.now() + (cardToPurchase.subscriptionDuration * 24 * 60 * 60 * 1000)), // Add days to current date
          autoRenewal: cardToPurchase.autoRenewal || false, // Enable auto-renewal if configured
          renewalCount: 0, // Initial renewal count
          totalAmountPaid: cardToPurchase.price, // Initial payment amount
          subscriptionStatus: "active", // Initial status
          lastUpdated: new Date(),
          renewalHistory: [], // Empty array for initial purchase
        }),
      };

      console.log(
        "🔥 Creating subcollection document at path:",
        `users/${user.uid}/purchasedCards/${cardToPurchase?.id}`
      );
      console.log("📄 Card data to be saved:", cardData);

      await setDoc(purchasedCardRef, cardData);
      console.log("✅ Subcollection document created successfully!");

      // Add transaction to history
      console.log("📊 Creating transaction record...");
      await addDoc(collection(firestore, "users", user.uid, "transactions"), {
        amount: cardPrice,
        date: new Date(),
        type: cardToPurchase?.isVip ? t(userLanguage, 'buyCards.messages.vipCardPurchase') : t(userLanguage, 'buyCards.messages.cardPurchase'),
        cardType: cardToPurchase?.id,
        description: `Purchased ${cardToPurchase?.name || t(userLanguage, 'buyCards.cardTypes.unknown')}`,
      });
      console.log("✅ Transaction record created successfully!");

      // Update local state
      setAvailableBalance((prev) => prev - cardPrice);

      // Add new card to local purchased cards array
      const newPurchasedCard = {
        id: cardToPurchase?.id,
        purchaseCardsId: cardToPurchase?.id,
        isActive: isFirstCard,
        purchaseDate: new Date(),
        cardName: cardToPurchase?.name || t(userLanguage, 'buyCards.cardTypes.unknown'),
      };
      console.log(
        "📦 Adding new purchased card to local state:",
        newPurchasedCard
      );
      setPurchasedCards((prev) => {
        const updatedCards = [...prev, newPurchasedCard];
        console.log("📦 Updated purchased cards array:", updatedCards);
        return updatedCards;
      });

      const successMessage = t(userLanguage, 'buyCards.messages.purchaseSuccessful')
        .replace('{cardName}', cardToPurchase?.name || t(userLanguage, 'buyCards.cardTypes.unknown'))
        .replace('{price}', cardPrice.toFixed(2));

      showModal({
        title: t(userLanguage, 'buyCards.titles.purchaseSuccessful'),
        message: successMessage,
        type: "success",
      });

      // Go back to previous screen
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error("❌ ERROR processing purchase:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error code:", error.code);
      console.error("❌ Full error object:", JSON.stringify(error, null, 2));
      showModal({
        title: t(userLanguage, 'buyCards.titles.error'),
        message: t(userLanguage, 'buyCards.messages.purchaseFailed').replace('{error}', error.message),
        type: "error",
      });
    } finally {
      setPurchasing(false);
      console.log("🏁 Purchase process completed");
    }
  };

  const formatCurrency = (amount) => {
    return `₱${Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getSelectedCardDetails = () => {
    return getCardTypes(userLanguage).find((card) => card.id === selectedCard);
  };

  const isCardPurchased = (cardId) => {
    return purchasedCards.some((card) => card.purchaseCardsId === cardId);
  };

  // Check if subscription card is still active
  const isSubscriptionActive = (card) => {
    if (!card.isSubscription) return true; // Non-subscription cards are always active
    
    const now = new Date();
    const endDate = card.subscriptionEndDate?.toDate ? card.subscriptionEndDate.toDate() : new Date(card.subscriptionEndDate);
    
    return now < endDate;
  };

  // Get active subscription status text
  const getSubscriptionStatusText = (card) => {
    if (!card.isSubscription) return null;
    
    const now = new Date();
    const endDate = card.subscriptionEndDate?.toDate ? card.subscriptionEndDate.toDate() : new Date(card.subscriptionEndDate);
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return t(userLanguage, 'buyCards.subscriptionStatus.expired');
    if (daysLeft <= 7) return `${daysLeft} ${t(userLanguage, 'buyCards.subscriptionStatus.daysLeft')}`;
    if (daysLeft <= 30) return `${daysLeft} ${t(userLanguage, 'buyCards.subscriptionStatus.daysLeft')}`;
    return t(userLanguage, 'buyCards.subscriptionStatus.active');
  };

  // Check if subscription is expired
  const isSubscriptionExpired = (card) => {
    if (!card.isSubscription) return false;
    
    const now = new Date();
    const endDate = card.subscriptionEndDate?.toDate ? card.subscriptionEndDate.toDate() : new Date(card.subscriptionEndDate);
    return now >= endDate;
  };

  // Get subscription days remaining
  const getSubscriptionDaysRemaining = (card) => {
    if (!card.isSubscription) return 0;
    
    const now = new Date();
    const endDate = card.subscriptionEndDate?.toDate ? card.subscriptionEndDate.toDate() : new Date(card.subscriptionEndDate);
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, daysLeft);
  };

  // Handle subscription modal open
  const handleSubscriptionModalOpen = (card) => {
    const purchasedCard = purchasedCards.find(c => c.purchaseCardsId === card.id);
    if (purchasedCard && purchasedCard.isSubscription) {
      setSelectedSubscriptionCard(purchasedCard);
      setShowSubscriptionModal(true);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !selectedSubscriptionCard) {
        showModal({
                  title: t(userLanguage, 'buyCards.titles.error'),
        message: t(userLanguage, 'buyCards.messages.unableToCancelSubscription'),
          type: "error",
        });
        return;
      }

      console.log("🗑️ Cancelling subscription for card:", selectedSubscriptionCard.purchaseCardsId);

      // Update the subscription card to disable auto-renewal
      const subscriptionCardRef = doc(
        firestore,
        "users",
        user.uid,
        "purchasedCards",
        selectedSubscriptionCard.purchaseCardsId
      );

      await updateDoc(subscriptionCardRef, {
        autoRenewal: false,
        cancelledAt: new Date(),
      });

      // Add transaction record for cancellation
      await addDoc(collection(firestore, "users", user.uid, "transactions"), {
        amount: 0, // No refund
        date: new Date(),
        type: t(userLanguage, 'buyCards.messages.subscriptionCancelled'),
        cardType: selectedSubscriptionCard.purchaseCardsId,
        description: `Cancelled ${selectedSubscriptionCard.cardName} subscription - No refund provided`,
      });

      // Update local state
      setPurchasedCards((prev) =>
        prev.map((card) =>
          card.purchaseCardsId === selectedSubscriptionCard.purchaseCardsId
            ? { ...card, autoRenewal: false, cancelledAt: new Date() }
            : card
        )
      );

      // Close modal
      setShowSubscriptionModal(false);
      setSelectedSubscriptionCard(null);

      // Show success message
      showModal({
        title: t(userLanguage, 'buyCards.titles.subscriptionCancelled'),
        message: t(userLanguage, 'buyCards.messages.subscriptionCancelled'),
        type: "success",
      });

    } catch (error) {
      console.error("❌ Error cancelling subscription:", error);
      showModal({
        title: t(userLanguage, 'buyCards.titles.error'),
        message: t(userLanguage, 'buyCards.messages.failedToCancelSubscription'),
        type: "error",
      });
    }
  };

  // Handle auto-renewal
  const handleAutoRenewal = async (subscriptionCard) => {
    try {
      const user = auth.currentUser;
      if (!user || !subscriptionCard) {
        showModal({
                  title: t(userLanguage, 'buyCards.titles.error'),
        message: t(userLanguage, 'buyCards.messages.unableToProcessAutoRenewal'),
          type: "error",
        });
        return;
      }

      const cardType = getCardTypes(userLanguage).find(card => card.id === subscriptionCard.purchaseCardsId);
      if (!cardType || !cardType.autoRenewal) {
        return; // Not an auto-renewal card
      }

      console.log("🔄 Processing auto-renewal for card:", subscriptionCard.purchaseCardsId);

      // Check if user has sufficient balance
      if (availableBalance < cardType.price) {
        console.log("❌ Insufficient balance for auto-renewal");
        
        // Update subscription to expired
        const subscriptionCardRef = doc(
          firestore,
          "users",
          user.uid,
          "purchasedCards",
          subscriptionCard.purchaseCardsId
        );

        await updateDoc(subscriptionCardRef, {
          autoRenewal: false,
          expiredAt: new Date(),
          expiredReason: t(userLanguage, 'buyCards.messages.insufficientBalanceForAutoRenewal'),
        });

        // Update local state
        setPurchasedCards((prev) =>
          prev.map((card) =>
            card.purchaseCardsId === subscriptionCard.purchaseCardsId
              ? { ...card, autoRenewal: false, expiredAt: new Date(), expiredReason: t(userLanguage, 'buyCards.messages.insufficientBalanceForAutoRenewal') }
              : card
          )
        );

        showModal({
                  title: t(userLanguage, 'buyCards.titles.autoRenewalFailed'),
        message: t(userLanguage, 'buyCards.messages.autoRenewalFailed'),
          type: "warning",
        });
        return;
      }

      // Process auto-renewal payment
      const userDocRef = doc(firestore, "users", user.uid);
      await updateDoc(userDocRef, {
        availBalanceAmount: increment(-cardType.price),
      });

      // Update subscription end date
      const newEndDate = new Date(Date.now() + (cardType.subscriptionDuration * 24 * 60 * 60 * 1000));
      const subscriptionCardRef = doc(
        firestore,
        "users",
        user.uid,
        "purchasedCards",
        subscriptionCard.purchaseCardsId
      );

      // Get current renewal count
      const currentRenewalCount = subscriptionCard.renewalCount || 0;
      const newRenewalCount = currentRenewalCount + 1;

      await updateDoc(subscriptionCardRef, {
        subscriptionEndDate: newEndDate,
        lastRenewalDate: new Date(),
        renewalCount: newRenewalCount,
        totalAmountPaid: increment(cardType.price),
        renewalHistory: arrayUnion({
          renewalDate: new Date(),
          renewalNumber: newRenewalCount,
          amountPaid: cardType.price,
          previousEndDate: subscriptionCard.subscriptionEndDate,
          newEndDate: newEndDate,
        }),
        subscriptionStatus: "active",
        lastUpdated: new Date(),
      });

      // Add transaction record
      await addDoc(collection(firestore, "users", user.uid, "transactions"), {
        amount: cardType.price,
        date: new Date(),
        type: t(userLanguage, 'buyCards.messages.autoRenewalPayment'),
        cardType: subscriptionCard.purchaseCardsId,
        description: `Auto-renewal for ${subscriptionCard.cardName} subscription`,
      });

      // Update local state
      setAvailableBalance(prev => prev - cardType.price);
      setPurchasedCards((prev) =>
        prev.map((card) =>
          card.purchaseCardsId === subscriptionCard.purchaseCardsId
            ? { 
                ...card, 
                subscriptionEndDate: newEndDate,
                lastRenewalDate: new Date(),
                renewalCount: newRenewalCount,
                totalAmountPaid: (card.totalAmountPaid || cardType.price) + cardType.price,
                subscriptionStatus: "active",
                lastUpdated: new Date(),
                renewalHistory: [
                  ...(card.renewalHistory || []),
                  {
                    renewalDate: new Date(),
                    renewalNumber: newRenewalCount,
                    amountPaid: cardType.price,
                    previousEndDate: subscriptionCard.subscriptionEndDate,
                    newEndDate: newEndDate,
                  }
                ]
              }
            : card
        )
      );

      console.log("✅ Auto-renewal processed successfully");

    } catch (error) {
      console.error("❌ Error processing auto-renewal:", error);
      showModal({
        title: t(userLanguage, 'buyCards.titles.autoRenewalError'),
                  message: t(userLanguage, 'buyCards.messages.failedToProcessAutoRenewal'),
        type: "error",
      });
    }
  };

  // Handle deletion of expired subscriptions
  const handleExpiredSubscriptionDeletion = async (expiredCard) => {
    try {
      const user = auth.currentUser;
      if (!user || !expiredCard) {
        console.error("❌ Unable to delete expired subscription");
        return;
      }

      console.log("🗑️ Deleting expired subscription:", expiredCard.purchaseCardsId);

      // Delete the subscription card from Firestore
      const subscriptionCardRef = doc(
        firestore,
        "users",
        user.uid,
        "purchasedCards",
        expiredCard.purchaseCardsId
      );

      await deleteDoc(subscriptionCardRef);

      // Add transaction record for expiration
      await addDoc(collection(firestore, "users", user.uid, "transactions"), {
        amount: 0, // No refund
        date: new Date(),
        type: t(userLanguage, 'buyCards.messages.subscriptionExpired'),
        cardType: expiredCard.purchaseCardsId,
        description: `${expiredCard.cardName} subscription expired - Auto-renewal was disabled`,
      });

      // Remove from local state
      setPurchasedCards((prev) =>
        prev.filter((card) => card.purchaseCardsId !== expiredCard.purchaseCardsId)
      );

      console.log("✅ Expired subscription deleted successfully");

      // Show notification to user
      showModal({
        title: t(userLanguage, 'buyCards.titles.subscriptionExpired'),
                  message: t(userLanguage, 'buyCards.messages.subscriptionExpired', { cardName: expiredCard.cardName }),
        type: "info",
      });

    } catch (error) {
      console.error("❌ Error deleting expired subscription:", error);
      showModal({
        title: t(userLanguage, 'buyCards.titles.error'),
        message: t(userLanguage, 'buyCards.messages.failedToRemoveExpired'),
        type: "error",
      });
    }
  };

  // Handle auto-renewal toggle
  const handleToggleAutoRenewal = async (subscriptionCard) => {
    try {
      const user = auth.currentUser;
      if (!user || !subscriptionCard) {
        showModal({
                  title: t(userLanguage, 'buyCards.titles.error'),
        message: t(userLanguage, 'buyCards.messages.unableToToggleAutoRenewal'),
          type: "error",
        });
        return;
      }

      const newAutoRenewalState = !subscriptionCard.autoRenewal;
      console.log("🔄 Toggling auto-renewal for card:", subscriptionCard.purchaseCardsId, "to:", newAutoRenewalState);

      // Update the subscription card in Firestore
      const subscriptionCardRef = doc(
        firestore,
        "users",
        user.uid,
        "purchasedCards",
        subscriptionCard.purchaseCardsId
      );

      await updateDoc(subscriptionCardRef, {
        autoRenewal: newAutoRenewalState,
        lastUpdated: new Date(),
      });

      // Update local state
      setPurchasedCards((prev) =>
        prev.map((card) =>
          card.purchaseCardsId === subscriptionCard.purchaseCardsId
            ? { ...card, autoRenewal: newAutoRenewalState, lastUpdated: new Date() }
            : card
        )
      );

      // Update selected subscription card for modal
      setSelectedSubscriptionCard(prev => 
        prev ? { ...prev, autoRenewal: newAutoRenewalState, lastUpdated: new Date() } : null
      );

      // Show success message
      showModal({
                title: newAutoRenewalState ? t(userLanguage, 'buyCards.titles.autoRenewalEnabled') : t(userLanguage, 'buyCards.titles.autoRenewalDisabled'),
        message: newAutoRenewalState
          ? t(userLanguage, 'buyCards.messages.autoRenewalEnabled')
          : t(userLanguage, 'buyCards.messages.autoRenewalDisabled'),
        type: "success",
      });

    } catch (error) {
      console.error("❌ Error toggling auto-renewal:", error);
      showModal({
        title: t(userLanguage, 'buyCards.titles.error'),
        message: t(userLanguage, 'buyCards.messages.failedToToggleAutoRenewal'),
        type: "error",
      });
    }
  };

  const getActiveCard = () => {
    return purchasedCards.find((card) => card.isActive);
  };

  // Function to switch active card
  const switchActiveCard = async (newActiveCardId) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        showModal({
          title: t(userLanguage, 'buyCards.titles.error'),
          message: t(userLanguage, 'buyCards.messages.userNotAuthenticated'),
          type: "error",
        });
        return;
      }

      console.log("🔄 Switching active card to:", newActiveCardId);

      // Find current active card
      const currentActiveCard = purchasedCards.find((card) => card.isActive);

      if (
        currentActiveCard &&
        currentActiveCard.purchaseCardsId === newActiveCardId
      ) {
        console.log("⚠️ Card is already active");
        return; // Already active, no need to switch
      }

      // Update Firestore documents
      const batch = [];

      // Deactivate current active card
      if (currentActiveCard) {
        const currentActiveRef = doc(
          firestore,
          "users",
          user.uid,
          "purchasedCards",
          currentActiveCard.purchaseCardsId
        );
        batch.push({
          ref: currentActiveRef,
          data: { isActive: false },
        });
        console.log("📱 Deactivating card:", currentActiveCard.purchaseCardsId);
      }

      // Activate new card
      const newActiveRef = doc(
        firestore,
        "users",
        user.uid,
        "purchasedCards",
        newActiveCardId
      );
      batch.push({
        ref: newActiveRef,
        data: { isActive: true },
      });
      console.log("🌟 Activating card:", newActiveCardId);

      // Execute all updates
      for (const update of batch) {
        await updateDoc(update.ref, update.data);
      }

      // Update local state
      const updatedCards = purchasedCards.map((card) => ({
        ...card,
        isActive: card.purchaseCardsId === newActiveCardId,
      }));
      setPurchasedCards(updatedCards);

      // Update preview to show the new active card
      setSelectedCard(newActiveCardId);

      console.log("✅ Card switching completed successfully");

      // Show success message only if not switching due to vip7 removal
      if (
        newActiveCardId !== "default" ||
        !currentActiveCard ||
        currentActiveCard.purchaseCardsId !== "vip7"
      ) {
        const cardName =
          getCardTypes(userLanguage).find((c) => c.id === newActiveCardId)?.name || t(userLanguage, 'buyCards.cardTypes.unknown');
        showModal({
          title: t(userLanguage, 'buyCards.titles.cardActivated'),
          message: t(userLanguage, 'buyCards.messages.cardActivated').replace('{cardName}', cardName),
          type: "success",
        });
      }
    } catch (error) {
      console.error("❌ Error switching active card:", error);
      showModal({
        title: t(userLanguage, 'buyCards.titles.error'),
        message: t(userLanguage, 'buyCards.messages.failedToSwitchCard'),
        type: "error",
      });
    }
  };

  // Function to grant default card to existing users
  const grantDefaultCardToExistingUser = async (userId) => {
    try {
      console.log("🎁 Granting default card to existing user:", userId);

      // Double-check to prevent duplicates
      const defaultCardRef = doc(
        firestore,
        "users",
        userId,
        "purchasedCards",
        "default"
      );
      const existingCard = await getDoc(defaultCardRef);

      if (existingCard.exists()) {
        console.log("⚠️ Default card already exists, skipping grant");
        return;
      }

      const now = new Date();

      // Create default card in purchasedCards subcollection
      await setDoc(defaultCardRef, {
        purchaseCardsId: "default",
        isActive: true, // First card is always active
        purchaseDate: now,
        cardName: t(userLanguage, 'buyCards.cardTypes.default'),
        isDefaultCard: true, // Mark as free welcome card
        grantedToExistingUser: true, // Mark as granted to existing user
      });

      // Add transaction record for the free default card
      await addDoc(collection(firestore, "users", userId, "transactions"), {
        amount: 0, // Free card
        date: now,
        type: t(userLanguage, 'buyCards.messages.freeDefaultCard'),
        cardType: "default",
        description: t(userLanguage, 'buyCards.messages.welcomeGiftDefaultCard'),
      });

      console.log("✅ Default card successfully granted to existing user");
    } catch (error) {
      console.error("❌ Error granting default card to existing user:", error);
      // Don't show alert to user - this should be silent
    }
  };

  // Function to grant vip7 card to qualifying users
  const grantVip7CardToUser = async (userId) => {
    try {
      console.log("🏆 Granting vip7 card to qualifying user:", userId);

      // Double-check to prevent duplicates
      const vip7CardRef = doc(
        firestore,
        "users",
        userId,
        "purchasedCards",
        "vip7"
      );
      const existingCard = await getDoc(vip7CardRef);

      if (existingCard.exists()) {
        console.log("⚠️ Vip7 card already exists, skipping grant");
        return;
      }

      const now = new Date();

      // Create vip7 card in purchasedCards subcollection
      await setDoc(vip7CardRef, {
        purchaseCardsId: "vip7",
        isActive: false, // Don't make it active automatically
        purchaseDate: now,
        cardName: t(userLanguage, 'buyCards.cardTypes.diamondElite'),
        isAutoGranted: false, // Mark as manually claimed
        claimedByUser: true, // Mark as claimed by user
        grantedForDeposit: true, // Mark as granted for deposit qualification
      });

      // Add transaction record for the claimed vip7 card
      await addDoc(collection(firestore, "users", userId, "transactions"), {
        amount: 0, // Free card
        date: now,
        type: t(userLanguage, 'buyCards.messages.claimedVipCard'),
        cardType: "vip7",
        description:
          t(userLanguage, 'buyCards.messages.vipCardClaimedDescription'),
      });

      console.log("✅ Vip7 card successfully granted to qualifying user");
    } catch (error) {
      console.error("❌ Error granting vip7 card to user:", error);
      // Don't show alert to user - this should be silent
    }
  };

  // Function to remove vip7 card from users who no longer qualify
  const removeVip7CardFromUser = async (userId) => {
    try {
      console.log(
        "🚫 Removing vip7 card from user who no longer qualifies:",
        userId
      );

      // Remove vip7 card from purchasedCards subcollection
      const vip7CardRef = doc(
        firestore,
        "users",
        userId,
        "purchasedCards",
        "vip7"
      );

      await deleteDoc(vip7CardRef);

      // Add transaction record for the removed vip7 card
      await addDoc(collection(firestore, "users", userId, "transactions"), {
        amount: 0, // No refund since it was free
        date: new Date(),
        type: t(userLanguage, 'buyCards.messages.removedVipCard'),
        cardType: "vip7",
        description:
          t(userLanguage, 'buyCards.messages.vipCardRemovedDescription'),
      });

      console.log("✅ Vip7 card successfully removed from user");
    } catch (error) {
      console.error("❌ Error removing vip7 card from user:", error);
      // Don't show alert to user - this should be silent
    }
  };

  /* 
  // 🔧 OPTIONAL: One-time migration function for all existing users
  // Uncomment and run this if you want to give default cards to ALL existing users at once
  // This is an alternative to the automatic check above
  
  const migrateAllExistingUsers = async () => {
    try {
      console.log("🔄 Starting migration for all existing users...");
      
      // Get all users
      const usersRef = collection(firestore, "users");
      const usersSnap = await getDocs(usersRef);
      
      let processedCount = 0;
      let alreadyHadCards = 0;
      let grantedCards = 0;
      
      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        console.log(`🔍 Checking user: ${userId}`);
        
        // Check if user has any purchased cards
        const purchasedCardsRef = collection(firestore, "users", userId, "purchasedCards");
        const purchasedCardsSnap = await getDocs(purchasedCardsRef);
        
        if (purchasedCardsSnap.size === 0) {
          // Grant default card
          await grantDefaultCardToExistingUser(userId);
          grantedCards++;
          console.log(`✅ Granted default card to user: ${userId}`);
        } else {
          alreadyHadCards++;
          console.log(`⚠️ User ${userId} already has ${purchasedCardsSnap.size} cards`);
        }
        
        processedCount++;
      }
      
      console.log("🎉 Migration completed!");
      console.log(`📊 Processed ${processedCount} users`);
      console.log(`🎁 Granted default cards to ${grantedCards} users`);
      console.log(`✅ ${alreadyHadCards} users already had cards`);
      
      Alert.alert(
        t(userLanguage, 'buyCards.messages.migrationComplete'), 
        t(userLanguage, 'buyCards.messages.migrationCompleteDetails', { processedCount, grantedCards, alreadyHadCards })
      );
      
    } catch (error) {
      console.error("❌ Migration failed:", error);
      Alert.alert(t(userLanguage, 'buyCards.messages.migrationFailed'), error.message);
    }
  };
  */

  // Handle scroll events to show/hide the floating button
  const handleScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(scrollY > 300); // Show button after scrolling 300px
  };

  // Scroll to card preview section
  const scrollToPreview = () => {
    scrollViewRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.redTheme.background} />
                          <Text style={styles.loadingText}>{t(userLanguage, 'buyCards.common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea} />
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, getRTLStyles(userLanguage)]}>
            {t(userLanguage, 'buyCards.header.title')}
          </Text>
          <Text style={[styles.headerSubtitle, getRTLStyles(userLanguage)]}>
            {t(userLanguage, 'buyCards.header.subtitle')}
          </Text>
        </View>

        {/* Available Balance Section */}
        <View style={styles.balanceSection}>
          <AmountContent amount={availableBalance} title={t(userLanguage, 'buyCards.sections.availableBalance')} />
        </View>

        {/* Card Preview Section */}
        <View style={styles.previewSection}>
          <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
            {t(userLanguage, 'buyCards.sections.cardPreview')}
          </Text>
          <View style={styles.cardPreviewContainer}>
            <InspCard selectedCardId={selectedCard} />
          </View>
        </View>

        {/* VVIP Cards Section */}
        <View style={styles.selectionSection}>
          <View style={styles.selectionHeader}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="diamond" size={24} color="#FFD700" />
              <Text style={[styles.sectionTitle, styles.vvipSectionTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'buyCards.sections.vipCollection')}
              </Text>
            </View>
            <Text style={[styles.sectionSubtitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, 'buyCards.descriptions.vipCards')}
            </Text>
          </View>

          <View style={styles.designGrid}>
            {getCardTypes(userLanguage)
              .filter((card) => card.isVvip)
              .map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.designCard,
                    selectedCard === card.id && styles.selectedDesignCard,
                    isCardPurchased(card.id) && styles.ownedDesignCard,
                  ]}
                  onPress={() => {
                    if (isCardPurchased(card.id)) {
                      // Check if it's a subscription card
                      const purchasedCard = purchasedCards.find(c => c.purchaseCardsId === card.id);
                      if (purchasedCard && purchasedCard.isSubscription) {
                        handleSubscriptionModalOpen(card);
                      } else {
                        handleCardSelect(card.id);
                      }
                    } else if (card.id === "vip7") {
                      setShowVip7InfoModal(true);
                    } else {
                      handleCardPurchase(card.id);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.designCardContainer,
                      selectedCard === card.id &&
                        styles.selectedDesignContainer,
                      isCardPurchased(card.id) && styles.ownedDesignContainer,
                    ]}
                  >
                    {/* Card Image */}
                    <View style={styles.designImageWrapper}>
                      <Image
                        source={card.path}
                        style={styles.designCardImage}
                        resizeMode="cover"
                      />

                      {/* Lock Overlay for VVIP-only cards */}
                      {!canPurchaseCard(card.id) &&
                        card.requiresVipStatus &&
                        !hasVipStatus() && (
                          <View style={styles.lockOverlay}>
                            <View style={styles.lockContainer}>
                              <Ionicons
                                name="lock-closed"
                                size={24}
                                color="#FFD700"
                              />
                              <Text style={styles.lockText}>
                                {t(userLanguage, 'buyCards.cardStatus.depositRequired')}
                              </Text>
                            </View>
                          </View>
                        )}

                      {/* Selection Overlay */}
                      {selectedCard === card.id && (
                        <View style={styles.selectionOverlay}>
                          <View style={styles.selectionBadge}>
                            <Ionicons
                              name="checkmark-circle"
                              size={28}
                              color="white"
                            />
                          </View>
                        </View>
                      )}

                      {/* Ownership Status */}
                      {isCardPurchased(card.id) && (
                        <View style={styles.ownershipBadge}>
                          <Ionicons name="star" size={16} color="#FFD700" />
                          <Text style={styles.ownershipText}>
                            {t(userLanguage, 'buyCards.cardStatus.owned')}
                          </Text>
                        </View>
                      )}

                      {/* VVIP Badge for VVIP cards */}
                      {card.isVvip && (
                        <View style={styles.vvipBadge}>
                          <Ionicons name="diamond" size={12} color="#FFD700" />
                          <Text style={styles.vvipText}>{t(userLanguage, 'buyCards.cardTypes.vip')}</Text>
                        </View>
                      )}

                      {/* Price Badge for non-owned cards */}
                      {!isCardPurchased(card.id) && card.id !== "vip7" && (
                        <View
                          style={[
                            styles.priceBadge,
                            card.isVvip && styles.vvipPriceBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.priceText,
                              card.isVvip && styles.vvipPriceText,
                            ]}
                          >
                            ₱{card.price}
                          </Text>
                        </View>
                      )}

                      {/* Special badge for vip7 */}
                      {!isCardPurchased(card.id) && card.id === "vip7" && (
                        <View style={styles.vvipPriceBadge}>
                          <Text style={styles.vvipPriceText}>
                            {hasVipStatus() ? t(userLanguage, 'buyCards.buttons.claim') : t(userLanguage, 'buyCards.cardStatus.depositRequired')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Card Info */}
                    <View
                      style={[
                        styles.designCardInfo,
                        selectedCard === card.id && styles.selectedCardInfo,
                        isCardPurchased(card.id) && styles.ownedCardInfo,
                      ]}
                    >
                      <Text
                        style={[
                          styles.designCardName,
                          selectedCard === card.id && styles.selectedCardName,
                          isCardPurchased(card.id) && styles.ownedCardName,
                        ]}
                      >
                        {card.name}
                      </Text>

                      {/* Status Indicator */}
                      <View style={styles.statusContainer}>
                        {isCardPurchased(card.id) ? (
                          (() => {
                            const purchasedCard = purchasedCards.find(c => c.purchaseCardsId === card.id);
                            const subscriptionStatus = getSubscriptionStatusText(purchasedCard);
                            
                            if (card.isSubscription && subscriptionStatus) {
                              return (
                                <View style={[
                                  styles.subscriptionIndicator,
                                  subscriptionStatus === "Expired" && styles.expiredIndicator,
                                  subscriptionStatus.includes("days left") && styles.warningIndicator,
                                ]}>
                                  <Ionicons
                                    name={subscriptionStatus === "Expired" ? "time" : "calendar"}
                                    size={12}
                                    color={subscriptionStatus === "Expired" ? "#f44336" : subscriptionStatus.includes("days left") ? "#FF9800" : "#4CAF50"}
                                  />
                                  <Text style={[
                                    styles.subscriptionStatusText,
                                    subscriptionStatus === "Expired" && styles.expiredStatusText,
                                    subscriptionStatus.includes("days left") && styles.warningStatusText,
                                  ]}>
                                    {subscriptionStatus === "Expired" 
                                      ? t(userLanguage, 'buyCards.subscriptionStatus.expired')
                                      : subscriptionStatus.includes("days left")
                                      ? subscriptionStatus.replace("days left", ` ${t(userLanguage, 'buyCards.subscriptionStatus.daysLeft')}`)
                                      : subscriptionStatus === "Active"
                                      ? t(userLanguage, 'buyCards.subscriptionStatus.active')
                                      : subscriptionStatus
                                    }
                                  </Text>
                                </View>
                              );
                            }
                            
                            return (
                              <View style={styles.ownedIndicator}>
                                <Ionicons
                                  name="checkmark"
                                  size={12}
                                  color="#4CAF50"
                                />
                                <Text style={styles.ownedStatusText}>
                                  {t(userLanguage, 'buyCards.cardStatus.owned')}
                                </Text>
                              </View>
                            );
                          })()
                        ) : selectedCard === card.id ? (
                          <View style={styles.selectedIndicator}>
                            <Ionicons
                              name="eye"
                              size={12}
                              color={Colors.redTheme.background}
                            />
                            <Text style={styles.selectedStatusText}>
                              {t(userLanguage, 'buyCards.cardStatus.preview')}
                            </Text>
                          </View>
                        ) : card.id === "vip7" && !hasVipStatus() ? (
                          <View style={styles.vvipRequiredIndicator}>
                            <Ionicons
                              name="diamond"
                              size={12}
                              color="#FFD700"
                            />
                            <Text style={styles.vvipRequiredStatusText}>
                              {t(userLanguage, 'buyCards.cardStatus.depositRequired')}
                            </Text>
                          </View>
                        ) : card.id === "vip7" &&
                          hasVipStatus() &&
                          !isCardPurchased("vip7") ? (
                          <View style={styles.availableIndicator}>
                            <Ionicons name="gift" size={12} color="#FFD700" />
                            <Text style={styles.availableStatusText}>
                              {t(userLanguage, 'buyCards.cardStatus.tapToClaim')}
                            </Text>
                          </View>
                        ) : card.id === "vip7" &&
                          hasVipStatus() &&
                          isCardPurchased("vip7") ? (
                          <View style={styles.availableIndicator}>
                            <Ionicons
                              name="checkmark"
                              size={12}
                              color="#4CAF50"
                            />
                            <Text style={styles.availableStatusText}>
                              {t(userLanguage, 'buyCards.cardStatus.claimed')}
                            </Text>
                          </View>
                        ) : !canPurchaseCard(card.id) &&
                          card.requiresVipStatus ? (
                          <View style={styles.vvipRequiredIndicator}>
                            <Ionicons
                              name="lock-closed"
                              size={12}
                              color="#FFD700"
                            />
                            <Text style={styles.vvipRequiredStatusText}>
                              {t(userLanguage, 'buyCards.cardStatus.vipOnly')}
                            </Text>
                          </View>
                        ) : card.isSubscription ? (
                          <View style={styles.subscriptionIndicator}>
                            <Ionicons name="calendar" size={12} color="#FFD700" />
                            <Text style={styles.subscriptionStatusText}>
                              {t(userLanguage, 'buyCards.cardStatus.monthlySubscription')}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.availableIndicator}>
                            <Ionicons
                              name="add-circle"
                              size={12}
                              color="#666"
                            />
                            <Text style={styles.availableStatusText}>
                              {t(userLanguage, 'buyCards.cardStatus.tapToBuy')}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Selection Glow Effect */}
                    {selectedCard === card.id && !isCardPurchased(card.id) && (
                      <View style={styles.selectionGlow} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {/* Design Cards Section */}
        <View style={styles.selectionSection}>
          <View style={styles.selectionHeader}>
            <View style={styles.headerTitleContainer}>
              <Ionicons
                name="brush"
                size={24}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'buyCards.sections.designCollection')}
              </Text>
            </View>
            <Text style={[styles.sectionSubtitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, 'buyCards.descriptions.designCards')}
            </Text>
          </View>

          <View style={styles.designGrid}>
            {getCardTypes(userLanguage)
              .filter((card) => !card.isVip && card.id !== "default")
              .map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.designCard,
                    selectedCard === card.id && styles.selectedDesignCard,
                    isCardPurchased(card.id) && styles.ownedDesignCard,
                  ]}
                  onPress={() => {
                    if (isCardPurchased(card.id)) {
                      handleCardSelect(card.id);
                    } else if (card.id === "vip7") {
                      setShowVip7InfoModal(true);
                    } else {
                      handleCardPurchase(card.id);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.designCardContainer,
                      selectedCard === card.id &&
                        styles.selectedDesignContainer,
                      isCardPurchased(card.id) && styles.ownedDesignContainer,
                    ]}
                  >
                    {/* Card Image */}
                    <View style={styles.designImageWrapper}>
                      <Image
                        source={card.path}
                        style={styles.designCardImage}
                        resizeMode="cover"
                      />

                      {/* Lock Overlay for VIP-only cards */}
                      {!canPurchaseCard(card.id) && card.requiresVipStatus && (
                        <View style={styles.lockOverlay}>
                          <View style={styles.lockContainer}>
                            <Ionicons
                              name="lock-closed"
                              size={24}
                              color="#FF6B35"
                            />
                            <Text style={styles.lockText}>{t(userLanguage, 'buyCards.cardStatus.vipOnly')}</Text>
                          </View>
                        </View>
                      )}

                      {/* Selection Overlay */}
                      {selectedCard === card.id && (
                        <View style={styles.selectionOverlay}>
                          <View style={styles.selectionBadge}>
                            <Ionicons
                              name="checkmark-circle"
                              size={28}
                              color="white"
                            />
                          </View>
                        </View>
                      )}

                      {/* Ownership Status */}
                      {isCardPurchased(card.id) && (
                        <View style={styles.ownershipBadge}>
                          <Ionicons name="star" size={16} color="#FFD700" />
                          <Text style={styles.ownershipText}>{t(userLanguage, 'buyCards.cardStatus.owned')}</Text>
                        </View>
                      )}

                      {/* Price Badge for non-owned cards */}
                      {!isCardPurchased(card.id) && (
                        <View style={styles.priceBadge}>
                          <Text style={styles.priceText}>₱{card.price}</Text>
                        </View>
                      )}
                    </View>

                    {/* Card Info */}
                    <View
                      style={[
                        styles.designCardInfo,
                        selectedCard === card.id && styles.selectedCardInfo,
                        isCardPurchased(card.id) && styles.ownedCardInfo,
                      ]}
                    >
                      <Text
                        style={[
                          styles.designCardName,
                          selectedCard === card.id && styles.selectedCardName,
                          isCardPurchased(card.id) && styles.ownedCardName,
                        ]}
                      >
                        {card.name}
                      </Text>

                      {/* Status Indicator */}
                      <View style={styles.statusContainer}>
                        {isCardPurchased(card.id) ? (
                          <View style={styles.ownedIndicator}>
                            <Ionicons
                              name="checkmark"
                              size={12}
                              color="#4CAF50"
                            />
                            <Text style={styles.ownedStatusText}>{t(userLanguage, 'buyCards.cardStatus.owned')}</Text>
                          </View>
                        ) : selectedCard === card.id ? (
                          <View style={styles.selectedIndicator}>
                            <Ionicons
                              name="eye"
                              size={12}
                              color={Colors.redTheme.background}
                            />
                            <Text style={styles.selectedStatusText}>
                              Preview
                            </Text>
                          </View>
                        ) : !canPurchaseCard(card.id) &&
                          card.requiresVipStatus ? (
                          <View style={styles.vipRequiredIndicator}>
                            <Ionicons
                              name="lock-closed"
                              size={12}
                              color="#FF6B35"
                            />
                            <Text style={styles.vipRequiredStatusText}>
                              VIP Only
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.availableIndicator}>
                            <Ionicons
                              name="add-circle"
                              size={12}
                              color="#666"
                            />
                            <Text style={styles.availableStatusText}>
                              Tap to Buy
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Selection Glow Effect */}
                    {selectedCard === card.id && !isCardPurchased(card.id) && (
                      <View style={styles.selectionGlow} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {/* Purchased Cards Section */}
        {purchasedCards.length > 0 && (
          <View style={styles.purchasedSection}>
            <View style={styles.purchasedHeader}>
              <View style={styles.headerTitleContainer}>
                <Ionicons
                  name="wallet"
                  size={24}
                  color={Colors.redTheme.background}
                />
                <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'buyCards.sections.yourCollection')}
                </Text>
              </View>
              <Text style={[styles.sectionSubtitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'buyCards.descriptions.collectionHelp')}
              </Text>
            </View>

            <View style={styles.cardsContainer}>
              {purchasedCards.map((purchasedCard, index) => {
                const card = getCardTypes(userLanguage).find(
                  (c) => c.id === purchasedCard.purchaseCardsId
                );
                return card ? (
                  <TouchableOpacity
                    key={`${purchasedCard.id}-${index}`}
                    style={[
                      styles.purchasedCard,
                      purchasedCard.isActive
                        ? styles.activeCard
                        : styles.inactiveCard,
                    ]}
                    onPress={() =>
                      switchActiveCard(purchasedCard.purchaseCardsId)
                    }
                    activeOpacity={0.8}
                  >
                    {/* Card Container with Gradient Border */}
                    <View
                      style={[
                        styles.cardContainer,
                        purchasedCard.isActive && styles.activeCardContainer,
                      ]}
                    >
                      <Image
                        source={card.path}
                        style={styles.purchasedCardImage}
                        resizeMode="cover"
                      />

                      {/* Status Badge */}
                      {purchasedCard.isActive ? (
                        <View style={styles.activeStatusBadge}>
                          <Ionicons name="star" size={14} color="#FFD700" />
                          <Text style={styles.activeStatusText}>{t(userLanguage, 'buyCards.cardStatus.active')}</Text>
                        </View>
                      ) : (
                        <View style={styles.ownedStatusBadge}>
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color="#4CAF50"
                          />
                        </View>
                      )}

                      {/* Bottom Info Overlay */}
                      <View
                        style={[
                          styles.cardInfoOverlay,
                          purchasedCard.isActive
                            ? styles.activeCardInfoOverlay
                            : styles.inactiveCardInfoOverlay,
                        ]}
                      >
                        <Text
                          style={[
                            styles.cardTitle,
                            purchasedCard.isActive
                              ? styles.activeCardTitle
                              : styles.inactiveCardTitle,
                          ]}
                        >
                          {card.name}
                        </Text>
                        {purchasedCard.isActive && (
                          <View style={styles.activeIndicatorContainer}>
                            <View style={styles.activeDot} />
                            <Text style={styles.activeLabel}>
                              {t(userLanguage, 'buyCards.cardStatus.currentlyActive')}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Active Card Glow Effect */}
                      {purchasedCard.isActive && (
                        <View style={styles.glowEffect} />
                      )}
                    </View>
                  </TouchableOpacity>
                ) : null;
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Purchase Modal */}
      <Modal
        visible={showPurchaseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.purchaseModalContent}>
            {selectedCardForPurchase ? (
              <>
                {/* Header with Close Button */}
                <View style={styles.purchaseModalHeader}>
                  <View style={styles.headerLeftSection}>
                    <View style={styles.headerIconContainer}>
                      <Ionicons
                        name={selectedCardForPurchase.isVip ? "trophy" : "card"}
                        size={20}
                        color={
                          selectedCardForPurchase.isVip ? "#FFD700" : "white"
                        }
                      />
                    </View>
                    <View>
                      <Text style={styles.purchaseModalTitle}>
                        {selectedCardForPurchase.isVip
                          ? t(userLanguage, 'buyCards.modals.purchase.vipTitle')
                          : t(userLanguage, 'buyCards.modals.purchase.title')}
                      </Text>
                      <Text style={styles.purchaseModalSubtitle}>
                        {t(userLanguage, 'buyCards.modals.purchase.subtitle')}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowPurchaseModal(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close-circle" size={28} color="white" />
                  </TouchableOpacity>
                </View>

                {/* Scrollable Content */}
                <ScrollView
                  style={styles.modalContentScroll}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {/* Card Preview Section */}
                  <View style={styles.modalCardPreview}>
                    <Text style={styles.previewLabel}>{t(userLanguage, 'buyCards.modals.purchase.cardPreview')}</Text>
                    <View style={styles.cardPreviewContainer}>
                      <View style={styles.modalCardWrapper}>
                        <View style={styles.inspCardContainer}>
                          <InspCard
                            selectedCardId={selectedCardForPurchase.id}
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Card Details Section */}
                  <View style={styles.cardDetailsSection}>
                    <View style={styles.cardNameContainer}>
                      <Text style={styles.cardDetailsName}>
                        {selectedCardForPurchase.name}
                      </Text>
                      {selectedCardForPurchase.isVip && (
                        <View style={styles.modalVipBadge}>
                          <Ionicons name="diamond" size={14} color="#FFD700" />
                          <Text style={styles.modalVipText}>{t(userLanguage, 'buyCards.cardTypes.vip')}</Text>
                        </View>
                      )}
                    </View>

                    {/* Price Display */}
                    <View style={styles.priceDisplay}>
                      <Text style={styles.priceLabel}>{t(userLanguage, 'buyCards.modals.purchase.price')}</Text>
                      <Text
                        style={[
                          styles.cardDetailsPrice,
                          selectedCardForPurchase.isVip && styles.vipPrice,
                        ]}
                      >
                        {formatCurrency(selectedCardForPurchase.price)}
                      </Text>
                    </View>

                    {/* Balance Check */}
                    <View style={styles.balanceSection}>
                      <View style={styles.balanceRow}>
                        <Text style={styles.balanceLabel}>
                          {t(userLanguage, 'buyCards.modals.purchase.availableBalance')}
                        </Text>
                        <Text
                          style={[
                            styles.balanceAmount,
                            availableBalance < selectedCardForPurchase.price &&
                              styles.insufficientBalance,
                          ]}
                        >
                          {formatCurrency(availableBalance)}
                        </Text>
                      </View>

                      {availableBalance >= selectedCardForPurchase.price ? (
                        <View style={styles.sufficientIndicator}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#4CAF50"
                          />
                          <Text style={styles.sufficientText}>
                            {t(userLanguage, 'buyCards.modals.purchase.sufficientBalance')}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.insufficientIndicator}>
                          <Ionicons name="warning" size={16} color="#f44336" />
                          <Text style={styles.insufficientText}>
                            {t(userLanguage, 'buyCards.modals.purchase.insufficientBalance', { amount: formatCurrency(selectedCardForPurchase.price - availableBalance) })}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* VIP Status Check for vip7 */}
                    {selectedCardForPurchase.requiresVipStatus && (
                      <View style={styles.vipStatusSection}>
                        <View style={styles.vipStatusRow}>
                          <Text style={styles.vipStatusLabel}>
                            {t(userLanguage, 'buyCards.modals.purchase.timeDepositRequired')}
                          </Text>
                          <View style={styles.vipStatusIndicator}>
                            {hasVipStatus() ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={16}
                                color="#4CAF50"
                              />
                            ) : (
                              <Ionicons
                                name="close-circle"
                                size={16}
                                color="#f44336"
                              />
                            )}
                          </View>
                        </View>

                        {hasVipStatus() ? (
                          <View style={styles.vipStatusSufficient}>
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color="#4CAF50"
                            />
                            <Text style={styles.vipStatusSufficientText}>
                              {t(userLanguage, 'buyCards.modals.purchase.vipStatusMet')}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.vipStatusInsufficient}>
                            <Ionicons
                              name="warning"
                              size={16}
                              color="#f44336"
                            />
                            <Text style={styles.vipStatusInsufficientText}>
                              {t(userLanguage, 'buyCards.modals.purchase.vipStatusNotMet')}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Subscription Information */}
                    {selectedCardForPurchase.isSubscription && (
                      <View style={styles.subscriptionInfoSection}>
                        <View style={styles.subscriptionInfoRow}>
                          <Text style={styles.subscriptionInfoLabel}>
                            {t(userLanguage, 'buyCards.modals.purchase.subscriptionType')}
                          </Text>
                          <View style={styles.subscriptionInfoBadge}>
                            <Ionicons name="calendar" size={14} color="#FFD700" />
                            <Text style={styles.subscriptionInfoText}>{t(userLanguage, 'buyCards.modals.purchase.monthly')}</Text>
                          </View>
                        </View>

                        <View style={styles.subscriptionDetails}>
                          <View style={styles.subscriptionDetailRow}>
                            <Ionicons name="time" size={14} color="#666" />
                            <Text style={styles.subscriptionDetailText}>
                              {t(userLanguage, 'buyCards.modals.purchase.duration', { days: selectedCardForPurchase.subscriptionDuration })}
                            </Text>
                          </View>
                          <View style={styles.subscriptionDetailRow}>
                            <Ionicons name="refresh" size={14} color="#666" />
                            <Text style={styles.subscriptionDetailText}>
                              {t(userLanguage, 'buyCards.modals.purchase.autoRenewal')}
                            </Text>
                          </View>
                          <View style={styles.subscriptionDetailRow}>
                            <Ionicons name="information-circle" size={14} color="#666" />
                            <Text style={styles.subscriptionDetailText}>
                              {t(userLanguage, 'buyCards.modals.purchase.accessExpires', { days: selectedCardForPurchase.subscriptionDuration })}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.cancelModalButton}
                    onPress={() => setShowPurchaseModal(false)}
                  >
                    <Text style={styles.cancelModalButtonText}>{t(userLanguage, 'buyCards.buttons.cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.purchaseModalButton,
                      selectedCardForPurchase.isVip &&
                        styles.vipPurchaseModalButton,
                      (availableBalance < selectedCardForPurchase.price ||
                        purchasing ||
                        (selectedCardForPurchase.requiresVipStatus &&
                          !hasVipStatus())) &&
                        styles.disabledModalButton,
                    ]}
                    onPress={() => {
                      setSelectedCard(selectedCardForPurchase.id);
                      confirmPurchase();
                    }}
                    disabled={
                      availableBalance < selectedCardForPurchase.price ||
                      purchasing ||
                      (selectedCardForPurchase.requiresVipStatus &&
                        !hasVipStatus())
                    }
                  >
                    {purchasing ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <View style={styles.purchaseButtonContent}>
                        <Ionicons
                          name={
                            selectedCardForPurchase.isVip ? "diamond" : "card"
                          }
                          size={18}
                          color="white"
                        />
                        <Text style={styles.purchaseModalButtonText}>
                          {availableBalance < selectedCardForPurchase.price
                            ? t(userLanguage, 'buyCards.modals.purchase.actionButtons.insufficientBalance')
                            : selectedCardForPurchase.requiresVipStatus &&
                              !hasVipStatus()
                            ? t(userLanguage, 'buyCards.modals.purchase.actionButtons.vipRequired')
                            : selectedCardForPurchase.isSubscription
                            ? t(userLanguage, 'buyCards.modals.purchase.actionButtons.subscribe', { type: selectedCardForPurchase.subscriptionType })
                            : selectedCardForPurchase.isVip
                            ? t(userLanguage, 'buyCards.modals.purchase.actionButtons.purchaseVip')
                            : t(userLanguage, 'buyCards.modals.purchase.actionButtons.purchase')}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* VIP7 Info Modal */}
      <Modal
        visible={showVip7InfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVip7InfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.vip7InfoModalContent}>
            {/* Header */}
            <View style={styles.vip7InfoModalHeader}>
              <View style={styles.vip7InfoHeaderLeft}>
                <View style={styles.vip7InfoIconContainer}>
                  <Ionicons name="diamond" size={24} color="#FFD700" />
                </View>
                <View>
                  <Text style={styles.vip7InfoModalTitle}>
                    {t(userLanguage, 'buyCards.modals.vipCardInfo.title')}
                  </Text>
                  <Text style={styles.vip7InfoModalSubtitle}>
                    {t(userLanguage, 'buyCards.modals.vipCardInfo.subtitle')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowVip7InfoModal(false)}
                style={styles.vip7InfoCloseButton}
              >
                <Ionicons name="close-circle" size={28} color="white" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.vip7InfoModalBody}>
              <View style={styles.vip7InfoSection}>
                <View style={styles.vip7InfoIconRow}>
                  <Ionicons name="information-circle" size={20} color="#4CAF50" />
                  <Text style={styles.vip7InfoSectionTitle}>{t(userLanguage, 'buyCards.modals.vipCardInfo.howToGet')}</Text>
                </View>
                <Text style={styles.vip7InfoDescription}>
                  {t(userLanguage, 'buyCards.modals.vipCardInfo.howToGetDescription')}
                </Text>
              </View>

              <View style={styles.vip7InfoSection}>
                <View style={styles.vip7InfoIconRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.vip7InfoSectionTitle}>{t(userLanguage, 'buyCards.modals.vipCardInfo.requirements')}</Text>
                </View>
                <View style={styles.vip7InfoRequirement}>
                  <Text style={styles.vip7InfoRequirementText}>
                    • {t(userLanguage, 'buyCards.modals.vipCardInfo.requirementsList.0')}
                  </Text>
                  <Text style={styles.vip7InfoRequirementText}>
                    • {t(userLanguage, 'buyCards.modals.vipCardInfo.requirementsList.1')}
                  </Text>
                  <Text style={styles.vip7InfoRequirementText}>
                    • {t(userLanguage, 'buyCards.modals.vipCardInfo.requirementsList.2')}
                  </Text>
                </View>
              </View>

              <View style={styles.vip7InfoSection}>
                <View style={styles.vip7InfoIconRow}>
                  <Ionicons name="star" size={20} color="#FFD700" />
                  <Text style={styles.vip7InfoSectionTitle}>{t(userLanguage, 'buyCards.modals.vipCardInfo.yourStatus')}</Text>
                </View>
                <View
                  style={[
                    styles.vip7InfoStatusContainer,
                    hasVipStatus()
                      ? styles.vip7InfoStatusQualified
                      : styles.vip7InfoStatusNotQualified,
                  ]}
                >
                  <Ionicons
                    name={hasVipStatus() ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={hasVipStatus() ? "#4CAF50" : "#f44336"}
                  />
                  <Text
                    style={[
                      styles.vip7InfoStatusText,
                      hasVipStatus()
                        ? styles.vip7InfoStatusQualifiedText
                        : styles.vip7InfoStatusNotQualifiedText,
                    ]}
                  >
                    {hasVipStatus()
                      ? isCardPurchased("vip7")
                        ? t(userLanguage, 'buyCards.messages.alreadyClaimed')
                        : t(userLanguage, 'buyCards.modals.vipCardInfo.qualified')
                      : t(userLanguage, 'buyCards.modals.vipCardInfo.notQualified')}
                  </Text>
                </View>

                {/* Warning for users who have the card but might lose it */}
                {!hasVipStatus() && isCardPurchased("vip7") && (
                  <View style={styles.vip7InfoWarningContainer}>
                    <Ionicons name="warning" size={16} color="#f44336" />
                    <Text style={styles.vip7InfoWarningText}>
                      {t(userLanguage, 'buyCards.modals.vipCardInfo.warning')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.vip7InfoModalFooter}>
              {hasVipStatus() && !isCardPurchased("vip7") && (
                <TouchableOpacity
                  style={styles.vip7InfoModalButton}
                  onPress={handleClaimVip7}
                >
                                      <Text style={styles.vip7InfoModalButtonText}>
                      {t(userLanguage, 'buyCards.modals.vipCardInfo.claimButton')}
                    </Text>
                </TouchableOpacity>
              )}
              {(!hasVipStatus() || isCardPurchased("vip7")) && (
                <TouchableOpacity
                  style={styles.vip7InfoModalButton}
                  onPress={() => setShowVip7InfoModal(false)}
                >
                                          <Text style={styles.vip7InfoModalButtonText}>{t(userLanguage, 'buyCards.buttons.gotIt')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button - Scroll to Preview */}
      {showScrollToTop && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={scrollToPreview}
          activeOpacity={0.8}
        >
          <View style={styles.floatingButtonContent}>
            <Ionicons name="eye" size={20} color="white" />
            <Text style={styles.floatingButtonText}>{t(userLanguage, 'buyCards.buttons.preview')}</Text>
          </View>
        </TouchableOpacity>
      )}

      <ProfessionalModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        showCloseButton={modalConfig.showCloseButton}
        onConfirm={modalConfig.onConfirm}
        confirmText={modalConfig.confirmText}
        showCancelButton={modalConfig.showCancelButton}
        cancelText={modalConfig.cancelText}
      />

      {/* Subscription Details Modal */}
      <Modal
        visible={showSubscriptionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSubscriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.purchaseModalContent, { padding: 0, overflow: 'visible', shadowRadius: 24, shadowOpacity: 0.25 }]}> 
            {selectedSubscriptionCard && (
              <>
                {/* Gradient Header */}
                <View style={styles.subscriptionModalHeader}>
                  <View style={styles.subscriptionModalHeaderIconWrap}>
                    <Ionicons name="calendar" size={28} color="#fff" />
                  </View>
                  <Text style={styles.subscriptionModalHeaderTitle}>{t(userLanguage, 'buyCards.modals.subscription.title')}</Text>
                  <TouchableOpacity
                    onPress={() => setShowSubscriptionModal(false)}
                    style={styles.subscriptionModalCloseButton}
                  >
                    <Ionicons name="close" size={26} color="#fff" />
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  style={styles.subscriptionModalScrollView}
                  contentContainerStyle={styles.subscriptionModalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Header Section */}
                  <View style={styles.subscriptionModalHeaderSection}>
                    <Text style={styles.subscriptionModalCardName}>
                      {selectedSubscriptionCard.cardName}
                    </Text>
                    <Text style={styles.subscriptionModalSubtitle}>
                      {t(userLanguage, 'buyCards.modals.subscription.subtitle')}
                    </Text>
                  </View>

                  {/* Days Remaining Section */}
                  <View style={styles.daysRemainingSection}>
                    <View style={styles.daysRemainingBadgeCircle}>
                      <Text style={styles.daysRemainingBadgeNumber}>{getSubscriptionDaysRemaining(selectedSubscriptionCard)}</Text>
                      <Text style={styles.daysRemainingBadgeLabel}>{t(userLanguage, 'buyCards.subscriptionStatus.daysLeft')}</Text>
                    </View>
                    <View style={styles.subscriptionProgressBarWrap}>
                      <View style={styles.subscriptionProgressBarBg}>
                        <View style={[styles.subscriptionProgressBarFg, { width: `${Math.max(0, Math.min(100, 100 * getSubscriptionDaysRemaining(selectedSubscriptionCard) / selectedSubscriptionCard.subscriptionDuration))}%` }]} />
                      </View>
                    </View>
                  </View>

                  {/* Info Cards Section */}
                  <View style={styles.subscriptionInfoCardsContainer}>
                    {/* Renewal Info Card */}
                    <View style={styles.subscriptionInfoCard}>
                      <View style={styles.infoCardHeader}>
                        <Ionicons name="stats-chart" size={20} color="#3B82F6" />
                        <Text style={styles.infoCardTitle}>{t(userLanguage, 'buyCards.modals.subscription.subscriptionDetails')}</Text>
                      </View>
                      <View style={styles.infoCardContent}>
                        <View style={styles.infoCardRow}>
                          <Text style={styles.infoCardLabel}>{t(userLanguage, 'buyCards.modals.subscription.totalRenewals')}</Text>
                          <Text style={styles.infoCardValue}>{selectedSubscriptionCard.renewalCount || 0}</Text>
                        </View>
                        <View style={styles.infoCardRow}>
                          <Text style={styles.infoCardLabel}>{t(userLanguage, 'buyCards.modals.subscription.totalPaid')}</Text>
                          <Text style={styles.infoCardValue}>₱{(selectedSubscriptionCard.totalAmountPaid || 10000).toLocaleString()}</Text>
                        </View>
                        {selectedSubscriptionCard.lastRenewalDate && (
                          <View style={styles.infoCardRow}>
                            <Text style={styles.infoCardLabel}>{t(userLanguage, 'buyCards.modals.subscription.lastRenewal')}</Text>
                            <Text style={styles.infoCardValue}>
                              {new Date(selectedSubscriptionCard.lastRenewalDate?.toDate ? selectedSubscriptionCard.lastRenewalDate.toDate() : selectedSubscriptionCard.lastRenewalDate).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Auto-Renewal Card */}
                    <View style={styles.subscriptionInfoCard}>
                      <View style={styles.infoCardHeader}>
                        <Ionicons name="refresh" size={20} color="#4CAF50" />
                        <Text style={styles.infoCardTitle}>{t(userLanguage, 'buyCards.modals.subscription.autoRenewal')}</Text>
                      </View>
                      <View style={styles.autoRenewalContent}>
                        <Text style={styles.autoRenewalStatusText}>
                          {selectedSubscriptionCard.autoRenewal ? (
                            <>
                              <Text style={{ color: "#4CAF50", fontWeight: "bold" }}>{t(userLanguage, 'buyCards.subscriptionStatus.active')}</Text> - {t(userLanguage, 'buyCards.modals.subscription.autoRenewalActive')}
                            </>
                          ) : (
                            <>
                              <Text style={{ color: "#f44336", fontWeight: "bold" }}>{t(userLanguage, 'buyCards.subscriptionStatus.expired')}</Text> - {t(userLanguage, 'buyCards.modals.subscription.autoRenewalDisabled')}
                            </>
                          )}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.autoRenewalToggle,
                            selectedSubscriptionCard.autoRenewal && styles.autoRenewalToggleActive
                          ]}
                          onPress={() => handleToggleAutoRenewal(selectedSubscriptionCard)}
                        >
                          <View style={[
                            styles.autoRenewalToggleThumb,
                            selectedSubscriptionCard.autoRenewal && styles.autoRenewalToggleThumbActive
                          ]} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Warning Section */}
                  {!selectedSubscriptionCard.autoRenewal && getSubscriptionDaysRemaining(selectedSubscriptionCard) <= 7 && (
                    <View style={styles.subscriptionExpirationWarningBox}>
                      <Ionicons name="time" size={18} color="#FF9800" style={{ marginRight: 8 }} />
                      <Text style={styles.subscriptionExpirationWarningText}>
                        {t(userLanguage, 'buyCards.modals.subscription.expirationWarning', { days: getSubscriptionDaysRemaining(selectedSubscriptionCard) })}
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.subscriptionModalButtonsContainer}>
                    <TouchableOpacity
                      style={styles.subscriptionCancelButton}
                      onPress={handleCancelSubscription}
                    >
                      <Ionicons name="trash" size={16} color="white" />
                      <Text style={styles.subscriptionCancelButtonText}>{t(userLanguage, 'buyCards.modals.subscription.actionButtons.cancelSubscription')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.subscriptionCloseButton}
                      onPress={() => setShowSubscriptionModal(false)}
                    >
                                              <Text style={styles.subscriptionCloseButtonText}>{t(userLanguage, 'buyCards.buttons.close')}</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  androidSafeArea: {
    paddingTop: Platform.OS === "android" ? 80 : 0,
    opacity: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.redTheme.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: getResponsiveValue(10, 12, 15),
    paddingTop: getResponsiveValue(15, 20, 25),
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: getResponsiveValue(6, 8, 10),
  },
  headerSubtitle: {
    fontSize: getResponsiveFontSize(16),
    color: "#666",
    textAlign: "center",
    paddingHorizontal: getResponsiveValue(10, 15, 20),
    lineHeight: getResponsiveValue(20, 22, 24),
  },
  balanceSection: {
    padding: getResponsivePadding(),
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginTop: 1,
  },
  previewSection: {
    padding: getResponsivePadding(),
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginTop: getResponsiveValue(5, 8, 10),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: getResponsiveValue(8, 10, 12),
    letterSpacing: getResponsiveValue(0.3, 0.5, 0.7),
  },
  vipSectionTitle: {
    color: "#1E293B", // Professional dark slate for VIP section
  },
  sectionSubtitle: {
    fontSize: getResponsiveFontSize(14),
    color: "#666",
    lineHeight: getResponsiveValue(18, 20, 22),
    marginTop: getResponsiveValue(3, 5, 7),
    paddingHorizontal: getResponsiveValue(5, 8, 10),
  },
  cardPreviewContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  selectionSection: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginTop: getResponsiveValue(5, 6, 8), // Reduced from 10 to be more professional
    borderRadius: getResponsiveValue(12, 15, 18),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
    marginHorizontal: getResponsiveValue(5, 8, 10),
  },
  selectionHeader: {
    padding: getResponsivePadding(),
    paddingBottom: getResponsiveValue(12, 15, 18),
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  designGrid: {
    padding: getResponsiveValue(10, 15, 20),
    paddingTop: getResponsiveValue(3, 5, 8),
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: isTablet ? "flex-start" : "space-between",
  },
  designCard: {
    width: isTablet ? (screenWidth - 120) / 3 : getResponsiveCardWidth(),
    marginBottom: getResponsiveValue(15, 20, 25),
    marginRight: isTablet ? 15 : 0,
  },
  selectedDesignCard: {
    transform: [{ scale: 1.02 }],
  },
  ownedDesignCard: {
    opacity: 0.95,
  },
  designCardContainer: {
    borderRadius: getResponsiveValue(12, 15, 18),
    backgroundColor: "#f8f9fa",
    borderWidth: getResponsiveValue(1.5, 2, 2.5),
    borderColor: "#e9ecef",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: getResponsiveValue(3, 4, 5),
    elevation: 3,
  },
  selectedDesignContainer: {
    borderColor: Colors.redTheme.background,
    borderWidth: 3,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: "#fff",
  },
  ownedDesignContainer: {
    borderColor: "#4CAF50",
    borderWidth: 2,
    backgroundColor: "#f9fff9",
  },
  designImageWrapper: {
    position: "relative",
    height: getResponsiveValue(120, 140, 160),
    backgroundColor: "#fff",
  },
  designCardImage: {
    width: "100%",
    height: "100%",
  },
  selectionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(254, 125, 72, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  selectionBadge: {
    backgroundColor: "rgba(254, 125, 72, 0.9)",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  ownershipBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(34, 197, 94, 0.95)", // Professional green
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  ownershipText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  priceBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
  },
  designCardInfo: {
    padding: getResponsiveValue(12, 15, 18),
    backgroundColor: "#f8f9fa",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  selectedCardInfo: {
    backgroundColor: "#fff5f5",
    borderTopColor: Colors.redTheme.background,
  },
  ownedCardInfo: {
    backgroundColor: "#f0fff0",
    borderTopColor: "#4CAF50",
  },
  designCardName: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
    marginBottom: getResponsiveValue(6, 8, 10),
    letterSpacing: getResponsiveValue(0.2, 0.3, 0.4),
  },
  selectedCardName: {
    color: Colors.redTheme.background,
    fontWeight: "bold",
  },
  ownedCardName: {
    color: "#2E7D32",
    fontWeight: "bold",
  },
  statusContainer: {
    alignItems: "center",
  },
  ownedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ownedStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4CAF50",
    marginLeft: 4,
  },
  selectedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectedStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.redTheme.background,
    marginLeft: 4,
  },
  availableIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availableStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    marginLeft: 4,
  },
  selectionGlow: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 17,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(254, 125, 72, 0.3)",
  },
  purchasedSection: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginTop: getResponsiveValue(5, 6, 8),
    borderRadius: getResponsiveValue(12, 15, 18),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
    marginHorizontal: getResponsiveValue(5, 8, 10),
  },
  purchasedHeader: {
    padding: getResponsivePadding(),
    paddingBottom: getResponsiveValue(12, 15, 18),
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardsContainer: {
    padding: 15,
    paddingTop: 5,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  purchasedCard: {
    width: (screenWidth - 75) / 2,
    marginBottom: 20,
  },
  activeCard: {
    transform: [{ scale: 1.03 }],
  },
  inactiveCard: {
    opacity: 0.9,
  },
  cardContainer: {
    height: 140,
    borderRadius: 15,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "#e9ecef",
  },
  activeCardContainer: {
    borderWidth: 3,
    borderColor: "#3B82F6", // Professional blue
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 12,
    backgroundColor: "#F8FAFC", // Clean light background
  },
  purchasedCardImage: {
    width: "100%",
    height: "75%",
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  activeStatusBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(59, 130, 246, 0.95)", // Professional blue
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  activeStatusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  ownedStatusBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(76, 175, 80, 0.95)",
    borderRadius: 10,
    padding: 6,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  cardInfoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "25%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  activeCardInfoOverlay: {
    backgroundColor: "rgba(59, 130, 246, 0.9)", // Professional blue
  },
  inactiveCardInfoOverlay: {
    backgroundColor: "rgba(76, 175, 80, 0.9)",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  activeCardTitle: {
    color: "#FFFFFF",
  },
  inactiveCardTitle: {
    color: "white",
  },
  activeIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 4,
  },
  activeLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  glowEffect: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 17,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)", // Professional blue glow
  },
  purchaseSection: {
    padding: getResponsivePadding(),
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginTop: getResponsiveValue(5, 8, 10),
    marginBottom: getResponsiveValue(15, 20, 25),
    marginHorizontal: getResponsiveValue(5, 8, 10),
    borderRadius: getResponsiveValue(12, 15, 18),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: getResponsiveValue(15, 20, 25),
    padding: getResponsiveValue(12, 15, 18),
    backgroundColor: "#f9f9f9",
    borderRadius: getResponsiveValue(6, 8, 10),
  },
  priceLabel: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: "600",
    color: "#333",
  },
  priceValue: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: "bold",
    color: Colors.redTheme.background,
  },
  purchaseButton: {
    backgroundColor: Colors.redTheme.background,
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  buttonIcon: {
    marginRight: 8,
  },
  purchaseButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  warningText: {
    marginTop: 10,
    fontSize: 14,
    color: "#ff6b6b",
    textAlign: "center",
  },
  ownedWarningText: {
    marginTop: 10,
    fontSize: 14,
    color: "#4CAF50",
    textAlign: "center",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    minHeight: screenHeight,
  },
  modalContentScroll: {
    flex: 1,
    backgroundColor: "white",
  },

  // VIP Card Styles - Professional Design
  vipBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(30, 41, 59, 0.95)", // Professional dark slate
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 15, // Higher than other badges
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)", // Subtle silver border
  },
  vipText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 4,
    letterSpacing: 0.8,
  },
  vipPriceBadge: {
    backgroundColor: "rgba(30, 41, 59, 0.95)", // Professional dark slate
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
  },
  vipPriceText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  vipPriceValue: {
    color: "#3B82F6", // Professional blue
    textShadowColor: "rgba(59, 130, 246, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  vipLabel: {
    fontSize: 14,
    color: "#3B82F6", // Professional blue
    fontWeight: "bold",
  },
  vipPurchaseButton: {
    backgroundColor: "#1E293B", // Dark professional background
    borderWidth: 2,
    borderColor: "#3B82F6", // Professional blue border
  },

  // Floating Action Button Styles
  floatingButton: {
    position: "absolute",
    bottom: getResponsiveValue(25, 30, 35),
    right: getResponsiveValue(15, 20, 25),
    backgroundColor: Colors.redTheme.background,
    borderRadius: getResponsiveValue(24, 28, 32),
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  floatingButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveValue(14, 16, 18),
    paddingVertical: getResponsiveValue(10, 12, 14),
  },
  floatingButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: getResponsiveFontSize(14),
    marginLeft: getResponsiveValue(4, 6, 8),
  },
  backButton: {
    padding: 10,
  },

  // Purchase Modal Styles
  purchaseModalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    width: screenWidth - 40,
    maxWidth: 400,
    height: screenHeight * 0.85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
    overflow: "hidden",
    flexDirection: "column",
  },

  // Header Section
  purchaseModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.redTheme.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: 80,
  },
  headerLeftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  purchaseModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  purchaseModalSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  closeButton: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },

  // Card Preview Section
  modalCardPreview: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "white",
    minHeight: 280,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardPreviewContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  cardWrapper: {
    width: getResponsiveValue(240, 260, 280),
    height: getResponsiveValue(150, 165, 180),
    alignItems: "center",
    justifyContent: "center",
  },
  modalCardWrapper: {
    width: getResponsiveValue(300, 320, 340),
    height: getResponsiveValue(210, 225, 240),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  inspCardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scale: getResponsiveValue(0.8, 0.85, 0.9) }],
  },

  // Card Details Section
  cardDetailsSection: {
    padding: 12,
    paddingTop: 8,
    backgroundColor: "white",
    minHeight: 150,
  },
  cardNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  cardDetailsName: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    textAlign: "center",
    marginRight: 8,
  },
  modalVipBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FFD700",
    marginTop: 4,
  },
  modalVipText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#B8860B",
    marginLeft: 4,
    letterSpacing: 0.8,
  },

  // Price Display
  priceDisplay: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  priceLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardDetailsPrice: {
    fontSize: 26,
    fontWeight: "bold",
    color: Colors.redTheme.background,
  },
  vipPrice: {
    color: "#B8860B",
  },

  // Balance Section
  balanceSection: {
    padding: getResponsivePadding(),
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginTop: 1,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  insufficientBalance: {
    color: "#f44336",
  },

  // Status Indicators
  sufficientIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.2)",
  },
  sufficientText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 8,
  },
  insufficientIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.2)",
  },
  insufficientText: {
    fontSize: 14,
    color: "#f44336",
    fontWeight: "600",
    marginLeft: 8,
  },

  // Modal Footer
  modalFooter: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: 12,
    backgroundColor: "white",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    gap: 12,
    minHeight: 70,
  },
  cancelModalButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
  },
  purchaseModalButton: {
    flex: 2,
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  vipPurchaseModalButton: {
    backgroundColor: "#B8860B",
    shadowColor: "#B8860B",
  },
  disabledModalButton: {
    backgroundColor: "#ccc",
    shadowOpacity: 0.1,
  },
  purchaseButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  purchaseModalButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },

  // VIP Card Styles - Professional Design
  vipRequiredIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 53, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.3)",
  },
  vipRequiredStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FF6B35",
    marginLeft: 4,
  },

  // Lock Overlay Styles
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  lockContainer: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  lockText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FF6B35",
    marginLeft: 8,
  },
  vipStatusSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  vipStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  vipStatusLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  vipStatusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
    justifyContent: "center",
    alignItems: "center",
  },
  vipStatusSufficient: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    padding: 5,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.2)",
  },
  vipStatusSufficientText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 5,
  },
  vipStatusInsufficient: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    padding: 5,
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.2)",
  },
  vipStatusInsufficientText: {
    fontSize: 12,
    color: "#f44336",
    fontWeight: "600",
    marginLeft: 5,
  },
  vvipSectionTitle: {
    color: "#FFD700", // Yellow for VVIP section
  },
  vvipRequiredIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 53, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.3)",
  },
  vvipRequiredStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FF6B35",
    marginLeft: 4,
  },
  vvipBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(255, 215, 0, 0.95)", // Yellow for VVIP
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 15, // Higher than other badges
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)", // Subtle silver border
  },
  vvipText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 4,
    letterSpacing: 0.8,
  },
  vvipPriceBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.95)", // Yellow for VVIP
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
  },
  vvipPriceText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  vvipPriceValue: {
    color: "#FFD700", // Yellow for VVIP
    textShadowColor: "rgba(255, 215, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // VIP7 Info Modal Styles
  vip7InfoModalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    width: screenWidth - 40,
    maxWidth: 400,
    maxHeight: screenHeight * 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
    overflow: "hidden",
  },
  vip7InfoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.redTheme.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  vip7InfoHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  vip7InfoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vip7InfoModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  vip7InfoModalSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  vip7InfoCloseButton: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  vip7InfoModalBody: {
    padding: 20,
    backgroundColor: "white",
  },
  vip7InfoSection: {
    marginBottom: 20,
  },
  vip7InfoIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  vip7InfoSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  vip7InfoDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    paddingLeft: 28,
  },
  vip7InfoRequirement: {
    paddingLeft: 28,
  },
  vip7InfoRequirementText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 4,
  },
  vip7InfoStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginLeft: 28,
  },
  vip7InfoStatusQualified: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.2)",
  },
  vip7InfoStatusNotQualified: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.2)",
  },
  vip7InfoStatusText: {
    fontSize: Platform.OS === "android" ? 12 : 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  vip7InfoStatusQualifiedText: {
    color: "#4CAF50",
  },
  vip7InfoStatusNotQualifiedText: {
    color: "#f44336",
  },
  vip7InfoWarningContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginLeft: 28,
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.2)",
  },
  vip7InfoWarningText: {
    fontSize: 13,
    color: "#f44336",
    fontWeight: "600",
    marginLeft: 8,
    lineHeight: 18,
  },
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  claimButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFD700",
    marginLeft: 4,
  },
  vip7InfoModalFooter: {
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  vip7InfoModalButton: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  vip7InfoModalButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },

  // Subscription Card Styles
  subscriptionIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  subscriptionStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFD700",
    marginLeft: 4,
  },
  expiredIndicator: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderColor: "rgba(244, 67, 54, 0.3)",
  },
  expiredStatusText: {
    color: "#f44336",
  },
  warningIndicator: {
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    borderColor: "rgba(255, 152, 0, 0.3)",
  },
  warningStatusText: {
    color: "#FF9800",
  },

  // Subscription Info Modal Styles
  subscriptionInfoSection: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "rgba(255, 215, 0, 0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  subscriptionInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  subscriptionInfoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  subscriptionInfoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  subscriptionInfoText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFD700",
    marginLeft: 4,
  },
  subscriptionDetails: {
    marginTop: 8,
  },
  subscriptionDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  subscriptionDetailText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  subscriptionModalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  subscriptionModalScrollView: {
    flex: 1,
  },
  subscriptionModalScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 32,
  },
  subscriptionModalHeaderSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  subscriptionModalCardName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.redTheme.background,
    textAlign: 'center',
    marginBottom: 4,
  },
  subscriptionModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  daysRemainingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  subscriptionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: undefined,
    // Gold gradient background
    backgroundImage: 'linear-gradient(90deg, #FFD700 0%, #FFB300 100%)',
    backgroundColor: '#FFD700', // fallback for React Native
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  subscriptionModalHeaderIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    padding: 8,
    marginRight: 10,
  },
  subscriptionModalHeaderTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subscriptionModalCloseButton: {
    marginLeft: 10,
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  daysRemainingBadgeWrap: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.redTheme.background,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  subscriptionExpiryInfo: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  daysRemainingBadgeCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,215,0,0.18)',
    borderWidth: 3,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  daysRemainingBadgeNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    lineHeight: 40,
  },
  daysRemainingBadgeLabel: {
    fontSize: 13,
    color: '#FFD700',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -2,
    letterSpacing: 0.5,
  },
  subscriptionInfoCardsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 20,
  },
  subscriptionInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  infoCardContent: {
    gap: 8,
  },
  infoCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoCardLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoCardValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  autoRenewalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoRenewalStatusText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 12,
  },
  subscriptionProgressBarWrap: {
    width: '70%',
    marginVertical: 8,
    alignItems: 'center',
  },
  subscriptionProgressBarBg: {
    width: '100%',
    height: 10,
    borderRadius: 6,
    backgroundColor: '#F3E5AB',
    overflow: 'hidden',
  },
  subscriptionProgressBarFg: {
    height: 10,
    borderRadius: 6,
    backgroundColor: '#FFD700',
  },
  subscriptionWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.18)',
    width: '100%',
  },
  subscriptionWarningText: {
    fontSize: 13,
    color: '#f44336',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  subscriptionAutoRenewalBox: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.18)',
    width: '100%',
  },
  autoRenewalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  autoRenewalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  autoRenewalStatus: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    flex: 1,
  },
  autoRenewalToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  autoRenewalToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    padding: 2,
    justifyContent: 'center',
  },
  autoRenewalToggleActive: {
    backgroundColor: '#4CAF50',
  },
  autoRenewalToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    transform: [{ translateX: 0 }],
  },
  autoRenewalToggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  subscriptionExpirationWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.18)',
    width: '100%',
  },
  subscriptionExpirationWarningText: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  subscriptionRenewalInfoBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.18)',
    width: '100%',
  },
  renewalInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  renewalInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  renewalInfoDetails: {
    marginTop: 4,
  },
  renewalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  renewalInfoLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  renewalInfoValue: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  subscriptionModalButtonsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  subscriptionCancelButton: {
    backgroundColor: '#f44336',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  subscriptionCancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  subscriptionCloseButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  subscriptionCloseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
});
