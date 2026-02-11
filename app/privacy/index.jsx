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
      headerTitle: "Privacy Policy",
      headerTitleStyle: {
        color: "#000000",
        fontSize: 18,
        fontWeight: "bold",
      },
      headerTintColor: "#000000",
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
      id: 'informationCollection',
      title: 'What Information We Collect',
      content: 'We collect the following types of data:',
      bulletPoints: [
        'Personal Information: Your name, email address, and other details you provide.',
        'Usage Data: Information like your device type, IP address, and how you use the app.'
      ]
    },
    {
      id: 'informationUsage',
      title: 'How We Use Your Information',
      content: 'We use your information to:',
      bulletPoints: [
        'Provide and improve your services.',
        'Contact you with updates or important notices.',
        'Monitor how the app is used to enhance performance.'
      ]
    },
    {
      id: 'informationSharing',
      title: 'Sharing Your Information',
      content: 'We may share your data with service providers who help us run the app, business partners, or authorities if required by law.'
    },
    {
      id: 'dataSecurity',
      title: 'Data Security',
      content: 'We take steps to protect your information, but no system is 100% secure. Always be cautious when sharing data online.'
    },
    {
      id: 'childrensPrivacy',
      title: "Children's Privacy",
      content: 'We do not collect data from anyone under 13. If you believe your child has shared data with us, contact us to remove it.'
    },
    {
      id: 'yourRights',
      title: 'Your Rights',
      content: 'You can update or delete your personal data by logging into your account or contacting us.'
    },
    {
      id: 'policyChanges',
      title: 'Changes To This Policy',
      content: 'We may update this policy periodically. Check this page for the latest version.'
    },
    {
      id: 'contactUs',
      title: 'Contact Us',
      content: 'If you have any questions, email us at:',
      email: 'info@inspireholdings.ph'
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

      {section.email && (
        <Text style={[styles.emailText, getRTLStyles(userLanguage)]}>
          {section.email}
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
              We Value Your Privacy
            </Text>
            <Text style={[styles.heroSubtitle, getRTLStyles(userLanguage)]}>
              This policy explains how we collect, use, and protect your information when you use Inspire Wallet. We are committed to maintaining the trust and confidence of our users.
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

  // Email Text
  emailText: {
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
