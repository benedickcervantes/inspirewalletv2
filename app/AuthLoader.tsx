import { useEffect, useState, useRef } from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMe } from "../configs/api";
import type { RootStackParamList } from "../types/navigation";

const LOADER_IMAGE = require("../assets/images/InpireLogo.png");
const MIN_SPLASH_MS = 3000;

type ScreenName = keyof RootStackParamList;

export default function AuthLoader() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const hasInitializedRef = useRef(false);
  const navigationHandledRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const goTo = (screenName: ScreenName) => {
      if (navigationHandledRef.current) return;
      navigationHandledRef.current = true;
      setLoading(false);
      navigation.reset({
        index: 0,
        routes: [{ name: screenName }],
      });
    };

    const waitMinSplash = (startTime: number) => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      return new Promise<void>((resolve) => setTimeout(resolve, remaining));
    };

    const handleAuthAndRedirect = async () => {
      if (navigationHandledRef.current) return;
      const startTime = Date.now();

      try {
        const accessToken = await AsyncStorage.getItem("access_token");
        if (!accessToken) {
          await waitMinSplash(startTime);
          goTo("Welcome");
          return;
        }

        const result = await getMe(accessToken);
        if (!result.success || !result.user) {
          await AsyncStorage.multiRemove(["access_token", "user", "passcodeLoginComplete"]);
          await waitMinSplash(startTime);
          goTo("Welcome");
          return;
        }

        const passcodeLoginComplete = await AsyncStorage.getItem("passcodeLoginComplete");
        const user = result.user as { hasPasscode?: boolean };

        if (passcodeLoginComplete === "true") {
          await waitMinSplash(startTime);
          goTo("Main");
          return;
        }

        if (user?.hasPasscode) {
          await AsyncStorage.setItem("user", JSON.stringify(result.user));
          await waitMinSplash(startTime);
          goTo("Passcode");
          return;
        }

        await waitMinSplash(startTime);
        goTo("Main");
      } catch (error) {
        console.error("Error in auth handling:", error);
        try {
          await AsyncStorage.multiRemove(["access_token", "user", "passcodeLoginComplete"]);
        } catch (_) {}
        await waitMinSplash(startTime);
        goTo("Welcome");
      }
    };

    handleAuthAndRedirect();
  }, [navigation]);

  if (!loading) return null;

  return (
    <LinearGradient colors={["#E25A17", "#F28934"]} style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={LOADER_IMAGE} style={styles.logo} resizeMode="contain" />
        <Text style={styles.createdByText}>CREATED BY INSPIRE</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  logo: {
    width: 250,
    height: 250,
  },
  createdByText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "400",
    fontStyle: "normal",
    letterSpacing: 1,
    position: "absolute",
    bottom: 50,
  },
});
