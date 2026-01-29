import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";

const { width, height } = Dimensions.get("window");

const AgentTutorial = ({ visible, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const tutorialImages = [
    require("../assets/tutorial/agent/7.png"),
    require("../assets/tutorial/agent/8.png"),
    require("../assets/tutorial/agent/9.png"),
    require("../assets/tutorial/agent/10.png"),
    require("../assets/tutorial/agent/11.png"),
  ];

  const tutorialTitles = [
    "Welcome to InspireWallet",
    "Go to the Register Page",
    "Let us know who you are",
    "Fill up the details needed",
    "Get Started",
  ];

  const tutorialDescriptions = [
    "Learn how to Register as Agent in Inspire Wallet",
    "Click the Register button",
    "Enter your First name and Last name",
    "Click 'Yes I'm an Agent' since you are an Agent and fill up the details needed",
    "You're all set! Click 'Create Account' and Start your Agent journey today",
  ];

  const handleNext = () => {
    if (currentIndex < tutorialImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleSwipe = (direction) => {
    if (direction === 'left' && currentIndex < tutorialImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (direction === 'right' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            {tutorialImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentIndex && styles.activeProgressDot,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Tutorial Image */}
        <View style={styles.imageContainer}>
          <TouchableOpacity
            style={styles.swipeArea}
            onPress={() => handleSwipe('left')}
            activeOpacity={0.9}
          >
            <Image
              source={tutorialImages[currentIndex]}
              style={styles.tutorialImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Navigation Arrows */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.navButton,
              currentIndex === 0 && styles.disabledNavButton,
            ]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={currentIndex === 0 ? "#ccc" : Colors.redTheme.background}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={handleNext}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={Colors.redTheme.background}
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{tutorialTitles[currentIndex]}</Text>
          <Text style={styles.description}>{tutorialDescriptions[currentIndex]}</Text>
        </View>

        {/* Bottom Navigation */}
        <View style={styles.bottomContainer}>
          <View style={styles.pageIndicator}>
            <Text style={styles.pageText}>
              {currentIndex + 1} of {tutorialImages.length}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.nextButton,
              currentIndex === tutorialImages.length - 1 && styles.finishButton,
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === tutorialImages.length - 1 ? "Get Started" : "Next"}
            </Text>
            <Ionicons
              name={currentIndex === tutorialImages.length - 1 ? "checkmark" : "arrow-forward"}
              size={20}
              color="white"
              style={styles.nextButtonIcon}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 20,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 4,
  },
  activeProgressDot: {
    backgroundColor: Colors.redTheme.background,
    width: 24,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  swipeArea: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  tutorialImage: {
    width: width - 40,
    height: height * 0.6,
    borderRadius: 20,
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  disabledNavButton: {
    opacity: 0.3,
  },
  contentContainer: {
    paddingHorizontal: 30,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 24,
  },
  bottomContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 20 : 30,
  },
  pageIndicator: {
    flex: 1,
  },
  pageText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.redTheme.background,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  finishButton: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  nextButtonIcon: {
    marginLeft: 4,
  },
});

export default AgentTutorial; 