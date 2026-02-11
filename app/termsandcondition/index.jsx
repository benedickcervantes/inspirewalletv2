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
import { LinearGradient } from 'expo-linear-gradient';
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
      headerTitle: "Terms & Conditions",
      headerTintColor: "#000000",
      headerTitleStyle: {
        color: "#000000",
        fontSize: 18,
        fontWeight: "bold",
      },
      headerTitleAlign: "center",
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
      title: 'Eligibility',
      content: 'You must be at least 18 years old and have the legal capacity to enter into contracts. By using our app, you represent that you meet these requirements. If you are located in a jurisdiction where investment services are restricted, you may not use the app.'
    },
    {
      id: 'accountRegistration',
      title: 'Account Registration',
      content: 'To access the maximum capacity of the app, you must create an account. You agree to:',
      bulletPoints: [
        'Provide accurate and complete information',
        'Maintain the security of your password',
        'In case of any unauthorized use of your account, kindly notify us immediately'
      ]
    },
    {
      id: 'servicesProvided',
      title: 'Services Provided',
      content: 'Inspire Wallet provides you access and investment and lets you monitor your money before and after withdrawal. Every transaction shall be made through email and not directly with the Bank. Inspire Alliance Fund Group will process your transaction, not the app itself. The process could take approximately five (5) to seven (7) working days to reflect on your Inspire Wallet account.'
    },
    {
      id: 'feesAndCharges',
      title: 'Fees and Charges',
      content: 'Details of fees associated with transactions, account maintenance, and other services will be provided in-app and may change from time to time.'
    },
    {
      id: 'userResponsibilities',
      title: 'User Responsibilities',
      content: 'You agree to use the app for lawful purposes and to abide by all applicable laws and regulations. You are responsible for your account and investment decisions.'
    },
    {
      id: 'intellectualProperty',
      title: 'Intellectual Property',
      content: 'All content, trademarks, and software related to are owned by Inspire Alliance Fund Group or its licensors. You are granted a limited, non-exclusive license to use the app for personal purposes.'
    },
    {
      id: 'privacyPolicy',
      title: 'Privacy Policy',
      content: 'Your use of the app is also governed by our Privacy Policy, which details how we collect, use, and protect your personal information. The app only collects data such as your name, email address and bank details.'
    },
    {
      id: 'changesToTerms',
      title: 'Changes to Terms',
      content: 'We may update these terms at any time. We will notify you of significant changes through the app or via email. Your continued use of the app after changes constitutes acceptance of the new terms.'
    },
    {
      id: 'contactDetails',
      title: 'Contact Us',
      content: 'For questions or concerns regarding these terms, please contact us at:',
      contactInfo: 'inspireholdings: 85982571'
    }
  ];

  const renderSection = (section) => (
    <View key={section.id} style={styles.sectionCard}>
      <View style={styles.sectionTitleContainer}>
        <LinearGradient
          colors={['#E15816', '#F48F38']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.orangeLine}
        />
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
              <Text style={styles.bulletDot}>•</Text>
              <Text style={[styles.bulletText, getRTLStyles(userLanguage)]}>
                {point}
              </Text>
            </View>
          ))}
        </View>
      )}

      {section.contactInfo && (
        <Text style={[styles.contactInfoText, getRTLStyles(userLanguage)]}>
          {section.contactInfo}
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
            <Text style={[styles.heroTitle, getRTLStyles(userLanguage)]}>
              Welcome to Inspire Wallet!
            </Text>
            <Text style={[styles.heroSubtitle, getRTLStyles(userLanguage)]}>
              Please read these terms and conditions carefully before accessing, using, or obtaining any materials, information, products, or services through the Inspire Wallet (collectively, "the app"). By using our app, you agree to be bound by these terms and conditions ("Terms") and our Privacy Policy. In these "Terms", "we", "us", "our" and "Inspire Wallet" refers to Inspire Wallet, and "I", "you", and "your" refers to you, the user.
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
    paddingTop: Platform.OS === "android" ? 80 : 70,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Hero Card - Clean white card
  heroCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E15816",
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },

  // Content Container
  contentContainer: {
    gap: 0,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  orangeLine: {
    width: 4,
    height: 20,
    marginRight: 12,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1a1a1a",
    flex: 1,
  },
  sectionContent: {
    fontSize: 13,
    lineHeight: 20,
    color: "#666",
    marginBottom: 8,
  },

  // Bullet Points
  bulletPointsContainer: {
    marginTop: 8,
  },
  bulletPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 16,
    color: "#E15816",
    marginRight: 8,
    marginTop: -2,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: "#666",
  },

  // Contact Info
  contactInfoText: {
    marginTop: 8,
    fontSize: 13,
    color: "#E15816",
    fontWeight: "600",
  },

  // Spacing
  bottomSpacing: {
    height: 40,
  },
});
