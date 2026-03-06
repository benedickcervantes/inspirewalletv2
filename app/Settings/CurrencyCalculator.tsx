import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import type { NavProp } from '../../types/navigation';
import { useResponsive } from '../../utils/responsive';

interface Currency {
    code: string;
    nameKey: string;
    symbol: string;
    buyRate: number; // 1 FC = X PHP (Buy)
    sellRate: number; // 1 FC = X PHP (Sell)
}

const CURRENCIES: Currency[] = [
    { code: 'PHP', nameKey: 'deposit.currencyPhilippinePeso', symbol: '₱', buyRate: 1, sellRate: 1 },
    { code: 'USD', nameKey: 'deposit.currencyUSDollar', symbol: '$', buyRate: 57.5669, sellRate: 60.5191 },
    { code: 'JPY', nameKey: 'deposit.currencyJapaneseYen', symbol: '¥', buyRate: 0.3624, sellRate: 0.3810 },
    { code: 'CNY', nameKey: 'deposit.currencyChineseYuan', symbol: '¥', buyRate: 8.3386, sellRate: 8.7662 },
    { code: 'EUR', nameKey: 'deposit.currencyEuro', symbol: '€', buyRate: 66.6890, sellRate: 70.1049 },
    { code: 'HKD', nameKey: 'deposit.currencyHongKongDollar', symbol: 'HK$', buyRate: 7.3573, sellRate: 7.7345 },
    { code: 'AUD', nameKey: 'deposit.currencyAustralianDollar', symbol: 'A$', buyRate: 40.4089, sellRate: 42.4811 },
    { code: 'CAD', nameKey: 'deposit.currencyCanadianDollar', symbol: 'C$', buyRate: 42.0878, sellRate: 44.2462 },
    { code: 'GBP', nameKey: 'deposit.currencyBritishPound', symbol: '£', buyRate: 76.8173, sellRate: 80.7567 },
    { code: 'CHF', nameKey: 'deposit.currencySwissFranc', symbol: 'Fr', buyRate: 73.7051, sellRate: 77.4849 },
];

const CurrencyCalculator = () => {
    const navigation = useNavigation();
    const { t } = useLanguage();
    const { scale: scaleFn } = useResponsive();
    const scaled = (n: number) => Math.round(scaleFn(n));

    const [amount, setAmount] = useState('1');
    const [fromCurrency, setFromCurrency] = useState(CURRENCIES[1]); // USD default
    const [toCurrency, setToCurrency] = useState(CURRENCIES[0]); // PHP default
    const [isBuyRate, setIsBuyRate] = useState(true);

    const convertedAmount = useMemo(() => {
        const numAmount = parseFloat(amount) || 0;
        const fromRate = isBuyRate ? fromCurrency.buyRate : fromCurrency.sellRate;
        const toRate = isBuyRate ? toCurrency.buyRate : toCurrency.sellRate;

        // Logic: (Amount in FromCurrency) * (Rate From -> PHP) / (Rate To -> PHP)
        const result = (numAmount * fromRate) / toRate;
        return result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }, [amount, fromCurrency, toCurrency, isBuyRate]);

    const handleSwap = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

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
        toggleContainer: {
            flexDirection: 'row',
            backgroundColor: '#E0E0E0',
            borderRadius: scaled(12),
            padding: scaled(4),
            marginBottom: scaled(20),
        } as ViewStyle,
        toggleButton: {
            flex: 1,
            paddingVertical: scaled(10),
            alignItems: 'center',
            borderRadius: scaled(10),
        } as ViewStyle,
        activeToggle: {
            backgroundColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        } as ViewStyle,
        toggleText: {
            fontSize: scaled(14),
            fontWeight: '600',
            color: '#666',
        } as TextStyle,
        activeToggleText: {
            color: '#F38B35',
        } as TextStyle,
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
                    <Text style={[styles.label, r.label]}>{t('settings.rateType')}</Text>
                    <View style={r.toggleContainer}>
                        <TouchableOpacity
                            style={[r.toggleButton, isBuyRate && r.activeToggle]}
                            onPress={() => setIsBuyRate(true)}
                        >
                            <Text style={[r.toggleText, isBuyRate && r.activeToggleText]}>{t('settings.buyRate')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[r.toggleButton, !isBuyRate && r.activeToggle]}
                            onPress={() => setIsBuyRate(false)}
                        >
                            <Text style={[r.toggleText, !isBuyRate && r.activeToggleText]}>{t('settings.sellRate')}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.label, r.label]}>Amount</Text>
                    <View style={r.inputContainer}>
                        <TextInput
                            style={r.input}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                        <TouchableOpacity style={r.currencySelector} onPress={() => setFromModalVisible(true)}>
                            <Text style={r.currencyCode}>{fromCurrency.code}</Text>
                            <Ionicons name="chevron-down" size={16} color="#F38B35" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={r.swapButton} onPress={handleSwap}>
                        <Ionicons name="swap-vertical" size={24} color="#F38B35" />
                    </TouchableOpacity>

                    <Text style={[styles.label, r.label]}>To</Text>
                    <View style={r.inputContainer}>
                        <View style={{ flex: 1 }}>
                            <Text style={[r.input, { opacity: 0.5 }]}>Converted Amount</Text>
                        </View>
                        <TouchableOpacity style={r.currencySelector} onPress={() => setToModalVisible(true)}>
                            <Text style={r.currencyCode}>{toCurrency.code}</Text>
                            <Ionicons name="chevron-down" size={16} color="#F38B35" />
                        </TouchableOpacity>
                    </View>

                    <View style={r.resultContainer}>
                        <Text style={r.resultLabel}>Total Result ({isBuyRate ? t('settings.buyRate') : t('settings.sellRate')})</Text>
                        <Text style={r.resultValue}>{toCurrency.symbol} {convertedAmount}</Text>
                        <Text style={r.resultCurrency}>{t(toCurrency.nameKey)}</Text>
                    </View>

                    <View style={{ height: 40 }} />
                    <Text style={styles.disclaimer}>
                        * Rates are hardcoded as of the provided table and are for reference only.
                    </Text>

                    {/* Simple Currency Selectors could be added here as Modals if needed, but for now just showing implementation */}
                    {fromModalVisible && (
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Select Currency</Text>
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
                                            <Text style={styles.currencyItemText}>{curr.code} - {t(curr.nameKey)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity onPress={() => setFromModalVisible(false)} style={styles.closeButton}>
                                    <Text style={styles.closeButtonText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {toModalVisible && (
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Select Currency</Text>
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
                                            <Text style={styles.currencyItemText}>{curr.code} - {t(curr.nameKey)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity onPress={() => setToModalVisible(false)} style={styles.closeButton}>
                                    <Text style={styles.closeButtonText}>Close</Text>
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
    }
});

export default CurrencyCalculator;
