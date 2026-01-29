import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  Platform,
} from "react-native";
import { useNavigation } from "expo-router";
import { Colors } from "../../constants/Colors";
import userService from "../../services/userService";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { Ionicons } from "@expo/vector-icons";

export default function Index() {
  const navigation = useNavigation();
  const [userLanguage, setUserLanguage] = useState('English');

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, 'privacy.header.title'),
      headerTitleStyle: {
        color: Colors.redTheme.background,
        fontSize: 20,
        fontWeight: "600",
      },
      headerTintColor: Colors.redTheme.background, // This colors the default back button
      // No headerLeft needed - React Navigation provides default back button
    });
  }, [navigation, userLanguage]);

  const fetchUserLanguage = async () => {
    try {
      const profile = await userService.getUserProfile();
      setUserLanguage(profile?.preferredLanguage || 'English');
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  const sections = [
    {
      id: 'informationCollection',
      title: t(userLanguage, 'privacy.content.informationCollection.title'),
      icon: 'information-circle-outline',
      content: t(userLanguage, 'privacy.content.informationCollection.content'),
      bulletPoints: [
        t(userLanguage, 'privacy.content.informationCollection.bulletPoints.personalInfo'),
        t(userLanguage, 'privacy.content.informationCollection.bulletPoints.usageData')
      ]
    },
    {
      id: 'informationUsage',
      title: t(userLanguage, 'privacy.content.informationUsage.title'),
      icon: 'analytics-outline',
      content: t(userLanguage, 'privacy.content.informationUsage.content'),
      bulletPoints: [
        t(userLanguage, 'privacy.content.informationUsage.bulletPoints.provideServices'),
        t(userLanguage, 'privacy.content.informationUsage.bulletPoints.contactUpdates'),
        t(userLanguage, 'privacy.content.informationUsage.bulletPoints.monitorUsage')
      ]
    },
    {
      id: 'informationSharing',
      title: t(userLanguage, 'privacy.content.informationSharing.title'),
      icon: 'share-outline',
      content: t(userLanguage, 'privacy.content.informationSharing.content'),
      bulletPoints: [
        t(userLanguage, 'privacy.content.informationSharing.bulletPoints.serviceProviders'),
        t(userLanguage, 'privacy.content.informationSharing.bulletPoints.businessPartners'),
        t(userLanguage, 'privacy.content.informationSharing.bulletPoints.authorities')
      ]
    },
    {
      id: 'dataSecurity',
      title: t(userLanguage, 'privacy.content.dataSecurity.title'),
      icon: 'shield-checkmark-outline',
      content: t(userLanguage, 'privacy.content.dataSecurity.content')
    },
    {
      id: 'childrensPrivacy',
      title: t(userLanguage, 'privacy.content.childrensPrivacy.title'),
      icon: 'people-outline',
      content: t(userLanguage, 'privacy.content.childrensPrivacy.content')
    },
    {
      id: 'yourRights',
      title: t(userLanguage, 'privacy.content.yourRights.title'),
      icon: 'hand-right-outline',
      content: t(userLanguage, 'privacy.content.yourRights.content')
    },
    {
      id: 'policyChanges',
      title: t(userLanguage, 'privacy.content.policyChanges.title'),
      icon: 'refresh-outline',
      content: t(userLanguage, 'privacy.content.policyChanges.content')
    },
    {
      id: 'contactUs',
      title: t(userLanguage, 'privacy.content.contactUs.title'),
      icon: 'mail-outline',
      content: t(userLanguage, 'privacy.content.contactUs.content'),
      email: t(userLanguage, 'privacy.content.contactUs.email')
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

      {section.email && (
        <Text style={[styles.contactInfo, getRTLStyles(userLanguage)]}>
          <Text style={styles.link}>{section.email}</Text>
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
              <Ionicons name="shield-outline" size={48} color="white" />
            </View>
            <Text style={[styles.heroTitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, 'privacy.header.title')}
            </Text>
            <Text style={[styles.heroSubtitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, 'privacy.content.introduction.content')}
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

  // Spacing
  bottomSpacing: {
    height: 40,
  },
});
