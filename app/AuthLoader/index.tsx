import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { registerIndieID } from 'native-notify';
import { useEffect, useRef, useState } from "react";
import { getMe, login } from "../../configs/api";
import { useLanguage } from "../../context/LanguageContext";
import type { RootStackParamList } from "../../types/navigation";
import CustomLoader from "../Loader/CustomLoader";

const MIN_SPLASH_MS = 0;

type ScreenName = keyof RootStackParamList;

export default function AuthLoader() {
  const navigation = useNavigation();
  const { t } = useLanguage();
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
      SplashScreen.hideAsync().catch(() => { });
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
        let accessToken = await AsyncStorage.getItem("access_token");

        // ── Silent auto-login helper ──────────────────────────────────────────
        // Tries to log in with saved credentials and returns the new token,
        // or null if credentials are missing / login fails.
        const trySilentLogin = async (): Promise<string | null> => {
          try {
            const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

            // Check if saved credentials have expired (older than 2 days)
            const savedAt = await AsyncStorage.getItem("savedPasswordAt");
            if (!savedAt || Date.now() - parseInt(savedAt, 10) > TWO_DAYS_MS) {
              // Credentials expired — wipe them; user must email-login again
              await SecureStore.deleteItemAsync("savedPassword").catch(() => { });
              await AsyncStorage.removeItem("savedPasswordAt").catch(() => { });
              return null;
            }

            const savedEmail = await AsyncStorage.getItem("lastLoggedEmail");
            const savedPassword = await SecureStore.getItemAsync("savedPassword");
            if (!savedEmail || !savedPassword) return null;
            const res = await login(savedEmail, savedPassword);
            if (res.success && res.access_token) {
              await AsyncStorage.setItem("access_token", res.access_token);
              await AsyncStorage.setItem("user", JSON.stringify(res.user || {}));
              await AsyncStorage.removeItem("passcodeLoginComplete");
              // Refresh the timestamp so the 2-day window resets on each successful auto-login
              await AsyncStorage.setItem("savedPasswordAt", String(Date.now()));
              return res.access_token;
            }
          } catch {
            // non-fatal
          }
          return null;
        };
        // ─────────────────────────────────────────────────────────────────────

        if (!accessToken) {
          // No token — try silent re-login before showing Welcome
          const newToken = await trySilentLogin();
          if (!newToken) {
            await waitMinSplash(startTime);
            goTo("Welcome");
            return;
          }
          accessToken = newToken;
        }

        const result = await getMe(accessToken);
        if (!result.success || !result.user) {
          // Token expired — try silent re-login
          const newToken = await trySilentLogin();
          if (!newToken) {
            await AsyncStorage.multiRemove(["access_token", "user", "passcodeLoginComplete", "registrationPasscodePending"]);
            await waitMinSplash(startTime);
            goTo("Welcome");
            return;
          }
          // Re-run getMe with the fresh token
          const retryResult = await getMe(newToken);
          if (!retryResult.success || !retryResult.user) {
            await AsyncStorage.multiRemove(["access_token", "user", "passcodeLoginComplete", "registrationPasscodePending"]);
            await waitMinSplash(startTime);
            goTo("Welcome");
            return;
          }
          // Use retryResult going forward
          await AsyncStorage.setItem("user", JSON.stringify(retryResult.user));
          const silentUser = retryResult.user as { hasPasscode?: boolean };
          await waitMinSplash(startTime);
          goTo(silentUser?.hasPasscode ? "Passcode" : "Main");
          return;
        }

        // Always store user so Dashboard has userData (backend-only, no Firebase)
        await AsyncStorage.setItem("user", JSON.stringify(result.user));

        // Register device for Indie Push Notifications on app load if already logged in
        const userObj = result.user as any;
        const userId = userObj?.id || userObj?._id;
        const appId = process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_ID;
        const appToken = process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_TOKEN;

        if (userId && appId && appToken) {
          registerIndieID(String(userId), Number(appId), appToken);
        }

        const registrationPasscodePending = await AsyncStorage.getItem("registrationPasscodePending");
        const passcodeLoginComplete = await AsyncStorage.getItem("passcodeLoginComplete");
        const user = result.user as { hasPasscode?: boolean };

        if (registrationPasscodePending === "true") {
          await AsyncStorage.setItem("user", JSON.stringify(result.user));
          await waitMinSplash(startTime);
          goTo("CreatePasscode");
          return;
        }

        if (passcodeLoginComplete === "true") {
          await waitMinSplash(startTime);
          goTo("Main");
          return;
        }

        if (user?.hasPasscode) {
          await waitMinSplash(startTime);
          goTo("Passcode");
          return;
        }

        await waitMinSplash(startTime);
        goTo("Main");
      } catch (error) {
        console.error("Error in auth handling:", error);
        try {
          await AsyncStorage.multiRemove(["access_token", "user", "passcodeLoginComplete", "registrationPasscodePending"]);
        } catch (_) { }
        await waitMinSplash(startTime);
        goTo("Welcome");
      }
    };

    handleAuthAndRedirect();
  }, [navigation]);

  if (!loading) return null;

  return <CustomLoader text={t("common.loading")} />;
}
