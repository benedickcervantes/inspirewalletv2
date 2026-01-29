import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { LogBox, View } from "react-native";
import ErrorBoundary from "../components/ErrorBoundary";
import { enableScreens } from "react-native-screens";
import AgentFloatingButton from "../components/AgentFloatingButton";
import AgentChatModal from "../components/AgentChatModal";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import * as Linking from 'expo-linking';

// Optimize navigation performance - call once at module level with error handling
try {
  enableScreens(true);
} catch (e) {
  // Already enabled or not supported, ignore
}

// Ignore specific warnings that we can't fix
LogBox.ignoreLogs([
  "AsyncStorage has been extracted from react-native",
  "Constants.platform.ios.model has been deprecated",
]);

export default function Layout() {
  const [isAgent, setIsAgent] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount, markAsRead } = useUnreadMessages();

  // Use MongoDB authentication
  const { user, loading } = useMobileAuth();

  // Debug logging
  console.log('🟡 Layout - unreadCount:', unreadCount, 'isAgent:', isAgent, 'user:', user?.email);

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

  // Update agent status when user changes
  useEffect(() => {
    if (user) {
      setIsAgent(user.agent === true);
    } else {
      setIsAgent(false);
    }
  }, [user]);


  const handleChatPress = () => {
    setShowChatModal(true);
    // Mark messages as read when opening chat
    if (unreadCount > 0) {
      markAsRead();
    }
  };

  const handleCloseChat = () => {
    setShowChatModal(false);
  };

  // Determine if floating button should be visible
  const shouldShowFloatingButton = () => {
    // Don't show on login and register pages
    const hiddenPages = ['/', '/register', '/forgotpassword'];
    const isHiddenPage = hiddenPages.includes(pathname);

    return isAgent && !isHiddenPage;
  };

  return (
    <ErrorBoundary>
      <View style={{ flex: 1 }}>
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
