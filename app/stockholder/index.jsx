import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
  Platform,
  Modal,
  Animated,
  useRef,
  ScrollView,
  Dimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter, useNavigation } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { auth, firestore } from "../../configs/firebase";
import { doc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import StockTransaction from "../../components/StockTransaction";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import AmountContent from "../../components/AmountContent";
import { BlurView } from "expo-blur";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

const { width } = Dimensions.get("window");
const isSmallDevice = width < 375;
const isMediumDevice = width >= 375 && width < 414;

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();
  const [data, setUserData] = useState({});
  const [userId, setUserId] = useState();
  const [userLanguage, setUserLanguage] = useState("English");
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  const STOCK_RATE = 2000000; // 1 stock = 2,000,000 PHP

  const formatCurrency = (amount) => {
    const value = Number(amount);
    if (isNaN(value)) return "0.00";
    return value.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatStockCount = (amount) => {
    const value = Number(amount);
    if (isNaN(value)) return "0";
    // Format to up to 4 decimal places, then remove trailing zeros
    const formatted = value.toLocaleString("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
    // Remove trailing zeros and decimal point if not needed
    return formatted.replace(/\.?0+$/, "") || "0";
  };

  // Update stock count in Firebase whenever stockAmount changes
  const updateStockCount = async (stockAmount, uid) => {
    try {
      const stockCount = stockAmount / STOCK_RATE;
      const userDocRef = doc(firestore, "users", uid);
      await updateDoc(userDocRef, {
        stockCount: stockCount,
        lastStockCountUpdate: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating stock count:", error);
    }
  };

  // Fetch user language
  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          // Normalize language name to match languageUtils mapping
          const preferredLang = data.preferredLanguage || "English";
          // Map common variations to correct format
          const languageMap = {
            "english": "English",
            "japanese": "Japanese",
            "saudi arabia": "Saudi Arabia",
            "arabic": "Saudi Arabia",
            "korea": "Korea",
            "korean": "Korea"
          };
          const normalizedLang = languageMap[preferredLang.toLowerCase()] || preferredLang;
          setUserLanguage(normalizedLang);
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserId(user.uid);
      fetchUserLanguage();

      // Real-time listener for user data
      const userDocRef = doc(firestore, "users", user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          setUserData(userData);

          // Update language if it changed
          if (userData.preferredLanguage) {
            const languageMap = {
              "english": "English",
              "japanese": "Japanese",
              "saudi arabia": "Saudi Arabia",
              "arabic": "Saudi Arabia",
              "korea": "Korea",
              "korean": "Korea"
            };
            const normalizedLang = languageMap[userData.preferredLanguage.toLowerCase()] || userData.preferredLanguage;
            if (normalizedLang !== userLanguage) {
              setUserLanguage(normalizedLang);
            }
          }

          // Update stock count if stockAmount exists and stockCount doesn't match
          if (userData.stockAmount !== undefined) {
            const calculatedStockCount = userData.stockAmount / STOCK_RATE;
            const currentStockCount = userData.stockCount || 0;

            // Only update if there's a difference (to avoid unnecessary writes)
            if (Math.abs(calculatedStockCount - currentStockCount) > 0.001) {
              updateStockCount(userData.stockAmount, user.uid);
            }
          }
        } else {
          showModal({
            title: t(userLanguage, "stockholder.modals.dataError.title"),
            message: t(userLanguage, "stockholder.modals.dataError.message"),
            type: "error",
          });
        }
      });

      return () => unsubscribeUser();
    }
  }, [userLanguage]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: "Stockholder Dashboard",
      headerTransparent: true,
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        color: Colors.redTheme.background,
        fontSize: 18,
        fontWeight: "bold",
      },
    });
  }, [userLanguage]);

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContainer}>
          {/* Stock Rate Info Banner */}
          <View style={styles.stockRateBanner}>
            <View style={styles.stockRateIconWrapper}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
            </View>
            <View style={styles.stockRateTextContainer}>
              <Text style={[styles.stockRateLabel, getRTLStyles(userLanguage)]}>
                Stock Rate
              </Text>
              <Text style={[styles.stockRateValue, getRTLStyles(userLanguage)]}>
                1 Stock = ₱ {formatCurrency(STOCK_RATE)}
              </Text>
            </View>
          </View>

          {/* Stock Balance Card */}
          <View style={styles.balanceCard}>
            {/* Gradient Header */}
            <LinearGradient
              colors={['#E15816', '#F48F38']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradientHeader}
            >
              <View style={styles.stockIconWrapper}>
                <Ionicons name="trending-up" size={32} color="white" />
              </View>
              <View style={styles.stockHeaderInfo}>
                <Text style={[styles.stockHeaderLabel, getRTLStyles(userLanguage)]}>
                  Your Stock Portfolio
                </Text>
                <View style={styles.stockCountRow}>
                  <Text style={[styles.stockCountNumber, getRTLStyles(userLanguage)]}>
                    {formatStockCount(data.stockCount || (data.stockAmount || 0) / STOCK_RATE)}
                  </Text>
                  <Text style={[styles.stockCountUnit, getRTLStyles(userLanguage)]}>
                    {(data.stockCount || (data.stockAmount || 0) / STOCK_RATE) === 1 ? "Stock" : "Stocks"}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Total Value Section */}
            <View style={styles.totalValueContainer}>
              <View style={styles.totalValueHeader}>
                <Ionicons name="wallet" size={22} color="#1a1a1a" />
                <Text style={[styles.totalValueLabel, getRTLStyles(userLanguage)]}>
                  Total Portfolio Value
                </Text>
              </View>
              <Text style={[styles.totalValueAmount, getRTLStyles(userLanguage)]}>
                ₱ {formatCurrency(data.stockAmount || 0)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.buyButton}
              onPress={() => router.push("deposit")}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={24} color="white" />
              <Text style={[styles.buyButtonText, getRTLStyles(userLanguage)]}>
                BUY
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sellButton}
              onPress={() => router.push("stocktransfer")}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward-circle-outline" size={24} color="white" />
              <Text style={[styles.sellButtonText, getRTLStyles(userLanguage)]}>
                SELL
              </Text>
            </TouchableOpacity>
          </View>

          {/* Transaction History Section */}
          <View style={styles.transactionSection}>
            <View style={styles.transactionHeader}>
              <Ionicons name="time-outline" size={24} color={Colors.redTheme.background} />
              <Text style={[styles.transactionHeaderText, getRTLStyles(userLanguage)]}>
                Transaction History
              </Text>
            </View>
            <StockTransaction userId={userId} />
          </View>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.androidSafeAreaBottom} />

      <ProfessionalModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={hideModal}
        onConfirm={modalConfig.onConfirm}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: width * 0.04,
    paddingTop: Platform.OS === "ios" ? 4 : 8,
    paddingBottom: Platform.OS === "ios" ? 20 : 24,
  },

  // Stock Rate Banner
  stockRateBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  stockRateIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stockRateTextContainer: {
    flex: 1,
  },
  stockRateLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
    marginBottom: 4,
  },
  stockRateValue: {
    fontSize: 16,
    color: "#1a1a1a",
    fontWeight: "bold",
  },

  // Balance Card
  balanceCard: {
    backgroundColor: "white",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardGradientHeader: {
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  stockIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  stockHeaderInfo: {
    flex: 1,
  },
  stockHeaderLabel: {
    fontSize: 15,
    color: "white",
    fontWeight: "600",
    marginBottom: 8,
  },
  stockCountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  stockCountNumber: {
    fontSize: 40,
    fontWeight: "bold",
    color: "white",
  },
  stockCountUnit: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
  },

  // Total Value Section
  totalValueContainer: {
    padding: 24,
    backgroundColor: "white",
  },
  totalValueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  totalValueLabel: {
    fontSize: 15,
    color: "#1a1a1a",
    fontWeight: "600",
  },
  totalValueAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  // Action Buttons
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  buyButton: {
    flex: 1,
    backgroundColor: "#10B981",
    borderRadius: 50,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sellButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 50,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buyButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  sellButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  // Transaction Section
  transactionSection: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  transactionHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    flex: 1,
  },
  androidSafeArea: {
    paddingTop: Platform.OS === "android" ? 80 : 0,
    opacity: 0,
  },
  androidSafeAreaBottom: {
    paddingBottom: Platform.OS === "android" ? 20 : 0,
    opacity: 0,
  },
  backButton: {
    padding: 10,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    minWidth: 320,
    width: "90%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalIcon: {
    fontSize: 30,
    fontWeight: "bold",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: Colors.redTheme.background,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 120,
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
