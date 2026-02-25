import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getMessages, markAllMessagesAsRead, sendMessage } from "../../configs/api";
import { subscribeToConnectionStatus } from "../../lib/connectionStatus";
import { subscribeToNewSupportMessage } from "../../lib/messagingEvents";
import type { NavProp } from "../../types/navigation";

interface ApiMessage {
  id: string;
  content: string;
  createdAt: string;
  status: "SENT" | "READ";
  senderName?: string;
  direction?: "ADMIN_TO_USER" | "USER_TO_ADMIN";
}

interface DisplayMessage {
  id: string;
  text: string;
  isSent: boolean;
  timestamp: Date;
  status: "SENT" | "READ";
}

const formatTime = (date: Date) => {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function mapApiToDisplay(api: ApiMessage[]): DisplayMessage[] {
  // API returns newest first; we want oldest at top, newest at bottom (chronological)
  const mapped = api.map((m) => ({
    id: m.id,
    text: m.content,
    isSent: m.direction === "USER_TO_ADMIN",
    timestamp: new Date(m.createdAt),
    status: m.status ?? "SENT",
  }));
  return mapped.reverse();
}

export default function Message() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const fetchMessages = useCallback(async () => {
    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      setError("Please log in to view messages.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const result = await getMessages(accessToken, { page: 1, limit: 100 });
    if (result.success && result.messages) {
      setMessages(mapApiToDisplay(result.messages));
      setError(null);
      // Mark all as read when viewing, then refetch to show updated status
      await markAllMessagesAsRead(accessToken);
      const refetch = await getMessages(accessToken, { page: 1, limit: 100 });
      if (refetch.success && refetch.messages) {
        setMessages(mapApiToDisplay(refetch.messages));
      }
    } else {
      setError(result.error || "Failed to load messages.");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMessages();
  }, [fetchMessages]);

  const handleSend = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    const accessToken = await AsyncStorage.getItem("access_token");
    if (!accessToken) {
      setError("Please log in to send messages.");
      return;
    }

    setSending(true);
    const result = await sendMessage(accessToken, trimmed);
    setSending(false);

    if (result.success) {
      setMessage("");
      await fetchMessages();
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } else {
      setError(result.error || "Failed to send message.");
    }
  }, [message, sending, fetchMessages]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMessages();
    }, [fetchMessages])
  );

  useEffect(() => {
    const unsubscribe = subscribeToNewSupportMessage(() => {
      fetchMessages();
    });
    return unsubscribe;
  }, [fetchMessages]);

  useEffect(() => {
    const unsubscribe = subscribeToConnectionStatus(setIsOnline);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Scroll to bottom when messages load or change (show latest at bottom)
  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [messages]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (navigation as unknown as NavProp).goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <MaterialCommunityIcons
              name="headset"
              size={22}
              color="#E15816"
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>Support</Text>
            <Text style={styles.headerSubtitle}>
              {isOnline ? "Online • You're connected" : "Offline • Connect for real-time updates"}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerRight}>
          <Ionicons name="call-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading && messages.length === 0 ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#E15816" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : error && messages.length === 0 ? (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#999" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.messagesContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#E15816"
            />
          }
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="message-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                Start a conversation with Inspire Wallet Support. Send a message below
                or wait for support to contact you.
              </Text>
            </View>
          ) : (
            messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.bubbleRow,
                  msg.isSent ? styles.bubbleRowSent : styles.bubbleRowReceived,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    msg.isSent ? styles.bubbleSent : styles.bubbleReceived,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      msg.isSent ? styles.bubbleTextSent : styles.bubbleTextReceived,
                    ]}
                  >
                    {msg.text}
                  </Text>
                  <View style={styles.bubbleFooter}>
                    <Text
                      style={[
                        styles.bubbleTime,
                        msg.isSent ? styles.bubbleTimeSent : styles.bubbleTimeReceived,
                      ]}
                    >
                      {formatTime(msg.timestamp)}
                    </Text>
                    {msg.isSent ? (
                      <View style={styles.readStatus}>
                        <Ionicons
                          name={msg.status === "READ" ? "checkmark-done" : "checkmark"}
                          size={14}
                          color={msg.status === "READ" ? "#4FC3F7" : "rgba(255,255,255,0.8)"}
                        />
                        <Text
                          style={[
                            styles.readStatusText,
                            msg.status === "READ" ? styles.readStatusRead : styles.readStatusSent,
                          ]}
                        >
                          {msg.status === "READ" ? "Read" : "Sent"}
                        </Text>
                      </View>
                    ) : msg.status === "SENT" ? (
                      <View style={styles.unreadDot} />
                    ) : null}
                  </View>
                </View>
              </View>
            ))
          )}
          </ScrollView>

          <View
            style={[
              styles.inputBar,
              {
                paddingBottom: keyboardVisible
                  ? 8
                  : Math.max(insets.bottom, 16),
              },
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={10000}
              editable={!sending}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!message.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              activeOpacity={0.7}
              disabled={!message.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#999" />
              ) : (
                <MaterialCommunityIcons
                  name="send"
                  size={22}
                  color={message.trim() ? "#FFFFFF" : "#999"}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8E8E8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#E15816",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  headerRight: {
    padding: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
  },
  errorText: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#E15816",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  messagesScroll: { flex: 1 },
  messagesContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 20,
  },
  messagesContentEmpty: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  bubbleRowSent: {
    justifyContent: "flex-end",
  },
  bubbleRowReceived: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleSent: {
    backgroundColor: "#E15816",
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 18,
  },
  bubbleReceived: {
    backgroundColor: "#FFFFFF",
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTextSent: {
    color: "#FFFFFF",
  },
  bubbleTextReceived: {
    color: "#333",
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 6,
  },
  bubbleTime: {
    fontSize: 11,
  },
  readStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  readStatusText: {
    fontSize: 10,
  },
  readStatusSent: {
    color: "rgba(255,255,255,0.8)",
  },
  readStatusRead: {
    color: "#4FC3F7",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E15816",
  },
  bubbleTimeSent: {
    color: "rgba(255,255,255,0.8)",
  },
  bubbleTimeReceived: {
    color: "#999",
  },
  keyboardView: { flex: 1 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    paddingTop: 12,
    maxHeight: 100,
    fontSize: 16,
    color: "#333",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E15816",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
});
