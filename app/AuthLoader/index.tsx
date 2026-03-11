import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { registerIndieID } from 'native-notify';
import { useEffect, useRef, useState } from "react";
import { getMe } from "../../configs/api";
import type { RootStackParamList } from "../../types/navigation";
import CustomLoader from "../Loader/CustomLoader";
import { useLanguage } from "../../context/LanguageContext";

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
          await AsyncStorage.multiRemove(["access_token", "user", "passcodeLoginComplete", "registrationPasscodePending"]);
          await waitMinSplash(startTime);
          goTo("Welcome");
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
        } catch (_) {}
        await waitMinSplash(startTime);
        goTo("Welcome");
      }
    };

    handleAuthAndRedirect();
  }, [navigation]);

  if (!loading) return null;

  return <CustomLoader text={t("common.loading")} />;
}
