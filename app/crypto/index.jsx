import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
  ToastAndroid,
  ImageBackground,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  StatusBar,
  Animated,
  KeyboardAvoidingView,

} from "react-native";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import Constants from "expo-constants";
import { auth, firestore } from "../../configs/firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  addDoc,
  collection,
} from "firebase/firestore";
import { useNavigation } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { checkAccountTypeAccess } from "../../utils/accountTypeUtils";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

// Get API keys from environment variables
const CRYPTO_API_KEY = process.env.EXPO_PUBLIC_CRYPTO_API_KEY;

// Add Alpha Vantage API key
const ALPHA_VANTAGE_API_KEY = process.env.EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY;

// Print API keys
console.log("API Keys:", {
  CRYPTO_API_KEY,
  ALPHA_VANTAGE_API_KEY,
});

// Create axios instances with default config for CoinGecko API
// Note: CoinGecko API is free and doesn't require authentication for basic endpoints
// The API key is optional and only needed for higher rate limits
const cryptoApi = axios.create({
  baseURL: "https://api.coingecko.com/api/v3",
  timeout: 15000, // Increased timeout
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    // CoinGecko API key is optional for public endpoints
    ...(CRYPTO_API_KEY && { "x-cg-demo-api-key": CRYPTO_API_KEY }),
  },
});

// Add request interceptor for better error handling
cryptoApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("CoinGecko API Error:", error.response?.data || error.message);
    if (error.response?.status === 429) {
      console.warn("Rate limit exceeded, consider adding API key for higher limits");
    }
    return Promise.reject(error);
  }
);

// Add forex API instance
const forexApi = axios.create({
  baseURL: "https://www.alphavantage.co/query",
  timeout: 10000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Cache configuration
const CACHE_DURATION = 60000; // 1 minute
let priceCache = {
  data: null,
  timestamp: 0,
};

// Fallback data for when API fails
const fallbackPrices = {
  bitcoin: { usd: 45000 },
  ethereum: { usd: 2800 },
  tether: { usd: 1.00 },
};

// Add animation configuration
const CANDLE_ANIMATION_DURATION = 500; // 500ms for each candle animation
const LAST_CANDLE_ANIMATION_DURATION = 1000; // 1 second for the last candle pulse

// Add these helper functions at the top of the file
const calculateTrendLine = (data) => {
  const n = data.length;
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((sum, y) => sum + y, 0) / n;

  let numerator = 0;
  let denominator = 0;

  data.forEach((y, x) => {
    numerator += (x - xMean) * (y - yMean);
    denominator += Math.pow(x - xMean, 2);
  });

  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  return data.map((_, x) => slope * x + intercept);
};

const calculateMovingAverage = (data, windowSize = 3) => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, i + Math.floor(windowSize / 2) + 1);
    const window = data.slice(start, end);
    const average = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(average);
  }
  return result;
};

const calculateOHLC = (data) => {
  const result = [];
  // Group data into periods (e.g., hourly)
  for (let i = 0; i < data.length; i++) {
    const currentPrice = data[i];
    const nextPrice = data[i + 1] || currentPrice;

    result.push({
      open: currentPrice,
      high: Math.max(currentPrice, nextPrice),
      low: Math.min(currentPrice, nextPrice),
      close: nextPrice,
      time: i,
    });
  }
  return result;
};

// Add a function to check if cache is valid
const isCacheValid = (timestamp) => {
  return Date.now() - timestamp < CACHE_DURATION;
};

