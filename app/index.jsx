import { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "../configs/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Index() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = getAuth();
  const [loading, setLoading] = useState(true);
  const hasInitializedRef = useRef(false);
  const navigationHandledRef = useRef(false);

  // CRITICAL: If we're not on root path, don't do anything - let the current route handle itself
  if (pathname !== "/" && pathname !== "") {
    return null; // Don't render anything, let the current route render
  }

  useEffect(() => {
    // Only run once - prevent re-running on app resume
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const handleAuthAndRedirect = async (user) => {
      // Prevent multiple navigations
      if (navigationHandledRef.current) return;
      
      try {
        if (user) {
          // User is authenticated
          const passcodeLoginComplete = await AsyncStorage.getItem("passcodeLoginComplete");
          
          if (passcodeLoginComplete === "true") {
            navigationHandledRef.current = true;
            setLoading(false);
            router.replace("/main");
            return;
          }

          // Check user document for passcode
          try {
            const userDocRef = doc(firestore, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              navigationHandledRef.current = true;
              setLoading(false);
              
              if (userData.passcode) {
                router.replace("/passcode-login");
              } else {
                router.replace("/create-passcode");
              }
            } else {
              navigationHandledRef.current = true;
              setLoading(false);
              router.replace("/login");
            }
          } catch (firestoreError) {
            console.error("Error accessing Firestore:", firestoreError);
            navigationHandledRef.current = true;
            setLoading(false);
            router.replace("/login");
          }
        } else {
          // No user - check for stored credentials
          const userEmail = await AsyncStorage.getItem("userEmail");
          const userPassword = await AsyncStorage.getItem("userPassword");

          if (userEmail && userPassword) {
            try {
              // Try to re-authenticate
              const userCredential = await signInWithEmailAndPassword(
                auth,
                userEmail,
                userPassword
              );
              const authenticatedUser = userCredential.user;

              if (authenticatedUser) {
                // Check passcode
                const userDocRef = doc(firestore, "users", authenticatedUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                
                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data();
                  navigationHandledRef.current = true;
                  setLoading(false);
                  
                  if (userData.passcode) {
                    router.replace("/passcode-login");
                  } else {
                    router.replace("/passcode");
                  }
                } else {
                  navigationHandledRef.current = true;
                  setLoading(false);
                  router.replace("/login");
                }
              }
            } catch (authError) {
              // Auth failed - clear credentials and go to login
              console.log("Re-authentication failed:", authError);
              try {
                await AsyncStorage.removeItem("userEmail");
                await AsyncStorage.removeItem("userPassword");
                await AsyncStorage.removeItem("passcodeLoginComplete");
              } catch (clearError) {
                console.error("Error clearing credentials:", clearError);
              }
              navigationHandledRef.current = true;
              setLoading(false);
              router.replace("/login");
            }
          } else {
            // No stored credentials
            navigationHandledRef.current = true;
            setLoading(false);
            router.replace("/login");
          }
        }
      } catch (error) {
        console.error("Error in auth handling:", error);
        navigationHandledRef.current = true;
        setLoading(false);
        router.replace("/login");
      }
    };

    // Wait for Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, handleAuthAndRedirect);

    return () => {
      unsubscribe();
    };
  }, []); // Empty deps - only run once on mount

  // Show loading while determining auth state
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fe7d48" />
      </View>
    );
  }

  // Should not reach here, but just in case
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
});
