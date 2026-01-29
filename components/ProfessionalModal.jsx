import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Animated,
} from "react-native";
import { BlurView } from "expo-blur";

const ProfessionalModal = ({
  visible,
  onClose,
  title,
  message,
  type = "info", // 'success', 'error', 'warning', 'info'
  showCloseButton = true,
  onConfirm = null,
  confirmText = "OK",
  showCancelButton = false,
  cancelText = "Cancel",
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Delay icon animation for a nice effect
      setTimeout(() => {
        Animated.spring(iconScaleAnim, {
          toValue: 1,
          tension: 150,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }, 100);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.7,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(iconScaleAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getIconAndColor = () => {
    switch (type) {
      case "success":
        return { icon: "✓", color: "#10B981", bgColor: "#ECFDF5" };
      case "error":
        return { icon: "!", color: "#EF4444", bgColor: "#FEF2F2" };
      case "warning":
        return { icon: "!", color: "#F59E0B", bgColor: "#FFFBEB" };
      default:
        return { icon: "i", color: "#3B82F6", bgColor: "#EFF6FF" };
    }
  };

  const { icon, color, bgColor } = getIconAndColor();

  if (!visible) return null;

  return (
    <Modal 
      transparent={true} 
      animationType="none" 
      visible={visible}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <View style={styles.overlayView} />
        </TouchableOpacity>
        {Platform.OS === "ios" ? (
          <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}} // Prevent closing when tapping inside modal
            >
              <Animated.View
                style={[
                  styles.modalContainer,
                  { transform: [{ scale: scaleAnim }] },
                ]}
              >
                <View
                  style={[styles.iconContainer, { backgroundColor: bgColor }]}
                >
                  <Animated.Text
                    style={[
                      styles.iconText,
                      { color, transform: [{ scale: iconScaleAnim }] },
                    ]}
                  >
                    {icon}
                  </Animated.Text>
                </View>

                <Text style={styles.modalTitle}>{title}</Text>
                <Text style={styles.modalMessage}>{message}</Text>

                <View style={styles.buttonContainer}>
                  {showCloseButton && (
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: color }]}
                      onPress={() => {
                        if (onConfirm) {
                          onConfirm();
                          onClose();
                        } else {
                          onClose();
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.confirmButtonText}>{confirmText}</Text>
                    </TouchableOpacity>
                  )}

                  {showCancelButton && (
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={onClose}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelButtonText}>{cancelText}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            </TouchableOpacity>
          </BlurView>
        ) : (
          <View style={styles.androidModalOverlay}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}} // Prevent closing when tapping inside modal
            >
              <Animated.View
                style={[
                  styles.modalContainer,
                  { transform: [{ scale: scaleAnim }] },
                ]}
              >
                <View
                  style={[styles.iconContainer, { backgroundColor: bgColor }]}
                >
                  <Animated.Text
                    style={[
                      styles.iconText,
                      { color, transform: [{ scale: iconScaleAnim }] },
                    ]}
                  >
                    {icon}
                  </Animated.Text>
                </View>

                <Text style={styles.modalTitle}>{title}</Text>
                <Text style={styles.modalMessage}>{message}</Text>

                <View style={styles.buttonContainer}>
                  {showCloseButton && (
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: color }]}
                      onPress={() => {
                        if (onConfirm) {
                          onConfirm();
                          onClose();
                        } else {
                          onClose();
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.confirmButtonText}>{confirmText}</Text>
                    </TouchableOpacity>
                  )}

                  {showCancelButton && (
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={onClose}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelButtonText}>{cancelText}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  overlayTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayView: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  androidModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 320,
    width: "90%",
    maxWidth: 360,
    minHeight: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 35,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    overflow: "hidden",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  iconText: {
    fontSize: 32,
    fontWeight: "800",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: -0.2,
    paddingHorizontal: 4,
  },
  modalMessage: {
    fontSize: 17,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 36,
    paddingHorizontal: 12,
    fontWeight: "400",
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  modalButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    minHeight: 56,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    marginTop: 12,
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});

export default ProfessionalModal;
