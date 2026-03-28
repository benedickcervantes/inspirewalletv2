import * as LocalAuthentication from "expo-local-authentication";
import type { LocalAuthenticationResult } from "expo-local-authentication";
import { Platform } from "react-native";

/**
 * Device biometrics used for Inspire Wallet login / settings:
 * - **iOS:** Face ID or Touch ID (LocalAuthentication → same LAContext flow as system Wallet apps).
 * - **Android:** BiometricPrompt (fingerprint / face per OEM).
 *
 * The app always uses the same SecureStore `biometricToken` and `POST /auth/biometric/verify`
 * on both platforms — no separate “Apple ID” API; Apple’s Face ID is only the local gate
 * before that token is sent.
 */
export async function authenticateWithDeviceBiometrics(options: {
  promptMessage: string;
  /** Shown as “Use Passcode” fallback on iOS; Android uses equivalent device credential flow when allowed. */
  fallbackLabel: string;
  /** Custom Cancel label; recommended on iOS so the Face ID / Touch ID sheet matches app language. */
  cancelLabel?: string;
}): Promise<LocalAuthenticationResult> {
  const { promptMessage, fallbackLabel, cancelLabel } = options;

  return LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel,
    // Allow device PIN/password fallback on both platforms (matches prior app behavior).
    disableDeviceFallback: false,
    ...(Platform.OS === "ios" && cancelLabel
      ? { cancelLabel }
      : {}),
  });
}
