import type { Ticket } from "@/lib/tickets";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../context/LanguageContext";
import { useSocket } from "../../context/SocketContext";
import { subscribeToNewTicketMessage, subscribeToTicketMessagesRead } from "../../lib/ticketingEvents";

interface TicketDetailProps {
  ticket: Ticket;
  accessToken: string;
  onBack: () => void;
}

interface SenderInfo {
  id: string;
  firstName: string;
  lastName: string;
}

interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  isCustomer: boolean;
  createdAt: string;
  readByUserAt?: string | null;
  readByAdminAt?: string | null;
  sender?: SenderInfo;
}

function TicketDetail({
  ticket,
  accessToken,
  onBack,
}: TicketDetailProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef({ offset: 0, contentHeight: 0, layoutHeight: 0 });

  // State management
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();

  const { isConnected: isSocketConnected, getSocket } = useSocket();

  // Sync WS connection state with global socket
  useEffect(() => {
    setWsConnected(isSocketConnected);
  }, [isSocketConnected]);

  // Derived state: User must wait for an admin to reply before they can follow up
  const hasAdminReply = messages.some((m) => m.isCustomer === false);
  const canUserType = hasAdminReply;

  // Helper function to format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === "ar" ? "ar-SA" : language === "ko" ? "ko-KR" : language === "ja" ? "ja-JP" : "en-US";
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  };

  // Helper function to get sender display name
  const getSenderName = (msg: TicketMessage): string => {
    if (msg.sender?.firstName && msg.sender?.lastName) {
      return `${msg.sender.firstName} ${msg.sender.lastName}`;
    }
    return msg.isCustomer ? t("tickets.you") : t("tickets.admin");
  };

  // Fetch messages from backend
  const fetchMessages = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);

      if (!accessToken) {
        setError(t("support.loginRequired"));
        onBack();
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_WALLET_BACKEND_URL}/tickets/${ticket.id}/messages`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            ...(process.env.EXPO_PUBLIC_API_KEY && {
              "x-api-key": process.env.EXPO_PUBLIC_API_KEY,
            }),
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          setError(t("common.sessionExpired"));
          onBack();
          return;
        }
        if (response.status === 404) {
          setError(t("tickets.notFound"));
          onBack();
          return;
        }
        if (response.status === 500) {
          throw new Error(t("common.serverError"));
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      let fetchedMessages = (data.messages || []).map((msg: any) => ({
        ...msg,
        content: msg.content ?? msg.message ?? "",
        isCustomer: msg.isCustomer === true,
        readByUserAt: msg.readByUserAt ?? null,
        readByAdminAt: msg.readByAdminAt ?? null,
      }));

      // Validate message structure
      fetchedMessages = fetchedMessages.filter((msg: any) =>
        msg.id && msg.ticketId && msg.senderId && (msg.content || "").length >= 0 && msg.createdAt
      );

      // Sort messages chronologically (oldest first)
      fetchedMessages.sort(
        (a: TicketMessage, b: TicketMessage) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setMessages(fetchedMessages);
      console.log(`[TicketDetail] Loaded ${fetchedMessages.length} messages`);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError(t("common.timeout"));
      } else {
        const errorMessage =
          err instanceof Error ? err.message : t("support.failedToLoad");
        setError(errorMessage);
      }
      console.error("[TicketDetail] Fetch messages error:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Fetch messages on mount
  useEffect(() => {
    fetchMessages();
  }, [ticket.id, accessToken]);

  // Setup subscription to global ticket events
  useEffect(() => {
    console.log(`[TicketDetail] Setting up subscription/room for ticket ${ticket.id}`);

    const socket = getSocket();
    console.log(`[TicketDetail] Socket connected: ${isSocketConnected}, Socket exists: ${!!socket}`);

    // Subscribe to ticket message events first
    const unsubscribe = subscribeToNewTicketMessage((newMessage: any) => {
      if (newMessage.ticketId !== ticket.id) return;
      setMessages((prev) => {
        const existing = prev.findIndex((m) => m.id === newMessage.id);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = { ...next[existing], ...newMessage };
          return next;
        }
        return [...prev, newMessage];
      });
    });

    const unsubscribeRead = subscribeToTicketMessagesRead((ticketId) => {
      if (ticketId === ticket.id) fetchMessages(false);
    });

    // Join the ticket room if socket is available
    if (socket && isSocketConnected) {
      const roomName = `ticket:${ticket.id}`;
      console.log(`[TicketDetail] Attempting to join room: ${roomName}`);
      console.log(`[TicketDetail] Socket ID: ${socket.id}`);
      console.log(`[TicketDetail] Socket connected state: ${socket.connected}`);

      // Emit join event
      socket.emit('join', roomName);
      console.log(`[TicketDetail] Join event emitted for room: ${roomName}`);
    } else {
      console.warn(`[TicketDetail] Cannot join room - Socket not ready: connected=${isSocketConnected}, hasSocket=${!!socket}`);
    }

    return () => {
      unsubscribe();
      unsubscribeRead();
      const currentSocket = getSocket();
      if (currentSocket && currentSocket.connected) {
        const roomName = `ticket:${ticket.id}`;
        currentSocket.emit('leave', roomName);
        console.log(`[TicketDetail] Left room: ${roomName}`);
      }
    };
  }, [ticket.id, isSocketConnected]);

  // Fix footer staying lifted after keyboard dismiss
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      });
    });
    return () => sub.remove();
  }, []);

  // Refetch on reconnection
  useEffect(() => {
    if (wsConnected) {
      console.log("[TicketDetail] Socket reconnected, refetching messages to ensure sync");
      fetchMessages();
    }
  }, [wsConnected]);

  // Fallback: Auto-refresh every 10 seconds if WebSocket isn't delivering messages
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("[TicketDetail] Background refresh (fallback)");
      fetchMessages(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [ticket.id, accessToken]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Check if user is at the bottom of the list
      const isAtBottom =
        scrollPositionRef.current.offset +
        scrollPositionRef.current.layoutHeight >=
        scrollPositionRef.current.contentHeight - 50; // 50px threshold

      if (isAtBottom) {
        // User is at bottom, scroll to latest message
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        // User manually scrolled up, don't force scroll
        console.log("[TicketDetail] User scrolled up, not forcing scroll");
      }
    }
  }, [messages]);

  // Log admin reply detection
  useEffect(() => {
    if (hasAdminReply) {
      console.log("[TicketDetail] Admin reply detected! Input field is now enabled.");
    }
  }, [hasAdminReply]);

  // Handle scroll events to track user scroll position
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    scrollPositionRef.current = {
      offset: contentOffset.y,
      contentHeight: contentSize.height,
      layoutHeight: layoutMeasurement.height,
    };
  };

  const handleSend = async () => {
    const trimmed = message.trim();

    // Validation
    if (!trimmed) {
      console.warn("[TicketDetail] Empty message");
      return;
    }

    if (!canUserType) {
      console.warn("[TicketDetail] User cannot type yet (waiting for admin)");
      return;
    }

    if (sending) {
      console.warn("[TicketDetail] Already sending a message");
      return;
    }

    if (trimmed.length > 10000) {
      setError(t("support.messageTooLong"));
      return;
    }

    try {
      setSending(true);
      setError(null);

      // Create optimistic message (will be replaced with server response)
      const optimisticMessage: TicketMessage = {
        id: `temp-${Date.now()}`,
        ticketId: ticket.id,
        senderId: "", // Will be filled by server
        content: trimmed,
        isCustomer: true,
        createdAt: new Date().toISOString(),
        sender: {
          id: "",
          firstName: "You",
          lastName: "",
        },
      };

      // Add optimistic message immediately
      setMessages((prev) => [...prev, optimisticMessage]);
      setMessage("");

      // Send to backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_WALLET_BACKEND_URL}/tickets/${ticket.id}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            ...(process.env.EXPO_PUBLIC_API_KEY && {
              "x-api-key": process.env.EXPO_PUBLIC_API_KEY,
            }),
          },
          body: JSON.stringify({ content: trimmed }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Remove optimistic message on error
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticMessage.id)
        );

        if (response.status === 401) {
          setError(t("common.sessionExpired"));
          onBack();
          return;
        }
        if (response.status === 404) {
          setError(t("tickets.notFound"));
          onBack();
          return;
        }
        if (response.status === 400) {
          throw new Error(t("support.invalidContent"));
        }
        if (response.status === 500) {
          throw new Error(t("common.serverError"));
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const serverMessage = await response.json();

      // Replace optimistic message with server response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMessage.id ? serverMessage : m
        )
      );

      console.log("[TicketDetail] Message sent successfully");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError(t("common.timeout"));
        // Remove optimistic message on timeout
        setMessages((prev) =>
          prev.filter((m) => m.id !== `temp-${Date.now()}`)
        );
      } else {
        const errorMessage =
          err instanceof Error ? err.message : t("support.failedToSend");
        setError(errorMessage);
      }
      console.error("[TicketDetail] Send message error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchMessages();
  };

  // Helper function to handle API errors consistently
  const handleApiError = (error: any, context: string) => {
    let errorMessage = t("common.error");

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = t("common.timeout");
      } else {
        errorMessage = error.message;
      }
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    console.error(`[TicketDetail] ${context} error:`, error);
    return errorMessage;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButtonContainer}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{t("tickets.ticketNo")}{ticket.id.slice(0, 8)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.statusDot, { backgroundColor: wsConnected ? '#4CAF50' : '#f44336' }]} />
            <Text style={styles.statusText}>{wsConnected ? t("support.realTimeReady") : t("support.reconnecting")}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => fetchMessages(true)} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ width: 10 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#E15816" />
            <Text style={styles.loadingText}>{t("support.loading")}</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#E15816" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              ref={scrollRef}
              style={[styles.messagesScroll, isSmallScreen && styles.messagesScrollSmall]}
              contentContainerStyle={[
                styles.messagesContent,
                isSmallScreen && styles.messagesContentSmall,
              ]}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {messages.length === 0 ? (
                <View style={[styles.emptyState, isSmallScreen && styles.emptyStateSmall]}>
                  <MaterialCommunityIcons name="message-outline" size={isSmallScreen ? 40 : 48} color="#CCC" />
                  <Text style={[styles.emptyText, isSmallScreen && styles.emptyTextSmall]}>{t("support.noMessagesYet")}</Text>
                </View>
              ) : (
                messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.bubbleRow,
                      isSmallScreen && styles.bubbleRowSmall,
                      msg.isCustomer ? styles.bubbleRowSent : styles.bubbleRowReceived,
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      {!msg.isCustomer && msg.sender && (
                        <Text style={[styles.senderName, isSmallScreen && styles.senderNameSmall]}>
                          {`${msg.sender.firstName} ${msg.sender.lastName}`}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.bubble,
                          isSmallScreen && styles.bubbleSmall,
                          msg.isCustomer ? styles.bubbleSent : styles.bubbleReceived,
                        ]}
                      >
                        <Text
                          style={[
                            styles.bubbleText,
                            isSmallScreen && styles.bubbleTextSmall,
                            msg.isCustomer ? styles.bubbleTextSent : styles.bubbleTextReceived,
                          ]}
                          numberOfLines={0}
                        >
                          {msg.content || t("tickets.emptyMessage")}
                        </Text>
                        <View
                          style={[
                            styles.bubbleTimeRow,
                            msg.isCustomer ? styles.bubbleTimeRowSent : styles.bubbleTimeRowReceived,
                          ]}
                        >
                          <Text
                            style={[
                              styles.bubbleTime,
                              isSmallScreen && styles.bubbleTimeSmall,
                              msg.isCustomer ? styles.bubbleTimeSent : styles.bubbleTimeReceived,
                            ]}
                          >
                            {formatTime(msg.createdAt)}
                          </Text>
                          {msg.isCustomer && (
                            <Ionicons
                              name={msg.readByAdminAt ? "checkmark-done" : "checkmark"}
                              size={isSmallScreen ? 16 : 18}
                              color={msg.readByAdminAt ? "#4CAF50" : "#9CA3AF"}
                              style={styles.readReceipt}
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {!canUserType && (
              <View style={[styles.waitingMessage, isSmallScreen && styles.waitingMessageSmall]}>
                <MaterialCommunityIcons name="clock-outline" size={isSmallScreen ? 18 : 20} color="#E15816" />
                <Text style={styles.waitingText}>{t("tickets.waitingForAdmin")}</Text>
              </View>
            )}

            <View style={[
              styles.inputBar,
              isSmallScreen && styles.inputBarSmall,
              { paddingBottom: Math.max(isSmallScreen ? 8 : 10, insets.bottom) },
            ]}>
              <TextInput
                style={[styles.input, isSmallScreen && styles.inputSmall, !canUserType && styles.inputDisabled]}
                placeholder={canUserType ? t("tickets.replyPlaceholder") : t("tickets.waitingForAdminPlaceholder") || t("tickets.waitingForAdmin")}
                placeholderTextColor="#999"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={10000}
                editable={canUserType}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  isSmallScreen && styles.sendButtonSmall,
                  (!message.trim() || !canUserType || sending) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                activeOpacity={0.7}
                disabled={!message.trim() || !canUserType || sending}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#999" />
                ) : (
                  <MaterialCommunityIcons
                    name="send"
                    size={isSmallScreen ? 20 : 22}
                    color={message.trim() && canUserType ? "#FFFFFF" : "#999"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8E8E8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#E15816",
  },
  headerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  backButtonContainer: {
    padding: 8,
    marginRight: 8,
  },
  backButtonSmall: {
    padding: 6,
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  headerTitleSmall: {
    fontSize: 14,
  },
  keyboardView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  errorText: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginTop: 12,
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
  messagesScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  messagesScrollSmall: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  messagesContent: {
    paddingBottom: 24,
  },
  messagesContentSmall: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateSmall: {
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
  },
  emptyTextSmall: {
    fontSize: 14,
    marginTop: 8,
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  bubbleRowSmall: {
    marginBottom: 10,
  },
  bubbleRowSent: {
    justifyContent: "flex-end",
  },
  bubbleRowReceived: {
    justifyContent: "flex-start",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
    marginLeft: 12,
  },
  senderNameSmall: {
    fontSize: 11,
    marginLeft: 8,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    alignSelf: "flex-start",
  },
  bubbleSmall: {
    maxWidth: "88%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleSent: {
    backgroundColor: "#E15816",
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 18,
    alignSelf: "flex-end",
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
  bubbleTextSmall: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextSent: {
    color: "#FFFFFF",
  },
  bubbleTextReceived: {
    color: "#333",
  },
  bubbleTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  bubbleTimeRowSent: {
    justifyContent: "flex-end",
  },
  bubbleTimeRowReceived: {
    justifyContent: "flex-start",
  },
  bubbleTime: {
    fontSize: 11,
  },
  bubbleTimeSmall: {
    fontSize: 10,
  },
  bubbleTimeSent: {
    color: "rgba(255,255,255,0.8)",
  },
  bubbleTimeReceived: {
    color: "#999",
  },
  readReceipt: {
    marginLeft: 6,
  },
  waitingMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(225, 88, 22, 0.1)",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  waitingMessageSmall: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  waitingText: {
    fontSize: 14,
    color: "#E15816",
    fontWeight: "600",
  },
  waitingTextSmall: {
    fontSize: 13,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 10,
  },
  inputBarSmall: {
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
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
  inputSmall: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingTop: 10,
    maxHeight: 88,
    fontSize: 15,
    borderRadius: 20,
  },
  inputDisabled: {
    backgroundColor: "#E8E8E8",
    color: "#999",
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E15816",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonSmall: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  sendButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 10,
    opacity: 0.8,
  },
  statusTextSmall: {
    fontSize: 9,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  refreshButtonSmall: {
    padding: 6,
    borderRadius: 16,
  },
});

export default TicketDetail;
