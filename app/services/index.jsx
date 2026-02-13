import React from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function Services() {
  const router = useRouter();

  const mainServices = [
    { icon: "wallet-outline", label: "E-Wallet", sublabel: "Fund Transfer", route: "/maya" },
    { icon: "swap-horizontal", label: "Transfer", sublabel: "Fund Transfer", route: "/transfer" },
    { icon: "bank", label: "Banking Services", sublabel: "Deposit", route: "/bdo" },
    { icon: "airplane", label: "Travel Protection", sublabel: "Insurance", route: "/travel" },
  ];

  const inspireBalances = [
    { icon: "cash-multiple", label: "Inspire Secure Group", sublabel: "Time Deposit", route: "/timedeposit" },
    { icon: "chart-line", label: "Stockholder", sublabel: "Trade Stocks", route: "/stockholder" },
    { icon: "account-tie", label: "Agent", sublabel: "Become an agent", route: "/agentrequest" },
    { icon: "gift", label: "Special Campaign", sublabel: "Events", route: "/campaign" },
  ];

  const playAndEarn = [
    { icon: "target", label: "Trading", sublabel: "Crypto Forex", route: "/crypto" },
    { icon: "cash", label: "Deposit Via Crypto", sublabel: "", route: "/depositcrypto" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#E15816", "#F48F38"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services..."
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Services */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Main Services</Text>
          <View style={styles.servicesGrid}>
            {mainServices.map((service, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.serviceCard,
                  index === 0 && styles.serviceCardHighlighted
                ]}
                onPress={() => router.push(service.route)}
              >
                <View style={[
                  styles.serviceIcon,
                  index === 0 ? styles.serviceIconHighlighted : styles.serviceIconNormal
                ]}>
                  <MaterialCommunityIcons 
                    name={service.icon} 
                    size={32} 
                    color={index === 0 ? "#FFFFFF" : "#E15816"} 
                  />
                </View>
                <Text style={styles.serviceLabel}>{service.label}</Text>
                <Text style={styles.serviceSublabel}>{service.sublabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Inspire Balances */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Inspire Balances</Text>
          <View style={styles.servicesGrid}>
            {inspireBalances.map((service, index) => (
              <TouchableOpacity
                key={index}
                style={styles.serviceCard}
                onPress={() => router.push(service.route)}
              >
                <View style={styles.serviceIconNormal}>
                  <MaterialCommunityIcons 
                    name={service.icon} 
                    size={32} 
                    color="#E15816"
                  />
                </View>
                <Text style={styles.serviceLabel}>{service.label}</Text>
                <Text style={styles.serviceSublabel}>{service.sublabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Play and Earn */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Play and Earn</Text>
          <View style={styles.servicesGrid}>
            {playAndEarn.map((service, index) => (
              <TouchableOpacity
                key={index}
                style={styles.serviceCard}
                onPress={() => router.push(service.route)}
              >
                <View style={styles.serviceIconNormal}>
                  <MaterialCommunityIcons 
                    name={service.icon} 
                    size={32} 
                    color="#E15816"
                  />
                </View>
                <Text style={styles.serviceLabel}>{service.label}</Text>
                <Text style={styles.serviceSublabel}>{service.sublabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Crypto Banner */}
        <LinearGradient
          colors={["#E15816", "#F48F38"]}
          style={styles.cryptoBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cryptoContent}>
            <Text style={styles.cryptoTitle}>CRYPTO IN INSPIRE WALLET</Text>
            <Text style={styles.cryptoSubtitle}>Trade Bitcoin, Ethereum and more</Text>
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => router.push("/crypto")}
            >
              <Text style={styles.exploreButtonText}>Explore</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>CREATED BY INSPIRE</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  searchWrapper: {
    backgroundColor: "#E15816",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  serviceCard: {
    width: (width - 88) / 3,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
  },
  serviceCardHighlighted: {
    backgroundColor: "#E15816",
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceIconHighlighted: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  serviceIconNormal: {
    backgroundColor: "transparent",
  },
  serviceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 2,
    lineHeight: 14,
  },
  serviceSublabel: {
    fontSize: 9,
    color: "#999",
    textAlign: "center",
    lineHeight: 12,
  },
  cryptoBanner: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  cryptoContent: {
    flex: 1,
  },
  cryptoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cryptoSubtitle: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 16,
  },
  exploreButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E15816",
  },
  footer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#CCC",
    letterSpacing: 1,
  },
});

