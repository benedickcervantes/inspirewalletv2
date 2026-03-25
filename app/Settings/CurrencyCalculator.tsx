import {
  Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback,
  useEffect,
  useRef,
  useState } from 'react';
import {
    ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { calculateExchangePair } from '../../configs/api';
import { useLanguage } from '../../context/LanguageContext';
import type { NavProp } from '../../types/navigation';
import { formatAmountWithCommas, unformatNumberString } from '../../utils/numberFormat';
import { useResponsive } from '../../utils/responsive';
import { TouchableOpacity } from "react-native-gesture-handler";

interface Currency {
    code: string;
    nameKey: string;
    symbol: string;
}

const CURRENCIES: Currency[] = [
    { code: 'PHP', nameKey: 'deposit.currencyPhilippinePeso', symbol: '₱' },
    { code: 'USD', nameKey: 'deposit.currencyUSDollar', symbol: '$' },
    { code: 'JPY', nameKey: 'deposit.currencyJapaneseYen', symbol: '¥' },
    { code: 'CNY', nameKey: 'deposit.currencyChineseYuan', symbol: '¥' },
    { code: 'EUR', nameKey: 'deposit.currencyEuro', symbol: '€' },
    { code: 'HKD', nameKey: 'deposit.currencyHongKongDollar', symbol: 'HK$' },
    { code: 'AUD', nameKey: 'deposit.currencyAustralianDollar', symbol: 'A$' },
    { code: 'GBP', nameKey: 'deposit.currencyBritishPound', symbol: '£' },
    { code: 'CHF', nameKey: 'deposit.currencySwissFranc', symbol: 'Fr' },
    { code: 'KRW', nameKey: 'deposit.currencyKoreanWon', symbol: '₩' },
    { code: 'SAR', nameKey: 'deposit.currencySaudiRiyal', symbol: '﷼' },
];

const CurrencyCalculator = () => {
    const navigation = useNavigation();
    const { t } = useLanguage();
    const { scale: scaleFn } = useResponsive();
    const scaled = (n: number) => Math.round(scaleFn(n));

    const [amount, setAmount] = useState('1');
    const [fromCurrency, setFromCurrency] = useState(CURRENCIES[1]); // USD default
    const [toCurrency, setToCurrency] = useState(CURRENCIES[0]); // PHP default
    const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [convertError, setConvertError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestIdRef = useRef(0);
    const rateCacheRef = useRef<Map<string, number>>(new Map());

    const fetchConversion = useCallback(async (from: string, to: string, amountVal: number) => {
        if (amountVal <= 0 || !from || !to || from === to) {
            setConvertedAmount(from === to ? amountVal : 0);
            setConvertError(null);
            return;
        }
        const requestId = ++requestIdRef.current;
        setIsConverting(true);
        setConvertError(null);
        try {
            const result = await calculateExchangePair({
                fromCurrency: from,
                toCurrency: to,
                amount: amountVal,
            });

            // Ignore stale responses from older requests.
            if (requestId !== requestIdRef.current) return;

            setIsConverting(false);
            if (result.success && result.convertedAmount != null) {
                const effectiveRate = result.convertedAmount / amountVal;
                if (Number.isFinite(effectiveRate) && effectiveRate > 0) {
                    rateCacheRef.current.set(`${from}->${to}`, effectiveRate);
                }
                setConvertedAmount(result.convertedAmount);
                setConvertError(null);
            } else {
                setConvertedAmount(null);
                setConvertError(result.error || t('currency.exchangeRateUnavailable'));
            }
        } catch {
            if (requestId !== requestIdRef.current) return;
            setIsConverting(false);
            setConvertedAmount(null);
            setConvertError(t('currency.exchangeRateUnavailable'));
        }
    }, [t]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const numAmount = parseFloat(unformatNumberString(amount)) || 0;
        if (!amount.trim() || numAmount <= 0) {
            setConvertedAmount(null);
            setConvertError(null);
            return;
        }
        if (fromCurrency.code === toCurrency.code) {
            setConvertedAmount(numAmount);
            setConvertError(null);
            setIsConverting(false);
            return;
        }

        const pairKey = `${fromCurrency.code}->${toCurrency.code}`;
        const cachedRate = rateCacheRef.current.get(pairKey);
        if (cachedRate && Number.isFinite(cachedRate)) {
            // Show immediate estimate while fetching fresh rate.
            setConvertedAmount(numAmount * cachedRate);
            setConvertError(null);
        }

        debounceRef.current = setTimeout(() => {
            fetchConversion(fromCurrency.code, toCurrency.code, numAmount);
        }, 180);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [amount, fromCurrency, toCurrency, fetchConversion]);

    const handleSwap = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    const displayAmount =
        convertedAmount != null
            ? convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
            : '—';

    const r = {
        header: {
            paddingHorizontal: scaled(16),
            paddingTop: scaled(40),
            paddingBottom: scaled(20),
        } as ViewStyle,
        backButton: { padding: scaled(4) } as ViewStyle,
        headerTitle: { fontSize: scaled(18) } as TextStyle,
        container: { padding: scaled(20) } as ViewStyle,
        label: { fontSize: scaled(14), marginBottom: scaled(8) } as TextStyle,
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: scaled(12),
            paddingHorizontal: scaled(16),
            paddingVertical: scaled(12),
            marginBottom: scaled(20),
            borderWidth: 1,
            borderColor: '#E0E0E0',
        } as ViewStyle,
        input: { flex: 1, fontSize: scaled(18), color: '#333', fontWeight: '600' } as TextStyle,
        currencySelector: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: scaled(12),
            borderLeftWidth: 1,
            borderLeftColor: '#F0F0F0',
        } as ViewStyle,
        currencyCode: { fontSize: scaled(16), fontWeight: '700', color: '#F38B35', marginRight: scaled(4) } as TextStyle,
        swapButton: {
            alignSelf: 'center',
            width: scaled(44),
            height: scaled(44),
            borderRadius: scaled(22),
            backgroundColor: '#FFF1E2',
            alignItems: 'center',
            justifyContent: 'center',
            marginVertical: scaled(10),
        } as ViewStyle,
        resultContainer: {
            backgroundColor: '#F38B35',
            borderRadius: scaled(16),
            padding: scaled(24),
            marginTop: scaled(20),
            alignItems: 'center',
            shadowColor: '#F38B35',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
        } as ViewStyle,
        resultLabel: { color: 'rgba(255,255,255,0.8)', fontSize: scaled(14), marginBottom: scaled(8) } as TextStyle,
        resultValue: { color: '#FFFFFF', fontSize: scaled(32), fontWeight: '800' } as TextStyle,
        resultCurrency: { color: '#FFFFFF', fontSize: scaled(18), fontWeight: '600', marginTop: scaled(4) } as TextStyle,
        errorText: { color: '#B71C1C', fontSize: scaled(13), marginTop: scaled(8), textAlign: 'center' } as TextStyle,
    };

    const [fromModalVisible, setFromModalVisible] = useState(false);
    const [toModalVisible, setToModalVisible] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#DE5212', '#F38B35']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={r.header}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => (navigation as unknown as NavProp).goBack()} style={r.backButton}>
                        <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, r.headerTitle]}>{t('settings.currencyCalculator')}</Text>
                    <View style={{ width: 28 }} />
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView style={r.container} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.label, r.label]}>{t('currency.amount')}</Text>
                    <View style={r.inputContainer}>
                        <TextInput
                            style={r.input}
                            value={amount}
                            onChangeText={(text) => {
                                setAmount(formatAmountWithCommas(text));
                            }}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                        <TouchableOpacity style={r.currencySelector} onPress={() => setFromModalVisible(true)}>
                            <Text style={r.currencyCode}>{fromCurrency.code}</Text>
                            <Ionicons name="chevron-down" size={16} color="#F38B35" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ alignItems: 'center' }}>
                        <TouchableOpacity style={r.swapButton} onPress={handleSwap}>
                            <Ionicons name="swap-vertical" size={24} color="#F38B35" />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.label, r.label]}>{t('currency.convertedTo')}</Text>
                    <View style={r.inputContainer}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            {isConverting ? (
                                <ActivityIndicator size="small" color="#F38B35" style={{ marginRight: 8 }} />
                            ) : null}
                            <Text
                                style={[
                                    r.input,
                                    { opacity: convertedAmount != null ? 1 : 0.5 },
                                ]}
                            >
                                {toCurrency.symbol} {displayAmount}
                            </Text>
                        </View>
                        <TouchableOpacity style={r.currencySelector} onPress={() => setToModalVisible(true)}>
                            <Text style={r.currencyCode}>{toCurrency.code}</Text>
                            <Ionicons name="chevron-down" size={16} color="#F38B35" />
                        </TouchableOpacity>
                    </View>

                    <View style={r.resultContainer}>
                        <Text style={r.resultLabel}>{t('currency.totalResult')}</Text>
                        <Text style={r.resultValue}>
                            {toCurrency.symbol}{' '}
                            {isConverting ? '...' : displayAmount}
                        </Text>
                        <Text style={r.resultCurrency}>{t(toCurrency.nameKey)}</Text>
                        {convertError ? <Text style={r.errorText}>{convertError}</Text> : null}
                    </View>

                    <View style={{ height: 40 }} />
                    <Text style={styles.disclaimer}>
                        {t('currency.disclaimer')}
                    </Text>

                    {fromModalVisible && (
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>{t('currency.selectFromCurrency')}</Text>
                                <ScrollView>
                                    {CURRENCIES.map((curr) => (
                                        <TouchableOpacity
                                            key={curr.code}
                                            style={styles.currencyItem}
                                            onPress={() => {
                                                setFromCurrency(curr);
                                                setFromModalVisible(false);
                                            }}
                                        >
                                            <Text style={styles.currencyItemText}>
                                                {curr.code} - {t(curr.nameKey)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity onPress={() => setFromModalVisible(false)} style={styles.closeButton}>
                                    <Text style={styles.closeButtonText}>{t('common.close')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {toModalVisible && (
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>{t('currency.selectToCurrency')}</Text>
                                <ScrollView>
                                    {CURRENCIES.map((curr) => (
                                        <TouchableOpacity
                                            key={curr.code}
                                            style={styles.currencyItem}
                                            onPress={() => {
                                                setToCurrency(curr);
                                                setToModalVisible(false);
                                            }}
                                        >
                                            <Text style={styles.currencyItemText}>
                                                {curr.code} - {t(curr.nameKey)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity onPress={() => setToModalVisible(false)} style={styles.closeButton}>
                                    <Text style={styles.closeButtonText}>{t('common.close')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const scaled = (n: number) => n; // Fallback for styles outside component if needed

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontFamily: 'Poppins-Bold',
        color: '#FFFFFF',
    },
    label: {
        fontWeight: '700',
        color: '#333',
    },
    disclaimer: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    modalOverlay: {
        position: 'absolute',
        top: -scaled(20),
        left: -scaled(20),
        right: -scaled(20),
        bottom: -scaled(20),
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    currencyItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    currencyItemText: {
        fontSize: 16,
        color: '#333',
    },
    closeButton: {
        marginTop: 15,
        paddingVertical: 12,
        backgroundColor: '#F38B35',
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});

export default CurrencyCalculator;

