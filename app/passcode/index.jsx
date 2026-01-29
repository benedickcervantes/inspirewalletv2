import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { Colors } from "../../constants/Colors";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

const { width } = Dimensions.get('window');

const auth = getAuth();
const db = getFirestore();

// PasscodeBoxIndicator Component
const PasscodeBoxIndicator = ({ passcode, error, userLanguage, success }) => {
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [success]);

  return (
    <Animated.View 
      style={[
        styles.passcodeContainer,
        { 
          transform: [
            { translateX: shakeAnimation },
            { scale: scaleAnimation }
          ] 
        }
      ]}
    >
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={[
            styles.passcodeBox,
            passcode.length > index && styles.passcodeBoxFilled,
            error && styles.passcodeBoxError,
            success && styles.passcodeBoxSuccess
          ]}
        >
          {success && passcode.length > index && (
            <Ionicons name="checkmark" size={12} color="white" />
          )}
        </View>
      ))}
    </Animated.View>
  );
};

// StepIndicator Component
const StepIndicator = ({ currentStep, userLanguage }) => {
  const getStepNumber = () => {
    switch (currentStep) {
      case 'enterCurrent': return 1;
      case 'enterNew': return 2;
      case 'confirmNew': return 3;
      default: return 1;
    }
  };

  const stepNumber = getStepNumber();
  
  return (
    <View style={styles.stepIndicatorContainer}>
      <Text style={styles.stepText}>
        Step {stepNumber} of 3
      </Text>
      <View style={styles.stepDots}>
        {[1, 2, 3].map((step) => (
          <View
            key={step}
            style={[
              styles.stepDot,
              step <= stepNumber && styles.stepDotActive
            ]}
          />
        ))}
      </View>
    </View>
  );
};

