import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import type { NavProp } from '../../types/navigation';
import { useResponsive } from '../../utils/responsive';

const PRIORITY_KEYS = ['help.priorityLow', 'help.priorityMedium', 'help.priorityHigh', 'help.priorityUrgent'] as const;
const CATEGORY_KEYS = ['help.categoryAccount', 'help.categoryWallet', 'help.categoryTransactions', 'help.categoryInvestments', 'help.categoryTechnical', 'help.categoryOther'] as const;

interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
}

const HelpCenter = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { horizontalPadding } = useResponsive();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [ticketTitle, setTicketTitle] = useState('');
  const [priorityLevel, setPriorityLevel] = useState('');
  const [categoryKey, setCategoryKey] = useState('');
  const [concern, setConcern] = useState('');
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadUser = useCallback(async () => {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as UserData;
        if (user.firstName) setFirstName(user.firstName);
        if (user.lastName) setLastName(user.lastName);
        if (user.email) setEmail(user.email);
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleSubmit = async () => {
    const f = firstName.trim();
    const l = lastName.trim();
    const e = email.trim();

    if (!f) {
      Alert.alert(t('help.validationError'), t('help.validationFirst'));
      return;
    }
    if (!l) {
      Alert.alert(t('help.validationError'), t('help.validationLast'));
      return;
    }
    if (!e) {
      Alert.alert(t('help.validationError'), t('help.validationEmail'));
      return;
    }
    if (!validateEmail(e)) {
      Alert.alert(t('help.validationError'), t('help.validationEmailValid'));
      return;
    }
    if (!ticketTitle.trim()) {
      Alert.alert(t('help.validationError'), t('help.validationTitle'));
      return;
    }
    if (!priorityLevel) {
      Alert.alert(t('help.validationError'), t('help.validationPriority'));
      return;
    }
    if (!categoryKey) {
      Alert.alert(t('help.validationError'), t('help.validationCategory'));
      return;
    }
    if (!concern.trim()) {
      Alert.alert(t('help.validationError'), t('help.validationConcern'));
      return;
    }

    setSubmitting(true);
    // TODO: Replace with actual API call when backend endpoint is available
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    Alert.alert(
      t('help.requestSubmitted'),
      t('help.thankYouMessage'),
      [{ text: t('common.ok'), onPress: () => (navigation as unknown as NavProp).goBack() }]
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
          <TouchableOpacity onPress={() => (navigation as unknown as NavProp).goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('help.title')}</Text>
          <TouchableOpacity style={styles.headerButton}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="time-outline" size={22} color="#F38B35" />
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingHorizontal: horizontalPadding }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.banner}>
          <View style={styles.bannerIconWrapper}>
            <MaterialCommunityIcons name="comment-search-outline" size={36} color="#F38B35" />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>{t('help.submitRequest')}</Text>
            <Text style={styles.bannerSubtitle}>{t('help.bannerSubtitle')}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('help.personalInfo')}</Text>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>
              {t('help.firstName')}<Text style={styles.required}> *</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('help.placeholderFirst')}
              placeholderTextColor="#9E9E9E"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>
              {t('help.lastName')}<Text style={styles.required}> *</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('help.placeholderLast')}
              placeholderTextColor="#9E9E9E"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('help.emailAddress')}<Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('help.placeholderEmail')}
            placeholderTextColor="#9E9E9E"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.sectionLabel}>{t('help.issueDetails')}</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('help.ticketTitle')}<Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('help.placeholderTitle')}
            placeholderTextColor="#9E9E9E"
            value={ticketTitle}
            onChangeText={setTicketTitle}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>
              {t('help.priorityLevel')}<Text style={styles.required}> *</Text>
            </Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowPriorityModal(true)}>
              <Text style={[styles.dropdownText, !priorityLevel && styles.dropdownPlaceholder]}>
                {priorityLevel || t('help.selectPriority')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>
              {t('help.category')}<Text style={styles.required}> *</Text>
            </Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowCategoryModal(true)}>
              <Text style={[styles.dropdownText, !categoryKey && styles.dropdownPlaceholder]}>
                {categoryKey ? t(categoryKey) : t('help.selectCategory')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('help.describeConcern')}<Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('help.placeholderConcern')}
            placeholderTextColor="#9E9E9E"
            value={concern}
            onChangeText={setConcern}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.note}>{t('help.note')}</Text>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#DE5212', '#F38B35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>{t('help.submitRequestButton')}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={showPriorityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPriorityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('help.selectPriorityTitle')}</Text>
              <TouchableOpacity onPress={() => setShowPriorityModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {PRIORITY_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.optionRow, priorityLevel === key && styles.optionRowSelected]}
                  onPress={() => {
                    setPriorityLevel(key);
                    setShowPriorityModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(key)}</Text>
                  {priorityLevel === key && <Ionicons name="checkmark-circle" size={22} color="#F38B35" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('help.selectCategoryTitle')}</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {CATEGORY_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.optionRow, categoryKey === key && styles.optionRowSelected]}
                  onPress={() => {
                    setCategoryKey(key);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(key)}</Text>
                  {categoryKey === key && <Ionicons name="checkmark-circle" size={22} color="#F38B35" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerButton: {
    padding: 4,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#FFF8F3',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 139, 53, 0.25)',
  },
  bannerIconWrapper: {
    marginRight: 14,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputGroup: {
    marginTop: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  required: {
    color: '#F38B35',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000000',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    color: '#9E9E9E',
    fontWeight: '400',
  },
  note: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
    marginTop: 20,
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  bottomPadding: {
    height: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalContent: {
    padding: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#F9F9F9',
  },
  optionRowSelected: {
    backgroundColor: 'rgba(243, 139, 53, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(243, 139, 53, 0.3)',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default HelpCenter;
