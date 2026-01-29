import { StyleSheet, Text, View } from "react-native";
import React from "react";

export default function AvailBalanceContent({
  availBalanceAmount,
  dollarAvailBalanceAmount,
  cryptoAvailBalanceAmount,
}) {
  const formatCurrency = (value) => {
    const numberValue = Number(value);
    if (isNaN(numberValue)) {
      return "loading data...";
    }
    // Format to 2 decimal places
    const fixedValue = numberValue.toFixed(2);
    // Add comma separators for thousands
    const formattedStr = fixedValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return formattedStr;
  };
  return (
    <View style={styles.container}>
      <Text
        style={{
          textAlign: "left",
          width: "100%",
          paddingLeft: 10,
        }}
      >
        Available Balance
      </Text>
      <Text
        style={{
          width: "100%",
          textAlign: "right",
          paddingRight: 10,
          fontSize: 20,
        }}
      >
        PHP {formatCurrency(availBalanceAmount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "auto",
    backgroundColor: "white",
    borderColor: "black",
    borderWidth: 2,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
    padding: 10,
  },
});
