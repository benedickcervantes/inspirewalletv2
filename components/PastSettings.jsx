import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Linking,
  ToastAndroid,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import React from "react";
import { useRouter, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, firestore } from "../configs/firebase";
import IconButton from "./IconButton";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import { unregisterIndieDevice } from "native-notify";

const { width, height } = Dimensions.get("window");

export default function PastSettings() {
  const navigation = useNavigation();
  const router = useRouter();

  const DATA = [
    {
      id: "1",
      title: "Investment Profile",
      iconSource: require("../assets/images/investmentprofile.png"),
      routeData: () => {
        router.push("inspireauto");
      },
    },
    {
      id: "2",
      title: "Transfer",
      iconSource: require("../assets/images/transfer.png"),
      routeData: () => {
        router.push("/transfer");
      },
    },
    {
      id: "3",
      title: "Agent",
      iconSource: require("../assets/images/agentdashboard.png"),
      routeData: () => {
        router.push("agentdashboard");
      },
    },
    {
      id: "4",
      title: "Stockholder",
      iconSource: require("../assets/images/stock.png"),
      routeData: () => {
        router.push("stockholder");
      },
    },
    {
      id: "5",
      title: "Inspire Cards",
      iconSource: require("../assets/images/card.png"),
      routeData: () => {
        router.push("inspirecards");
      },
    },
    {
      id: "18",
      title: "Buy Cards",
      iconSource: require("../assets/images/card.png"),
      routeData: () => {
        router.push("buycards");
      },
    },
    {
      id: "6",
      title: "E-Wallet",
      iconSource: require("../assets/images/maya.png"),
      routeData: () => {
        router.push("maya");
      },
    },
    {
      id: "7",
      title: "Banking Service",
      iconSource: require("../assets/images/finance.png"),
      routeData: () => {
        router.push("bdo");
      },
    },
    {
      id: "8",
      title: "Trading",
      iconSource: require("../assets/images/crypto.png"),
      routeData: () => {
        router.push("crypto");
      },
    },
    {
      id: "9",
      title: "Events",
      iconSource: require("../assets/images/event.png"),
      routeData: () => {
        router.push("events");
      },
    },
    {
      id: "10",
      title: "Travel Protection",
      iconSource: require("../assets/images/travel.png"),
      routeData: () => {
        router.push("travel");
      },
    },
    {
      id: "11",
      title: "Privacy Policy",
      iconSource: require("../assets/images/privacypolicy.png"),
      routeData: () => {
        router.push("privacy");
      },
    },
    {
      id: "12",
      title: "Passcode",
      iconSource: require("../assets/images/passcode.png"),
      routeData: () => {
        router.push("passcode");
      },
    },
    {
      id: "13",
      title: "Terms & Conditions",
      iconSource: require("../assets/images/termsandcondition.png"),
      routeData: () => {
        router.push("termsandcondition");
      },
    },
    {
      id: "14",
      title: "About Us",
      iconSource: require("../assets/images/aboutus.png"),
      routeData: () => {
        router.push("about");
      },
    },
    {
      id: "15",
      title: "Help Center",
      iconSource: require("../assets/images/helpcenter.png"),
      routeData: () => {
        router.push("helpcenter");
      },
    },
    {
      id: "16",
      title: "Inspire Secure Growth",
      iconSource: require("../assets/images/helpcenter.png"),
      routeData: () => {
        router.push("test");
      },
    },
  ];

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: "Settings",
      headerTransparent: true,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.replace("/main")}
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={Colors.redTheme.background}
          />
        </TouchableOpacity>
      ),
    });
  }, []);

  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      await signOut(auth);

      router.replace("/");

      // Navigate to the login screen
      setTimeout(() => {
        router.replace("/"); // Adjust the path as needed
      }, 100);
    } catch (error) {
      // console.error("Error signing out: ", error);
    }
  };

  const renderItem = ({ item }) => {
    // Calculate font size based on title length
    const getFontSize = (text) => {
      if (!text) return Math.max(width * 0.035, 12);
      if (text.length <= 8) return Math.max(width * 0.035, 12);
      if (text.length <= 12) return Math.max(width * 0.032, 11);
      if (text.length <= 16) return Math.max(width * 0.028, 10);
      if (text.length <= 20) return Math.max(width * 0.025, 9);
      return Math.max(width * 0.022, 8);
    };

    return (
      <View style={styles.itemContainer}>
        <TouchableOpacity
          style={styles.itemButton}
          onPress={item.routeData}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Image source={item.iconSource} style={styles.icon} />
          </View>
          <Text
            style={[styles.itemTitle, { fontSize: getFontSize(item.title) }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
        </TouchableOpacity>
        {!item.routeData && (
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>SOON</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ImageBackground
      source={require("../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.gridContainer}>
          <FlatList
            data={DATA}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={3}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
          />
        </View>

        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => router.push("accountdeletion")}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text style={styles.dangerButtonText}>DELETE ACCOUNT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text style={styles.logoutButtonText}>LOG OUT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <SafeAreaView style={styles.androidSafeArea1} />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F6F0",
  },
  androidSafeArea: {
    paddingTop: Platform.OS === "android" ? 80 : 0,
    opacity: 0,
  },
  androidSafeArea1: {
    paddingBottom: Platform.OS === "android" ? 20 : 0,
    opacity: 0,
  },
  backButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  gridContainer: {
    paddingHorizontal: 10,
    paddingTop: 0,
  },
  gridContent: {
    paddingBottom: 20,
  },
  itemContainer: {
    flex: 1,
    margin: 6,
    alignItems: "center",
    justifyContent: "center",
    width: (width - 60) / 3,
    height: 120,
  },
  itemButton: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.newYearTheme.background,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  iconContainer: {
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 60,
  },
  icon: {
    width: Math.max(width * 0.08, 40),
    height: Math.max(width * 0.08, 40),
    resizeMode: "contain",
  },
  itemTitle: {
    fontWeight: "600",
    color: Colors.newYearTheme.text,
    textAlign: "center",
    lineHeight: 25,
    flexWrap: "wrap",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    width: "100%",
  },
  soonBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FF4444",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  soonText: {
    color: "white",
    fontSize: Math.max(width * 0.025, 10),
    fontWeight: "bold",
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  dangerButton: {
    backgroundColor: "#FF4444",
    borderRadius: 12,
    marginVertical: 6,
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    shadowColor: "#FF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  dangerButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: Math.max(width * 0.035, 14),
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: "#666666",
    borderRadius: 12,
    marginVertical: 6,
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    shadowColor: "#666666",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: Math.max(width * 0.035, 14),
    marginLeft: 8,
    letterSpacing: 0.5,
  },
});
