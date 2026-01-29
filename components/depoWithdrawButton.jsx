import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Colors } from "../constants/Colors";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, firestore } from "../configs/firebase";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";

const { width, height } = Dimensions.get("window");

const DepoWithdrawButton = ({ topPosition }) => {
  const router = useRouter();
  const [userLanguage, setUserLanguage] = useState("english");

  // Function to fetch user language
  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserLanguage(userData.preferredLanguage || "english");
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
      setUserLanguage("english");
    }
  };

  // Fetch user language on component mount and listen for real-time changes
  useEffect(() => {
    fetchUserLanguage();

    // Set up real-time listener for language changes
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(firestore, "users", user.uid);
      const unsubscribeLanguage = onSnapshot(userRef, (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const newLanguage = userData.preferredLanguage || "english";
          setUserLanguage((prevLanguage) => {
            // Only update if the language actually changed
            if (prevLanguage !== newLanguage) {
              console.log(
                `DepoWithdrawButton: Language changed from ${prevLanguage} to ${newLanguage}`
              );
              return newLanguage;
            }
            return prevLanguage;
          });
        }
      });

      return () => unsubscribeLanguage();
    }
  }, []);

  return (
    <View style={[styles.depositWithdrawContainer, { top: topPosition }]}>
      <TouchableOpacity
        style={styles.hollowButton}
        onPress={() => router.push("deposit")}
      >
        <Text style={[styles.hollowButtonText, getRTLStyles(userLanguage)]}>
          {t(userLanguage, "depoWithdrawButton.deposit")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.hollowButton}
        onPress={() => router.push("withdraw")}
      >
        <Text style={[styles.hollowButtonText, getRTLStyles(userLanguage)]}>
          {t(userLanguage, "depoWithdrawButton.withdraw")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  depositWithdrawContainer: {
    position: "relative",
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: width * 0.01,
    marginTop: height * 0.01,
    gap: width * 0.02,
    paddingBottom: 20,
  },
  hollowButton: {
    backgroundColor: "transparent",
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.012,
    borderRadius: 25,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.redTheme.background,
  },
  hollowButtonText: {
    fontSize: width * 0.03,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    textAlign: "center",
    marginTop: height * 0.005,
  },
});

export default DepoWithdrawButton;
