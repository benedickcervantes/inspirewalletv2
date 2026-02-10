import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
  PanResponder,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../configs/firebase';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AgentFloatingButton = ({ onPress, isVisible = true }) => {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useUnreadMessages();
  const [user, setUser] = useState(null);

  // Debug logging
  console.log('🟢 AgentFloatingButton - unreadCount:', unreadCount, 'isVisible:', isVisible);
  
  // Enable LayoutAnimation on Android
  if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
  }
  const [scaleAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [dragScaleAnim] = useState(new Animated.Value(1));
  const [badgeAnim] = useState(new Animated.Value(0));
  
  // Calculate initial position accounting for safe area
  const initialX = screenWidth - 76;
  const initialY = screenHeight - insets.bottom - 80; // 80px from bottom safe area
  
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const lastPosition = useRef({ x: initialX, y: initialY });
  

  // Load saved position on component mount
  useEffect(() => {
    loadSavedPosition();
  }, []);

  // Listen to authentication state changes
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      console.log('🟢 AgentFloatingButton - Auth state changed, user:', currentUser?.uid);
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  const loadSavedPosition = async () => {
    try {
      const savedPosition = await AsyncStorage.getItem('agentFloatingButtonPosition');
      if (savedPosition) {
        const { x, y } = JSON.parse(savedPosition);
        setPosition({ x, y });
        lastPosition.current = { x, y };
        pan.setValue({ x: 0, y: 0 });
      }
    } catch (error) {
      console.error('Error loading saved position:', error);
    }
  };

  const savePosition = async (x, y) => {
    try {
      await AsyncStorage.setItem('agentFloatingButtonPosition', JSON.stringify({ x, y }));
    } catch (error) {
      console.error('Error saving position:', error);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only set responder if there's significant movement (more than 5 pixels)
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 5 || Math.abs(dy) > 5;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);

        // Animate scale up for dragging
        Animated.spring(dragScaleAnim, {
          toValue: 1.1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();

        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();

        // Check if this was a tap (minimal movement) or a drag
        const { dx, dy } = gestureState;
        const wasTap = Math.abs(dx) < 5 && Math.abs(dy) < 5;

        if (wasTap) {
          // This was a tap, not a drag - reset immediately
          setIsDragging(false);
          Animated.spring(dragScaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }).start();
          return;
        }

        // Calculate new position
        const newX = lastPosition.current.x + pan.x._value;
        const newY = lastPosition.current.y + pan.y._value;

        // Constrain Y position first
        const constrainedY = Math.max(insets.top + 20, Math.min(screenHeight - insets.bottom - 80, newY));

        // Auto-snap X position to sides if in middle third of screen
        let finalX;
        const screenMiddle = screenWidth / 2;
        const buttonCenter = newX + 28; // 28 is half of button width (56/2)
        const middleThirdStart = screenWidth * 0.33;
        const middleThirdEnd = screenWidth * 0.67;

        // Check if button center is in the middle third of the screen
        if (buttonCenter >= middleThirdStart && buttonCenter <= middleThirdEnd) {
          // Auto-snap to the nearest side
          if (buttonCenter < screenMiddle) {
            // Snap to left side
            finalX = 20;
          } else {
            // Snap to right side
            finalX = screenWidth - 76;
          }
        } else {
          // Keep current position but constrain to screen bounds
          finalX = Math.max(0, Math.min(screenWidth - 56, newX));
        }

        // Check if snapping should occur
        const didSnap = (buttonCenter >= middleThirdStart && buttonCenter <= middleThirdEnd);
        
        if (didSnap) {
          // Configure layout animation for smooth snapping
          LayoutAnimation.configureNext({
            duration: 300,
            create: { type: 'linear', property: 'opacity' },
            update: { type: 'spring', springDamping: 0.7 },
            delete: { type: 'linear', property: 'opacity' },
          });
          
          // Update position with animation
          setPosition({ x: finalX, y: constrainedY });
          lastPosition.current = { x: finalX, y: constrainedY };
          pan.setValue({ x: 0, y: 0 });
          savePosition(finalX, constrainedY);
        } else {
          // Update position immediately for normal movement
          setPosition({ x: finalX, y: constrainedY });
          lastPosition.current = { x: finalX, y: constrainedY };
          pan.setValue({ x: 0, y: 0 });
          savePosition(finalX, constrainedY);
        }

        // Animate scale back to normal
        Animated.spring(dragScaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();

        setIsDragging(false);
      },
    })
  ).current;

  const handlePress = () => {
    console.log('🟢 AgentFloatingButton - handlePress called, isDragging:', isDragging);
    if (!isDragging) {
      console.log('🟢 AgentFloatingButton - Calling onPress callback');
      onPress();
    } else {
      console.log('🟡 AgentFloatingButton - Press ignored (dragging)');
    }
  };

  useEffect(() => {
    if (isVisible) {
      // Scale in animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    } else {
      // Scale out animation
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  // Badge animation effect
  useEffect(() => {
    if (unreadCount > 0) {
      // Animate badge in with bounce
      Animated.spring(badgeAnim, {
        toValue: 1,
        tension: 120,
        friction: 6,
        useNativeDriver: true,
      }).start();
    } else {
      // Animate badge out
      Animated.timing(badgeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [unreadCount]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: position.x,
          top: position.y,
          transform: [
            { scale: scaleAnim },
            { scale: pulseAnim },
            { scale: dragScaleAnim },
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={[
          styles.button,
          isDragging && styles.buttonDragging
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="chatbubble-ellipses"
          size={24}
          color="white"
        />

        {/* Notification Badge */}
        {unreadCount > 0 && (
          <Animated.View
            style={[
              styles.badge,
              {
                transform: [{ scale: badgeAnim }],
              },
            ]}
          >
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
    elevation: Platform.OS === 'android' ? 8 : 0,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.redTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.redTheme.background,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  buttonDragging: {
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});

export default AgentFloatingButton;
