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
  getDoc,
  updateDoc,
  getFirestore,
  getDocs,
} from "firebase/firestore";
import InvestmentProfileButtons from "../../components/InvestmentProfileButtons";
import AmountContent from "../../components/AmountContent";
import TransactionHistory from "../../components/TransactionHistory";
import AutoCarousel from "../../components/AutoCarousel";
import CurrencyConverter from "../../components/CurrencyConverter";
import { Colors } from "../../constants/Colors";
import rates from "../../assets/data/investmentRates.json";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();
  const [data, setUserData] = useState({});
  const [userId, setUserId] = useState();
  const [walletAmount, setWalletAmount] = useState(0);
  const [availBalanceAmount, setAvailBalanceAmount] = useState(0); // Default to 0
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserId(user.uid);

      // Real-time listener for user data
      const userDocRef = doc(firestore, "users", user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          setUserData(userData);
          // Update wallet and available balance in real-time
          setWalletAmount(userData.walletAmount || 0);
          setAvailBalanceAmount(userData.availBalanceAmount || 0);
        } else {
          showModal({
            title: "Data Error",
            message: "No user data found. Please try again.",
            type: "error",
          });
        }
      });

      return () => unsubscribeUser();
    }
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: "Available Balance",
      headerTransparent: true,
      headerTintColor: Colors.redTheme.background, // This colors the default back button
      // No headerLeft needed - React Navigation provides default back button
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;

      if (!user) {
        console.error("No logged-in user found!");
        return;
      }

      const userId = user.uid;
      const db = firestore;

      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.error("No document found for this user!");
          return;
        }

        const userData = userSnap.data();

        // Fetch values directly from Firestore
        const wallet = userData.walletAmount || 0;
        const availBalance = userData.availBalanceAmount || 0;

        console.log("Fetched Wallet Amount:", wallet);
        console.log("Fetched Available Balance:", availBalance);

        // Update state
        setWalletAmount(wallet);
        setAvailBalanceAmount(availBalance);
      } catch (error) {
        console.error("Error fetching wallet and balance data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={{ alignItems: "center" }}
        >
          <View style={styles.mainContainer}>
            <AmountContent amount={walletAmount} title="Amount Wallet" />
            <AmountContent
              amount={availBalanceAmount}
              title="Available Balance"
            />
            <View
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              <AutoCarousel />
            </View>
            <CurrencyConverter />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={() => router.push("withdraw")}
              >
                <Text
                  style={{ color: Colors.newYearTheme.text, fontWeight: "500" }}
                >
                  WITHDRAW
                </Text>
              </TouchableOpacity>
            </View>
            <TransactionHistory userId={userId} />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
      <SafeAreaView style={styles.androidSafeArea} />

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
    justifyContent: "center",
    alignItems: "center",
  },
  mainContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    padding: 10,
  },
  transferButton: {
    margin: 10,
    width: "95%",
    backgroundColor: "#ddf6e1",
    height: 50,
    justifyContent: "center",
    borderRadius: 15,
  },
  transferText: {
    fontSize: 15,
    color: "#00a651",
    textAlign: "center",
  },
  androidSafeArea: {
    paddingTop: Platform.OS === "android" ? 80 : 0,
    opacity: 0,
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    marginTop: 25,
  },
  buttonContainer: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.newYearTheme.background,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
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
