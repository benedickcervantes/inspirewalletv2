import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

export default function CurrencyConverter() {
  const [amount, setAmount] = useState("1");
  const [result, setResult] = useState("");
  const [currencies, setCurrencies] = useState([]);
  const [fromCurrency, setFromCurrency] = useState("PHP");
  const [toCurrency, setToCurrency] = useState("JPY");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  // Fetch currencies when the component mounts
  useEffect(() => {
    let isMounted = true; // Track component mount status

    const fetchCurrencies = async () => {
      try {
        const response = await axios.get(
          "https://api.exchangerate-api.com/v4/latest/USD",
          { timeout: 5000 } // Set a timeout of 5 seconds
        );

        // Check if the response data is valid
        if (response && response.data && response.data.rates) {
          if (isMounted) {
            const currencyList = Object.keys(response.data.rates).map(
              (currency) => ({
                label: currency,
                value: currency,
              })
            );
            setCurrencies(currencyList);
            setLoading(false);
          }
        } else {
          setError("Invalid data from API");
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          // console.error("Error fetching currencies:", error);
          setError("Failed to fetch currencies");
          setLoading(false);
        }
      }
    };

    fetchCurrencies();

    // Cleanup if component is unmounted
    return () => {
      isMounted = false;
    };
  }, []);

  // Convert currency when the amount or currency changes
  useEffect(() => {
    if (fromCurrency && toCurrency) {
      convertCurrency();
    }
  }, [amount, fromCurrency, toCurrency]);

  const convertCurrency = async () => {
    try {
      const response = await axios.get(
        `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`,
        { timeout: 5000 } // Set a timeout of 5 seconds
      );

      if (response && response.data && response.data.rates) {
        const rate = response.data.rates[toCurrency];
        if (rate) {
          setResult((amount * rate).toFixed(2));
        } else {
          setError(`No conversion rate found for ${toCurrency}`);
        }
      } else {
        // console.log("Invalid conversion data:", response);
        setError("Failed to convert currency");
      }
    } catch (error) {
      // console.error("Error converting currency:", error);
      setError("Failed to convert currency");
    }
  };

  // Show loading indicator if currencies are being fetched
  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  // Show error message if there's an error fetching currencies
  if (error) {
    // console.log("Error:", error);
    return <Text style={styles.error}>{error}</Text>;
  }

  // Check if currencies is empty
  if (currencies.length === 0) {
    return <Text style={styles.error}>No currencies available</Text>;
  }

  return (
    <View style={styles.container}>
      <Text
        style={{
          width: "100%",
          textAlign: "center",
          marginBottom: 10,
          fontSize: 20,
        }}
      >
        FOREX CONVERTER
      </Text>
      <View style={{ width: "100%", flexDirection: "row" }}>
        <TextInput
          style={styles.input}
          keyboardType="numbers-and-punctuation"
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
          }}
          editable={true}
        />
        <TextInput style={styles.input} value={result} editable={false} />
      </View>

      <View style={styles.dropdownWrapper}>
        <TouchableOpacity
          style={styles.modalSelector}
          onPress={() => setOpenFrom(true)}
        >
          <Text style={styles.modalSelectorText}>
            {fromCurrency || "Select From Currency"}
          </Text>
          <Ionicons
            name="chevron-down-outline"
            size={20}
            color="#333"
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.modalSelector}
          onPress={() => setOpenTo(true)}
        >
          <Text style={styles.modalSelectorText}>
            {toCurrency || "Select To Currency"}
          </Text>
          <Ionicons
            name="chevron-down-outline"
            size={20}
            color="#333"
          />
        </TouchableOpacity>
      </View>

      {/* From Currency Selection Modal */}
      <Modal
        visible={openFrom}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpenFrom(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setOpenFrom(false)}
          activeOpacity={1}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select From Currency</Text>
              <TouchableOpacity onPress={() => setOpenFrom(false)}>
                <Ionicons name="close-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {currencies.map((currency) => (
                <TouchableOpacity
                  key={currency.value}
                  style={styles.optionItem}
                  onPress={() => {
                    setFromCurrency(currency.value);
                    setOpenFrom(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text>{currency.label}</Text>
                  </View>
                  {fromCurrency === currency.value && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* To Currency Selection Modal */}
      <Modal
        visible={openTo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpenTo(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setOpenTo(false)}
          activeOpacity={1}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select To Currency</Text>
              <TouchableOpacity onPress={() => setOpenTo(false)}>
                <Ionicons name="close-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {currencies.map((currency) => (
                <TouchableOpacity
                  key={currency.value}
                  style={styles.optionItem}
                  onPress={() => {
                    setToCurrency(currency.value);
                    setOpenTo(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text>{currency.label}</Text>
                  </View>
                  {toCurrency === currency.value && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
    padding: 20,
    overflow: "visible",
    zIndex: 1000,
  },
  input: {
    flex: 1,
    margin: 5,
    height: 40,
    borderColor: "black",
    borderWidth: 2,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "white",
    color: "black",
  },
  dropdownWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    gap: 10,
  },
  modalSelector: {
    flex: 1,
    backgroundColor: "white",
    borderColor: "black",
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 40,
  },
  modalSelectorText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 0,
    width: '92%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fafbfc',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    paddingRight: 40,
    paddingLeft: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  optionText: {
    fontSize: 17,
    color: '#222',
    fontWeight: '500',
  },
  checkmarkCircle: {
    backgroundColor: '#333',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: "red",
    textAlign: "center",
  },
});
