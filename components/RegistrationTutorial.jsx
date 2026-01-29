import React, { useEffect, useRef, useState } from "react";
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
import { Colors } from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

const RegistrationTutorial = ({
  visible,
  onClose,
  onPlayTutorial,
  onSkipTutorial,
}) => {
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  
  // Animation values for the first modal (Welcome modal)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;
  
  // Animation values for the second modal (User Type Selection modal)
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const scaleAnim2 = useRef(new Animated.Value(0.7)).current;
  const iconScaleAnim2 = useRef(new Animated.Value(0)).current;

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
  }, [visible, fadeAnim, scaleAnim, iconScaleAnim]);

  // Animation for the second modal (User Type Selection)
  useEffect(() => {
    if (showUserTypeModal) {
      Animated.parallel([
        Animated.timing(fadeAnim2, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim2, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Delay icon animation for a nice effect
      setTimeout(() => {
        Animated.spring(iconScaleAnim2, {
          toValue: 1,
          tension: 150,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }, 100);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim2, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim2, {
          toValue: 0.7,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(iconScaleAnim2, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showUserTypeModal, fadeAnim2, scaleAnim2, iconScaleAnim2]);

  // Cleanup effect to reset modal state
  useEffect(() => {
    if (!visible) {
      // Reset the user type modal when the main modal is closed
      setShowUserTypeModal(false);
    }
  }, [visible]);

  const handlePlayTutorial = () => {
    console.log("Play Tutorial button pressed");
    // Just show the user type modal without closing the main modal
    setShowUserTypeModal(true);
  };

  const handleSkipTutorial = () => {
    onClose();
    if (onSkipTutorial) {
      onSkipTutorial();
    }
  };

  const handleInvestorTutorial = () => {
    if (onPlayTutorial) {
      onPlayTutorial('investor');
    }
    setShowUserTypeModal(false);
    onClose();
  };

  const handleAgentTutorial = () => {
    if (onPlayTutorial) {
      onPlayTutorial('agent');
    }
    setShowUserTypeModal(false);
    onClose();
  };

  if (!visible && !showUserTypeModal) return null;

  return (
    <>
      {/* First Modal - Welcome Modal */}
      {visible && (
        <Modal transparent={true} animationType="none" visible={visible}>
          <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
            {Platform.OS === "ios" ? (
              <BlurView intensity={20} tint="dark" style={styles.blurContainer} pointerEvents="box-none">
                <Animated.View
                  style={[
                    styles.modalContainer,
                    { transform: [{ scale: scaleAnim }] },
                  ]}
                >
                  <View style={[styles.iconContainer, { backgroundColor: "#EFF6FF" }]}>
                    <Animated.Text
                      style={[
                        styles.iconText,
                        { color: "#3B82F6", transform: [{ scale: iconScaleAnim }] },
                      ]}
                    >
                      🎓
                    </Animated.Text>
                  </View>

                  <Text style={styles.modalTitle}>Welcome to InspireWallet!</Text>
                  <Text style={styles.modalMessage}>
                    Would you like to take a quick tutorial to learn about How to Register in Inspire Wallet?
                  </Text>

                  <View style={styles.buttonContainer} pointerEvents="box-none">
                    <View pointerEvents="auto" style={{ width: '100%', zIndex: 9999 }}>
                      <TouchableOpacity
                        style={[
                          styles.modalButton, 
                          { backgroundColor: "#fe7d48", zIndex: 9999, elevation: 9999 }
                        ]}
                        onPress={handlePlayTutorial}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        pointerEvents="auto"
                      >
                        <Text style={styles.confirmButtonText}>Play Tutorial</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={handleSkipTutorial}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.cancelButtonText}>Skip Tutorial</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </BlurView>
            ) : (
              <View style={styles.androidModalOverlay}>
                <Animated.View
                  style={[
                    styles.modalContainer,
                    { transform: [{ scale: scaleAnim }] },
                  ]}
                >
                  <View style={[styles.iconContainer, { backgroundColor: "#EFF6FF" }]}>
                    <Animated.Text
                      style={[
                        styles.iconText,
                        { color: "#3B82F6", transform: [{ scale: iconScaleAnim }] },
                      ]}
                    >
                      🎓
                    </Animated.Text>
                  </View>

                  <Text style={styles.modalTitle}>Welcome to InspireWallet!</Text>
                  <Text style={styles.modalMessage}>
                    Would you like to take a quick tutorial to learn about How to Register in Inspire Wallet?
                  </Text>

                  <View style={styles.buttonContainer} pointerEvents="box-none">
                    <View pointerEvents="auto" style={{ width: '100%', zIndex: 9999 }}>
                      <TouchableOpacity
                        style={[
                          styles.modalButton, 
                          { backgroundColor: "#fe7d48", zIndex: 9999, elevation: 9999 }
                        ]}
                        onPress={handlePlayTutorial}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        pointerEvents="auto"
                      >
                        <Text style={styles.confirmButtonText}>Play Tutorial</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={handleSkipTutorial}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.cancelButtonText}>Skip Tutorial</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </View>
            )}
          </Animated.View>
        </Modal>
      )}

      {/* User Type Selection Modal */}
      {showUserTypeModal && (
        <Modal transparent={true} animationType="none" visible={showUserTypeModal}>
          <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim2 }]}>
            {Platform.OS === "ios" ? (
              <BlurView intensity={20} tint="dark" style={styles.blurContainer} pointerEvents="box-none">
                <Animated.View
                  style={[
                    styles.modalContainer,
                    { transform: [{ scale: scaleAnim2 }] },
                  ]}
                >
                  <View style={[styles.iconContainer, { backgroundColor: "rgba(254, 125, 72, 0.1)" }]}>
                    <Animated.Text
                      style={[
                        styles.iconText,
                        { color: Colors.redTheme.background, transform: [{ scale: iconScaleAnim2 }] },
                      ]}
                    >
                      👥
                    </Animated.Text>
                  </View>

                  <Text style={styles.modalTitle}>Choose Your Role</Text>
                  <Text style={styles.modalMessage}>
                    Are you an investor looking to grow your wealth, or an agent helping others invest?
                  </Text>

                  <View style={styles.buttonContainer} pointerEvents="box-none">
                    <TouchableOpacity
                      style={[styles.modalButton, styles.investorButton]}
                      onPress={handleInvestorTutorial}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={styles.buttonContent}>
                        <View style={styles.buttonIconContainer}>
                          <Text style={styles.buttonIcon}>📈</Text>
                        </View>
                        <View style={styles.buttonTextContainer}>
                          <Text style={styles.buttonTitle}>I'm an Investor</Text>
                          <Text style={styles.buttonSubtitle}>Grow my wealth</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="white" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.agentButton]}
                      onPress={handleAgentTutorial}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={styles.buttonContent}>
                        <View style={styles.buttonIconContainer}>
                          <Text style={styles.buttonIcon}>💼</Text>
                        </View>
                        <View style={styles.buttonTextContainer}>
                          <Text style={styles.buttonTitle}>I'm an Agent</Text>
                          <Text style={styles.buttonSubtitle}>Help others invest</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="white" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setShowUserTypeModal(false);
                        onClose();
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </BlurView>
            ) : (
              <View style={styles.androidModalOverlay}>
                <Animated.View
                  style={[
                    styles.modalContainer,
                    { transform: [{ scale: scaleAnim2 }] },
                  ]}
                >
                  <View style={[styles.iconContainer, { backgroundColor: "rgba(204, 33, 53, 0.1)" }]}>
                    <Animated.Text
                      style={[
                        styles.iconText,
                        { color: Colors.redTheme.background, transform: [{ scale: iconScaleAnim2 }] },
                      ]}
                    >
                      👥
                    </Animated.Text>
                  </View>

                  <Text style={styles.modalTitle}>Choose Your Role</Text>
                  <Text style={styles.modalMessage}>
                    Are you an investor looking to grow your wealth, or an agent helping others invest?
                  </Text>

                  <View style={styles.buttonContainer} pointerEvents="box-none">
                    <TouchableOpacity
                      style={[styles.modalButton, styles.investorButton]}
                      onPress={handleInvestorTutorial}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={styles.buttonContent}>
                        <View style={styles.buttonIconContainer}>
                          <Text style={styles.buttonIcon}>📈</Text>
                        </View>
                        <View style={styles.buttonTextContainer}>
                          <Text style={styles.buttonTitle}>I'm an Investor</Text>
                          <Text style={styles.buttonSubtitle}>Grow my wealth</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="white" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.agentButton]}
                      onPress={handleAgentTutorial}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={styles.buttonContent}>
                        <View style={styles.buttonIconContainer}>
                          <Text style={styles.buttonIcon}>💼</Text>
                        </View>
                        <View style={styles.buttonTextContainer}>
                          <Text style={styles.buttonTitle}>I'm an Agent</Text>
                          <Text style={styles.buttonSubtitle}>Help others invest</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="white" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setShowUserTypeModal(false);
                        onClose();
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </View>
            )}
          </Animated.View>
        </Modal>
      )}
    </>
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
    zIndex: 1000,
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
    zIndex: 1001,
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
  // New improved button styles
  investorButton: {
    backgroundColor: "#10B981",
    borderWidth: 0,
    marginBottom: 12,
  },
  agentButton: {
    backgroundColor: Colors.redTheme.background,
    borderWidth: 0,
    marginBottom: 12,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  buttonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  buttonIcon: {
    fontSize: 20,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  buttonSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default RegistrationTutorial;
