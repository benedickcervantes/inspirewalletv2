import {
  Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { unregisterIndieDevice } from 'native-notify';
import { useEffect,
  useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLanguage } from '../../context/LanguageContext';
import {
    subscribeToAccountDeletionApproved,
    subscribeToAccountDeletionRejected,
} from '../../lib/accountDeletionEvents';
import { ANNOUNCEMENT_SESSION_ASYNC_KEYS } from '../../lib/announcementLoginSession';
import { navigateToWelcome } from '../../lib/navigationRef';

import ActivityModal from '../components/ActivityModal';
type ModalState = 'none' | 'approved' | 'rejected';
type ModalData = { adminNotes?: string | null };

/**
 * Listens for real-time account deletion approval/rejection from backend
 * and shows modals. On approved: shows "Account deleted" and logs out fully.
 * On rejected: shows admin comment.
 */
export default function AccountDeletionModal() {
  const { t } = useLanguage();
  const [state, setState] = useState<{ type: ModalState; data?: ModalData }>({
    type: 'none',
  });

  useEffect(() => {
    const unsubApproved = subscribeToAccountDeletionApproved(() => {
      setState({ type: 'approved' });
    });
    const unsubRejected = subscribeToAccountDeletionRejected((adminNotes) => {
      setState({ type: 'rejected', data: { adminNotes } });
    });
    return () => {
      unsubApproved();
      unsubRejected();
    };
  }, []);

  const handleApprovedClose = async () => {
    setState({ type: 'none' });
    try {
      // Full logout: clear all auth data
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        const userId = userObj?.id || userObj?._id;
        const appId = process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_ID;
        const appToken = process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_TOKEN;
        if (userId && appId && appToken) {
          unregisterIndieDevice(String(userId), Number(appId), appToken);
        }
      }
      await AsyncStorage.multiRemove([
        'access_token',
        'user',
        'passcodeLoginComplete',
        'registrationPasscodePending',
        ...ANNOUNCEMENT_SESSION_ASYNC_KEYS,
      ]);
    } catch (_) {}
    navigateToWelcome();
  };

  const handleRejectedClose = () => {
    setState({ type: 'none' });
  };

  if (state.type === 'none') return null;

  if (state.type === 'approved') {
    return (
      <ActivityModal visible transparent animationType="fade">
        <View style={styles.overlay}>
          <LinearGradient
            colors={['#E15816', '#F48F38']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modal}
          >
            <Ionicons name="checkmark-circle" size={56} color="#FFFFFF" style={styles.icon} />
            <Text style={styles.title}>{t('delete.approvedTitle')}</Text>
            <Text style={styles.message}>{t('delete.approvedMessage')}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.buttonApproved,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => void handleApprovedClose()}
              android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
            >
              <Text style={styles.buttonText}>{t('common.ok')}</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </ActivityModal>
    );
  }

  // Rejected
  const adminNotes = state.data?.adminNotes;
  return (
    <ActivityModal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.rejectedModal}>
          <Ionicons name="close-circle" size={56} color="#DC2626" style={styles.icon} />
          <Text style={[styles.title, { color: '#333' }]}>{t('delete.rejectedTitle')}</Text>
          <Text style={[styles.message, { color: '#666' }]}>
            {t('delete.rejectedMessage')}
          </Text>
          {adminNotes ? (
            <View style={styles.commentBox}>
              <Text style={styles.commentLabel}>{t('delete.adminComment')}</Text>
              <ScrollView
                style={styles.commentScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.commentText}>{adminNotes}</Text>
              </ScrollView>
            </View>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.rejectedButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleRejectedClose}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>{t('common.ok')}</Text>
          </Pressable>
        </View>
      </View>
    </ActivityModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
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
  rejectedModal: {
    backgroundColor: '#FFFFFF',
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
  icon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.95,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  /** Full-width tap target — avoids RNGH/Modal issues and small hit areas on phones. */
  buttonApproved: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  rejectedButton: {
    alignSelf: 'stretch',
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E15816',
  },
  commentBox: {
    marginBottom: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 120,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  commentScroll: {
    maxHeight: 80,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

