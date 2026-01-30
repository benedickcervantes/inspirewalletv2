import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useState, useRef, useMemo } from "react";
import { LogBox, View, PanResponder } from "react-native";
import ErrorBoundary from "../components/ErrorBoundary";
import { enableScreens } from "react-native-screens";
import { enableFreeze } from "react-native-screens";
import AgentFloatingButton from "../components/AgentFloatingButton";
import AgentChatModal from "../components/AgentChatModal";
import { auth, firestore } from "../configs/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import { useInactivityTimer } from "../hooks/useInactivityTimer";
import * as Linking from 'expo-linking';

// Optimize navigation performance
enableScreens();
enableFreeze(true);

// Ignore specific warnings that we can't fix
LogBox.ignoreLogs([
  "AsyncStorage has been extracted from react-native",
  "Constants.platform.ios.model has been deprecated",
]);

export default function Layout() {
  const [isAgent, setIsAgent] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount, markAsRead } = useUnreadMessages();
  const userUnsubscribeRef = useRef(null);
  
  // Initialize inactivity timer - only runs when authenticated
  const { trackActivity } = useInactivityTimer(isAuthenticated);

  // Debug logging
  console.log('🟡 Layout - unreadCount:', unreadCount, 'isAgent:', isAgent, 'userData:', userData?.email);

  // Handle deep linking
  useEffect(() => {
    const handleDeepLink = (event) => {
      const data = Linking.parse(event.url);
      console.log('Deep link received:', data);
      
      if (data.path === 'quicktransfer' && data.queryParams) {
        // Navigate to quick transfer with account number
        router.push({
          pathname: '/quicktransfer',
          params: data.queryParams
        });
      }
    };

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Listen for deep link events while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Clean up previous user listener if it exists
    if (userUnsubscribeRef.current) {
      userUnsubscribeRef.current();
      userUnsubscribeRef.current = null;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      try {
        if (user) {
          setIsAuthenticated(true);
          // Listen to user data changes
          const userRef = doc(firestore, "users", user.uid);
          const unsubscribeUser = onSnapshot(
            userRef,
            (doc) => {
              try {
                if (doc.exists()) {
                  const data = doc.data();
                  setUserData(data);
                  setIsAgent(data.agent === true);
                } else {
                  setIsAgent(false);
                  setUserData(null);
                }
              } catch (error) {
                console.error("Error in user document snapshot:", error);
                setIsAgent(false);
                setUserData(null);
              }
            },
            (error) => {
              console.error("Error listening to user document:", error);
              setIsAgent(false);
              setUserData(null);
            }
          );

          // Store unsubscribe function for cleanup
          userUnsubscribeRef.current = unsubscribeUser;
        } else {
          setIsAuthenticated(false);
          setIsAgent(false);
          setUserData(null);
          if (userUnsubscribeRef.current) {
            userUnsubscribeRef.current();
            userUnsubscribeRef.current = null;
          }
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
        setIsAuthenticated(false);
        setIsAgent(false);
        setUserData(null);
      } finally {
        // Mark auth as initialized after first state change
        setAuthInitialized(true);
      }
    });

    return () => {
      unsubscribe();
      if (userUnsubscribeRef.current) {
        userUnsubscribeRef.current();
        userUnsubscribeRef.current = null;
      }
    };
  }, []);

  // Routes where inactivity timer should NOT run (login, passcode, register, etc.)
  const EXCLUDED_ROUTES = ['/', '/register', '/forgotpassword'];
  const isExcludedRoute = EXCLUDED_ROUTES.includes(pathname);
  const shouldTrackActivity = isAuthenticated && !isExcludedRoute;

  // Track navigation changes as user activity (only on authenticated screens)
  useEffect(() => {
    if (shouldTrackActivity) {
      trackActivity();
    }
  }, [pathname, shouldTrackActivity, trackActivity]);

  // Create PanResponder to track touch events without blocking child components
  // Recreate when isAuthenticated or trackActivity changes
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => {
          // Track activity but don't claim the responder (only on authenticated screens)
          if (shouldTrackActivity) {
            trackActivity();
          }
          return false; // Don't block child components
        },
        onMoveShouldSetPanResponder: () => {
          // Track activity on move as well (only on authenticated screens)
          if (shouldTrackActivity) {
            trackActivity();
          }
          return false; // Don't block child components
        },
      }),
    [shouldTrackActivity, trackActivity]
  );

  const handleChatPress = () => {
    setShowChatModal(true);
    // Mark messages as read when opening chat
    if (unreadCount > 0) {
      markAsRead();
    }
    // Track activity when chat is opened (only on authenticated screens)
    if (shouldTrackActivity) {
      trackActivity();
    }
  };

  const handleCloseChat = () => {
    setShowChatModal(false);
    // Track activity when chat is closed (only on authenticated screens)
    if (shouldTrackActivity) {
      trackActivity();
    }
  };

  // Determine if floating button should be visible
  const shouldShowFloatingButton = () => {
    // Only show on the dashboard (main) page
    return isAgent && pathname === '/main';
  };

  return (
    <ErrorBoundary>
      <View 
        style={{ flex: 1 }}
        {...panResponder.panHandlers}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        />
        
        {/* Agent Floating Button - Only show for agents on appropriate pages */}
        {shouldShowFloatingButton() && (
          <AgentFloatingButton
            onPress={handleChatPress}
            isVisible={shouldShowFloatingButton()}
            unreadCount={unreadCount || 3}
          />
        )}
        
        {/* Agent Chat Modal */}
        <AgentChatModal
          visible={showChatModal}
          onClose={handleCloseChat}
        />
      </View>
    </ErrorBoundary>
  );
}
