import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type PasscodeModalProps = {
  visible: boolean;
  passcode: string;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  loading?: boolean;
  onChangePasscode: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function PasscodeModal({
  visible,
  passcode,
  title,
  confirmLabel,
  cancelLabel,
  loading = false,
  onChangePasscode,
  onConfirm,
  onCancel,
}: PasscodeModalProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible || loading) {
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => clearTimeout(timer);
  }, [visible, loading]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => !loading && onCancel()}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <View style={styles.modalGlow}>
          <View style={styles.passcodeModalContent}>
            <Text style={styles.passcodeModalTitle}>{title}</Text>
            <Text style={styles.passcodeModalSubtitle}>
              Enter your 4-digit security passcode to continue this transaction.
            </Text>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
              onPressIn={() => inputRef.current?.focus()}
              style={styles.pinInputTouchArea}
              disabled={loading}
            >
              <View style={styles.pinRow}>
                {[0, 1, 2, 3].map((index) => (
                  <View
                    key={index}
                    style={[
                      styles.pinDot,
                      passcode.length > index && styles.pinDotFilled,
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.hiddenPasscodeInput}
              value={passcode}
              onChangeText={(value) =>
                onChangePasscode(value.replace(/\D/g, "").slice(0, 4))
              }
              maxLength={4}
              keyboardType="number-pad"
              editable={!loading}
              secureTextEntry
              autoFocus
              showSoftInputOnFocus
              contextMenuHidden
              autoComplete="off"
              caretHidden
              underlineColorAndroid="transparent"
            />
            <Text style={styles.passcodeHint}>
              Your passcode is required for protected wallet actions.
            </Text>
            <View style={styles.passcodeModalButtons}>
              <TouchableOpacity
                style={[
                  styles.passcodeModalButton,
                  styles.passcodeModalButtonCancel,
                ]}
                onPress={onCancel}
                disabled={loading}
              >
                <Text style={styles.passcodeModalButtonCancelText}>
                  {cancelLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.passcodeModalButton,
                  styles.passcodeModalButtonConfirm,
                  (loading || passcode.length !== 4) &&
                    styles.passcodeModalButtonConfirmDisabled,
                ]}
                onPress={onConfirm}
                disabled={loading || passcode.length !== 4}
              >
                <LinearGradient
                  colors={
                    loading || passcode.length !== 4
                      ? ["#F6B287", "#F2A56E"]
                      : ["#E25A17", "#F28934"]
                  }
                  style={styles.passcodeModalButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.passcodeModalButtonConfirmText}>
                      {confirmLabel}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalGlow: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 30,
    padding: 2,
    backgroundColor: "rgba(242, 137, 52, 0.28)",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.26,
    shadowRadius: 28,
    elevation: 18,
  },
  passcodeModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    width: "100%",
  },
  passcodeModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
  },
  passcodeModalSubtitle: {
    marginTop: 10,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
  },
  pinInputTouchArea: {
    paddingVertical: 8,
    marginBottom: 22,
  },
  pinRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#111827",
    backgroundColor: "#FFFFFF",
  },
  pinDotFilled: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  hiddenPasscodeInput: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
  },
  passcodeHint: {
    marginBottom: 20,
    fontSize: 12,
    lineHeight: 18,
    color: "#9CA3AF",
    textAlign: "center",
  },
  passcodeModalButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "stretch",
  },
  passcodeModalButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    overflow: "hidden",
  },
  passcodeModalButtonCancel: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  passcodeModalButtonCancelText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5563",
  },
  passcodeModalButtonConfirm: {},
  passcodeModalButtonConfirmDisabled: {
    opacity: 0.88,
  },
  passcodeModalButtonGradient: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  passcodeModalButtonConfirmText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
