import { Platform } from "react-native";

// Enhanced hit slop for Android users
export const getBackButtonHitSlop = () => {
  return Platform.OS === "android"
    ? { top: 15, bottom: 15, left: 15, right: 15 }
    : { top: 10, bottom: 10, left: 10, right: 10 };
};

// Enhanced styles for Android back buttons
export const getBackButtonStyle = (customStyle = {}) => {
  const androidStyle = {
    padding: 12,
    minWidth: 48,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  };

  const iosStyle = {
    padding: 10,
  };

  const baseStyle = Platform.OS === "android" ? androidStyle : iosStyle;

  return { ...baseStyle, ...customStyle };
};

// Enhanced active opacity for better feedback
export const getBackButtonActiveOpacity = () => {
  return Platform.OS === "android" ? 0.6 : 0.7;
};

// Enhanced icon size for Android
export const getBackButtonIconSize = (baseSize = 24) => {
  return Platform.OS === "android" ? baseSize + 2 : baseSize;
};
