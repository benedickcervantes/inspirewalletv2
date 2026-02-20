import { useEffect, useState, useRef } from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { User } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  auth,
  firestore,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  doc,
  getDoc,
} from "../configs/firebase";
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

    const handleAuthAndRedirect = async (user: User | null) => {
      if (navigationHandledRef.current) return;
      const startTime = Date.now();

      try {
        if (!firestore) {
          await waitMinSplash(startTime);
          goTo("Welcome");
          return;
        }

        if (user) {
          const passcodeLoginComplete = await AsyncStorage.getItem("passcodeLoginComplete");

          if (passcodeLoginComplete === "true") {
            await waitMinSplash(startTime);
            goTo("Main");
            return;
          }

          try {
            const userDocRef = doc(firestore, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data() as { passcode?: string };
              await waitMinSplash(startTime);

              if (userData?.passcode) {
                goTo("Passcode");
              } else {
                goTo("Login");
              }
              return;
            }

            await waitMinSplash(startTime);
            goTo("Login");
            return;
          } catch (firestoreError) {
            console.error("Error accessing Firestore:", firestoreError);
            await waitMinSplash(startTime);
            goTo("Login");
            return;
          }
        }

        const userEmail = await AsyncStorage.getItem("userEmail");
        const userPassword = await AsyncStorage.getItem("userPassword");

        if (userEmail && userPassword && auth) {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, userEmail, userPassword);
            const authenticatedUser = userCredential.user;

            if (authenticatedUser && firestore) {
              const userDocRef = doc(firestore, "users", authenticatedUser.uid);
              const userDocSnap = await getDoc(userDocRef);

              if (userDocSnap.exists()) {
                const userData = userDocSnap.data() as { passcode?: string };
                await waitMinSplash(startTime);

                if (userData?.passcode) {
                  goTo("Passcode");
                } else {
                  goTo("Login");
                }
                return;
              }
            }

            await waitMinSplash(startTime);
            goTo("Login");
            return;
          } catch (authError) {
            console.log("Re-authentication failed:", authError);
            try {
              await AsyncStorage.removeItem("userEmail");
              await AsyncStorage.removeItem("userPassword");
              await AsyncStorage.removeItem("passcodeLoginComplete");
            } catch (clearError) {
              console.error("Error clearing credentials:", clearError);
            }
            await waitMinSplash(startTime);
            goTo("Welcome");
            return;
          }
        }

        await waitMinSplash(startTime);
        goTo("Welcome");
      } catch (error) {
        console.error("Error in auth handling:", error);
        await waitMinSplash(startTime);
        goTo("Welcome");
      }
    };

    if (!firestore || !auth) {
      const t = setTimeout(() => {
        if (navigationHandledRef.current) return;
        navigationHandledRef.current = true;
        setLoading(false);
        navigation.reset({
          index: 0,
          routes: [{ name: "Welcome" }],
        });
      }, MIN_SPLASH_MS);
      return () => clearTimeout(t);
    }

    const unsubscribe = onAuthStateChanged(auth, handleAuthAndRedirect);

    return () => {
      unsubscribe();
    };
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
