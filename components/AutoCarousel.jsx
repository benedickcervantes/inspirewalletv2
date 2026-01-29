import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  PanGestureHandler,
  State,
} from "react-native";
import { useRouter } from "expo-router";

const images = [
  { src: require("../assets/images/independence.png"), route: null },
  { src: require("../assets/images/mayaads.png"), route: "/maya" },
  { src: require("../assets/images/securitybank.png"), route: "/bdo" },
  { src: require("../assets/images/unionbank.png"), route: "/bdo" },
  { src: require("../assets/images/ctbc.png"), route: "/bdo" },
];

const AutoCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get("window").width;
  const router = useRouter();
  const intervalRef = useRef(null);

  // Add a duplicate of the first image to the end for seamless looping
  const extendedImages = [...images, images[0]];

  const startAutoSlide = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (!isPaused) {
        const nextIndex = currentIndex + 1;

        Animated.timing(translateX, {
          toValue: -nextIndex * (screenWidth - 30),
          duration: 800,
          useNativeDriver: true,
        }).start(() => {
          // Reset position when reaching the duplicated image
          if (nextIndex === extendedImages.length - 1) {
            translateX.setValue(0); // Instantly reset position
            setCurrentIndex(0); // Reset index to the original first image
          } else {
            setCurrentIndex(nextIndex);
          }
        });
      }
    }, 4000); // Scroll every 4 seconds
  };

  useEffect(() => {
    startAutoSlide();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentIndex, isPaused]);

  const handlePress = (route) => {
    if (route) {
      router.push(route);
    } else {
      // console.log("Route not defined");
    }
  };

  const handleTouchStart = () => {
    setIsPaused(true);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
  };

  const handleSwipe = (direction) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    let nextIndex;
    if (direction === "left") {
      nextIndex = Math.min(currentIndex + 1, extendedImages.length - 1);
    } else {
      nextIndex = Math.max(currentIndex - 1, 0);
    }

    Animated.timing(translateX, {
      toValue: -nextIndex * (screenWidth - 30),
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (nextIndex === extendedImages.length - 1) {
        translateX.setValue(0);
        setCurrentIndex(0);
      } else {
        setCurrentIndex(nextIndex);
      }
      startAutoSlide();
    });
  };

  return (
    <View style={styles.carouselContainer}>
      <Animated.View
        style={[
          styles.carouselImages,
          {
            width: extendedImages.length * (screenWidth - 30),
            transform: [{ translateX }],
          },
        ]}
      >
        {extendedImages.map((image, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handlePress(image.route)}
            onPressIn={handleTouchStart}
            onPressOut={handleTouchEnd}
            activeOpacity={0.8}
            style={styles.imageContainer}
          >
            <Image source={image.src} style={styles.carouselImage} />
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Swipe indicators */}
      <View style={styles.swipeContainer}>
        <TouchableOpacity
          style={styles.swipeButton}
          onPress={() => handleSwipe("right")}
        />
        <TouchableOpacity
          style={styles.swipeButton}
          onPress={() => handleSwipe("left")}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    width: Dimensions.get("window").width,
    height: 120,
    overflow: "hidden",
    justifyContent: "center",
    padding: 0,
    position: "relative",
  },
  carouselImages: {
    flexDirection: "row",
    justifyContent: "flex-start",
    padding: 0,
    gap: 3,
  },
  imageContainer: {
    flex: 1,
  },
  carouselImage: {
    width: Dimensions.get("window").width - 30,
    height: 150,
    resizeMode: "contain",
  },
  swipeContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    pointerEvents: "box-none",
  },
  swipeButton: {
    width: 50,
    height: "100%",
    backgroundColor: "transparent",
  },
});

export default AutoCarousel;
