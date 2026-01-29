import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  PixelRatio,
} from "react-native";
import { Colors } from "../constants/Colors";

export default function IconButton({ title, iconSource, onPress }) {
  const scaleFont = (size) => {
    const scale = PixelRatio.getFontScale();
    return size * scale;
  };
  return (
    <TouchableOpacity style={styles.buttonContainer} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Image source={iconSource} style={styles.icon} />
      </View>
      <Text
        style={{
          fontSize: scaleFont(12),
          fontWeight: "bold",
          color: Colors.newYearTheme.text,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    width: 120,
    height: 120,
    backgroundColor: Colors.newYearTheme.background,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "60%",
  },
  icon: {
    width: 40, // adjust the icon size as needed
    height: 40,
    resizeMode: "contain",
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    color: "red",
    textAlign: "center",
  },
});
