import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOrCreateMainWallet, getTransactions } from '../../configs/api';
import type { TransactionDoc } from '../../configs/firebase';
import { auth, subscribeToTransactions } from '../../configs/firebase';
import type { NavProp } from '../../types/navigation';

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  TOP_UP: 'Deposit',
  PAYMENT: 'Withdraw',
  TRANSFER_OUT: 'Transfer',
  TRANSFER_IN: 'Received',
  FEE: 'Fee',
  REFUND: 'Refund',
  TIME_DEPOSIT: 'Time Deposit',
};

function getTransactionTypeLabel(type?: string): string {
  if (!type) return 'Transaction';
  return TRANSACTION_TYPE_LABELS[type] ?? type;
}

const SPENT_TYPES = ['PAYMENT', 'TRANSFER_OUT', 'FEE'];
const INCOME_TYPES = ['TOP_UP', 'TRANSFER_IN', 'REFUND'];

interface Transaction {
  id: string;
  type?: string;
  amount?: number;
  description?: string;
  timestamp?: { toDate?: () => Date };
  createdAt?: string;
}

interface RawApiTransaction {
  id?: unknown;
  type?: unknown;
  amount?: unknown;
  createdAt?: unknown;
  description?: unknown;
}

interface RawApiWallet {
  id?: string;
  balance?: number | string;
}

const CURRENCY_SYMBOL = '₱';
const ORANGE_GRADIENT: readonly [string, string] = ['#E25A17', '#F28934'];

