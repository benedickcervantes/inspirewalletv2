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
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "expo-router";
import { auth, firestore } from "../../configs/firebase";
import { doc, onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [timeDeposit, setTimeDeposit] = useState(0);
  const [activeTab, setActiveTab] = useState("Wallet");
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const bannerScrollRef = useRef(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

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

    return () => {
      unsubscribeUser();
      unsubscribeTransactions();
    };
  }, []);

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
    { icon: "wallet", label: "Investment\nProfile", route: "/monthly" },
    { icon: "swap-horizontal", label: "Transfer", route: "/transfer" },
    { icon: "wallet-outline", label: "E-Wallet", route: "/maya" },
    { icon: "bank", label: "Banking\nService", route: "/bdo" },
    { icon: "airplane", label: "Travel\nProtection", route: "/travel" },
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
            <TouchableOpacity 
              style={styles.headerLeft}
              onPress={() => router.push("/personal")}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color="#999" />
              </View>
              <View>
                <Text style={styles.userName}>
                  {userData?.firstName || userData?.fullName || `User ${userData?.accountNumber?.slice(-4) || "xxxx"}`}
                </Text>
                <Text style={styles.userAccount}>
                  {userData?.accountNumber || ""}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => router.push("/notification")}
              >
                <Ionicons name="notifications" size={24} color="#E15816" />
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

          {/* Balance Card with Flip Animation */}
          <View style={styles.balanceCardContainer}>
            {/* Front of Card */}
            <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
              <TouchableOpacity 
                onPress={flipCard}
                activeOpacity={1}
                style={{ flex: 1 }}
              >
                <ImageBackground
                  source={require("../../assets/cards/default/card2.0.png")}
                  style={styles.balanceCard}
                  imageStyle={styles.balanceCardImage}
                  resizeMode="cover"
                >
                  <View style={styles.balanceHeader}>
                    <View style={styles.balanceHeaderLeft}>
                      <Text style={styles.balanceLabel}>Available Balance:</Text>
                      <Ionicons name="eye-outline" size={18} color="#FFF" />
                    </View>
                  </View>
                  
                  <View style={styles.balanceAmountContainer}>
                    <Text style={styles.currency}>PHP</Text>
                    <Text style={styles.balanceAmount}>{formatCurrency(availableBalance)}</Text>
                  </View>
                  
                  <View style={styles.timeDepositRow}>
                    <Text style={styles.timeDepositText}>
                      Time Deposit: PHP {formatCurrency(timeDeposit)}
                    </Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            </Animated.View>

            {/* Back of Card */}
            <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}>
              <TouchableOpacity 
                onPress={flipCard}
                activeOpacity={1}
                style={styles.cardBackTouchable}
              >
                <ImageBackground
                  source={require("../../assets/cards/default/card2.0 back.png")}
                  style={styles.balanceCard}
                  imageStyle={styles.balanceCardImage}
                  resizeMode="cover"
                >
                </ImageBackground>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Deposit and Withdraw Buttons - Outside Card */}
          <View style={styles.balanceActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/deposit")}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color="#E15816" />
              <Text style={styles.actionButtonText}>Deposit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/withdraw")}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-up-circle-outline" size={20} color="#E15816" />
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>

          {/* Menu Grid */}
          <View style={styles.menuGrid}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => router.push(item.route)}
              >
                <View style={styles.menuIcon}>
                  <MaterialCommunityIcons name={item.icon} size={28} color="#E15816" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
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
              <Text style={styles.cryptoTitle}>CRYPTO</Text>
              <Text style={styles.cryptoSubtitle}>IN INSPIRE</Text>
              <Text style={styles.cryptoSubtitle}>WALLET</Text>
              <View style={styles.cryptoIcon}>
                <MaterialCommunityIcons name="bitcoin" size={40} color="#FFB800" />
              </View>
              <TouchableOpacity style={styles.exploreButton}>
                <Text style={styles.exploreButtonText}>Explore</Text>
              </TouchableOpacity>
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
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  userAccount: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
    fontStyle: "italic",
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
  balanceCardContainer: {
    margin: 20,
    marginBottom: 10,
    height: 200,
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
  cardBackTouchable: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  flipTouchArea: {
    flex: 1,
    zIndex: 1,
  },
  balanceCard: {
    padding: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    position: "relative",
    height: 200,
    justifyContent: "space-between",
  },
  flipTouchArea: {
    flex: 1,
  },
  balanceCardImage: {
    borderRadius: 20,
  },
  cardBackContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBackText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  balanceHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  inspireLogo: {
    width: 120,
    height: 45,
  },
  balanceAmountContainer: {
    marginBottom: 8,
  },
  currency: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  timeDepositRow: {
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.3)",
  },
  timeDepositText: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  balanceActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E15816",
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    paddingVertical: 8,
    justifyContent: "center",
  },
  menuItem: {
    width: (width - 40) / 4,
    alignItems: "center",
    paddingVertical: 16,
  },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuLabel: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    lineHeight: 14,
  },
  bannerScroll: {
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  cryptoBanner: {
    width: width - 40,
    height: 160,
    backgroundColor: "#E15816",
    borderRadius: 16,
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  cryptoTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  cryptoSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cryptoIcon: {
    position: "absolute",
    right: 20,
    top: 20,
  },
  exploreButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exploreButtonText: {
    fontSize: 14,
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
