import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  SafeAreaView,
  TouchableWithoutFeedback,
  ScrollView,
  Keyboard,
  TouchableOpacity,
  Platform,
  Modal,
  Animated,
  useRef,
  Dimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter, useNavigation } from "expo-router";
import { auth, firestore } from "../../configs/firebase";
import {
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  collection,
} from "firebase/firestore";
import TransactionDisplay from "../../components/AgentTransaction";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import AmountContent from "../../components/AmountContent";
import { BlurView } from "expo-blur";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { checkAccountTypeAccess } from "../../utils/accountTypeUtils";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { getDoc } from "firebase/firestore";

const { width } = Dimensions.get("window");
const isSmallDevice = width < 375;
const isMediumDevice = width >= 375 && width < 414;

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();
  const [data, setUserData] = useState({});
  const [userId, setUserId] = useState();
  const [userLanguage, setUserLanguage] = useState("english");
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserLanguage(data.preferredLanguage || "english");
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    checkAccessAndInitialize();
  }, []);

  const checkAccessAndInitialize = async () => {
    try {
      const { hasAccess, userAccountType } = await checkAccountTypeAccess(
        "Premium"
      );

      if (!hasAccess) {
        showModal({
          title: t(
            userLanguage,
            "agentDashboard.modals.accessRestricted.title"
          ),
          message: t(
            userLanguage,
            "agentDashboard.modals.accessRestricted.message"
          ).replace("{accountType}", userAccountType || "Basic"),
          type: "warning",
          onConfirm: () => {
            hideModal();
            router.replace("/main");
          },
        });
        return;
      }

      // If access is allowed, proceed with user initialization
      const user = auth.currentUser;
      if (user) {
        setUserId(user.uid);

        // Real-time listener for user data
        const userDocRef = doc(firestore, "users", user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            setUserData(userData);

            // Check if user is an agent
            if (!userData.agent) {
              showModal({
                title: t(
                  userLanguage,
                  "agentDashboard.modals.accessDenied.title"
                ),
                message: t(
                  userLanguage,
                  "agentDashboard.modals.accessDenied.message"
                ),
                type: "error",
                onConfirm: () => {
                  hideModal();
                  router.replace("/main");
                },
              });
              return;
            }

            // The agentWalletAmount will automatically update through userData
            console.log(
              "Agent Wallet Amount Updated:",
              userData.agentWalletAmount
            );
          } else {
            showModal({
              title: t(userLanguage, "agentDashboard.modals.dataError.title"),
              message: t(
                userLanguage,
                "agentDashboard.modals.dataError.message"
              ),
              type: "error",
            });
          }
        });

        return () => unsubscribeUser();
      }
    } catch (error) {
      console.error("Error checking account access:", error);
      showModal({
        title: t(userLanguage, "agentDashboard.modals.error.title"),
        message: t(userLanguage, "agentDashboard.modals.error.message"),
        type: "error",
        onConfirm: () => {
          hideModal();
          router.replace("/main");
        },
      });
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: t(userLanguage, "agentDashboard.header.title"),
      headerTransparent: true,
      headerTintColor: Colors.redTheme.background, // This colors the default back button
      // No headerLeft needed - React Navigation provides default back button
    });
  }, [userLanguage]);

  const formatCurrency = (amount) => {
    const value = Number(amount);
    if (isNaN(value)) return "0.00";
    return value.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

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
          {/* Agent Information Card */}
          <View style={styles.agentInfoCard}>
            <View style={styles.agentInfoHeader}>
              <Ionicons
                name="shield-checkmark"
                size={24}
                color={Colors.redTheme.background}
              />
              <Text
                style={[styles.agentInfoHeaderText, getRTLStyles(userLanguage)]}
              >
                {t(userLanguage, "agentDashboard.content.agentProfile")}
              </Text>
            </View>
            <View style={styles.agentInfoContent}>
              <View style={styles.agentInfoRow}>
                <View style={styles.agentInfoIconContainer}>
                  <Ionicons
                    name="person"
                    size={20}
                    color={Colors.redTheme.background}
                  />
                </View>
                <View style={styles.agentInfoTextContainer}>
                  <Text
                    style={[styles.agentInfoLabel, getRTLStyles(userLanguage)]}
                  >
                    {t(userLanguage, "agentDashboard.content.name")}
                  </Text>
                  <Text
                    style={[styles.agentInfoValue, getRTLStyles(userLanguage)]}
                    numberOfLines={1}
                  >
                    {data.firstName && data.lastName
                      ? `${data.firstName} ${data.lastName}`
                      : t(userLanguage, "agentDashboard.content.loading")}
                  </Text>
                </View>
              </View>
              <View style={styles.agentInfoRow}>
                <View style={styles.agentInfoIconContainer}>
                  <Ionicons
                    name="card"
                    size={20}
                    color={Colors.redTheme.background}
                  />
                </View>
                <View style={styles.agentInfoTextContainer}>
                  <Text
                    style={[styles.agentInfoLabel, getRTLStyles(userLanguage)]}
                  >
                    {t(userLanguage, "agentDashboard.content.agentNumber")}
                  </Text>
                  <Text
                    style={[styles.agentInfoValue, getRTLStyles(userLanguage)]}
                    numberOfLines={1}
                  >
                    {data.agentNumber ||
                      t(userLanguage, "agentDashboard.content.loading")}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Wallet Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Ionicons
                name="wallet-outline"
                size={20}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.balanceLabel, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "agentDashboard.content.agentWalletAmount")}
              </Text>
            </View>
            <Text style={[styles.balanceAmount, getRTLStyles(userLanguage)]}>
              PHP {formatCurrency(data.agentWalletAmount || 0)}
            </Text>
          </View>

          {/* Transfer Button */}
          <TouchableOpacity
            style={styles.transferButton}
            onPress={() => {
              router.push("agenttransfer");
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-horizontal-outline" size={24} color="white" />
            <Text
              style={[styles.transferButtonText, getRTLStyles(userLanguage)]}
            >
              Transfer to Available Balance
            </Text>
          </TouchableOpacity>

          {/* Withdraw Button */}
          <TouchableOpacity
            style={styles.withdrawButton}
            onPress={() => {
              router.push("withdraw");
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="cash-outline" size={24} color="white" />
            <Text
              style={[styles.withdrawButtonText, getRTLStyles(userLanguage)]}
            >
              Withdraw Funds
            </Text>
          </TouchableOpacity>

          {/* Transaction History Section */}
          <View style={styles.transactionSection}>
            <View style={styles.transactionHeader}>
              <Ionicons
                name="time-outline"
                size={20}
                color={Colors.redTheme.background}
              />
              <Text style={styles.transactionHeaderText}>
                Transaction History
              </Text>
            </View>
            <TransactionDisplay userId={userId} />
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
  androidSafeArea: {
    paddingTop: Platform.OS === "android" ? 80 : 0,
    opacity: 0,
  },
  androidSafeAreaBottom: {
    paddingBottom: Platform.OS === "android" ? 20 : 0,
    opacity: 0,
  },

  // Agent Information Card
  agentInfoCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
        shadowColor: "#000000",
      },
    }),
  },
  agentInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.redTheme.background + "15",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.redTheme.background + "20",
  },
  agentInfoHeaderText: {
    color: Colors.redTheme.background,
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: "700",
  },
  agentInfoContent: {
    padding: 20,
  },
  agentInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  agentInfoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.redTheme.background + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  agentInfoTextContainer: {
    flex: 1,
  },
  agentInfoLabel: {
    fontSize: isSmallDevice ? 12 : 13,
    fontWeight: "500",
    color: Colors.light.icon,
    marginBottom: 4,
  },
  agentInfoValue: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },

  // Balance Card
  balanceCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: isSmallDevice ? 20 : 24,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
        shadowColor: "#000000",
      },
    }),
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: isSmallDevice ? 14 : 15,
    color: Colors.light.icon,
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: isSmallDevice ? 28 : 32,
    fontWeight: "700",
    color: Colors.redTheme.background,
  },

  // Transfer Button
  transferButton: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    paddingVertical: isSmallDevice ? 14 : 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  transferButtonText: {
    fontSize: isSmallDevice ? 15 : 16,
    color: "white",
    fontWeight: "600",
  },

  // Withdraw Button
  withdrawButton: {
    backgroundColor: "#28a745", // Green color for withdraw
    borderRadius: 12,
    paddingVertical: isSmallDevice ? 14 : 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#28a745",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  withdrawButtonText: {
    fontSize: isSmallDevice ? 15 : 16,
    color: "white",
    fontWeight: "600",
  },

  // Transaction Section
  transactionSection: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  transactionHeaderText: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: "600",
    color: Colors.redTheme.background,
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
  agentInfoContainer: {
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  agentInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  agentInfoLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.newYearTheme.text,
  },
  agentInfoValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.newYearTheme.text,
  },
});
