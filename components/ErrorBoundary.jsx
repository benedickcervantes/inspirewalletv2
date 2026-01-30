import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Colors } from "../constants/Colors";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../configs/firebase";
import { signOut } from "firebase/auth";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isRecovering: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to your error reporting service
    console.error("Error caught by boundary:", error, errorInfo);
    console.error("Error stack:", error?.stack);
    console.error("Error info:", errorInfo);
  }

  handleRestart = async () => {
    try {
      this.setState({ isRecovering: true });

      // Check if error is auth-related
      const errorMessage = this.state.error?.message || "";
      const isAuthError =
        errorMessage.includes("auth") ||
        errorMessage.includes("permission-denied") ||
        errorMessage.includes("unauthenticated") ||
        errorMessage.includes("FirebaseError");

      if (isAuthError) {
        // For auth errors, try to sign out and clear storage
        try {
          if (auth.currentUser) {
            await signOut(auth);
          }
          // Clear stored credentials
          await AsyncStorage.multiRemove([
            "userEmail",
            "userPassword",
            "passcodeLoginComplete",
          ]);
        } catch (signOutError) {
          console.error("Error during sign out:", signOutError);
        }
      }

      // Reset error state and force re-render
      this.setState({ hasError: false, error: null, isRecovering: false });

      // Force app to reload by navigating to root
      if (this.props.router) {
        this.props.router.replace("/");
      }
    } catch (recoveryError) {
      console.error("Error during recovery:", recoveryError);
      this.setState({ isRecovering: false });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong.</Text>
          <Text style={styles.message}>
            We're sorry for the inconvenience. Please try again.
          </Text>
          {this.state.isRecovering ? (
            <View style={styles.recoveringContainer}>
              <ActivityIndicator
                size="large"
                color={Colors.redTheme.background}
              />
              <Text style={styles.recoveringText}>Recovering...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.button}
              onPress={this.handleRestart}
              disabled={this.state.isRecovering}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: Colors.redTheme.background,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  button: {
    backgroundColor: Colors.redTheme.background,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  recoveringContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  recoveringText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
});

// Wrap ErrorBoundary to provide router access
const ErrorBoundaryWithRouter = (props) => {
  const router = useRouter();
  return <ErrorBoundary {...props} router={router} />;
};

export default ErrorBoundaryWithRouter;
