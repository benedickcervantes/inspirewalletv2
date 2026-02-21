import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavProp } from "../../types/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  auth,
  subscribeToNotifications,
  subscribeToTransactions,
  subscribeToUser,
} from "../../configs/firebase";
import CardsTab from "./CardsTab";
import SavingsTab from "./SavingsTab";
import WalletTab from "./WalletTab";

const PLACEHOLDER_IMG = require("../../assets/images/InpireLogo.png");
const LOOPWORK_BANNER = require("../../assets/banner/Loopwork.png");
const HRX_BANNER = require("../../assets/banner/HRX.png");

const { width } = Dimensions.get("window");

interface Transaction {
  id: string;
  type?: string;
  amount?: number;
  timestamp?: { toDate?: () => Date };
}

export default function Dashboard() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [timeDeposit, setTimeDeposit] = useState(0);
  const [activeTab, setActiveTab] = useState("Wallet");
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const bannerScrollRef = useRef<ScrollView | null>(null);
  const languageScrollRef = useRef<ScrollView | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [currentLanguageIndex, setCurrentLanguageIndex] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const banners = [
    { image: LOOPWORK_BANNER, url: "https://inspire-loopwork.com/landingpage" },
    { image: HRX_BANNER, url: "https://www.deskhrx.com/home/" },
  ];

  const languageSlides = [
    { image: require("../../assets/banner/BuyCards.png") },
    { image: require("../../assets/banner/CryptoinIwallet.png") },
    { image: require("../../assets/banner/DepositviaCrypto.png") },
    { image: require("../../assets/banner/ChangeLanguage.png") },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => {
    if (!auth) return;
    const user = auth.currentUser;
    if (!user) {
      (navigation as unknown as NavProp).replace("Welcome");
      return;
    }

    const un1 = subscribeToUser(user.uid, (data) => {
      if (!data) {
        setUserData(null);
        return;
      }
      setUserData(data as Record<string, unknown>);
      const balance = (data?.availBalanceAmount ?? data?.availableBalance) as number | undefined;
      setAvailableBalance(Number(balance) || 0);
      setTimeDeposit(Number(data?.timeDepositTotal) || 0);
    });
    const un2 = subscribeToTransactions(user.uid, (list: Transaction[]) => {
      setRecentTransactions(list);
    });
    const un3 = subscribeToNotifications(user.uid, (count: number) => {
      setUnreadNotifications(count);
    });

    return () => {
      un1();
      un2();
      un3();
    };
  }, [navigation]);

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
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleNextLanguageSlide = () => {
    const nextIndex = (currentLanguageIndex + 1) % languageSlides.length;
    setCurrentLanguageIndex(nextIndex);
    if (languageScrollRef.current) {
      languageScrollRef.current.scrollTo({
        x: nextIndex * (width - 40),
        animated: true,
      });
    }
  };

  const handlePrevLanguageSlide = () => {
    const prevIndex =
      currentLanguageIndex === 0
        ? languageSlides.length - 1
        : currentLanguageIndex - 1;
    setCurrentLanguageIndex(prevIndex);
    if (languageScrollRef.current) {
      languageScrollRef.current.scrollTo({
        x: prevIndex * (width - 40),
        animated: true,
      });
    }
  };

  const flipCard = () => {
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

  const menuItems = [
    { icon: "wallet-outline", label: "E-Wallet", route: "Maya" },
    { icon: "chart-line", label: "Stock", route: "Stockholder" },
    { icon: "format-list-bulleted", label: "Task", route: "Task" },
    { icon: "account", label: "Agent", route: "AgentRequest" },
    {
      icon: "chart-areaspline",
      label: "Trading",
      route: "PlayEarn",
    },
  ];

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={28} color="#E15816" />
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate("Personal")}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.greeting}>{getGreeting()}</Text>
                  <Text style={styles.userName}>
                    {(userData?.firstName as string) || (userData?.fullName as string) || "User"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.navigate("Notification")}
              >
                <Ionicons name="notifications" size={24} color="#E15816" />
                {unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.navigate("Settings")}
              >
                <Ionicons name="settings-outline" size={24} color="#E15816" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tabs}>
            {["Wallet", "Investment", "Cards"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[styles.tabText, activeTab === tab && styles.activeTabText]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
          {activeTab === "Investment" && (
            <SavingsTab
              userData={userData}
              timeDeposit={timeDeposit}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab !== "Cards" && activeTab !== "Investment" && (
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate("Transfer")}
              >
                <View style={styles.quickActionIcon}>
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={24}
                    color="#E15816"
                  />
                </View>
                <Text style={styles.quickActionLabel}>Transfer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate("Bdo")}
              >
                <View style={styles.quickActionIcon}>
                  <MaterialCommunityIcons name="bank" size={24} color="#E15816" />
                </View>
                <Text style={styles.quickActionLabel}>Banking Service</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate("Travel")}
              >
                <View style={styles.quickActionIcon}>
                  <MaterialCommunityIcons
                    name="airplane"
                    size={24}
                    color="#E15816"
                  />
                </View>
                <Text style={styles.quickActionLabel}>Travel Protection</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate("History")}
              >
                <View style={styles.quickActionIcon}>
                  <MaterialCommunityIcons
                    name="history"
                    size={24}
                    color="#E15816"
                  />
                </View>
                <Text style={styles.quickActionLabel}>History</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab !== "Cards" && activeTab !== "Investment" && (
            <View style={styles.menuContainer}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuHeaderTitle}>Services</Text>
              </View>
              <View style={styles.menuGrid}>
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.menuItem}
                    onPress={() =>
                      (navigation as { navigate: (name: string) => void }).navigate(item.route)
                    }
                  >
                    <View style={styles.menuIcon}>
                      <MaterialCommunityIcons
                        name={item.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                        size={24}
                        color="#000000"
                      />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {activeTab !== "Investment" && (
            <View style={styles.languageCarouselContainer}>
              <View style={styles.languageCarouselWrapper}>
                <ScrollView
                  ref={languageScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(
                      event.nativeEvent.contentOffset.x / (width - 40)
                    );
                    setCurrentLanguageIndex(index);
                  }}
                  style={styles.languageScrollView}
                >
                  {languageSlides.map((slide, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.languageSlide}
                      onPress={() => navigation.navigate("Crypto")}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={slide.image}
                        style={styles.languageSlideImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.carouselButtonLeft}
                  onPress={handlePrevLanguageSlide}
                >
                  <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.carouselButtonRight}
                  onPress={handleNextLanguageSlide}
                >
                  <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.languagePaginationDots}>
                {languageSlides.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.languageDot,
                      currentLanguageIndex === index && styles.languageActiveDot,
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          {activeTab !== "Investment" && (
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
                      <Text style={styles.transactionName}>
                        {transaction.type || "Transaction"}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {transaction.timestamp?.toDate?.()?.toLocaleDateString() ||
                          ""}
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
                    <MaterialCommunityIcons
                      name="swap-horizontal"
                      size={24}
                      color="#E15816"
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionName}>Free Default Card</Text>
                    <Text style={styles.transactionDate}>February 03, 2026</Text>
                  </View>
                  <Text style={styles.transactionAmount}>₱0.00</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.bannersSection}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / (width - 40)
                );
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

          <View style={styles.footer}>
            <Text style={styles.footerText}>CREATED BY INSPIRE</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
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
  greeting: { fontSize: 14, color: "#999", marginBottom: 2 },
  userName: { fontSize: 16, fontWeight: "700", color: "#333" },
  headerRight: { flexDirection: "row", gap: 12 },
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
    justifyContent: "center",
    gap: 16,
  },
  tab: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
    alignItems: "center",
  },
  activeTab: { backgroundColor: "#E15816" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#666" },
  activeTabText: { color: "#FFFFFF" },
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
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuHeaderTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  menuGrid: {
    flexDirection: "row",
    paddingHorizontal: 0,
  },
  menuItem: {
    width: "21%",
    alignItems: "flex-start",
    paddingVertical: 0,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customIconImage: { width: 24, height: 24 },
  menuLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    lineHeight: 12,
  },
  languageCarouselContainer: { paddingHorizontal: 20, marginVertical: 16 },
  languageCarouselWrapper: { position: "relative", marginBottom: 12 },
  languageScrollView: { borderRadius: 16 },
  languageSlide: {
    width: width - 40,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
  },
  languageSlideImage: { width: "100%", height: "100%", borderRadius: 16 },
  carouselButtonLeft: {
    position: "absolute",
    left: 12,
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  carouselButtonRight: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  languagePaginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  languageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D0D0D0",
  },
  languageActiveDot: { backgroundColor: "#E15816", width: 24 },
  transactionSection: { paddingHorizontal: 20, marginBottom: 20 },
  transactionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  transactionTitle: { fontSize: 16, fontWeight: "600", color: "#E15816" },
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
  transactionDetails: { flex: 1 },
  transactionName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  transactionDate: { fontSize: 12, color: "#999" },
  transactionAmount: { fontSize: 14, fontWeight: "600", color: "#E15816" },
  bannersSection: { paddingHorizontal: 20, marginBottom: 20 },
  bannerScrollView: { marginBottom: 12 },
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
  bannerImage: { width: "100%", height: "100%" },
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
  activeDot: { backgroundColor: "#E15816", width: 24 },
  footer: { paddingVertical: 24, alignItems: "center" },
  footerText: { fontSize: 12, color: "#999", letterSpacing: 1 },
});
