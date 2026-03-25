import {
  Ionicons,
  MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLanguage } from '../../context/LanguageContext';
import type { NavProp } from '../../types/navigation';
import { TouchableOpacity } from "react-native-gesture-handler";

const HelpCenter = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();

  const FAQS = [
    {
      question: t('help.faq1Question'),
      answer: t('help.faq1Answer'),
    },
    {
      question: t('help.faq2Question'),
      answer: t('help.faq2Answer'),
    },
    {
      question: t('help.faq3Question'),
      answer: t('help.faq3Answer'),
    },
    {
      question: t('help.faq4Question'),
      answer: t('help.faq4Answer'),
    },
    {
      question: t('help.faq5Question'),
      answer: t('help.faq5Answer'),
    },
    {
      question: t('help.faq6Question'),
      answer: t('help.faq6Answer'),
    },
  ];

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
          <Text style={styles.headerTitle}>{t('help.title')}</Text>
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
            <Text style={styles.cardTitle}>{t('help.contactSupport')}</Text>
          </View>
          <Text style={styles.cardText}>
            {t('help.contactSupportDesc')}
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleEmailSupport} activeOpacity={0.8}>
            <Ionicons name="mail-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.contactButtonText}>{t('help.emailUs')}</Text>
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="frequently-asked-questions" size={24} color="#F38B35" />
            </View>
            <Text style={styles.cardTitle}>{t('help.faqTitle')}</Text>
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
            <Text style={styles.cardTitle}>{t('help.quickLinks')}</Text>
          </View>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => (navigation as unknown as NavProp).navigate('PrivacyPolicy')}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#F38B35" />
            <Text style={styles.linkText}>{t('settings.privacyPolicy')}</Text>
            <Ionicons name="chevron-forward" size={18} color="#BBBBBB" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <View style={styles.linkDivider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => (navigation as unknown as NavProp).navigate('TermsConditions')}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={20} color="#F38B35" />
            <Text style={styles.linkText}>{t('settings.termsAndCondition')}</Text>
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

