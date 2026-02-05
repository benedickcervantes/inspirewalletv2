import { useRouter } from "expo-router";
import {
  StyleSheet,
  Image,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";

const { width, height } = Dimensions.get("window");

export default function Welcome() {
  const router = useRouter();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <LinearGradient
        colors={["#E15816", "#F48F38"]}
        locations={[0, 1]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Logo Container */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/images/applogo2.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Buttons Container */}
          <View style={styles.buttonsContainer}>
            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push("/login")}
              activeOpacity={0.8}
            >
              <Text style={styles.loginText}>Login</Text>
            </TouchableOpacity>

            {/* Register Section */}
            <View style={styles.registerSection}>
              <TouchableOpacity
                style={styles.registerButton}
                onPress={() => router.push("/register")}
                activeOpacity={0.8}
              >
                <Text style={styles.registerText}>Register</Text>
              </TouchableOpacity>
              <Text style={styles.notMemberText}>Not yet a member?</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>CREATED BY INSPIRE</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
  },
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  logo: {
    width: width * 0.6,
    height: width * 0.6,
    maxWidth: 300,
    maxHeight: 300,
  },
  buttonsContainer: {
    width: "100%",
    paddingHorizontal: 40,
    gap: 16,
    marginBottom: 60,
  },
  loginButton: {
    width: "100%",
    paddingVertical: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  loginText: {
    color: "#E15816",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  registerSection: {
    width: "100%",
    marginTop: 8,
  },
  registerButton: {
    width: "100%",
    paddingVertical: 18,
    backgroundColor: "transparent",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
    marginBottom: 12,
  },
  registerText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  notMemberText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    textDecorationLine: "underline",
  },
  footer: {
    paddingBottom: 20,
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 1,
  },
});
