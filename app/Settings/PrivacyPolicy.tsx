import {
  Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
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

const SECTIONS = [
  { headingKey: 'privacy.h1', headingOrange: true, bodyKey: 'privacy.b1' },
  { headingKey: 'privacy.h2', introKey: 'privacy.i2', bulletKeys: ['privacy.b2_1', 'privacy.b2_2'] },
  { headingKey: 'privacy.h3', introKey: 'privacy.i3', bulletKeys: ['privacy.b3_1', 'privacy.b3_2', 'privacy.b3_3'] },
  { headingKey: 'privacy.h4', bodyKey: 'privacy.b4' },
  { headingKey: 'privacy.h5', bodyKey: 'privacy.b5' },
  { headingKey: 'privacy.h6', bodyKey: 'privacy.b6' },
  { headingKey: 'privacy.h7', bodyKey: 'privacy.b7' },
  { headingKey: 'privacy.h8', bodyKey: 'privacy.b8' },
  { headingKey: 'privacy.h9', introKey: 'privacy.i9', email: 'info@inspireholdings.ph' },
];

const PrivacyPolicy = () => {
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
                  {t(section.headingKey)}
                </Text>
              </View>
              {'introKey' in section && section.introKey ? (
                <Text style={styles.intro}>{t(section.introKey)}</Text>
              ) : null}
              {'bodyKey' in section && section.bodyKey ? (
                <Text style={styles.body}>{t(section.bodyKey)}</Text>
              ) : null}
              {'bulletKeys' in section && section.bulletKeys ? (
                <View style={styles.bulletList}>
                  {section.bulletKeys.map((key, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.bulletText}>{t(key)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {'email' in section && section.email ? (
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

