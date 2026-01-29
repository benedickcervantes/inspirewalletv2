import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Colors } from "../constants/Colors";

export default function AmountContent({ amount, title }) {
  const formatCurrency = (value) => {
    const numberValue = Number(value);
    if (isNaN(numberValue)) {
      return "loading data...";
    }
    // Round to 2 decimal places
    const roundedValue = Math.round(numberValue * 100) / 100;
    const numStr = roundedValue.toString().replace(/,/g, "");
    const formattedStr = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `PHP ${formattedStr}`;
  };

  return (
    <View style={styles.container}>
      <Text
        style={{
          textAlign: "left",
          width: "100%",
          paddingLeft: 10,
          color: Colors.redTheme.background,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          width: "100%",
          textAlign: "right",
          paddingRight: 10,
          fontSize: 20,
          color: Colors.redTheme.background,
          fontWeight: "bold",
        }}
      >
        {formatCurrency(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "97%",
    height: 70,
    backgroundColor: "white",
    borderColor: Colors.redTheme.background,
    borderWidth: 2,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
    marginBottom: 10,
    padding: 10,
  },
});
