import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { app } from "../configs/firebase"; // Adjust the import path if necessary
import { Colors } from "../constants/Colors";

export default function InvestmentProfileButtons({ userId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const db = getFirestore(app);
    const transactionsRef = collection(
      db,
      "users",
      userId,
      "investmentProfiles"
    );
    const q = query(transactionsRef, orderBy("dateOfMaturity", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedTransactions = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const dateOfMaturity = data.dateOfMaturity?.toDate
            ? data.dateOfMaturity.toDate()
            : new Date(data.dateOfMaturity);
          const amount =
            typeof data.amount === "number"
              ? data.amount
              : parseFloat(data.amount) || 0;
          const interestRate = data.interestRate || 0;

          // Only add transactions with an amount greater than 0
          if (amount > 0) {
            fetchedTransactions.push({
              id: doc.id,
              dateOfMaturity,
              amount,
              interestRate,
            });
          }
        });

        setTransactions(fetchedTransactions);
        setLoading(false);
      },
      (err) => {
        // console.error("Error fetching transactions:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [userId]);

  if (loading) {
    return <ActivityIndicator size="large" color="green" />;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  return (
    <View style={styles.container}>
      {transactions.length === 0 ? (
        <Text style={styles.noContractText}>There is no approved contract</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.transactionBox}>
              <View style={styles.transactionItem}>
                <Text style={styles.transactionText}>
                  Amount: PHP {item.amount.toFixed(2)}
                </Text>
              </View>
              <View style={styles.transactionItem}>
                <Text style={styles.transactionText}>
                  Date of Maturity: {item.dateOfMaturity.toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.transactionItem}>
                <Text style={styles.transactionText}>
                  Interest Rate: {item.interestRate}%
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    width: "100%",
    margin: 10,
  },
  transactionBox: {
    flexDirection: "column",
    backgroundColor: Colors.newYearTheme.background,
    borderRadius: 15,
    marginBottom: 10,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  transactionItem: {
    marginVertical: 2,
  },
  transactionText: {
    fontSize: 15,
    color: Colors.newYearTheme.text,
  },
  noContractText: {
    fontSize: 16,
    color: "#ff0000",
    textAlign: "center",
    marginTop: 20,
  },
});