// AnimatedKeypadButton Component
const AnimatedKeypadButton = ({ value, onPress, userLanguage }) => {
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnimation, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getButtonContent = () => {
    if (value === "Del") {
      return <Ionicons name="backspace-outline" size={24} color={Colors.redTheme.background} />;
    } else if (value === "✓") {
      return <Ionicons name="checkmark" size={24} color={Colors.redTheme.background} />;
    }
    return <Text style={styles.keypadButtonText}>{value}</Text>;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnimation }] }}>
      <TouchableOpacity
        style={[
          styles.keypadButton,
          (value === "✓") && styles.keypadButtonPrimary,
          (value === "Del") && styles.keypadButtonSecondary
        ]}
        onPress={() => onPress(value)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        {getButtonContent()}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function Passcode() {
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState(null);
  const [currentPasscode, setCurrentPasscode] = useState(null);
  const [step, setStep] = useState("check"); // check, enterCurrent, enterNew, confirmNew
  const [modalVisible, setModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [userLanguage, setUserLanguage] = useState('English');
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigation = useNavigation();
  const slideAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, 'passcode.header.title'),
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });

    checkExistingPasscode();
  }, [userLanguage]);

  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserLanguage(data.preferredLanguage || 'English');
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  const checkExistingPasscode = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated.");
      setLoading(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().passcode) {
        setCurrentPasscode(userDoc.data().passcode);
        setStep("enterCurrent");
      } else {
        setStep("enterNew");
      }
    } catch (error) {
      console.error("Error checking passcode:", error);
    } finally {
      setLoading(false);
    }
  };

  const savePasscodeToFirestore = async (newPasscode) => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated.");
      setLoading(false);
      return;
    }

    try {
      await setDoc(
        doc(db, "users", user.uid),
        { passcode: newPasscode },
        { merge: true }
      );
      console.log("Passcode saved successfully");
      
      // Show success animation before modal
      setShowSuccess(true);
      setTimeout(() => {
        setSuccessModalVisible(true);
        setStep("enterCurrent");
        setShowSuccess(false);
      }, 1000);
    } catch (error) {
      console.error("Error saving passcode:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = (value) => {
    if (value === "Del") {
      setPasscode(passcode.slice(0, -1));
      setShowError(false);
    } else if (value === "✓") {
      if (passcode.length !== 4) {
        setErrorMessage(t(userLanguage, 'passcode.content.errors.mustBe4Digits'));
        setShowError(true);
        return;
      }

      if (step === "enterCurrent") {
        if (passcode === currentPasscode) {
          // Slide animation to next step
          Animated.timing(slideAnimation, {
            toValue: -width,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setStep("enterNew");
            setPasscode("");
            slideAnimation.setValue(width);
            Animated.timing(slideAnimation, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start();
          });
        } else {
          setErrorMessage(t(userLanguage, 'passcode.content.errors.incorrectPasscode'));
          setShowError(true);
        }
        setPasscode("");
      } else if (step === "enterNew") {
        setConfirmPasscode(passcode);
        // Slide animation to next step
        Animated.timing(slideAnimation, {
          toValue: -width,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setStep("confirmNew");
          setPasscode("");
          slideAnimation.setValue(width);
          Animated.timing(slideAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        });
      } else if (step === "confirmNew") {
        if (passcode === confirmPasscode) {
          savePasscodeToFirestore(passcode);
        } else {
          setErrorMessage(t(userLanguage, 'passcode.content.errors.passcodesDoNotMatch'));
          setShowError(true);
          setStep("enterNew");
        }
        setPasscode("");
        setConfirmPasscode(null);
      }
    } else if (/^\d$/.test(value) && passcode.length < 4) {
      setPasscode(passcode + value);
      setShowError(false);
    }
  };

  const renderButton = (value) => (
    <AnimatedKeypadButton
      key={value}
      value={value}
      onPress={handlePress}
      userLanguage={userLanguage}
    />
  );

  return (
    <LinearGradient
      colors={['#ffffff', '#f8f9fa']}
      style={styles.container}
    >
      <StepIndicator currentStep={step} userLanguage={userLanguage} />
      
      <Animated.View 
        style={[
          styles.contentContainer,
          { transform: [{ translateX: slideAnimation }] }
        ]}
      >
        <View style={styles.instructionContainer}>
          <Text style={[styles.instructionTitle, getRTLStyles(userLanguage)]}>
            {step === "enterCurrent"
              ? t(userLanguage, 'passcode.content.instructions.enterCurrent')
              : step === "enterNew"
              ? t(userLanguage, 'passcode.content.instructions.enterNew')
              : t(userLanguage, 'passcode.content.instructions.confirmNew')}
          </Text>
          <Text style={[styles.instructionSubtitle, getRTLStyles(userLanguage)]}>
            {t(userLanguage, 'passcode.content.subtitle')}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.redTheme.background} />
        ) : (
          <View style={styles.passcodeSection}>
            <PasscodeBoxIndicator 
              passcode={passcode} 
              error={showError} 
              userLanguage={userLanguage}
              success={showSuccess}
            />
            {showError && (
              <Text style={[styles.errorText, getRTLStyles(userLanguage)]}>
                {errorMessage}
              </Text>
            )}
          </View>
        )}

        <View style={styles.keypad}>
          <View style={styles.keypadRow}>{[1, 2, 3].map(renderButton)}</View>
          <View style={styles.keypadRow}>{[4, 5, 6].map(renderButton)}</View>
          <View style={styles.keypadRow}>{[7, 8, 9].map(renderButton)}</View>
          <View style={styles.keypadRow}>{["Del", 0, "✓"].map(renderButton)}</View>
        </View>
      </Animated.View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalText, getRTLStyles(userLanguage)]}>{errorMessage}</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>{t(userLanguage, 'passcode.content.buttons.ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, 'passcode.content.success.passcodeChanged')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSuccessModalVisible(false);
                router.push("/settings");
              }}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>{t(userLanguage, 'passcode.content.buttons.ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepIndicatorContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 20,
  },
  stepText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  stepDots: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ddd",
    marginHorizontal: 4,
  },
  stepDotActive: {
    backgroundColor: Colors.redTheme.background,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  instructionContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  instructionSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  passcodeSection: {
    alignItems: "center",
    marginBottom: 50,
  },
  passcodeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  passcodeBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 4,
    marginHorizontal: 8,
    backgroundColor: "transparent",
  },
  passcodeBoxFilled: {
    backgroundColor: Colors.redTheme.background,
    borderColor: Colors.redTheme.background,
  },
  passcodeBoxError: {
    borderColor: "#ff4444",
  },
  passcodeBoxSuccess: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  errorText: {
    color: "#ff4444",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  keypad: {
    alignItems: "center",
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  keypadButton: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 12,
    backgroundColor: Colors.redTheme.background,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  keypadButtonPrimary: {
    backgroundColor: "white",
    borderColor: "white",
  },
  keypadButtonSecondary: {
    backgroundColor: "white",
    borderColor: "#e0e0e0",
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: "600",
    color: "white",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 30,
    paddingBottom: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
    lineHeight: 24,
  },
  modalButton: {
    width: "100%",
    backgroundColor: Colors.redTheme.background,
    paddingVertical: 15,
    borderRadius: 12,
    shadowColor: Colors.redTheme.background,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