// Custom Slider Component for Expo Go
const CustomSlider = ({ value, onValueChange, minimumValue = 0, maximumValue = 100, style }) => {
  const [sliderWidth, setSliderWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const percentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;
  const thumbPosition = (percentage / 100) * (sliderWidth - 20);

  const handleSliderPress = (event) => {
    const { locationX } = event.nativeEvent;
    const newPercentage = Math.max(0, Math.min(100, (locationX / sliderWidth) * 100));
    const newValue = minimumValue + (newPercentage / 100) * (maximumValue - minimumValue);
    onValueChange(newValue);
  };

  const handleThumbPress = () => {
    setIsDragging(true);
  };

  const handleThumbMove = (event) => {
    if (!isDragging) return;
    
    const { locationX } = event.nativeEvent;
    const newPercentage = Math.max(0, Math.min(100, (locationX / sliderWidth) * 100));
    const newValue = minimumValue + (newPercentage / 100) * (maximumValue - minimumValue);
    onValueChange(newValue);
  };

  const handleThumbRelease = () => {
    setIsDragging(false);
  };

  return (
    <View style={[styles.customSliderContainer, style]}>
      <TouchableWithoutFeedback onPress={handleSliderPress}>
        <View
          style={styles.customSliderTrack}
          onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
        >
          <View
            style={[
              styles.customSliderFill,
              { width: `${percentage}%` }
            ]}
          />
          <TouchableWithoutFeedback
            onPress={handleThumbPress}
            onPressIn={handleThumbPress}
            onPressOut={handleThumbRelease}
          >
            <Animated.View
              style={[
                styles.customSliderThumb,
                {
                  left: thumbPosition,
                  transform: [{ scale: isDragging ? 1.2 : 1 }]
                }
              ]}
            />
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

// Modify the ChartComponent to include proper animation initialization
const ChartComponent = React.memo(({ data, selectedCrypto, userLanguage }) => {
  const [animations, setAnimations] = useState([]);
  const [lastCandleAnimation] = useState(new Animated.Value(0));
  const [lastPrice, setLastPrice] = useState(null);
  const [isPriceIncreasing, setIsPriceIncreasing] = useState(true);

  // Initialize animations when data changes
  useEffect(() => {
    if (data?.datasets?.[0]?.data?.length > 0) {
      const newAnimations = data.datasets[0].data.map(
        () => new Animated.Value(0)
      );
      setAnimations(newAnimations);

      // Start animations
      newAnimations.forEach((anim, index) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: CANDLE_ANIMATION_DURATION,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      });

      // Handle last candle animation
      const currentPrice =
        data.datasets[0].data[data.datasets[0].data.length - 1];
      if (lastPrice !== null) {
        setIsPriceIncreasing(currentPrice > lastPrice);
      }
      setLastPrice(currentPrice);

      // Start continuous animation for the last candle
      Animated.loop(
        Animated.sequence([
          Animated.timing(lastCandleAnimation, {
            toValue: 1,
            duration: LAST_CANDLE_ANIMATION_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(lastCandleAnimation, {
            toValue: 0,
            duration: LAST_CANDLE_ANIMATION_DURATION,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [data?.datasets?.[0]?.data]);

  const chartCalculations = useMemo(() => {
    if (!data?.datasets?.[0]?.data?.length) return null;

    const prices = data.datasets[0].data;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = Math.max(maxPrice - minPrice, 0.1);
    const padding = priceRange * 0.1;
    const paddedMinPrice = minPrice - padding;
    const paddedMaxPrice = maxPrice + padding;
    const paddedRange = paddedMaxPrice - paddedMinPrice;

    return {
      prices,
      maxPrice,
      minPrice,
      priceRange,
      paddedMinPrice,
      paddedMaxPrice,
      paddedRange,
    };
  }, [data?.datasets?.[0]?.data]);

  const ohlcData = useMemo(() => {
    if (!chartCalculations) return [];
    return calculateOHLC(chartCalculations.prices);
  }, [chartCalculations]);

  if (!chartCalculations || !animations.length) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={[styles.noDataText, getRTLStyles(userLanguage)]}>
          {t(userLanguage, 'crypto.content.noPriceData')}
        </Text>
      </View>
    );
  }

  const isForex = selectedCrypto === "USD" || selectedCrypto === "JPY";
  const currencySymbol = isForex ? "₱" : "$";

  // Fix the color logic
  const getCandleColor = (isBullish, isLastCandle = false) => {
    if (isLastCandle) {
      return isPriceIncreasing ? "#4CAF50" : "#f44336";
    }
    return isBullish ? "#4CAF50" : "#f44336";
  };

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartWrapper}>
        <View style={styles.yAxisContainer}>
          {[0, 1, 2, 3, 4].map((i) => {
            const price =
              chartCalculations.paddedMaxPrice -
              (i * chartCalculations.paddedRange) / 4;
            const isUSDT = selectedCrypto === "USDT";
            return (
              <Text key={i} style={styles.yAxisLabel}>
                {currencySymbol}
                {price.toLocaleString(undefined, {
                  minimumFractionDigits: isUSDT ? 4 : 2,
                  maximumFractionDigits: isUSDT ? 4 : 2,
                })}
              </Text>
            );
          })}
        </View>

        <View style={styles.chartArea}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={`grid-${i}`}
              style={[styles.gridLine, { top: `${i * 25}%` }]}
            />
          ))}

          <View style={styles.chartContent}>
            {ohlcData.map((candle, index) => {
              if (!animations[index]) return null;

              const isLastCandle = index === ohlcData.length - 1;
              const isBullish = candle.close >= candle.open;
              const candleWidth = 6;
              const spacing = 4;
              const totalWidth = candleWidth + spacing;
              const xPosition = index * totalWidth;

              const highY = Math.max(
                0,
                Math.min(
                  100,
                  ((candle.high - chartCalculations.paddedMinPrice) /
                    chartCalculations.paddedRange) *
                    100
                )
              );
              const lowY = Math.max(
                0,
                Math.min(
                  100,
                  ((candle.low - chartCalculations.paddedMinPrice) /
                    chartCalculations.paddedRange) *
                    100
                )
              );
              const openY = Math.max(
                0,
                Math.min(
                  100,
                  ((candle.open - chartCalculations.paddedMinPrice) /
                    chartCalculations.paddedRange) *
                    100
                )
              );
              const closeY = Math.max(
                0,
                Math.min(
                  100,
                  ((candle.close - chartCalculations.paddedMinPrice) /
                    chartCalculations.paddedRange) *
                    100
                )
              );

              const candleColor = getCandleColor(isBullish, isLastCandle);

              return (
                <Animated.View
                  key={`candle-${index}`}
                  style={[
                    styles.candleContainer,
                    {
                      left: `${xPosition}%`,
                      width: `${candleWidth}%`,
                      opacity: animations[index],
                      transform: [
                        {
                          scaleY: animations[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.candleWick,
                      {
                        top: `${highY}%`,
                        height: `${lowY - highY}%`,
                        backgroundColor: candleColor,
                        ...(isLastCandle && {
                          borderWidth: 2,
                          borderColor: candleColor,
                          opacity: lastCandleAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1],
                          }),
                        }),
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.candleBody,
                      {
                        top: `${Math.min(openY, closeY)}%`,
                        height: `${Math.max(Math.abs(closeY - openY), 1)}%`,
                        backgroundColor: candleColor,
                        ...(isLastCandle && {
                          borderWidth: 2,
                          borderColor: candleColor,
                          opacity: lastCandleAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1],
                          }),
                        }),
                      },
                    ]}
                  />
                </Animated.View>
              );
            })}
          </View>
        </View>

        <View style={styles.xAxisContainer}>
          {data.labels.map((label, index) => (
            <Text key={index} style={styles.xAxisLabel}>
              {label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
});

const Crypto = () => {
  const navigation = useNavigation();
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [price, setPrice] = useState(0);
  const [previousPrice, setPreviousPrice] = useState(0);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [timeRange, setTimeRange] = useState("24h");
  const [tradeHistory, setTradeHistory] = useState([]);
  const [priceChange, setPriceChange] = useState(0);
  const [cryptoBalances, setCryptoBalances] = useState({
    BTC: 0,
    ETH: 0,
    USDT: 0,
  });
  const [selectedType, setSelectedType] = useState("CRYPTO");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [exchangeRates, setExchangeRates] = useState({
    USD: 0,
    JPY: 0,
  });
  const [currencyBalances, setCurrencyBalances] = useState({
    USD: 0,
    JPY: 0,
  });
  const [forexChartData, setForexChartData] = useState({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [forexPriceChange, setForexPriceChange] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [updateInterval, setUpdateInterval] = useState(null);
  const [tradingMode, setTradingMode] = useState("BUY"); // Add trading mode state
  const [sliderValue, setSliderValue] = useState(0); // Add slider value state
  const [isManualInput, setIsManualInput] = useState(false); // Track if user is manually typing
  const [isTradingContainerVisible, setIsTradingContainerVisible] = useState(false); // Track trading container visibility
  const slideAnimation = useRef(new Animated.Value(0)).current; // Animation value for slide
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const [userLanguage, setUserLanguage] = useState('English');

  const screenWidth = Dimensions.get("window").width;

  // Map of crypto symbols for CoinGecko API (using CoinGecko IDs)
  const cryptoSymbols = {
    BTC: "bitcoin",
    ETH: "ethereum",
    USDT: "tether",
  };

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    checkAccessAndInitialize();
  }, [selectedCrypto, timeRange, navigation, userLanguage]);

  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserLanguage(data.preferredLanguage || 'English');
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  // Add a test function to verify API connectivity
  const testCoinGeckoAPI = async () => {
    try {
      console.log("Testing CoinGecko API connectivity...");
      const response = await cryptoApi.get("/ping");
      console.log("CoinGecko API ping response:", response.data);
      return true;
    } catch (error) {
      console.error("CoinGecko API test failed:", error);
      return false;
    }
  };

  const checkAccessAndInitialize = async () => {
    try {
      const { hasAccess, userAccountType } = await checkAccountTypeAccess("Premium");
      
      if (!hasAccess) {
        showModal({
          title: t(userLanguage, 'crypto.modals.accessRestricted.title'),
          message: t(userLanguage, 'crypto.modals.accessRestricted.message').replace('{accountType}', userAccountType || "Basic"),
          type: "warning",
          onConfirm: () => {
            navigation.goBack();
          },
        });
        return;
      }

      // Test API connectivity first
      const apiTestResult = await testCoinGeckoAPI();
      if (!apiTestResult) {
        showModal({
          title: t(userLanguage, 'crypto.modals.apiConnectionError.title'),
          message: t(userLanguage, 'crypto.modals.apiConnectionError.message'),
          type: "error",
        });
        return;
      }
      
      fetchCryptoData();
      fetchUserBalance();
      fetchCryptoBalances();
      fetchForexBalances();
      fetchForexRates();
      navigation.setOptions({
        headerShown: true,
        headerTitle: t(userLanguage, 'crypto.header.title'),
        headerTransparent: true,
        headerTintColor: Colors.redTheme.background,
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 18,
        },
      });
    } catch (error) {
      console.error("Error checking account access:", error);
      showModal({
        title: t(userLanguage, 'crypto.modals.error.title'),
        message: t(userLanguage, 'crypto.modals.error.message'),
        type: "error",
        onConfirm: () => {
          navigation.goBack();
        },
      });
    }
  };

  const fetchUserBalance = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDocRef = doc(firestore, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          const balanceAmount = parseFloat(userData.availBalanceAmount || 0);
          setBalance(balanceAmount);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      setError("Failed to fetch balance");
    }
  };

  const updateBalance = async (newBalance) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDocRef = doc(firestore, "users", user.uid);
      await updateDoc(userDocRef, {
        availBalanceAmount: parseFloat(newBalance.toFixed(2)),
      });
    } catch (error) {
      throw error;
    }
  };

  const addTradeToHistory = async (tradeData) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await addDoc(collection(firestore, "users", user.uid, "cryptoTrades"), {
        ...tradeData,
        timestamp: new Date(),
      });
    } catch (error) {
      throw error;
    }
  };

  const fetchCryptoData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchCryptoPrice(), fetchHistoricalData()]);
    } catch (error) {
      setError("Failed to fetch data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCryptoPrice = async () => {
    const maxRetries = 2;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const now = Date.now();
        if (priceCache.data && isCacheValid(priceCache.timestamp)) {
          setPreviousPrice(price);
          setPrice(priceCache.data[cryptoSymbols[selectedCrypto]].usd);
          return;
        }

        console.log(`Fetching price for ${cryptoSymbols[selectedCrypto]} (attempt ${retryCount + 1})`);

        const response = await cryptoApi.get(`/simple/price`, {
          params: {
            ids: cryptoSymbols[selectedCrypto],
            vs_currencies: "usd",
          },
        });

        console.log("Price API Response:", response.data);

        if (!response.data) {
          throw new Error("No response data received");
        }

        if (response.data.error) {
          throw new Error(response.data.error);
        }

        if (!response.data[cryptoSymbols[selectedCrypto]]) {
          throw new Error(`No data found for ${cryptoSymbols[selectedCrypto]}`);
        }

        if (!response.data[cryptoSymbols[selectedCrypto]].usd) {
          throw new Error("USD price not found in response");
        }

        setPreviousPrice(price);
        setPrice(response.data[cryptoSymbols[selectedCrypto]].usd);
        priceCache = {
          data: response.data,
          timestamp: now,
        };

        // Success, break out of retry loop
        break;

      } catch (error) {
        retryCount++;
        console.error(`Price fetch error (attempt ${retryCount}):`, error);
        
        if (retryCount >= maxRetries) {
          // Use fallback data if all retries fail
          if (fallbackPrices[cryptoSymbols[selectedCrypto]]) {
            console.log("Using fallback price data");
            setPreviousPrice(price);
            setPrice(fallbackPrices[cryptoSymbols[selectedCrypto]].usd);
            setError("Using cached price data - API temporarily unavailable");
          } else {
            setError(`Failed to fetch current price after ${maxRetries} attempts: ${error.message}`);
          }
        } else {
          // Wait before retrying
          const delay = 1000 * retryCount;
          console.log(`Retrying price fetch in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  };

  // Add a useEffect to clear cache when crypto changes
  useEffect(() => {
    priceCache = {
      data: null,
      timestamp: 0,
    };
    fetchCryptoPrice();
  }, [selectedCrypto]);

  // Add a useEffect to periodically fetch new prices
  useEffect(() => {
    const fetchInterval = setInterval(() => {
      fetchCryptoPrice();
    }, 30000); // Fetch every 30 seconds

    return () => clearInterval(fetchInterval);
  }, [selectedCrypto]);

  const calculatePriceChange = (data) => {
    if (!data || data.length < 2) return 0;

    const firstPrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    return selectedCrypto === "USDT"
      ? Number(change.toFixed(4))
      : Number(change.toFixed(2));
  };

  const fetchHistoricalData = async () => {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Convert timeRange to CoinGecko format
        let days;
        if (timeRange === "24h") {
          days = 1;
        } else if (timeRange === "7d") {
          days = 7;
        } else {
          days = 30;
        }

        console.log(`Fetching historical data for ${cryptoSymbols[selectedCrypto]} for ${days} days (attempt ${retryCount + 1})`);

        const response = await cryptoApi.get(`/coins/${cryptoSymbols[selectedCrypto]}/market_chart`, {
          params: {
            vs_currency: "usd",
            days: days,
          },
        });

        console.log("CoinGecko API Response:", response.data);

        if (!response.data) {
          throw new Error("No response data received");
        }

        if (response.data.error) {
          throw new Error(response.data.error);
        }

        if (!response.data.prices || !Array.isArray(response.data.prices) || response.data.prices.length === 0) {
          throw new Error("Invalid or empty prices data received");
        }

        const data = response.data.prices.map(([timestamp, price]) => ({
          time: timestamp / 1000, // Convert to seconds
          close: price,
        }));

        console.log(`Processed ${data.length} data points`);

        const change = calculatePriceChange(data);
        setPriceChange(change);

        const prices = data.map((item) => item.close);

        const labels = data.map((item) => {
          const date = new Date(item.time * 1000);
          if (timeRange === "24h") {
            return `${date.getHours()}:00`;
          } else if (timeRange === "7d") {
            return `${date.getDate()}/${date.getMonth() + 1}`;
          } else {
            return `${date.getDate()}/${date.getMonth() + 1}`;
          }
        });

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = Math.max(maxPrice - minPrice, 0.1);
        const paddedMinPrice = minPrice - priceRange * 0.1;
        const paddedMaxPrice = maxPrice + priceRange * 0.1;

        setChartData({
          labels,
          datasets: [
            {
              data: prices,
              minPrice: paddedMinPrice,
              maxPrice: paddedMaxPrice,
            },
          ],
        });

        // Success, break out of retry loop
        break;

      } catch (error) {
        retryCount++;
        console.error(`Historical data fetch error (attempt ${retryCount}):`, error);
        
        if (retryCount >= maxRetries) {
          setError(`Failed to fetch historical data after ${maxRetries} attempts: ${error.message}`);
        } else {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  };

  // Memoize price change calculation
  const priceChangeValue = useMemo(() => {
    if (!chartData.datasets[0].data.length) return 0;
    return calculatePriceChange(chartData.datasets[0].data);
  }, [chartData.datasets[0].data]);

  const fetchCryptoBalances = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDocRef = doc(firestore, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          setCryptoBalances({
            BTC: parseFloat(userData.cryptoBalances?.BTC || 0),
            ETH: parseFloat(userData.cryptoBalances?.ETH || 0),
            USDT: parseFloat(userData.cryptoBalances?.USDT || 0),
          });
        }
      });

      return () => unsubscribe();
    } catch (error) {
      setError("Failed to fetch crypto balances");
    }
  };

  const fetchForexRates = async () => {
    try {
      const response = await axios.get(
        "https://api.exchangerate-api.com/v4/latest/PHP"
      );
      if (response.data && response.data.rates) {
        setExchangeRates({
          USD: response.data.rates.USD,
          JPY: response.data.rates.JPY,
        });
      }
    } catch (error) {
      setError("Failed to fetch forex rates");
    }
  };

  // Add function to fetch forex historical data
  const fetchForexHistoricalData = async () => {
    try {
      const response = await forexApi.get("", {
        params: {
          function: "FX_DAILY",
          from_symbol: selectedCurrency,
          to_symbol: "PHP",
          apikey: ALPHA_VANTAGE_API_KEY,
          outputsize: timeRange === "30d" ? "full" : "compact",
        },
      });

      if (response.data["Error Message"]) {
        setError("API Error: " + response.data["Error Message"]);
        return;
      }

      const timeSeriesKey = "Time Series FX (Daily)";
      if (!response.data[timeSeriesKey]) {
        setError("Invalid data format received from API");
        return;
      }

      const timeSeriesData = response.data[timeSeriesKey];
      const dataPoints = Object.entries(timeSeriesData)
        .slice(0, timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : 30)
        .reverse();

      if (dataPoints.length === 0) {
        setError("No historical data available");
        return;
      }

      const prices = dataPoints.map(([_, data]) => {
        const price = parseFloat(data["4. close"]);
        if (isNaN(price)) {
          return 0;
        }
        return price;
      });

      const labels = dataPoints.map(([date]) => {
        const d = new Date(date);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      });

      const firstPrice = prices[0];
      const lastPrice = prices[prices.length - 1];
      const change = ((lastPrice - firstPrice) / firstPrice) * 100;
      setForexPriceChange(change);

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = Math.max(maxPrice - minPrice, 0.1);
      const paddedMinPrice = minPrice - priceRange * 0.1;
      const paddedMaxPrice = maxPrice + priceRange * 0.1;

      setForexChartData({
        labels,
        datasets: [
          {
            data: prices,
            minPrice: paddedMinPrice,
            maxPrice: paddedMaxPrice,
          },
        ],
      });
    } catch (error) {
      if (error.response) {
        setError(
          `API Error: ${error.response.data.message || "Unknown error"}`
        );
      } else if (error.request) {
        setError("No response received from API");
      } else {
        setError("Failed to fetch forex historical data");
      }
    }
  };

  // Modify useEffect to fetch forex data when needed
  useEffect(() => {
    if (selectedType === "FOREX") {
      fetchForexHistoricalData();
    }
  }, [selectedType, selectedCurrency, timeRange]);

  // Add function to fetch forex balances
  const fetchForexBalances = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDocRef = doc(firestore, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          setCurrencyBalances({
            USD: parseFloat(userData.currencyBalances?.USD || 0),
            JPY: parseFloat(userData.currencyBalances?.JPY || 0),
          });
        }
      });

      return () => unsubscribe();
    } catch (error) {
      setError("Failed to fetch forex balances");
    }
  };

  const handleBuy = useCallback(async () => {
    const buyAmountPHP = parseFloat(amount);
    if (!buyAmountPHP || buyAmountPHP <= 0) {
      showModal({
        title: t(userLanguage, 'crypto.modals.invalidAmount.title'),
        message: t(userLanguage, 'crypto.modals.invalidAmount.message'),
        type: "error",
      });
      return;
    }

    if (buyAmountPHP > balance) {
      showModal({
        title: t(userLanguage, 'crypto.modals.insufficientBalance.title'),
        message: t(userLanguage, 'crypto.modals.insufficientBalance.message')
          .replace('{required}', buyAmountPHP.toFixed(2))
          .replace('{available}', balance.toFixed(2)),
        type: "error",
      });
      return;
    }

    try {
      setLoading(true);
      const newBalance = balance - buyAmountPHP;

      if (selectedType === "CRYPTO") {
        // Convert PHP to USD first, then buy crypto
        // Use the USD exchange rate from the forex API
        const phpToUsdRate = exchangeRates.USD; // This is the rate from PHP to USD
        const usdAmount = buyAmountPHP * phpToUsdRate;
        const cryptoAmount = usdAmount / price;
        const newCryptoBalance = cryptoBalances[selectedCrypto] + cryptoAmount;

        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(firestore, "users", user.uid);
          await updateDoc(userDocRef, {
            availBalanceAmount: parseFloat(newBalance.toFixed(2)),
            [`cryptoBalances.${selectedCrypto}`]: parseFloat(
              newCryptoBalance.toFixed(8)
            ),
          });
        }

        await addTradeToHistory({
          type: "BUY",
          asset: selectedCrypto,
          amount: cryptoAmount,
          amountPHP: buyAmountPHP,
          price: price,
          totalCost: buyAmountPHP,
        });

        setAmount("");
        showModal({
          title: t(userLanguage, 'crypto.modals.success.title'),
          message: t(userLanguage, 'crypto.modals.success.message')
            .replace('{amount}', cryptoAmount.toFixed(8))
            .replace('{asset}', selectedCrypto)
            .replace('{cost}', buyAmountPHP.toFixed(2)),
          type: "success",
        });
      } else {
        const exchangeRate = exchangeRates[selectedCurrency];
        const foreignAmount = buyAmountPHP * exchangeRate;
        const newCurrencyBalance =
          (currencyBalances[selectedCurrency] || 0) + foreignAmount;

        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(firestore, "users", user.uid);
          await updateDoc(userDocRef, {
            availBalanceAmount: parseFloat(newBalance.toFixed(2)),
            [`currencyBalances.${selectedCurrency}`]: parseFloat(
              newCurrencyBalance.toFixed(2)
            ),
          });

          setCurrencyBalances((prev) => ({
            ...prev,
            [selectedCurrency]: parseFloat(newCurrencyBalance.toFixed(2)),
          }));
        }

        await addTradeToHistory({
          type: "BUY",
          asset: selectedCurrency,
          amount: foreignAmount,
          amountPHP: buyAmountPHP,
          rate: exchangeRate,
          totalCost: buyAmountPHP,
        });

        setAmount("");
        showModal({
          title: t(userLanguage, 'crypto.modals.success.title'),
          message: t(userLanguage, 'crypto.modals.success.message')
            .replace('{amount}', foreignAmount.toFixed(2))
            .replace('{asset}', selectedCurrency)
            .replace('{cost}', buyAmountPHP.toFixed(2)),
          type: "success",
        });
      }
    } catch (error) {
      showModal({
        title: t(userLanguage, 'crypto.modals.purchaseError.title'),
        message: t(userLanguage, 'crypto.modals.purchaseError.message'),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [
    amount,
    balance,
    price,
    selectedCrypto,
    selectedType,
    selectedCurrency,
    exchangeRates,
    cryptoBalances,
    currencyBalances,
  ]);

  const handleSell = useCallback(async () => {
    const sellAmount = parseFloat(amount);
    if (!sellAmount || sellAmount <= 0) {
      showModal({
        title: t(userLanguage, 'crypto.modals.invalidAmount.title'),
        message: t(userLanguage, 'crypto.modals.invalidAmount.message'),
        type: "error",
      });
      return;
    }

    try {
      setLoading(true);

      if (selectedType === "CRYPTO") {
        if (sellAmount > cryptoBalances[selectedCrypto]) {
          showModal({
            title: t(userLanguage, 'crypto.modals.insufficientCryptoBalance.title'),
            message: t(userLanguage, 'crypto.modals.insufficientCryptoBalance.message')
              .replace('{amount}', cryptoBalances[selectedCrypto].toFixed(8))
              .replace('{asset}', selectedCrypto),
            type: "error",
          });
          return;
        }

        // Convert crypto value to USD first, then to PHP
        const usdValue = sellAmount * price;
        const phpToUsdRate = exchangeRates.USD;
        const totalValuePHP = usdValue / phpToUsdRate;
        const newBalance = balance + totalValuePHP;
        const newCryptoBalance = cryptoBalances[selectedCrypto] - sellAmount;

        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(firestore, "users", user.uid);
          await updateDoc(userDocRef, {
            availBalanceAmount: parseFloat(newBalance.toFixed(2)),
            [`cryptoBalances.${selectedCrypto}`]: parseFloat(
              newCryptoBalance.toFixed(8)
            ),
          });
        }

        await addTradeToHistory({
          type: "SELL",
          asset: selectedCrypto,
          amount: sellAmount,
          price: price,
          totalValue: totalValuePHP,
        });

        setAmount("");
        showModal({
          title: t(userLanguage, 'crypto.modals.saleSuccess.title'),
          message: t(userLanguage, 'crypto.modals.saleSuccess.message')
            .replace('{amount}', totalValuePHP.toFixed(2)),
          type: "success",
        });
      } else {
        if (sellAmount > (currencyBalances[selectedCurrency] || 0)) {
          showModal({
            title: t(userLanguage, 'crypto.modals.insufficientCryptoBalance.title'),
            message: t(userLanguage, 'crypto.modals.insufficientCryptoBalance.message')
              .replace('{amount}', currencyBalances[selectedCurrency].toFixed(2))
              .replace('{asset}', selectedCurrency),
            type: "error",
          });
          return;
        }

        const exchangeRate = exchangeRates[selectedCurrency];
        const phpAmount = sellAmount / exchangeRate;
        const newBalance = balance + phpAmount;
        const newCurrencyBalance =
          (currencyBalances[selectedCurrency] || 0) - sellAmount;

        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(firestore, "users", user.uid);
          await updateDoc(userDocRef, {
            availBalanceAmount: parseFloat(newBalance.toFixed(2)),
            [`currencyBalances.${selectedCurrency}`]: parseFloat(
              newCurrencyBalance.toFixed(2)
            ),
          });

          setCurrencyBalances((prev) => ({
            ...prev,
            [selectedCurrency]: parseFloat(newCurrencyBalance.toFixed(2)),
          }));
        }

        await addTradeToHistory({
          type: "SELL",
          asset: selectedCurrency,
          amount: sellAmount,
          rate: exchangeRate,
          totalValue: phpAmount,
        });

        setAmount("");
        showModal({
          title: t(userLanguage, 'crypto.modals.saleSuccess.title'),
          message: t(userLanguage, 'crypto.modals.saleSuccess.message')
            .replace('{amount}', phpAmount.toFixed(2)),
          type: "success",
        });
      }
    } catch (error) {
      showModal({
        title: t(userLanguage, 'crypto.modals.saleError.title'),
        message: t(userLanguage, 'crypto.modals.saleError.message'),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [
    amount,
    balance,
    price,
    selectedCrypto,
    selectedType,
    selectedCurrency,
    exchangeRates,
    cryptoBalances,
    currencyBalances,
  ]);

  // Add function to fetch 1-minute data (using hourly data as fallback since CoinGecko doesn't provide 1-minute data)
  // Note: CoinGecko free API doesn't support 1-minute intervals, so we use hourly data instead
  const fetchOneMinuteData = async () => {
    try {
      // CoinGecko doesn't provide 1-minute data in free API, so we'll use hourly data
      const response = await cryptoApi.get(`/coins/${cryptoSymbols[selectedCrypto]}/market_chart`, {
        params: {
          vs_currency: "usd",
          days: 1,
          interval: "hourly",
        },
      });

      if (!response.data || response.data.error) {
        throw new Error(response.data?.error || "API Error");
      }

      if (response.data.prices && response.data.prices.length > 0) {
        const data = response.data.prices.map(([timestamp, price]) => ({
          time: timestamp / 1000, // Convert to seconds
          close: price,
        }));

        const change = calculatePriceChange(data);
        setPriceChange(change);

        const prices = data.map((item) => item.close);
        const labels = data.map((item) => {
          const date = new Date(item.time * 1000);
          return `${date.getHours()}:00`;
        });

        setChartData({
          labels,
          datasets: [{ data: prices }],
        });
      }
    } catch (error) {
      setError(`Failed to fetch hourly data: ${error.message}`);
    }
  };

  // Add function to fetch 1-minute forex data
  const fetchOneMinuteForexData = async () => {
    try {
      const response = await forexApi.get("", {
        params: {
          function: "FX_INTRADAY",
          from_symbol: selectedCurrency,
          to_symbol: "PHP",
          interval: "1min",
          apikey: ALPHA_VANTAGE_API_KEY,
          outputsize: "compact",
        },
      });

      if (response.data["Error Message"]) {
        setError("API Error: " + response.data["Error Message"]);
        return;
      }

      const timeSeriesKey = "Time Series FX (1min)";
      if (!response.data[timeSeriesKey]) {
        setError("Invalid data format received from API");
        return;
      }

      const timeSeriesData = response.data[timeSeriesKey];
      const dataPoints = Object.entries(timeSeriesData)
        .slice(0, 60) // Get last 60 minutes
        .reverse();

      if (dataPoints.length === 0) {
        setError("No historical data available");
        return;
      }

      const prices = dataPoints.map(([_, data]) => {
        const price = parseFloat(data["4. close"]);
        if (isNaN(price)) {
          return 0;
        }
        return price;
      });

      const labels = dataPoints.map(([date]) => {
        const d = new Date(date);
        return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
      });

      const firstPrice = prices[0];
      const lastPrice = prices[prices.length - 1];
      const change = ((lastPrice - firstPrice) / firstPrice) * 100;
      setForexPriceChange(change);

      setForexChartData({
        labels,
        datasets: [{ data: prices }],
      });
    } catch (error) {
      if (error.response) {
        setError(
          `API Error: ${error.response.data.message || "Unknown error"}`
        );
      } else if (error.request) {
        setError("No response received from API");
      } else {
        setError("Failed to fetch forex historical data");
      }
    }
  };

  // Modify useEffect to handle time range changes
  useEffect(() => {
    if (selectedType === "CRYPTO") {
      if (updateInterval) {
        clearInterval(updateInterval);
        setUpdateInterval(null);
      }
      fetchHistoricalData();
    } else {
      // For forex, always use historical data
      if (updateInterval) {
        clearInterval(updateInterval);
        setUpdateInterval(null);
      }
      fetchForexHistoricalData();
    }

    return () => {
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, [timeRange, selectedCrypto, selectedType, selectedCurrency]);

  // Clear amount when switching trading modes
  useEffect(() => {
    setAmount("");
    setSliderValue(0);
    setIsManualInput(false);
  }, [tradingMode]);

  // Update amount when slider changes (only if not manually typing)
  useEffect(() => {
    if (!isManualInput) {
      if (tradingMode === "BUY") {
        const calculatedAmount = (balance * sliderValue) / 100;
        setAmount(calculatedAmount.toFixed(2));
      } else {
        // For sell mode, calculate based on available crypto/currency balance
        if (selectedType === "CRYPTO") {
          const calculatedAmount = (cryptoBalances[selectedCrypto] * sliderValue) / 100;
          setAmount(calculatedAmount.toFixed(8));
        } else {
          const calculatedAmount = (currencyBalances[selectedCurrency] * sliderValue) / 100;
          setAmount(calculatedAmount.toFixed(2));
        }
      }
    }
  }, [sliderValue, tradingMode, balance, selectedType, selectedCrypto, selectedCurrency, cryptoBalances, currencyBalances, isManualInput]);

  // Handle manual amount input
  const handleAmountChange = (text) => {
    setAmount(text);
    setIsManualInput(true);
    
    // Calculate percentage based on manual input
    const numAmount = parseFloat(text) || 0;
    if (tradingMode === "BUY") {
      const percentage = (numAmount / balance) * 100;
      setSliderValue(Math.min(100, Math.max(0, percentage)));
    } else {
      if (selectedType === "CRYPTO") {
        const percentage = (numAmount / cryptoBalances[selectedCrypto]) * 100;
        setSliderValue(Math.min(100, Math.max(0, percentage)));
      } else {
        const percentage = (numAmount / currencyBalances[selectedCurrency]) * 100;
        setSliderValue(Math.min(100, Math.max(0, percentage)));
      }
    }
  };

  // Slide animation functions
  const slideInTradingContainer = () => {
    setIsTradingContainerVisible(true);
    Animated.spring(slideAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const slideOutTradingContainer = () => {
    Animated.spring(slideAnimation, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => {
      setIsTradingContainerVisible(false);
    });
  };

  const toggleTradingContainer = () => {
    if (isTradingContainerVisible) {
      slideOutTradingContainer();
    } else {
      slideInTradingContainer();
    }
  };

  const renderError = () => {
    if (!error) return null;
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.errorButtonsContainer}>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCryptoData}>
            <Text style={styles.retryButtonText}>{t(userLanguage, 'crypto.content.retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.retryButton, styles.testApiButton]} 
            onPress={testCoinGeckoAPI}
          >
            <Text style={styles.retryButtonText}>{t(userLanguage, 'crypto.content.testApi')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderInstructions = () => {
    return (
      <Modal
        visible={showInstructions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInstructions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, 'crypto.instructions.title')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowInstructions(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.instructionsContainer}>
              <View style={styles.instructionSection}>
                <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'crypto.instructions.cryptoTrading.title')}
                </Text>
                <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
                  1. {t(userLanguage, 'crypto.instructions.cryptoTrading.step1')}
                </Text>
                <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
                  2. {t(userLanguage, 'crypto.instructions.cryptoTrading.step2')}
                </Text>
                <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
                  3. {t(userLanguage, 'crypto.instructions.cryptoTrading.buySteps')}
                  {"\n"} {t(userLanguage, 'crypto.instructions.cryptoTrading.buyStep1')}
                  {"\n"} {t(userLanguage, 'crypto.instructions.cryptoTrading.buyStep2')}
                </Text>
                <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
                  4. {t(userLanguage, 'crypto.instructions.cryptoTrading.sellSteps')}
                  {"\n"} {t(userLanguage, 'crypto.instructions.cryptoTrading.sellStep1')}
                  {"\n"} {t(userLanguage, 'crypto.instructions.cryptoTrading.sellStep2')}
                </Text>
              </View>

              <View style={styles.instructionSection}>
                <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'crypto.instructions.forexTrading.title')}
                </Text>
                <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
                  1. {t(userLanguage, 'crypto.instructions.forexTrading.step1')}
                </Text>
                <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
                  2. {t(userLanguage, 'crypto.instructions.forexTrading.step2')}
                </Text>
                <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
                  3. {t(userLanguage, 'crypto.instructions.forexTrading.buySteps')}
                  {"\n"} {t(userLanguage, 'crypto.instructions.forexTrading.buyStep1')}
                  {"\n"} {t(userLanguage, 'crypto.instructions.forexTrading.buyStep2')}
                </Text>
                <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
                  4. {t(userLanguage, 'crypto.instructions.forexTrading.sellSteps')}
                  {"\n"} {t(userLanguage, 'crypto.instructions.forexTrading.sellStep1')}
                  {"\n"} {t(userLanguage, 'crypto.instructions.forexTrading.sellStep2')}
                </Text>
              </View>

              <View style={styles.instructionSection}>
                <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'crypto.instructions.generalTips.title')}
                </Text>
                <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'crypto.instructions.generalTips.tip1')}
                </Text>
                <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'crypto.instructions.generalTips.tip2')}
                </Text>
                <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, 'crypto.instructions.generalTips.tip3')}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Modify the timeRangeSelector to show different options for crypto and forex
  const renderTimeRangeSelector = () => {
    const timeRanges =
      selectedType === "CRYPTO"
        ? ["24h", "7d", "30d"]
        : ["24h", "7d", "30d"];

    return (
      <View style={styles.timeRangeSelector}>
        {timeRanges.map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              timeRange === range && styles.selectedTimeRange,
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text
              style={[
                styles.timeRangeText,
                timeRange === range && styles.selectedTimeRangeText,
              ]}
            >
              {range}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ImageBackground
        source={require("../../assets/images/bg2.png")}
        style={styles.container}
      >
        {renderInstructions()}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollViewContent,
              { paddingBottom: 300 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Modern Header with Balance */}
            <View style={styles.modernHeader}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={[styles.headerLabel, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'crypto.content.availableBalance')}
                  </Text>
                  <Text style={styles.headerBalance}>₱{balance.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.helpButton}
                  onPress={() => setShowInstructions(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={28}
                    color={Colors.redTheme.background}
                  />
                </TouchableOpacity>
              </View>

              {/* Balances Cards */}
              <View style={styles.balanceCardsContainer}>
                {/* Crypto Balances Card */}
                <View style={styles.balanceCard}>
                  <View style={styles.balanceCardHeader}>
                    <Ionicons name="logo-bitcoin" size={20} color={Colors.redTheme.background} />
                    <Text style={[styles.balanceCardTitle, getRTLStyles(userLanguage)]}>
                      {t(userLanguage, 'crypto.content.cryptoBalances')}
                    </Text>
                  </View>
                  <View style={styles.balanceCardContent}>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceCrypto}>BTC</Text>
                      <Text style={styles.balanceValue}>{cryptoBalances.BTC.toFixed(8)}</Text>
                    </View>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceCrypto}>ETH</Text>
                      <Text style={styles.balanceValue}>{cryptoBalances.ETH.toFixed(8)}</Text>
                    </View>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceCrypto}>USDT</Text>
                      <Text style={styles.balanceValue}>{cryptoBalances.USDT.toFixed(8)}</Text>
                    </View>
                  </View>
                </View>

                {/* Forex Balances Card */}
                <View style={styles.balanceCard}>
                  <View style={styles.balanceCardHeader}>
                    <Ionicons name="cash-outline" size={20} color={Colors.redTheme.background} />
                    <Text style={[styles.balanceCardTitle, getRTLStyles(userLanguage)]}>
                      {t(userLanguage, 'crypto.content.forexBalances')}
                    </Text>
                  </View>
                  <View style={styles.balanceCardContent}>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceCrypto}>USD</Text>
                      <Text style={styles.balanceValue}>{currencyBalances.USD.toFixed(2)}</Text>
                    </View>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceCrypto}>JPY</Text>
                      <Text style={styles.balanceValue}>{currencyBalances.JPY.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Modern Type Selector */}
            <View style={styles.modernTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.modernTypeButton,
                  selectedType === "CRYPTO" && styles.modernTypeButtonSelected,
                ]}
                onPress={() => setSelectedType("CRYPTO")}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="logo-bitcoin" 
                  size={20} 
                  color={selectedType === "CRYPTO" ? "white" : Colors.redTheme.background} 
                />
                <Text
                  style={[
                    styles.modernTypeButtonText,
                    selectedType === "CRYPTO" && styles.modernTypeButtonTextSelected,
                    getRTLStyles(userLanguage)
                  ]}
                >
                  {t(userLanguage, 'crypto.content.crypto')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modernTypeButton,
                  selectedType === "FOREX" && styles.modernTypeButtonSelected,
                ]}
                onPress={() => setSelectedType("FOREX")}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="trending-up" 
                  size={20} 
                  color={selectedType === "FOREX" ? "white" : Colors.redTheme.background} 
                />
                <Text
                  style={[
                    styles.modernTypeButtonText,
                    selectedType === "FOREX" && styles.modernTypeButtonTextSelected,
                    getRTLStyles(userLanguage)
                  ]}
                >
                  {t(userLanguage, 'crypto.content.forex')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modern Asset Selector */}
            {selectedType === "CRYPTO" ? (
              <View style={styles.modernAssetSelector}>
                {["BTC", "ETH", "USDT"].map((crypto) => (
                  <TouchableOpacity
                    key={crypto}
                    style={[
                      styles.modernAssetButton,
                      selectedCrypto === crypto && styles.modernAssetButtonSelected,
                    ]}
                    onPress={() => setSelectedCrypto(crypto)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.assetIconContainer,
                      selectedCrypto === crypto && styles.assetIconContainerSelected
                    ]}>
                      <Ionicons 
                        name={crypto === "BTC" ? "logo-bitcoin" : crypto === "ETH" ? "diamond-outline" : "cash-outline"} 
                        size={24} 
                        color={selectedCrypto === crypto ? "white" : Colors.redTheme.background}
                      />
                    </View>
                    <Text
                      style={[
                        styles.modernAssetButtonText,
                        selectedCrypto === crypto && styles.modernAssetButtonTextSelected,
                      ]}
                    >
                      {crypto}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.modernAssetSelector}>
                {["USD", "JPY"].map((currency) => (
                  <TouchableOpacity
                    key={currency}
                    style={[
                      styles.modernAssetButton,
                      selectedCurrency === currency && styles.modernAssetButtonSelected,
                    ]}
                    onPress={() => setSelectedCurrency(currency)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.assetIconContainer,
                      selectedCurrency === currency && styles.assetIconContainerSelected
                    ]}>
                      <Text style={[
                        styles.currencyIcon,
                        selectedCurrency === currency && styles.currencyIconSelected
                      ]}>
                        {currency === "USD" ? "$" : "¥"}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.modernAssetButtonText,
                        selectedCurrency === currency && styles.modernAssetButtonTextSelected,
                      ]}
                    >
                      {currency}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="large"
                  color={Colors.redTheme.background}
                />
              </View>
            ) : (
              <>
                {renderError()}

                <View style={styles.priceContainer}>
                  {selectedType === "CRYPTO" ? (
                    <>
                      <Text style={[styles.priceText, getRTLStyles(userLanguage)]}>
                        {t(userLanguage, 'crypto.content.currentPrice')} 1 {selectedCrypto} = ₱
                        {(price / exchangeRates.USD).toLocaleString(undefined, {
                          minimumFractionDigits:
                            selectedCrypto === "USDT" ? 2 : 2,
                          maximumFractionDigits:
                            selectedCrypto === "USDT" ? 2 : 2,
                        })}
                      </Text>
                      <Text style={styles.priceText}>
                        (${price.toLocaleString(undefined, {
                          minimumFractionDigits:
                            selectedCrypto === "USDT" ? 4 : 2,
                          maximumFractionDigits:
                            selectedCrypto === "USDT" ? 4 : 2,
                        })} USD)
                      </Text>
                      <Text
                        style={[
                          styles.priceChangeText,
                          { color: priceChange >= 0 ? "#4CAF50" : "#f44336" },
                        ]}
                      >
                        {priceChange >= 0 ? "↑" : "↓"}{" "}
                        {Math.abs(priceChange).toFixed(
                          selectedCrypto === "USDT" ? 4 : 2
                        )}
                        %
                        <Text style={styles.timeRangeText}> ({timeRange})</Text>
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.priceText, getRTLStyles(userLanguage)]}>
                        {t(userLanguage, 'crypto.content.currentRate')} 1 {selectedCurrency} = ₱
                        {(1 / exchangeRates[selectedCurrency]).toFixed(2)}
                      </Text>
                      <Text style={styles.priceText}>
                        1 PHP = {exchangeRates[selectedCurrency].toFixed(4)}{" "}
                        {selectedCurrency}
                      </Text>
                      <Text
                        style={[
                          styles.priceChangeText,
                          {
                            color:
                              forexPriceChange >= 0 ? "#4CAF50" : "#f44336",
                          },
                        ]}
                      >
                        {forexPriceChange >= 0 ? "↑" : "↓"}{" "}
                        {Math.abs(forexPriceChange).toFixed(2)}%
                        <Text style={styles.timeRangeText}> ({timeRange})</Text>
                      </Text>
                    </>
                  )}
                </View>

                {selectedType === "CRYPTO" && (
                  <>
                    {renderTimeRangeSelector()}
                    {chartData.datasets[0].data.length > 0 && (
                      <ChartComponent
                        data={chartData}
                        selectedCrypto={selectedCrypto}
                        userLanguage={userLanguage}
                      />
                    )}
                    <View style={styles.chartBottomSpacer} />
                  </>
                )}

                {selectedType === "FOREX" && (
                  <>
                    {renderTimeRangeSelector()}
                    {forexChartData.datasets[0].data.length > 0 && (
                      <ChartComponent
                        data={forexChartData}
                        selectedCrypto={selectedCurrency}
                        userLanguage={userLanguage}
                      />
                    )}
                    <View style={styles.chartBottomSpacer} />
                  </>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Floating Action Button to toggle trading container */}
        <TouchableOpacity
          style={styles.floatingActionButton}
          onPress={toggleTradingContainer}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isTradingContainerVisible ? "chevron-down" : "chevron-up"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Trading Container */}
        {isTradingContainerVisible && (
          <Animated.View
            style={[
              styles.tradingContainer,
              Platform.OS === "android" && styles.androidTradingContainer,
              {
                transform: [
                  {
                    translateY: slideAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
                opacity: slideAnimation,
              },
            ]}
          >
            {/* Trading Mode Selector */}
            <View style={styles.tradingModeSelector}>
              <TouchableOpacity
                style={[
                  styles.tradingModeButton,
                  tradingMode === "BUY" && styles.selectedTradingMode,
                ]}
                onPress={() => setTradingMode("BUY")}
              >
                <Text
                  style={[
                    styles.tradingModeText,
                    tradingMode === "BUY" && styles.selectedTradingModeText,
                    getRTLStyles(userLanguage)
                  ]}
                >
                  {t(userLanguage, 'crypto.content.buy')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tradingModeButton,
                  tradingMode === "SELL" && styles.selectedTradingMode,
                ]}
                onPress={() => setTradingMode("SELL")}
              >
                <Text
                  style={[
                    styles.tradingModeText,
                    tradingMode === "SELL" && styles.selectedTradingModeText,
                    getRTLStyles(userLanguage)
                  ]}
                >
                  {t(userLanguage, 'crypto.content.sell')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Buy Container */}
            {tradingMode === "BUY" && (
              <View style={styles.tradingInputContainer}>
                <View style={styles.sliderContainer}>
                  <Text style={[styles.sliderLabel, getRTLStyles(userLanguage)]}>
                    {sliderValue.toFixed(0)}{t(userLanguage, 'crypto.content.percentageOfBalance')}
                  </Text>
                  <CustomSlider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    minimumValue={0}
                    maximumValue={100}
                    style={styles.slider}
                  />
                  <View style={styles.sliderMarks}>
                    <Text style={styles.sliderMark}>0%</Text>
                    <Text style={styles.sliderMark}>25%</Text>
                    <Text style={styles.sliderMark}>50%</Text>
                    <Text style={styles.sliderMark}>75%</Text>
                    <Text style={styles.sliderMark}>100%</Text>
                  </View>
                  <View style={styles.quickPercentageContainer}>
                    {[25, 50, 75, 100].map((percentage) => (
                      <TouchableOpacity
                        key={percentage}
                        style={[
                          styles.quickPercentageButton,
                          sliderValue === percentage && styles.selectedQuickPercentage,
                        ]}
                        onPress={() => setSliderValue(percentage)}
                      >
                        <Text
                          style={[
                            styles.quickPercentageText,
                            sliderValue === percentage && styles.selectedQuickPercentageText,
                          ]}
                        >
                          {percentage}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, 'crypto.content.amountInPHP')}
                  value={amount}
                  onChangeText={handleAmountChange}
                  onFocus={() => setIsManualInput(true)}
                  onBlur={() => setIsManualInput(false)}
                  keyboardType="numeric"
                  placeholderTextColor="#666"
                />
                <TouchableOpacity
                  style={[styles.actionButton, styles.buyButton]}
                  onPress={handleBuy}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? t(userLanguage, 'crypto.content.processing') : t(userLanguage, 'crypto.content.buy')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Sell Container */}
            {tradingMode === "SELL" && (
              <View style={styles.tradingInputContainer}>
                <View style={styles.sliderContainer}>
                  <Text style={[styles.sliderLabel, getRTLStyles(userLanguage)]}>
                    {sliderValue.toFixed(0)}{t(userLanguage, 'crypto.content.percentageOfAsset')} {selectedType === "CRYPTO" ? selectedCrypto : selectedCurrency}
                  </Text>
                  <CustomSlider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    minimumValue={0}
                    maximumValue={100}
                    style={styles.slider}
                  />
                  <View style={styles.sliderMarks}>
                    <Text style={styles.sliderMark}>0%</Text>
                    <Text style={styles.sliderMark}>25%</Text>
                    <Text style={styles.sliderMark}>50%</Text>
                    <Text style={styles.sliderMark}>75%</Text>
                    <Text style={styles.sliderMark}>100%</Text>
                  </View>
                  <View style={styles.quickPercentageContainer}>
                    {[25, 50, 75, 100].map((percentage) => (
                      <TouchableOpacity
                        key={percentage}
                        style={[
                          styles.quickPercentageButton,
                          sliderValue === percentage && styles.selectedQuickPercentage,
                        ]}
                        onPress={() => setSliderValue(percentage)}
                      >
                        <Text
                          style={[
                            styles.quickPercentageText,
                            sliderValue === percentage && styles.selectedQuickPercentageText,
                          ]}
                        >
                          {percentage}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={`${t(userLanguage, 'crypto.content.amountOf')} ${
                    selectedType === "CRYPTO" ? selectedCrypto : selectedCurrency
                  }`}
                  value={amount}
                  onChangeText={handleAmountChange}
                  onFocus={() => setIsManualInput(true)}
                  onBlur={() => setIsManualInput(false)}
                  keyboardType="numeric"
                  placeholderTextColor="#666"
                />
                <TouchableOpacity
                  style={[styles.actionButton, styles.sellButton]}
                  onPress={handleSell}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? t(userLanguage, 'crypto.content.processing') : t(userLanguage, 'crypto.content.sell')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}

        <ProfessionalModal
          visible={modalVisible}
          onClose={hideModal}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          showCloseButton={modalConfig.showCloseButton}
          onConfirm={modalConfig.onConfirm}
          confirmText={modalConfig.confirmText}
          showCancelButton={modalConfig.showCancelButton}
          cancelText={modalConfig.cancelText}
        />
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingBottom: 20,
  },
  // Modern Header Styles
  modernHeader: {
    padding: 20,
    paddingTop: Platform.OS === "android" ? 20 : 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  headerBalance: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.redTheme.background,
  },
  helpButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  balanceCardsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  balanceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  balanceCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.redTheme.background,
  },
  balanceCardContent: {
    gap: 8,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceCrypto: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  balanceValue: {
    fontSize: 13,
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  // Old header styles (keep for compatibility)
  header: {
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.redTheme.background,
  },
  balancesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cryptoBalancesContainer: {
    flex: 1,
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 8,
    marginRight: 5,
  },
  currencyBalancesContainer: {
    flex: 1,
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 8,
    marginLeft: 5,
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 5,
  },
  // Modern Type Selector
  modernTypeSelector: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  modernTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modernTypeButtonSelected: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background,
    borderWidth: 3,
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modernTypeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.redTheme.background,
  },
  modernTypeButtonTextSelected: {
    color: "white",
  },

  // Modern Asset Selector
  modernAssetSelector: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modernAssetButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modernAssetButtonSelected: {
    borderColor: Colors.redTheme.background,
    borderWidth: 3,
    backgroundColor: "white",
    transform: [{ scale: 1.02 }],
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  assetIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.redTheme.background + '12',
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  assetIconContainerSelected: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background + '30',
    ...Platform.select({
      ios: {
        shadowColor: Colors.redTheme.background,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modernAssetButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  modernAssetButtonTextSelected: {
    color: Colors.redTheme.background,
    fontWeight: "700",
  },
  currencyIcon: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.redTheme.background,
  },
  currencyIconSelected: {
    color: "white",
  },

  // Old selector styles (keep for compatibility)
  typeSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginTop: 10,
  },
  typeButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    backgroundColor: "#f0f0f0",
  },
  selectedType: {
    backgroundColor: Colors.redTheme.background,
  },
  typeButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  selectedTypeText: {
    color: "#fff",
  },
  cryptoSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginTop: 10,
  },
  currencySelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginTop: 10,
  },
  assetButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  selectedAsset: {
    backgroundColor: Colors.redTheme.background,
  },
  assetButtonText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  selectedAssetText: {
    color: "#fff",
  },
  assetButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  priceContainer: {
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginTop: 10,
  },
  priceText: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.redTheme.background,
  },
  priceChangeText: {
    fontSize: 18,
    marginTop: 5,
  },
  timeRangeSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginTop: 10,
  },
  timeRangeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
  },
  selectedTimeRange: {
    backgroundColor: Colors.redTheme.background,
  },
  selectedTimeRangeText: {
    color: "#fff",
  },
  timeRangeText: {
    fontSize: 14,
    color: "#666",
  },
  tradingContainer: {
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    width: "100%",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tradingModeSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 4,
  },
  tradingModeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  selectedTradingMode: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tradingModeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  selectedTradingModeText: {
    color: Colors.redTheme.background,
  },
  tradingInputContainer: {
    gap: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    color: "#333",
    fontSize: 16,
  },
  actionButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buyButton: {
    backgroundColor: "#4CAF50",
  },
  sellButton: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  errorContainer: {
    padding: 20,
    backgroundColor: "#ffebee",
    margin: 10,
    borderRadius: 8,
  },
  errorText: {
    color: "#c62828",
    fontSize: 16,
    marginBottom: 10,
  },
  errorButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  retryButton: {
    backgroundColor: "#c62828",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  testApiButton: {
    backgroundColor: "#1976d2",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  chartContainer: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden",
    height: 350,
  },
  chartWrapper: {
    height: 300,
    flexDirection: "row",
  },
  yAxisContainer: {
    width: 60,
    justifyContent: "space-between",
    paddingRight: 10,
  },
  yAxisLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "right",
  },
  chartArea: {
    flex: 1,
    position: "relative",
    height: "100%",
  },
  chartContent: {
    flex: 1,
    position: "relative",
    height: "100%",
    paddingHorizontal: 6,
    backgroundColor: "#fff",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  candleContainer: {
    position: "absolute",
    height: "100%",
    transformOrigin: "bottom",
  },
  candleWick: {
    position: "absolute",
    width: 2,
    left: "50%",
    transform: [{ translateX: -1 }],
  },
  candleBody: {
    position: "absolute",
    width: "100%",
    borderRadius: 2,
  },
  xAxisContainer: {
    position: "absolute",
    bottom: 0,
    left: 60,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  xAxisLabel: {
    fontSize: 10,
    color: "#666",
    transform: [{ rotate: "-45deg" }],
    width: 40,
    textAlign: "center",
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataText: {
    fontSize: 16,
    color: "#666",
  },
  currencySelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginTop: 10,
  },
  instructionButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.redTheme.background,
  },
  closeButton: {
    padding: 5,
  },
  instructionsContainer: {
    maxHeight: "100%",
  },
  instructionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
    lineHeight: 24,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  androidTradingContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sliderContainer: {
    marginBottom: 10,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.redTheme.background,
    textAlign: "center",
    marginBottom: 10,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderMarks: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  sliderMark: {
    fontSize: 10,
    color: "#666",
  },
  quickPercentageContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    paddingVertical: 5,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  quickPercentageButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#e0e0e0",
  },
  selectedQuickPercentage: {
    backgroundColor: Colors.redTheme.background,
  },
  quickPercentageText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  selectedQuickPercentageText: {
    color: "#fff",
  },
  backButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  customSliderContainer: {
    width: "100%",
    height: 40,
    justifyContent: "center",
  },
  customSliderTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e0e0e0",
    position: "relative",
  },
  customSliderFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: Colors.redTheme.background,
    position: "absolute",
    top: 0,
    left: 0,
  },
  customSliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.redTheme.background,
    position: "absolute",
    top: -8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartBottomSpacer: {
    height: 20,
    backgroundColor: "transparent",
  },
  floatingActionButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.redTheme.background,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
});

export default Crypto;
