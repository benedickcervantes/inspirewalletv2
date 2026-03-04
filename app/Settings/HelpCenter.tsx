import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import type { NavProp } from '../../types/navigation';

const FAQS = [
  {
    question: 'How do I reset my password?',
    answer:
      'On the Login screen, tap "Forgot Password?" and enter your registered email address. You will receive a secure reset link in your inbox valid for 30 minutes.',
  },
  {
    question: 'How do I verify my email?',
    answer:
      'After registration, a 6-digit OTP is sent to your email. Enter it on the verification screen, or click the verification link in the email.',
  },
  {
    question: 'How do I set up a passcode?',
    answer:
      'After logging in, go to Settings → Change Passcode. You can set a 4-digit passcode for faster and more secure app access.',
  },
  {
    question: 'How do I transfer money?',
    answer:
      'From the Dashboard, tap "Transfer". Enter the recipient\'s account number, amount, and confirm the transaction.',
  },
  {
    question: 'What should I do if I cannot log in?',
    answer:
      'Ensure your email and password are correct. Use "Forgot Password?" to reset your password. If the issue persists, contact support below.',
  },
  {
    question: 'How do I update my profile?',
    answer:
      'Go to Settings → Personal Information to update your name, phone, date of birth, and country.',
  },
];

const HelpCenter = () => {
  const navigation = useNavigation();

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@inspirewallet.com?subject=Help%20Request');
  };

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
          <TouchableOpacity
            onPress={() => (navigation as unknown as NavProp).goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help Center</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Contact Support */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="headset" size={24} color="#F38B35" />
            </View>
            <Text style={styles.cardTitle}>Contact Support</Text>
          </View>
          <Text style={styles.cardText}>
            Our support team is available Monday – Friday, 9 AM – 6 PM (PHT).
            We typically respond within 24 hours.
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleEmailSupport} activeOpacity={0.8}>
            <Ionicons name="mail-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.contactButtonText}>Email Us</Text>
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="frequently-asked-questions" size={24} color="#F38B35" />
            </View>
            <Text style={styles.cardTitle}>Frequently Asked Questions</Text>
          </View>
          {FAQS.map((faq, index) => (
            <View key={index} style={[styles.faqItem, index < FAQS.length - 1 && styles.faqDivider]}>
              <View style={styles.faqQuestionRow}>
                <View style={styles.faqBullet} />
                <Text style={styles.faqQuestion}>{faq.question}</Text>
              </View>
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            </View>
          ))}
        </View>

        {/* Quick Links */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="link-variant" size={24} color="#F38B35" />
            </View>
            <Text style={styles.cardTitle}>Quick Links</Text>
          </View>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => (navigation as unknown as NavProp).navigate('PrivacyPolicy')}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#F38B35" />
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color="#BBBBBB" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <View style={styles.linkDivider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => (navigation as unknown as NavProp).navigate('TermsConditions')}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={20} color="#F38B35" />
            <Text style={styles.linkText}>Terms & Conditions</Text>
            <Ionicons name="chevron-forward" size={18} color="#BBBBBB" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
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
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF1E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    flex: 1,
  },
  cardText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
    marginBottom: 14,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F38B35',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignSelf: 'flex-start',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  faqItem: {
    paddingVertical: 12,
  },
  faqDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  faqBullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F38B35',
    marginTop: 6,
    marginRight: 10,
    flexShrink: 0,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    flex: 1,
    lineHeight: 20,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
    paddingLeft: 17,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  linkText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  linkDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  bottomPadding: {
    height: 32,
  },
});

export default HelpCenter;
