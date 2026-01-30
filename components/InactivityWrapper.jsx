import React, { useRef } from "react";
import { View, PanResponder } from "react-native";

/**
 * Wrapper component that captures all touch events to track user activity
 * This ensures the inactivity timer is reset on any user interaction
 */
export const InactivityWrapper = ({ children, onActivity }) => {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        // Capture touch start events
        onActivity?.();
        return false; // Don't block the touch, just track it
      },
      onMoveShouldSetPanResponder: () => {
        // Capture touch move events
        onActivity?.();
        return false;
      },
      onPanResponderGrant: () => {
        // User started touching
        onActivity?.();
      },
      onPanResponderMove: () => {
        // User is moving finger
        onActivity?.();
      },
      onPanResponderRelease: () => {
        // User released touch
        onActivity?.();
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};
