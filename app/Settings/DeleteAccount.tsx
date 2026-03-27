import {
  Ionicons,
  MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { submitAccountDeletionRequest } from '../../configs/api';
import { useLanguage } from '../../context/LanguageContext';
import type { NavProp } from '../../types/navigation';
import AccountDeletionModal from '../AccountDeletion/AccountDeletionModal';
const REASON_KEYS = ['delete.reasonNoLonger', 'delete.reasonBetter', 'delete.reasonPrivacy', 'delete.reasonExpensive', 'delete.reasonTechnical', 'delete.reasonOther'] as const;

type Step = 'confirm' | 'reason' | 'done';

const DeleteAccount = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('confirm');
  const [reasonKey, setReasonKey] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirmNo = () => {
    (navigation as unknown as NavProp).goBack();
  };

  const handleConfirmYes = () => {
    setStep('reason');
  };

  const handleSubmit = async () => {
    if (!reasonKey.trim()) {
      Alert.alert(t('delete.required'), t('delete.requiredReason'));
      return;
    }

    setSubmitting(true);
    try {
      const accessToken = await AsyncStorage.getItem('access_token');
      if (!accessToken) {
        Alert.alert(t('delete.required'), t('delete.notAuthenticated') || t('settings.deleteNotAuthenticated'));
        return;
      }

      const res = await submitAccountDeletionRequest(accessToken, {
        reason: reasonKey,
        notes: additionalDetails?.trim() || undefined,
      });

      if (!res?.success) {
        Alert.alert(t('common.error'), res?.error || t('settings.deleteRequestFailed'));
        return;
      }

      setStep('done');
      setShowSuccessModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    (navigation as unknown as NavProp).goBack();
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
          <Text style={styles.headerTitle}>{t('delete.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'confirm' && (
          <View style={styles.card}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="alert-circle-outline" size={56} color="#F38B35" />
            </View>
            <Text style={styles.confirmTitle}>{t('delete.confirmTitle')}</Text>
            <Text style={styles.confirmSubtitle}>{t('delete.confirmSubtitle')}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleConfirmNo} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>{t('delete.noKeepAccount')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerButton} onPress={handleConfirmYes} activeOpacity={0.8}>
                <Text style={styles.dangerButtonText}>{t('delete.yesDeleteAccount')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'reason' && (
          <View style={styles.card}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="comment-question-outline" size={48} color="#F38B35" />
            </View>
            <Text style={styles.reasonTitle}>{t('delete.tellUsWhy')}</Text>
            <Text style={styles.reasonSubtitle}>{t('delete.reasonSubtitle')}</Text>

            <Text style={styles.inputLabel}>
              {t('delete.reason')}<Text style={styles.required}> *</Text>
            </Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowReasonModal(true)}>
              <Text style={[styles.dropdownText, !reasonKey && styles.dropdownPlaceholder]}>
                {reasonKey ? t(reasonKey) : t('delete.selectReason')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>{t('delete.additionalDetails')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('delete.placeholderDetails')}
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
                  <Text style={styles.submitButtonText}>{t('delete.submitRequest')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => setStep('confirm')}>
              <Ionicons name="arrow-back" size={18} color="#F38B35" />
              <Text style={styles.backLinkText}>{t('delete.goBack')}</Text>
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
        <Pressable style={styles.modalOverlay} onPress={() => setShowReasonModal(false)}>
          <Pressable style={styles.modalContainer} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('delete.selectReasonTitle')}</Text>
              <TouchableOpacity onPress={() => setShowReasonModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              {REASON_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.optionRow, reasonKey === key && styles.optionRowSelected]}
                  onPress={() => {
                    setReasonKey(key);
                    setShowReasonModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(key)}</Text>
                  {reasonKey === key && <Ionicons name="checkmark-circle" size={22} color="#F38B35" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Request Submitted Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessModalClose}
      >
        <View style={styles.successModalOverlay}>
          <LinearGradient
            colors={['#E15816', '#F48F38']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.successModalContainer}
          >
            <Text style={styles.successModalTitle}>{t('delete.requestSubmitted')}</Text>
            <Text style={styles.successModalMessage}>{t('delete.successMessage')}</Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={handleSuccessModalClose}
              activeOpacity={0.8}
            >
              <Text style={styles.successModalButtonText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
      <AccountDeletionModal />
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
  // Request Submitted success modal - orange gradient (#E15816 → #F48F38)
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModalContainer: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  successModalMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.95,
  },
  successModalButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  successModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E15816',
  },
});

export default DeleteAccount;