export default function HistoryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const headerPaddingTop =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight ?? 0, 12)
      : Math.max(insets.top, 12);
  const headerPaddingHorizontal = width < 375 ? 12 : 16;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateTime = (tx: Transaction) => {
    const date = tx.timestamp?.toDate?.() ?? (tx.createdAt ? new Date(tx.createdAt) : null);
    if (!date) return '';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const defaultTransactions: Transaction[] = [
    {
      id: '1',
      type: 'TOP_UP',
      amount: 0,
      description: 'Free Default Card',
      timestamp: { toDate: () => new Date('2026-02-12T14:56:00') },
      createdAt: '2026-02-12T14:56:00',
    },
    {
      id: '2',
      type: 'TOP_UP',
      amount: 0,
      description: 'Created Account',
      timestamp: { toDate: () => new Date('2008-02-10T16:30:00') },
      createdAt: '2008-02-10T16:30:00',
    },
  ];

  const displayTransactions = transactions.length > 0 ? transactions : defaultTransactions;

  const totalSpent = displayTransactions
    .filter((tx) => SPENT_TYPES.includes(tx.type ?? ''))
    .reduce((sum, tx) => sum + Math.abs(tx.amount ?? 0), 0);

  const totalIncome = displayTransactions
    .filter((tx) => INCOME_TYPES.includes(tx.type ?? ''))
    .reduce((sum, tx) => sum + Math.abs(tx.amount ?? 0), 0);

  const getTransactionIcon = (tx: Transaction) => {
    if (tx.description?.toLowerCase().includes('card')) return 'card-outline';
    if (tx.description?.toLowerCase().includes('account')) return 'people-outline';
    return 'swap-horizontal';
  };

  const fetchTransactions = useCallback(async (loadMore = false, currentCount = 0) => {
    const accessToken = await AsyncStorage.getItem('access_token');
    if (!accessToken) {
      setLoading(false);
      return;
    }

    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const { success, wallet } = await getOrCreateMainWallet(accessToken);
      const w = wallet as RawApiWallet | undefined;
      const walletId = w?.id;

      const txRes = await getTransactions(accessToken, {
        walletId,
        limit: loadMore ? currentCount + 20 : 20,
      });

      if (txRes.success && txRes.transactions) {
        const mapped: Transaction[] = (txRes.transactions as RawApiTransaction[]).map((tx) => ({
          id: String(tx.id ?? ''),
          type: String(tx.type ?? ''),
          amount: (() => {
            const a = parseFloat(String(tx.amount ?? 0));
            return Number.isNaN(a) ? 0 : a;
          })(),
          description: String(tx.description ?? ''),
          timestamp: {
            toDate: () => new Date(String(tx.createdAt ?? '')),
          },
          createdAt: String(tx.createdAt ?? ''),
        }));

        setTransactions(mapped);
        setHasMore(mapped.length >= (loadMore ? currentCount + 20 : 20));
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      if (!loadMore) {
        setTransactions([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    const init = async () => {
      const accessToken = await AsyncStorage.getItem('access_token');
      if (accessToken) {
        await fetchTransactions();
        return;
      }
      const firebaseUser = auth?.currentUser;
      if (!firebaseUser) {
        setLoading(false);
        setTransactions([]);
        return;
      }
      unsub = subscribeToTransactions(
        firebaseUser.uid,
        (list: TransactionDoc[]) => {
          if (cancelled) return;
          const mapped: Transaction[] = list.map((d) => ({
            id: d.id,
            type: String(d.type ?? ''),
            amount: parseFloat(String(d.amount ?? 0)) || 0,
            description: String(d.description ?? ''),
            timestamp: {
              toDate: () =>
                d.createdAt?.toMillis
                  ? new Date(d.createdAt.toMillis())
                  : new Date(),
            },
            createdAt: d.createdAt?.toMillis
              ? new Date(d.createdAt.toMillis()).toISOString()
              : '',
          }));
          setTransactions(mapped);
          setLoading(false);
        }
      );
    };

    init();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const handleBack = () => {
    (navigation as unknown as NavProp).goBack();
  };

  const handleTransactionPress = (tx: Transaction) => {
    (navigation as unknown as NavProp).navigate('Main');
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const count = transactions.length > 0 ? transactions.length : defaultTransactions.length;
      fetchTransactions(true, count);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#E25A17" />
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={ORANGE_GRADIENT}
          style={[
            styles.header,
            {
              paddingTop: headerPaddingTop,
              paddingHorizontal: headerPaddingHorizontal,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <View style={styles.backButtonCircle}>
              <Ionicons name="arrow-back" size={24} color="#E15816" />
            </View>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              All Transactions
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconButton} onPress={() => {}} activeOpacity={0.7}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="search" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} onPress={() => {}} activeOpacity={0.7}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="filter" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>TOTAL SPENT</Text>
              <Text style={styles.summaryValue}>
                {CURRENCY_SYMBOL} {formatCurrency(totalSpent)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>TOTAL INCOME</Text>
              <Text style={styles.summaryValue}>
                {CURRENCY_SYMBOL} {formatCurrency(totalIncome)}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>CURRENT TRANSACTIONS</Text>

          {loading && transactions.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E15816" />
            </View>
          ) : (
            <View style={styles.transactionList}>
              {displayTransactions.map((tx) => (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.transactionItem}
                  onPress={() => handleTransactionPress(tx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.transactionIcon}>
                    <Ionicons
                      name={
                        getTransactionIcon(tx) as keyof typeof Ionicons.glyphMap
                      }
                      size={22}
                      color="#E15816"
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionName}>
                      {tx.description || getTransactionTypeLabel(tx.type)}
                    </Text>
                    <Text style={styles.transactionDate}>{formatDateTime(tx)}</Text>
                  </View>
                  <Text style={styles.transactionAmount}>
                    {CURRENCY_SYMBOL} {formatCurrency(tx.amount ?? 0)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {displayTransactions.length > 0 && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={handleLoadMore}
              disabled={loadingMore || !hasMore}
              activeOpacity={0.7}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color="#999" />
              ) : (
                <Text style={styles.loadMoreText}>LOAD MORE</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    padding: 4,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#687076',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E15816',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  transactionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#687076',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E15816',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
  },
});
