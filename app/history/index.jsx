import {
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  Platform,
} from "react-native";
import React, { useEffect } from "react";
import TransactionHistory from "../../components/TransactionHistory";
import { useNavigation } from "expo-router";

export default function Index() {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: "TRANSACTION HISTORY",
    });
  }, [navigation]);

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea} />
      <TransactionHistory />
      <SafeAreaView style={styles.androidSafeArea} />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  androidSafeArea: {
    paddingTop: Platform.OS === "android" ? 80 : 0,
    opacity: 0,
  },
});
