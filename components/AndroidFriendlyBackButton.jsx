import React from "react";
import { TouchableOpacity, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";

const AndroidFriendlyBackButton = ({
  onPress,
  style,
  iconColor,
  iconSize = 24,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        Platform.OS === "android"
          ? styles.androidBackButton
          : styles.iosBackButton,
        style,
      ]}
      hitSlop={
        Platform.OS === "android"
          ? { top: 15, bottom: 15, left: 15, right: 15 }
          : { top: 10, bottom: 10, left: 10, right: 10 }
      }
      activeOpacity={0.6}
    >
      <Ionicons
        name="chevron-back"
        size={Platform.OS === "android" ? iconSize + 2 : iconSize}
        color={iconColor || Colors.redTheme.background}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  androidBackButton: {
    padding: 12,
    minWidth: 48,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  iosBackButton: {
    padding: 10,
  },
});

export default AndroidFriendlyBackButton;
