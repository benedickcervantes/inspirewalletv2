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
import type { NavProp } from '../../types/navigation';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];
const CATEGORY_OPTIONS = [
  'Account',
  'Wallet',
  'Transactions',
  'Investments',
  'Technical Issue',
  'Other',
];

interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
}

const HelpCenter = () => {
  const navigation = useNavigation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [ticketTitle, setTicketTitle] = useState('');
  const [priorityLevel, setPriorityLevel] = useState('');
  const [category, setCategory] = useState('');
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
      Alert.alert('Validation Error', 'Please enter your first name.');
      return;
    }
    if (!l) {
      Alert.alert('Validation Error', 'Please enter your last name.');
      return;
    }
    if (!e) {
      Alert.alert('Validation Error', 'Please enter your email address.');
      return;
    }
    if (!validateEmail(e)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    if (!ticketTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter a ticket title.');
      return;
    }
    if (!priorityLevel) {
      Alert.alert('Validation Error', 'Please select a priority level.');
      return;
    }
    if (!category) {
      Alert.alert('Validation Error', 'Please select a category.');
      return;
    }
    if (!concern.trim()) {
      Alert.alert('Validation Error', 'Please describe your concern.');
      return;
    }

    setSubmitting(true);
    // TODO: Replace with actual API call when backend endpoint is available
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    Alert.alert(
      'Request Submitted',
      'Thank you for reaching out! Our support team will review your concern and respond within 24-48 hours during business days.',
      [{ text: 'OK', onPress: () => (navigation as unknown as NavProp).goBack() }]
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
          <Text style={styles.headerTitle}>Help Center</Text>
          <TouchableOpacity style={styles.headerButton}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="time-outline" size={22} color="#F38B35" />
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.banner}>
          <View style={styles.bannerIconWrapper}>
            <MaterialCommunityIcons name="comment-search-outline" size={36} color="#F38B35" />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Submit Your Request</Text>
            <Text style={styles.bannerSubtitle}>
              Need help with something? Fill out this form and our support team will get back to you
              as soon as possible.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>
              First Name<Text style={styles.required}> *</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your first name"
              placeholderTextColor="#9E9E9E"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>
              Last Name<Text style={styles.required}> *</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your last name"
              placeholderTextColor="#9E9E9E"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Email Address<Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="your.email@example.com"
            placeholderTextColor="#9E9E9E"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.sectionLabel}>ISSUE DETAILS</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Ticket Title<Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Brief title describing your issue"
            placeholderTextColor="#9E9E9E"
            value={ticketTitle}
            onChangeText={setTicketTitle}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>
              Priority Level<Text style={styles.required}> *</Text>
            </Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowPriorityModal(true)}>
              <Text style={[styles.dropdownText, !priorityLevel && styles.dropdownPlaceholder]}>
                {priorityLevel || 'Select priority level'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>
              Category<Text style={styles.required}> *</Text>
            </Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowCategoryModal(true)}>
              <Text style={[styles.dropdownText, !category && styles.dropdownPlaceholder]}>
                {category || 'Select category'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Describe Your Concern<Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Please describe your concern or question in detail..."
            placeholderTextColor="#9E9E9E"
            value={concern}
            onChangeText={setConcern}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.note}>
          By submitting this form, we will receive your help request via email. Our support team will
          review your concern and respond within 24-48 hours during business days. Thank you for
          reaching out to us!
        </Text>

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
              <Text style={styles.submitButtonText}>SUBMIT REQUEST</Text>
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
              <Text style={styles.modalTitle}>Select Priority Level</Text>
              <TouchableOpacity onPress={() => setShowPriorityModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {PRIORITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionRow, priorityLevel === opt && styles.optionRowSelected]}
                  onPress={() => {
                    setPriorityLevel(opt);
                    setShowPriorityModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                  {priorityLevel === opt && <Ionicons name="checkmark-circle" size={22} color="#F38B35" />}
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
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {CATEGORY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionRow, category === opt && styles.optionRowSelected]}
                  onPress={() => {
                    setCategory(opt);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                  {category === opt && <Ionicons name="checkmark-circle" size={22} color="#F38B35" />}
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
