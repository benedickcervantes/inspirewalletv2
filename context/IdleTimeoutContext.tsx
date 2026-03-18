import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
} from "react";
import {
  AppState,
  AppStateStatus,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  TouchableWithoutFeedback,
} from "react-native";
import { navigationRef } from "../lib/navigationRef";

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // check every minute
const LAST_ACTIVITY_KEY = "lastActivityAt";
const IDLE_SESSION_ACTIVE_KEY = "idleSessionActive";

const THEME_COLOR = "#E15816";
const WHITE = "#FFFFFF";

interface IdleTimeoutContextValue {
  registerActivity: () => void;
  startIdleSession: () => void;
  stopIdleSession: () => void;
  isSessionActive: boolean;
}

const IdleTimeoutContext = createContext<IdleTimeoutContextValue | null>(null);

export const IdleTimeoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const lastActivityRef = useRef<number>(Date.now());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasLoggedOutRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const recordActivity = useCallback(async () => {
    if (!isSessionActive) return;
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      // ignore storage errors – inactivity still works in-memory
    }
  }, [isSessionActive]);

  const clearAuthData = useCallback(async () => {
    try {
      // Clear auth-related storage keys
      await AsyncStorage.multiRemove([
        "access_token",
        "user",
        "passcodeLoginComplete",
        "registrationPasscodePending",
        "lastLoggedEmail",
        "biometricEmail",
        IDLE_SESSION_ACTIVE_KEY,
        LAST_ACTIVITY_KEY,
      ]);

      // Clear biometric token if present
      try {
        await SecureStore.deleteItemAsync("biometricToken");
      } catch {
        // non-fatal
      }
    } catch {
      // ignore errors
    }
  }, []);

  const performLogout = useCallback(async () => {
    if (hasLoggedOutRef.current) return;
    hasLoggedOutRef.current = true;

    // Stop the session
    setIsSessionActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    await clearAuthData();

    // Show the modal instead of navigating immediately
    setShowModal(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [clearAuthData, fadeAnim, scaleAnim]);

  const handleModalDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowModal(false);
      // Navigate back to Login screen
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [
            {
              name: "Login",
              params: { fromSignOut: true } as any,
            },
          ],
        });
      }
    });
  }, [fadeAnim, scaleAnim]);

  // Start idle session - called when user reaches Dashboard after login
  const startIdleSession = useCallback(async () => {
    if (hasLoggedOutRef.current) {
      // Reset the logout flag for new session
      hasLoggedOutRef.current = false;
    }
    const now = Date.now();
    lastActivityRef.current = now;
    setIsSessionActive(true);
    try {
      await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      await AsyncStorage.setItem(IDLE_SESSION_ACTIVE_KEY, "true");
    } catch {
      // ignore
    }
  }, []);

  // Stop idle session - called on manual logout
  const stopIdleSession = useCallback(async () => {
    setIsSessionActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    try {
      await AsyncStorage.removeItem(IDLE_SESSION_ACTIVE_KEY);
      await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Exposed to screens/components to mark explicit user activity
  const registerActivity = useCallback(() => {
    // If session not active or already logged out, ignore
    if (!isSessionActive || hasLoggedOutRef.current) return;
    const now = Date.now();
    lastActivityRef.current = now;
    // Async storage update (fire and forget for performance)
    AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(now)).catch(() => {});
  }, [isSessionActive]);

  // On mount, check if there was an active session (app was killed and reopened)
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const [sessionActive, token] = await Promise.all([
          AsyncStorage.getItem(IDLE_SESSION_ACTIVE_KEY),
          AsyncStorage.getItem("access_token"),
        ]);

        if (!isMounted) return;

        // Only restore session if both token and session flag exist
        if (sessionActive === "true" && token) {
          const stored = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
          const parsed = stored ? parseInt(stored, 10) : NaN;
          const now = Date.now();

          if (!isNaN(parsed)) {
            const elapsed = now - parsed;
            if (elapsed >= INACTIVITY_LIMIT_MS) {
              // Session expired while app was closed
              performLogout();
              return;
            }
            lastActivityRef.current = parsed;
          } else {
            lastActivityRef.current = now;
          }
          setIsSessionActive(true);
        }
      } catch {
        // ignore errors
      }
    };

    initSession();

    return () => {
      isMounted = false;
    };
  }, [performLogout]);

  // Check for inactivity while app is in foreground
  useEffect(() => {
    if (!isSessionActive) {
      // Clear any existing interval when session is not active
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkInactivity = async () => {
      if (hasLoggedOutRef.current) return;
      if (appStateRef.current !== "active") return;
      if (!isSessionActive) return;

      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      if (elapsed >= INACTIVITY_LIMIT_MS) {
        performLogout();
      }
    };

    intervalRef.current = setInterval(checkInactivity, CHECK_INTERVAL_MS);

    const subscription = AppState.addEventListener(
      "change",
      async (nextState: AppStateStatus) => {
        const prevState = appStateRef.current;
        appStateRef.current = nextState;

        if (!isSessionActive) return;

        // When going inactive/background, record the time
        if (nextState === "inactive" || nextState === "background") {
          const now = Date.now();
          lastActivityRef.current = now;
          await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(now)).catch(
            () => {},
          );
          return;
        }

        // When coming back to foreground, compare elapsed time immediately
        if (
          (prevState === "inactive" || prevState === "background") &&
          nextState === "active"
        ) {
          let last = lastActivityRef.current;
          try {
            const stored = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
            const parsed = stored ? parseInt(stored, 10) : NaN;
            if (!isNaN(parsed)) last = parsed;
          } catch {
            // ignore and just use ref
          }

          const now = Date.now();
          const elapsed = now - last;
          if (elapsed >= INACTIVITY_LIMIT_MS) {
            await performLogout();
          } else {
            // still within window – update activity to now
            lastActivityRef.current = now;
            await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(now)).catch(
              () => {},
            );
          }
        }
      },
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      subscription.remove();
    };
  }, [isSessionActive, performLogout]);

  // Handle touch events to reset activity timer
  const handleUserActivity = useCallback(() => {
    if (!isSessionActive || hasLoggedOutRef.current) return;
    const now = Date.now();
    lastActivityRef.current = now;
    // Fire and forget for performance
    AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(now)).catch(() => {});
  }, [isSessionActive]);

  return (
    <IdleTimeoutContext.Provider
      value={{ registerActivity, startIdleSession, stopIdleSession, isSessionActive }}
    >
      {/* Wrap children in a touch detector to capture all user interactions */}
      <TouchableWithoutFeedback onPress={handleUserActivity}>
        <View style={styles.container} onStartShouldSetResponder={() => {
          handleUserActivity();
          return false; // Don't capture the touch, let it pass through
        }}>
          {children}
        </View>
      </TouchableWithoutFeedback>

      {/* Inactivity Logout Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="none"
        onRequestClose={handleModalDismiss}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Animated.View
            style={[styles.modalBox, { transform: [{ scale: scaleAnim }] }]}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.iconText}>⏰</Text>
            </View>
            <Text style={styles.title}>Session Expired</Text>
            <Text style={styles.message}>
              You have been automatically logged out due to inactivity. Please
              log in again to continue.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={handleModalDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </IdleTimeoutContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: WHITE,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(225,88,22,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: THEME_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 999,
    minWidth: 140,
    alignItems: "center",
  },
  buttonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
});

export function useIdleTimeout(): IdleTimeoutContextValue {
  const ctx = useContext(IdleTimeoutContext);
  if (!ctx) {
    throw new Error("useIdleTimeout must be used within IdleTimeoutProvider");
  }
  return ctx;
}

