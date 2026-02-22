import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
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

const REASON_OPTIONS = [
  'No longer need the service',
  'Found a better alternative',
  'Privacy concerns',
  'Too expensive',
  'Technical issues',
  'Other',
];

type Step = 'confirm' | 'reason' | 'done';

const DeleteAccount = () => {
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>('confirm');
  const [reason, setReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirmNo = () => {
    (navigation as unknown as NavProp).goBack();
  };

  const handleConfirmYes = () => {
    setStep('reason');
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please select a reason for deleting your account.');
      return;
    }

    setSubmitting(true);
    // TODO: Replace with actual API call when backend endpoint is available
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setStep('done');

    Alert.alert(
      'Request Submitted',
      'Your account deletion request has been submitted. Our admin team will process your request within 2-3 business days. You will be notified via email once your account has been deleted. Thank you for being part of Inspire Wallet.',
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
          <TouchableOpacity onPress={() => (navigation as unknown as NavProp).goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delete Account</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {step === 'confirm' && (
          <View style={styles.card}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="alert-circle-outline" size={56} color="#F38B35" />
            </View>
            <Text style={styles.confirmTitle}>Do you really want to delete your account?</Text>
            <Text style={styles.confirmSubtitle}>
              This action cannot be undone. All your data, including investments and transaction
              history, will be permanently removed.
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleConfirmNo} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>No, keep my account</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerButton} onPress={handleConfirmYes} activeOpacity={0.8}>
                <Text style={styles.dangerButtonText}>Yes, delete my account</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'reason' && (
          <View style={styles.card}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="comment-question-outline" size={48} color="#F38B35" />
            </View>
            <Text style={styles.reasonTitle}>Tell us why you're leaving</Text>
            <Text style={styles.reasonSubtitle}>
              Your feedback helps us improve. Please select a reason and feel free to add more
              details.
            </Text>

            <Text style={styles.inputLabel}>
              Reason<Text style={styles.required}> *</Text>
            </Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowReasonModal(true)}>
              <Text style={[styles.dropdownText, !reason && styles.dropdownPlaceholder]}>
                {reason || 'Select reason'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Additional details (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Share more about your experience..."
              placeholderTextColor="#9E9E9E"
              value={additionalDetails}
              onChangeText={setAdditionalDetails}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

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
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => setStep('confirm')}>
              <Ionicons name="arrow-back" size={18} color="#F38B35" />
              <Text style={styles.backLinkText}>Go back</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showReasonModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReasonModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Reason</Text>
              <TouchableOpacity onPress={() => setShowReasonModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {REASON_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionRow, reason === opt && styles.optionRowSelected]}
                  onPress={() => {
                    setReason(opt);
                    setShowReasonModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                  {reason === opt && <Ionicons name="checkmark-circle" size={22} color="#F38B35" />}
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
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  dangerButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reasonTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  reasonSubtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
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
    minHeight: 80,
    paddingTop: 14,
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
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  backLinkText: {
    fontSize: 14,
    color: '#F38B35',
    fontWeight: '600',
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

export default DeleteAccount;
