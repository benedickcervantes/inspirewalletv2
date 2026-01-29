import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../constants/Colors";
import carouselData from "../assets/data/New.json";
import { auth, firestore } from "../configs/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";

const { width, height } = Dimensions.get("window");

// Calculate responsive dimensions
const getResponsiveDimensions = () => {
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  
  // Base dimensions that work well on both platforms
  const baseItemWidth = Math.min(320, screenWidth * 0.85);
  const baseItemHeight = Math.min(280, screenHeight * 0.35);
  const baseImageHeight = Math.min(190, baseItemHeight * 0.68);
  const baseContentHeight = baseItemHeight - baseImageHeight;
  
  // Platform-specific adjustments
  const platformMultiplier = Platform.OS === 'android' ? 0.95 : 1;
  
  return {
    itemWidth: baseItemWidth * platformMultiplier,
    itemHeight: baseItemHeight * platformMultiplier,
    imageHeight: baseImageHeight * platformMultiplier,
    contentHeight: baseContentHeight * platformMultiplier,
    margin: screenWidth * 0.025,
    containerHeight: Math.min(360, screenHeight * 0.45),
  };
};

const carouselImages = {
  new1: require("../assets/images/new1.png"),
  new2: require("../assets/images/new2.png"),
  new3: require("../assets/images/new3.png"),
  new4: require("../assets/images/new4.png"),
};

const NewSectionCarousel = ({ topPosition }) => {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [userLanguage, setUserLanguage] = useState("english");
  const scrollViewRef = useRef(null);
  const intervalRef = useRef(null);

  // Function to fetch user language
  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserLanguage(userData.preferredLanguage || "english");
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
      setUserLanguage("english");
    }
  };

  const dimensions = getResponsiveDimensions();
  const itemWidth = dimensions.itemWidth + dimensions.margin * 2;

  const scrollToIndex = (index, animated = true) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: index * itemWidth,
        animated: animated,
      });
    }
  };

  const startAutoSlide = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (!isPaused && carouselData.items.length > 1) {
        const nextIndex = (currentIndex + 1) % carouselData.items.length;
        setCurrentIndex(nextIndex);
        scrollToIndex(nextIndex);
      }
    }, 5000); // Auto-slide every 5 seconds
  };

  useEffect(() => {
    startAutoSlide();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentIndex, isPaused]);

  // Fetch user language on component mount and listen for real-time changes
  useEffect(() => {
    fetchUserLanguage();
    
    // Set up real-time listener for language changes
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(firestore, "users", user.uid);
      const unsubscribeLanguage = onSnapshot(userRef, (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const newLanguage = userData.preferredLanguage || "english";
          setUserLanguage(prevLanguage => {
            // Only update if the language actually changed
            if (prevLanguage !== newLanguage) {
              console.log(`NewSectionCarousel: Language changed from ${prevLanguage} to ${newLanguage}`);
              return newLanguage;
            }
            return prevLanguage;
          });
        }
      });

      return () => unsubscribeLanguage();
    }
  }, []);

  const handleScroll = (event) => {
    const newIndex = Math.round(
      event.nativeEvent.contentOffset.x / itemWidth
    );
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  const handleTouchStart = () => {
    setIsPaused(true);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
  };

  const handleIndicatorPress = (index) => {
    setCurrentIndex(index);
    scrollToIndex(index);
  };

  return (
    <View style={[styles.carouselContainer, { top: topPosition, height: dimensions.containerHeight }]}>
      <Text style={[styles.whatsNewTitle, getRTLStyles(userLanguage)]}>
        {t(userLanguage, "newSectionCarousel.whatsNewTitle")}
      </Text>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(
            event.nativeEvent.contentOffset.x / itemWidth
          );
          setCurrentIndex(newIndex);
        }}
        style={styles.carouselScrollView}
        contentContainerStyle={styles.scrollContentContainer}
        decelerationRate="fast"
        snapToInterval={itemWidth}
        snapToAlignment="center"
      >
        {carouselData.items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.carouselItem,
              {
                width: dimensions.itemWidth,
                height: dimensions.itemHeight,
                marginHorizontal: dimensions.margin,
              }
            ]}
            onPress={() => router.push(item.explore)}
            onPressIn={handleTouchStart}
            onPressOut={handleTouchEnd}
            activeOpacity={0.9}
          >
            <View style={[
              styles.imageContainer,
              {
                width: dimensions.itemWidth,
                height: dimensions.imageHeight,
              }
            ]}>
              <ImageBackground
                source={carouselImages[item.image]}
                style={[
                  styles.carouselImage,
                  {
                    width: dimensions.itemWidth,
                    height: dimensions.imageHeight,
                  }
                ]}
                resizeMode="cover"
                imageStyle={styles.imageStyle}
              />
            </View>
            <View style={[
              styles.contentContainer,
              {
                width: dimensions.itemWidth,
                height: dimensions.contentHeight,
              }
            ]}>
              <Text style={styles.carouselTitle}>{item.title}</Text>
              <View style={styles.exploreButton}>
                <Text style={[styles.exploreButtonText, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "newSectionCarousel.exploreButton")}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Carousel Indicators */}
      <View style={styles.carouselIndicators}>
        {carouselData.items.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.activeIndicator,
            ]}
            onPress={() => handleIndicatorPress(index)}
            activeOpacity={0.7}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    position: "relative",
    left: 0,
    right: 0,
    alignItems: "center",
    margin: 0,
    padding: 0,
  },
  whatsNewTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.redTheme.background,
    marginBottom: 20,
    alignSelf: "flex-start",
    marginLeft: 20,
    letterSpacing: 0.5,
  },
  carouselScrollView: {
    flex: 1,
    margin: 0,
    padding: 0,
  },
  scrollContentContainer: {
    paddingHorizontal: 10,
  },
  carouselItem: {
    backgroundColor: "white",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    overflow: "hidden",
  },
  imageContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    margin: 0,
    padding: 0,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  carouselImage: {
    margin: 0,
    padding: 0,
    transform: [{ scale: 1.08 }],
  },
  imageStyle: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    margin: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
    letterSpacing: 0.4,
  },
  exploreButton: {
    backgroundColor: Colors.redTheme.background,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: Colors.redTheme.background,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  exploreButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  carouselIndicators: {
    position: "absolute",
    bottom: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e0e0e0",
    opacity: 0.7,
  },
  activeIndicator: {
    opacity: 1,
    backgroundColor: Colors.redTheme.background,
    transform: [{ scale: 1.3 }],
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default NewSectionCarousel;
