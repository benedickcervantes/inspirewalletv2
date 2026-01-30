import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import {
  getFirestore,
  collection,
  query,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { app } from "../configs/firebase"; // Adjust import path
import { Colors } from "../constants/Colors";

const TransactionHistory = ({ userId }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const windowWidth = Dimensions.get("window").width;

  // Helper function to determine if transaction adds to available balance
  const isPositiveTransaction = (transactionType) => {
    if (!transactionType) return false;
    const type = transactionType.toLowerCase();
    return (
      type.includes('received') ||
      type.includes('deposit') ||
      type.includes('cash in') ||
      type.includes('earnings') ||
      type.includes('returned') ||
      type.includes('agent wallet transfer') ||
      type.includes('add') ||
      type.includes('added') ||
      type.includes('credit') ||
      type.includes('refund') ||
      type.includes('bonus') ||
      type.includes('reward') ||
      type.includes('stock transfer received')
    );
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const db = getFirestore(app);
        // Fetch from the user's subcollection
        const transactionsRef = collection(db, "users", userId, "transactions");
        const q = query(transactionsRef, orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);

        // console.log("Query Snapshot:", querySnapshot); // Debug log

        const fetchedTransactions = [];
        querySnapshot.forEach((doc) => {
          // console.log("Fetched Document ID:", doc.id); // Debug log
          const data = doc.data();

          // Check if date field exists and is a timestamp
          const date = data.date?.toDate
            ? data.date.toDate()
            : new Date(data.date);
          const amount =
            typeof data.amount === "number"
              ? data.amount
              : parseFloat(data.amount) || 0;

          fetchedTransactions.push({
            id: doc.id,
            type: data.type,
            date: date,
            amount: amount,
          });
        });

        // console.log("Fetched Transactions:", fetchedTransactions); // Debug log
        setTransactions(fetchedTransactions);
      } catch (err) {
        // console.error("Error fetching transactions:", err); // Debug log
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchTransactions();
    }
  }, [userId]);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  return (
    <View style={[styles.container, { width: windowWidth - 20 }]}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.transactionBox}>
            <View style={styles.transactionItem}>
              <Text
                style={[
                  styles.transactionText,
                  { fontSize: windowWidth < 360 ? 12 : 15 },
                ]}
              >
                {item.type}
              </Text>
            </View>
            <View style={styles.transactionItem}>
              <Text
                style={[
                  styles.transactionText,
                  { fontSize: windowWidth < 360 ? 12 : 15 },
                ]}
              >
                {item.date.toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.transactionItem}>
              <Text
                style={[
                  styles.transactionText,
                  { fontSize: windowWidth < 360 ? 12 : 15 },
                ]}
              >
                {isPositiveTransaction(item.type) ? '+' : '-'}₱ {item.amount.toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    margin: 10,
  },
  transactionBox: {
    flexDirection: "row",
    backgroundColor: Colors.newYearTheme.background,
    borderRadius: 15,
    marginBottom: 10,
    padding: 5,
    alignItems: "center",
    minHeight: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  transactionItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  transactionText: {
    color: Colors.newYearTheme.text,
    textAlign: "center",
  },
});

export default TransactionHistory;
