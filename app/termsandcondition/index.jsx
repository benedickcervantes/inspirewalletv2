import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { Colors } from "../../constants/Colors";
import { auth, firestore } from "../../configs/firebase";
import { doc, getDoc } from "firebase/firestore";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { Ionicons } from "@expo/vector-icons";

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();
  const [userLanguage, setUserLanguage] = useState('English');

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, 'termsAndCondition.header.title'),
      headerTintColor: Colors.redTheme.background, // This colors the default back button
      // No headerLeft needed - React Navigation provides default back button
    });
  }, [navigation, userLanguage]);

  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserLanguage(data.preferredLanguage || 'English');
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  const sections = [
    {
      id: 'eligibility',
      title: t(userLanguage, 'termsAndCondition.content.eligibility.title'),
      icon: 'checkmark-circle-outline',
      content: t(userLanguage, 'termsAndCondition.content.eligibility.content')
    },
    {
      id: 'accountRegistration',
      title: t(userLanguage, 'termsAndCondition.content.accountRegistration.title'),
      icon: 'person-add-outline',
      content: t(userLanguage, 'termsAndCondition.content.accountRegistration.content'),
      bulletPoints: [
        t(userLanguage, 'termsAndCondition.content.accountRegistration.bulletPoints.accurateInfo'),
        t(userLanguage, 'termsAndCondition.content.accountRegistration.bulletPoints.passwordSecurity'),
        t(userLanguage, 'termsAndCondition.content.accountRegistration.bulletPoints.unauthorizedUse')
      ]
    },
    {
      id: 'servicesProvided',
      title: t(userLanguage, 'termsAndCondition.content.servicesProvided.title'),
      icon: 'business-outline',
      content: t(userLanguage, 'termsAndCondition.content.servicesProvided.content')
    },
    {
      id: 'feesAndCharges',
      title: t(userLanguage, 'termsAndCondition.content.feesAndCharges.title'),
      icon: 'card-outline',
      content: t(userLanguage, 'termsAndCondition.content.feesAndCharges.content')
    },
    {
      id: 'userResponsibilities',
      title: t(userLanguage, 'termsAndCondition.content.userResponsibilities.title'),
      icon: 'shield-checkmark-outline',
      content: t(userLanguage, 'termsAndCondition.content.userResponsibilities.content')
    },
    {
      id: 'intellectualProperty',
      title: t(userLanguage, 'termsAndCondition.content.intellectualProperty.title'),
      icon: 'copyright-outline',
      content: t(userLanguage, 'termsAndCondition.content.intellectualProperty.content')
    },
    {
      id: 'privacyPolicy',
      title: t(userLanguage, 'termsAndCondition.content.privacyPolicy.title'),
      icon: 'lock-closed-outline',
      content: t(userLanguage, 'termsAndCondition.content.privacyPolicy.content')
    },
    {
      id: 'changesToTerms',
      title: t(userLanguage, 'termsAndCondition.content.changesToTerms.title'),
      icon: 'refresh-outline',
      content: t(userLanguage, 'termsAndCondition.content.changesToTerms.content')
    },
    {
      id: 'contactDetails',
      title: t(userLanguage, 'termsAndCondition.content.contactDetails.title'),
      icon: 'mail-outline',
      content: t(userLanguage, 'termsAndCondition.content.contactDetails.content'),
      contactInfo: t(userLanguage, 'termsAndCondition.content.contactDetails.contactInfo')
    }
  ];

  const renderSection = (section) => (
    <View key={section.id} style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <Ionicons name={section.icon} size={24} color={Colors.redTheme.background} />
        </View>
        <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
          {section.title}
        </Text>
      </View>
      
      <Text style={[styles.sectionContent, getRTLStyles(userLanguage)]}>
        {section.content}
      </Text>

      {section.bulletPoints && (
        <View style={styles.bulletPointsContainer}>
          {section.bulletPoints.map((point, index) => (
            <View key={index} style={styles.bulletPoint}>
              <View style={styles.bulletIcon}>
                <Ionicons name="checkmark" size={12} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.bulletText, getRTLStyles(userLanguage)]}>
                {point}
              </Text>
            </View>
          ))}
        </View>
      )}

      {section.contactInfo && (
        <Text style={[styles.contactInfo, getRTLStyles(userLanguage)]}>
          <Text style={styles.link}>{section.contactInfo}</Text>
        </Text>
      )}
    </View>
  );

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="document-text" size={48} color="white" />
            </View>
            <Text style={[styles.heroTitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, 'termsAndCondition.header.title')}
            </Text>
            <Text style={[styles.heroSubtitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, 'termsAndCondition.content.welcome')}
            </Text>
          </View>

          {/* Content Sections */}
          <View style={styles.contentContainer}>
            {sections.map(renderSection)}

          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  androidSafeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 60 : 50,
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Hero Card - Modern e-wallet style
  heroCard: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 20,
  },

  // Content Container
  contentContainer: {
    gap: 16,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: Colors.redTheme.background,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    flex: 1,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    marginBottom: 12,
  },

  // Bullet Points
  bulletPointsContainer: {
    marginTop: 8,
  },
  bulletPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bulletIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#555",
  },

  // Contact Info
  contactInfo: {
    marginTop: 8,
    fontSize: 15,
    color: "#333",
  },
  link: {
    color: Colors.redTheme.background,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // Agreement Card
  agreementCard: {
    backgroundColor: "rgba(254, 125, 72, 0.05)",
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(254, 125, 72, 0.2)",
  },
  agreementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  agreementTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 12,
  },
  agreementText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    fontStyle: "italic",
    fontWeight: "500",
  },

  // Spacing
  bottomSpacing: {
    height: 40,
  },
});
