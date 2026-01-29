import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import { auth, firestore } from "../configs/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";

const { width, height } = Dimensions.get('window');

const MainNavBar = ({ topPosition }) => {
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
          setUserLanguage(prevLanguage => {
            // Only update if the language actually changed
            if (prevLanguage !== newLanguage) {
              console.log(`MainNavBar: Language changed from ${prevLanguage} to ${newLanguage}`);
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
    <View style={[styles.buttonContainer, { top: topPosition }]}>
      <Text style={[styles.exploreText, getRTLStyles(userLanguage)]}>
        {t(userLanguage, "mainNavBar.exploreText")}
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/inspireauto")}
        >
          <Ionicons name="cash" size={width * 0.05} color={Colors.redTheme.background} />
          <Text style={[styles.buttonText, getRTLStyles(userLanguage)]}>
            {t(userLanguage, "mainNavBar.investmentProfile")}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/transfer")}
        >
          <Ionicons name="swap-horizontal" size={width * 0.05} color={Colors.redTheme.background} />
          <Text style={[styles.buttonText, getRTLStyles(userLanguage)]}>
            {t(userLanguage, "mainNavBar.transfer")}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/task")}
        >
          <Ionicons name="checkmark-done-outline" size={width * 0.05} color={Colors.redTheme.background} />
          <Text style={[styles.buttonText, getRTLStyles(userLanguage)]}>
            {t(userLanguage, "mainNavBar.task")}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/agentdashboard")}
        >
          <Ionicons name="person" size={width * 0.05} color={Colors.redTheme.background} />
          <Text style={[styles.buttonText, getRTLStyles(userLanguage)]}>
            {t(userLanguage, "mainNavBar.agent")}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/stockholder")}
        >
          <Ionicons name="trending-up" size={width * 0.05} color={Colors.redTheme.background} />
          <Text style={[styles.buttonText, getRTLStyles(userLanguage)]}>
            {t(userLanguage, "mainNavBar.stock")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/maya")}
        >
          <Ionicons name="wallet-outline" size={width * 0.05} color={Colors.redTheme.background} />
          <Text style={[styles.buttonText, getRTLStyles(userLanguage)]}>
            {t(userLanguage, "mainNavBar.eWallet")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/bdo")}
        >
          <Ionicons name="business" size={width * 0.05} color={Colors.redTheme.background} />
          <Text style={[styles.buttonText, getRTLStyles(userLanguage)]}>
            {t(userLanguage, "mainNavBar.bankingService")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/crypto")}
        >
          <Ionicons name="analytics" size={width * 0.05} color={Colors.redTheme.background} />
          <Text style={[styles.buttonText, getRTLStyles(userLanguage)]}>
            {t(userLanguage, "mainNavBar.trading")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/travel")}
        >
          <Ionicons name="airplane" size={width * 0.05} color={Colors.redTheme.background} />
          <Text style={[styles.buttonText, getRTLStyles(userLanguage)]}>
            {t(userLanguage, "mainNavBar.travelProtection")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    position: "relative",
    right: 0,  
    bottom: 30,
    marginTop: height * 0,
  },
  scrollContent: {
    paddingHorizontal: width * 0.02,
    gap: width * 0.02,
  },
  navButton: {
    backgroundColor: "transparent",
    paddingHorizontal: width * 0,
    paddingVertical: height * 0,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    minWidth: width * 0.2,
  },
  buttonText: {
    fontSize: width * 0.03,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    textAlign: "center",
    marginTop: height * 0.005,
  },
  exploreText: {
    fontSize: width * 0.055,
    fontWeight: "bold",
    color: "black",
    textAlign: "left",
    marginBottom: height * 0.01,
    marginLeft: width * 0.02,
    paddingBottom: height * 0.02,
  },
});

export default MainNavBar;
