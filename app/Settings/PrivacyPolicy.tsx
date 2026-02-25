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
import { useLanguage } from '../../context/LanguageContext';
import type { NavProp } from '../../types/navigation';

const SECTIONS = [
  {
    heading: 'We Value Your Privacy',
    headingOrange: true,
    body: 'This policy explains how we collect, use, and protect your information when you use Inspire Wallet. We are committed to maintaining the trust and confidence of our users.',
    boldInBody: ['Inspire Wallet'],
  },
  {
    heading: 'What Information We Collect',
    intro: 'We collect the following types of data:',
    bullets: [
      'Personal Information: Your name, email address, and other details you provide.',
      'Usage Data: Information like your device type, IP address, and how you use the app.',
    ],
  },
  {
    heading: 'How We Use Your Information',
    intro: 'We use your information to:',
    bullets: [
      'Provide and improve your services.',
      'Contact you with updates or important notices.',
      'Monitor how the app is used to enhance performance.',
    ],
  },
  {
    heading: 'Sharing Your Information',
    body: 'We may share your data with service providers who help us run the app, business partners, or authorities if required by law.',
  },
  {
    heading: 'Data Security',
    body: 'We take steps to protect your information, but no system is 100% secure. Always be cautious when sharing data online.',
  },
  {
    heading: "Children's Privacy",
    body: "We do not collect data from anyone under 13. If you believe your child has shared data with us, contact us to remove it.",
  },
  {
    heading: 'Your Rights',
    body: 'You can update or delete your personal data by logging into your account or contacting us.',
  },
  {
    heading: 'Changes To This Policy',
    body: 'We may update this policy periodically. Check this page for the latest version.',
  },
  {
    heading: 'Contact US',
    intro: 'If you have any questions, email us at:',
    email: 'info@inspireholdings.ph',
  },
];

const PrivacyPolicy = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();

  const renderBodyWithBold = (text: string, boldPhrases: string[]) => {
    const phrase = boldPhrases[0];
    if (!phrase) return text;
    const idx = text.indexOf(phrase);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <Text style={styles.boldText}>{phrase}</Text>
        {text.slice(idx + phrase.length)}
      </>
    );
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
          <TouchableOpacity onPress={() => (navigation as unknown as NavProp).goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('privacy.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {SECTIONS.map((section, idx) => (
            <View key={idx} style={styles.section}>
              <View style={styles.headingRow}>
                {!section.headingOrange && <View style={styles.headingAccent} />}
                <Text
                  style={[styles.heading, section.headingOrange && styles.headingOrange]}
                >
                  {section.heading}
                </Text>
              </View>
              {section.intro ? (
                <Text style={styles.intro}>{section.intro}</Text>
              ) : null}
              {section.body ? (
                <Text style={styles.body}>
                  {section.boldInBody
                    ? renderBodyWithBold(section.body, section.boldInBody)
                    : section.body}
                </Text>
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
              {section.email ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`mailto:${section.email}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emailLink}>{section.email}</Text>
                </TouchableOpacity>
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
    color: '#000000',
  },
  headingOrange: {
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
  boldText: {
    fontWeight: '700',
    color: '#000000',
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
  emailLink: {
    fontSize: 14,
    color: '#F38B35',
    fontWeight: '600',
    marginTop: 8,
  },
  bottomPadding: {
    height: 32,
  },
});

export default PrivacyPolicy;
