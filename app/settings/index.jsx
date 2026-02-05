import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Dimensions,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function Settings() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const mainServices = [
    { icon: "wallet", label: "E-Wallet", subtitle: "Cash In/Cash Out", route: "/maya", active: true },
    { icon: "swap-horizontal", label: "Transfer", subtitle: "Cash to Cash", route: "/transfer" },
    { icon: "bank", label: "Banking Services", subtitle: "All in one", route: "/bdo" },
    { icon: "wallet-outline", label: "Inspire Cards", subtitle: "Virtual & Physical", route: "/inspirecards" },
    { icon: "airplane", label: "Travel Protection", subtitle: "Insurance", route: "/travel", small: true },
  ];

  const inspireBalances = [
    { icon: "chart-line", label: "Investment Profile", subtitle: "Grow your money", route: "/monthly" },
    { icon: "chart-bar", label: "Stockholder", subtitle: "Stock Market", route: "/stockholder" },
    { icon: "account-tie", label: "Agent", subtitle: "Become an Agent", route: "/agentrequest" },
    { icon: "cash-multiple", label: "Special Campaign", subtitle: "Limited Offers", route: "/campaign" },
    { icon: "shield-check", label: "Inspire Secure Growth", subtitle: "Safe Investment", route: "/inspiresecuregrowth", small: true },
  ];

  const playAndEarn = [
    { icon: "chart-timeline-variant", label: "Trading", subtitle: "Trade & Invest", route: "/crypto" },
    { icon: "bitcoin", label: "Deposit via Crypto", subtitle: "Crypto", route: "/depositcrypto" },
  ];

  const renderServiceCard = (service) => (
    <TouchableOpacity
      key={service.label}
      style={[
        styles.serviceCard, 
        service.active && styles.activeCard,
        service.small && styles.smallCard
      ]}
      onPress={() => router.push(service.route)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer, 
        service.active && styles.activeIconContainer,
        service.small && styles.smallIconContainer
      ]}>
        <MaterialCommunityIcons 
          name={service.icon} 
          size={service.small ? 21 : 22} 
          color={service.active ? "#FFFFFF" : "#E15816"} 
        />
      </View>
      <Text style={[
        styles.serviceLabel, 
        service.small && styles.smallLabel,
        service.active && styles.activeLabel
      ]} numberOfLines={2} ellipsizeMode="tail">{service.label}</Text>
      <Text style={[
        styles.serviceSubtitle, 
        service.small && styles.smallSubtitle,
        service.active && styles.activeSubtitle
      ]} numberOfLines={2} ellipsizeMode="tail">{service.subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#E15816" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={["#E15816", "#F48F38"]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Services</Text>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push("/notification")}
            >
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Main Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Main Services</Text>
            <View style={styles.servicesGrid}>
              {mainServices.map((service, index) => renderServiceCard(service, index, mainServices))}
            </View>
          </View>

          {/* Inspire Balances */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Inspire Balances</Text>
            <View style={styles.servicesGrid}>
              {inspireBalances.map((service, index) => renderServiceCard(service, index, inspireBalances))}
            </View>
          </View>

          {/* Play and Earn */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Play and Earn</Text>
            <View style={styles.servicesGrid}>
              {playAndEarn.map((service, index) => renderServiceCard(service, index, playAndEarn))}
            </View>
          </View>

          {/* Crypto Banner */}
          <TouchableOpacity
            style={styles.cryptoBanner}
            onPress={() => router.push("/crypto")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#E15816", "#F48F38"]}
              style={styles.cryptoBannerGradient}
            >
              <Text style={styles.cryptoBannerTitle}>CRYPTO IN INSPIRE WALLET</Text>
              <Text style={styles.cryptoBannerSubtitle}>Trade Bitcoin, Ethereum, & more</Text>
              <View style={styles.exploreButton}>
                <Text style={styles.exploreButtonText}>Explore</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
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
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceCard: {
    width: (width - 80) / 3,
    height: 105,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
    justifyContent: "flex-start",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 8,
  },
  smallCard: {
    width: (width - 80.2) / 3.01,
    height: 104,
    padding: 7.5,
  },
  lastRowCard: {
    marginRight: 8,
  },
  activeCard: {
    backgroundColor: "#F38B35",
    borderColor: "#DE5212",
    borderWidth: 2,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  smallIconContainer: {
    width: 41,
    height: 41,
    borderRadius: 9,
    marginBottom: 5,
  },
  activeIconContainer: {
    backgroundColor: "#DE5212",
  },
  serviceLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 2,
    lineHeight: 12,
    maxHeight: 24,
  },
  activeLabel: {
    color: "#FFFFFF",
  },
  smallLabel: {
    fontSize: 9.5,
    lineHeight: 11,
    maxHeight: 22,
  },
  serviceSubtitle: {
    fontSize: 8,
    color: "#999",
    textAlign: "center",
    lineHeight: 10,
    maxHeight: 20,
  },
  activeSubtitle: {
    color: "#FFFFFF",
    opacity: 0.9,
  },
  smallSubtitle: {
    fontSize: 7.5,
    lineHeight: 9,
    maxHeight: 18,
  },
  cryptoBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cryptoBannerGradient: {
    padding: 24,
    minHeight: 140,
    justifyContent: "center",
  },
  cryptoBannerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cryptoBannerSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 16,
  },
  exploreButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E15816",
  },
});
