import {
  Ionicons,
  MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLanguage } from '../../context/LanguageContext';
import type { NavProp } from '../../types/navigation';
import { TouchableOpacity } from "react-native-gesture-handler";

const WALLET_FEATURE_KEYS = ['about.feature1', 'about.feature2', 'about.feature3', 'about.feature4'] as const;

const Aboutus = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();

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
          <Text style={styles.headerTitle}>{t('about.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="domain" size={24} color="#F38B35" />
            </View>
            <Text style={styles.cardTitle}>{t('about.ourCompany')}</Text>
          </View>
          <Text style={styles.cardText}>
            {t('about.ourCompanyDesc')}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="account-group" size={24} color="#F38B35" />
            </View>
            <Text style={styles.cardTitle}>{t('about.ourMission')}</Text>
          </View>
          <Text style={styles.cardText}>
            {t('about.ourMissionDesc')}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="wallet" size={24} color="#F38B35" />
            </View>
            <Text style={styles.cardTitle}>{t('about.inspireWallet')}</Text>
          </View>
          <Text style={styles.cardText}>
            {t('about.inspireWalletIntro')}
          </Text>
          <View style={styles.featuresList}>
            {WALLET_FEATURE_KEYS.map((key, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.featureText}>{t(key)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.blockquote}>
            <View style={styles.blockquoteBar} />
            <Text style={styles.blockquoteText}>{t('about.blockquote')}</Text>
          </View>
        </View>

        <View style={styles.ctaBanner}>
          <View style={styles.ctaIconWrapper}>
            <MaterialCommunityIcons name="rocket-launch" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.ctaTitle}>{t('about.readyToGetStarted')}</Text>
          <Text style={styles.ctaText}>{t('about.ctaText')}</Text>
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
  },
  cardText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
  },
  featuresList: {
    marginTop: 12,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F38B35',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  blockquote: {
    flexDirection: 'row',
    marginTop: 4,
  },
  blockquoteBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#F38B35',
    marginRight: 12,
  },
  blockquoteText: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  ctaBanner: {
    backgroundColor: '#F38B35',
    borderRadius: 12,
    marginTop: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  ctaIconWrapper: {
    marginBottom: 12,
  },
  ctaTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.95,
  },
  bottomPadding: {
    height: 32,
  },
});

export default Aboutus;

