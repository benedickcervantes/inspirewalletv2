import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ImageBackground,
  Animated,
  Linking,
  Alert,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "expo-router";
import { auth, firestore, storage } from "../../configs/firebase";
import { doc, onSnapshot, collection, query, orderBy, limit, updateDoc, where } from "firebase/firestore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import { Questrial_400Regular } from "@expo-google-fonts/questrial";
import WalletTab from "../../components/WalletTab";
import CardsTab from "../../components/CardsTab";
import SavingsTab from "../../components/SavingsTab";
import LoanTab from "../../components/LoanTab";

const { width } = Dimensions.get("window");

export default function Dashboard() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Questrial_400Regular });
  const [userData, setUserData] = useState(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [timeDeposit, setTimeDeposit] = useState(0);
  const [activeTab, setActiveTab] = useState("Wallet");
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const bannerScrollRef = useRef(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const banners = [
    {
      image: require("../../assets/banner/Loopwork.png"),
      url: "https://inspire-loopwork.com/landingpage",
    },
    {
      image: require("../../assets/banner/HRX.png"),
      url: "https://www.deskhrx.com/home/",
    },
  ];

  // Add greeting helper function
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/welcome");
      return;
    }

    // Listen to user data
    const userDocRef = doc(firestore, "users", user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserData(data);
        setAvailableBalance(data.availableBalance || 0);
        setTimeDeposit(data.timeDepositTotal || 0);
      }
    });

    // Listen to recent transactions
    const transactionsRef = collection(firestore, "users", user.uid, "transactions");
    const transactionsQuery = query(transactionsRef, orderBy("timestamp", "desc"), limit(2));
    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactions = [];
      snapshot.forEach((doc) => {
        transactions.push({ id: doc.id, ...doc.data() });
      });
      setRecentTransactions(transactions);
    });

    // Listen to UNREAD notifications only
    const notificationsRef = collection(firestore, "users", user.uid, "notifications");
    const unreadQuery = query(notificationsRef, where("read", "==", false));
    const unsubscribeNotifications = onSnapshot(unreadQuery, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    });

    return () => {
      unsubscribeUser();
      unsubscribeTransactions();
      unsubscribeNotifications();
    };
  }, []);

  // Reset card to front when switching away from Cards tab
  useEffect(() => {
    if (activeTab !== "Cards" && isCardFlipped) {
      Animated.spring(flipAnimation, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
      setIsCardFlipped(false);
    }
  }, [activeTab]);

  // Auto-scroll banners
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % banners.length;
        if (bannerScrollRef.current) {
          bannerScrollRef.current.scrollTo({
            x: nextIndex * (width - 40),
            animated: true,
          });
        }
        return nextIndex;
      });
    }, 3000); // Auto-scroll every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const flipCard = () => {
    // Only allow flipping when in "Cards" tab
    if (activeTab !== "Cards") return;
    
    if (isCardFlipped) {
      Animated.spring(flipAnimation, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(flipAnimation, {
        toValue: 180,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
    }
    setIsCardFlipped(!isCardFlipped);
  };

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

  const menuItems = [
    { icon: "wallet", label: "Investment\nProfile", route: "/monthly", customImage: require("../../assets/images/investmentprofile.png") },
    { icon: "wallet-outline", label: "E-Wallet", route: "/maya" },
    { icon: "chart-line", label: "Stock", route: "/stockholder" },
    { icon: "format-list-bulleted", label: "Task", route: "/task" },
    { icon: "account", label: "Agent", route: "/agentrequest" },
    { icon: "chart-timeline-variant", label: "Trading", route: "/crypto" },
    { icon: "dots-horizontal", label: "More", route: "/settings" },
  ];

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={28} color="#E15816" />
              </View>
              <TouchableOpacity 
                onPress={() => router.push("/personal")}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.greeting}>{getGreeting()}</Text>
                  <Text style={styles.userName}>
                    {userData?.firstName || userData?.fullName || "User"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => router.push("/notification")}
              >
                <Ionicons name="notifications" size={24} color="#E15816" />
                {/* Notification Badge - Only shows if there are UNREAD notifications */}
                {unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.iconButton}>
                <Ionicons name="menu" size={24} color="#CCCCCC" />
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {["Wallet", "Savings", "Loan", "Cards"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Balance Card with Flip Animation - Render based on active tab */}
          {activeTab === "Wallet" && (
            <WalletTab
              userData={userData}
              availableBalance={availableBalance}
              formatCurrency={formatCurrency}
              flipAnimation={flipAnimation}
              isCardFlipped={isCardFlipped}
              flipCard={flipCard}
            />
          )}
          {activeTab === "Cards" && (
            <CardsTab
              userData={userData}
              availableBalance={availableBalance}
              formatCurrency={formatCurrency}
              flipAnimation={flipAnimation}
              isCardFlipped={isCardFlipped}
              flipCard={flipCard}
            />
          )}
          {activeTab === "Savings" && (
            <SavingsTab
              userData={userData}
              timeDeposit={timeDeposit}
              formatCurrency={formatCurrency}
            />
          )}
          {activeTab === "Loan" && (
            <LoanTab
              userData={userData}
            />
          )}

          {/* Quick Action Buttons */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push("/transfer")}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name="swap-horizontal" size={24} color="#E15816" />
              </View>
              <Text style={styles.quickActionLabel}>Transfer</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push("/bdo")}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name="bank" size={24} color="#E15816" />
              </View>
              <Text style={styles.quickActionLabel}>Banking Service</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push("/travel")}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name="airplane" size={24} color="#E15816" />
              </View>
              <Text style={styles.quickActionLabel}>Travel Protection</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push("/history")}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name="history" size={24} color="#E15816" />
              </View>
              <Text style={styles.quickActionLabel}>History</Text>
            </TouchableOpacity>
          </View>

          {/* Menu Grid Container - 5 items per line */}
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuHeaderTitle}>Services</Text>
            </View>
            <View style={styles.menuGrid}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => router.push(item.route)}
                >
                  <View style={styles.menuIcon}>
                    {item.customImage ? (
                      <Image 
                        source={item.customImage} 
                        style={styles.customIconImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <MaterialCommunityIcons name={item.icon} size={24} color="#E15816" />
                    )}
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Crypto Banner */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.bannerScroll}
          >
            <TouchableOpacity 
              style={styles.cryptoBanner}
              onPress={() => router.push("/crypto")}
            >
              <ImageBackground
                source={require("../../assets/images/what's new banner.png")}
                style={styles.cryptoBannerBackground}
                imageStyle={styles.cryptoBannerImage}
                resizeMode="cover"
              >
                <View style={styles.cryptoContent}>
                  <Text style={styles.cryptoText}>CHANGE YOUR PREFERRED LANGUAGE</Text>
                  <Text style={styles.languageOptionsText}>English, Japanese, Saudi Arabia, and Korea</Text>
                  <TouchableOpacity style={styles.exploreButton}>
                    <Text style={styles.exploreButtonText}>Explore</Text>
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </ScrollView>

          {/* Transaction History */}
          <View style={styles.transactionSection}>
            <View style={styles.transactionHeader}>
              <Ionicons name="time-outline" size={20} color="#E15816" />
              <Text style={styles.transactionTitle}>Transaction History</Text>
            </View>
            
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    <MaterialCommunityIcons 
                      name="swap-horizontal" 
                      size={24} 
                      color="#E15816" 
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionName}>{transaction.type || "Transaction"}</Text>
                    <Text style={styles.transactionDate}>
                      {transaction.timestamp?.toDate().toLocaleDateString() || ""}
                    </Text>
                  </View>
                  <Text style={styles.transactionAmount}>
                    ₱{formatCurrency(transaction.amount || 0)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  <MaterialCommunityIcons name="swap-horizontal" size={24} color="#E15816" />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionName}>Free Default Card</Text>
                  <Text style={styles.transactionDate}>February 03, 2026</Text>
                </View>
                <Text style={styles.transactionAmount}>₱0.00</Text>
              </View>
            )}
          </View>

          {/* Partner Banners - Auto-scrolling Carousel */}
          <View style={styles.bannersSection}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
                setCurrentBannerIndex(index);
              }}
              style={styles.bannerScrollView}
            >
              {banners.map((banner, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.bannerItem}
                  onPress={() => Linking.openURL(banner.url)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={banner.image}
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Pagination Dots */}
            <View style={styles.paginationDots}>
              {banners.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentBannerIndex === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>CREATED BY INSPIRE</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E15816",
  },
  greeting: {
    fontSize: 14,
    color: "#999",
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  headerRight: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: "#E15816",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  timeDepositRowOuter: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  timeDepositTextOuter: {
    fontSize: 13,
    color: "#666",
  },
  quickActionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: "space-between",
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    lineHeight: 14,
  },
  menuContainer: {
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  menuItem: {
    width: (width - 88) / 5,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customIconImage: {
    width: 28,
    height: 28,
  },
  menuLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    lineHeight: 13,
  },
  bannerScroll: {
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  cryptoBanner: {
    width: width - 40,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
  },
  cryptoBannerBackground: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  cryptoBannerImage: {
    borderRadius: 16,
  },
  cryptoContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  cryptoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 4,
  },
  languageOptionsText: {
    fontSize: 11,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 12,
  },
  cryptoIcon: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  exploreButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  exploreButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E15816",
  },
  transactionSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  transactionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E15816",
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: "#999",
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E15816",
  },
  bannersSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  bannerScrollView: {
    marginBottom: 12,
  },
  bannerItem: {
    width: width - 40,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 0,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D0D0D0",
  },
  activeDot: {
    backgroundColor: "#E15816",
    width: 24,
  },
  footer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    letterSpacing: 1,
  },
});