import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NavProp } from '../../types/navigation';

const SECTIONS = [
  {
    heading: 'Welcome to Inspire Wallet!',
    body:
      'Please read these terms and conditions carefully before accessing, using, or obtaining any materials, information, products or services. By accessing the Inspire Wallet (collectively, "the app"), you agree to be bound by these terms and conditions ("Terms") and our Privacy Policy. In these "Terms", "we", "us", "our" and "Inspire Wallet" refers to Inspire Wallet, and "you" and "your" refers to you, the user of our application.',
  },
  {
    heading: 'Eligibility',
    body:
      'You must be at least 18 years old and have the legal capacity to enter into contracts. By using our app, you represent that you meet these requirements. If you are located in a jurisdiction where investment services are restricted, you may not use the app.',
  },
  {
    heading: 'Account Registration',
    intro: 'To access the maximum capacity of the app, you must create an account. You agree to:',
    bullets: [
      'Provide accurate and complete information',
      'Maintain the security of your password',
      'In case of any unauthorized use of your account, kindly notify us immediately',
    ],
  },
  {
    heading: 'Services Provided',
    body:
      'Inspire Wallet tracks your stocks and investments and lets you monitor your money before and after withdrawal. Every transaction shall be made through email and not directly with the bank. Inspire Alliance Fund Group will process your transaction, not the app itself. The process could take approximately five (5) to seven (7) working days to reflect on your Inspire Wallet account.',
  },
  {
    heading: 'Fees and Charges',
    body:
      'Details about fees associated with transactions, account maintenance, and other services will be provided in-app and may change from time to time.',
  },
  {
    heading: 'User Responsibilities',
    body:
      'You agree to use the app for lawful purposes and to abide by all applicable laws and regulations. You are responsible for your account and investment decisions.',
  },
  {
    heading: 'Intellectual Property',
    body:
      'All content, trademarks, and software related to Inspire Wallet are owned by Inspire Alliance Fund Group or its licensors. You are granted a limited, non-exclusive license to use the app for personal purposes.',
  },
  {
    heading: 'Privacy Policy',
    body:
      'Your use of the app is also governed by our Privacy Policy, which details how we collect, use, and protect your personal information. The app only collects data such as your name, email address and bank details.',
  },
  {
    heading: 'Changes to Terms',
    body:
      'We may modify these terms at any time. We will notify you of significant changes through the app or via email. Your continued use of the app after changes constitutes acceptance of the new terms.',
  },
  {
    heading: 'Contact',
    contactIntro: 'For questions or concerns regarding these terms, please contact us at',
    contactText: 'inspireholdings.ph: 85963571',
    contactUrl: 'tel:85963571',
  },
];

const TermsConditions = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#DE5212', '#F38B35']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        locations={[0.01, 1]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => (navigation as unknown as NavProp).goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms & Conditions</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {SECTIONS.map((section, idx) => (
            <View key={idx} style={styles.section}>
              <View style={styles.headingRow}>
                <View style={styles.headingAccent} />
                <Text style={styles.heading}>{section.heading}</Text>
              </View>
              {section.intro ? (
                <Text style={styles.intro}>{section.intro}</Text>
              ) : null}
              {section.body ? (
                <Text style={styles.body}>{section.body}</Text>
              ) : null}
              {section.bullets ? (
                <View style={styles.bulletList}>
                  {section.bullets.map((item, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {section.contactIntro ? (
                <View style={styles.contactSection}>
                  <Text style={styles.contactIntro}>{section.contactIntro}</Text>
                  <TouchableOpacity
                    onPress={() => section.contactUrl && Linking.openURL(section.contactUrl)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.contactLink}>{section.contactText}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))}
        </View>
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  section: {
    marginBottom: 20,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headingAccent: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#F38B35',
    marginRight: 12,
    alignSelf: 'stretch',
  },
  heading: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#F38B35',
  },
  intro: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 22,
    marginTop: 8,
  },
  body: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 22,
    marginTop: 8,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F38B35',
    marginRight: 10,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    lineHeight: 22,
  },
  contactSection: {
    marginTop: 8,
  },
  contactIntro: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  contactLink: {
    fontSize: 14,
    color: '#F38B35',
    fontWeight: '700',
    fontStyle: 'italic',
    marginTop: 4,
  },
  bottomPadding: {
    height: 32,
  },
});

export default TermsConditions;
