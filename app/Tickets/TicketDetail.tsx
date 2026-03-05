import type { Ticket } from "@/lib/tickets";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSocket } from "../../context/SocketContext";
import { subscribeToNewTicketMessage } from "../../lib/ticketingEvents";

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

  const { isConnected: isSocketConnected } = useSocket();

  // Sync WS connection state with global socket
  useEffect(() => {
    setWsConnected(isSocketConnected);
  }, [isSocketConnected]);

  // Derived state
  const hasAdminReply = messages.some((m) => !m.isCustomer);
  const canUserType = hasAdminReply;

  // Helper function to format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Fetch messages from backend
  const fetchMessages = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);

      if (!accessToken) {
        setError("Authentication required. Please log in.");
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
          setError("Session expired. Please log in again.");
          onBack();
          return;
        }
        if (response.status === 404) {
          setError("Ticket not found.");
          onBack();
          return;
        }
        if (response.status === 500) {
          throw new Error("Server error. Please try again later.");
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      let fetchedMessages = data.messages || [];

      // Validate message structure
      fetchedMessages = fetchedMessages.filter((msg: any) => {
        return (
          msg.id &&
          msg.ticketId &&
          msg.senderId &&
          msg.content &&
          typeof msg.isCustomer === "boolean" &&
          msg.createdAt
        );
      });

      // Sort messages chronologically (oldest first)
      fetchedMessages.sort(
        (a: TicketMessage, b: TicketMessage) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setMessages(fetchedMessages);
      console.log(`[TicketDetail] Loaded ${fetchedMessages.length} messages`);
    } catch (err) {
      if (showLoader) {
        if (err instanceof Error && err.name === "AbortError") {
          setError("Request timed out. Please try again.");
        } else {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to load messages";
          setError(errorMessage);
        }
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
    console.log(`[TicketDetail] Setting up subscription for ticket ${ticket.id}`);
    
    const unsubscribe = subscribeToNewTicketMessage((newMessage: any) => {
      console.log("[TicketDetail] Event received:", newMessage?.id);
      
      if (newMessage.ticketId === ticket.id) {
        // Just add the new message instead of refetching all
        setMessages((prev) => [...prev, newMessage]);
      }
    });

    return () => {
      console.log(`[TicketDetail] Cleaning up subscription for ticket ${ticket.id}`);
      unsubscribe();
    };
  }, [ticket.id]);

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
      setError("Message is too long (max 10000 characters)");
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
          setError("Session expired. Please log in again.");
          onBack();
          return;
        }
        if (response.status === 404) {
          setError("Ticket not found.");
          onBack();
          return;
        }
        if (response.status === 400) {
          throw new Error("Invalid message content");
        }
        if (response.status === 500) {
          throw new Error("Server error. Please try again later.");
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
        setError("Request timed out. Please try again.");
        // Remove optimistic message on timeout
        setMessages((prev) =>
          prev.filter((m) => m.id !== `temp-${Date.now()}`)
        );
      } else {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
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
    let errorMessage = "An error occurred";

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = "Request timed out. Please try again.";
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButtonContainer}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>Ticket #{ticket.id.slice(0, 8)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.statusDot, { backgroundColor: wsConnected ? '#4CAF50' : '#f44336' }]} />
            <Text style={styles.statusText}>{wsConnected ? "Real-time Ready" : "Reconnecting..."}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => fetchMessages(true)} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ width: 10 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#E15816" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#E15816" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              ref={scrollRef}
              style={styles.messagesScroll}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="message-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyText}>No messages yet</Text>
                </View>
              ) : (
                messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.bubbleRow,
                      msg.isCustomer ? styles.bubbleRowSent : styles.bubbleRowReceived,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      {!msg.isCustomer && msg.sender && (
                        <Text style={styles.senderName}>
                          {`${msg.sender.firstName} ${msg.sender.lastName}`}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.bubble,
                          msg.isCustomer ? styles.bubbleSent : styles.bubbleReceived,
                        ]}
                      >
                        <Text
                          style={[
                            styles.bubbleText,
                            msg.isCustomer ? styles.bubbleTextSent : styles.bubbleTextReceived,
                          ]}
                          numberOfLines={0}
                        >
                          {msg.content || "(Empty message)"}
                        </Text>
                        <Text
                          style={[
                            styles.bubbleTime,
                            msg.isCustomer ? styles.bubbleTimeSent : styles.bubbleTimeReceived,
                          ]}
                        >
                          {formatTime(msg.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {!canUserType && (
              <View style={styles.waitingMessage}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#E15816" />
                <Text style={styles.waitingText}>Waiting for admin response...</Text>
              </View>
            )}

            <View style={styles.inputBar}>
              <TextInput
                style={[styles.input, !canUserType && styles.inputDisabled]}
                placeholder={canUserType ? "Type a reply..." : "Waiting for admin..."}
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
                  (!message.trim() || !canUserType || sending) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                activeOpacity={0.7}
                disabled={!message.trim() || !canUserType || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#999" />
                ) : (
                  <MaterialCommunityIcons
                    name="send"
                    size={22}
                    color={message.trim() && canUserType ? "#FFFFFF" : "#999"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </View >
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
  backButtonContainer: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
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
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
    marginLeft: 12,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    alignSelf: "flex-start",
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
  bubbleTextSent: {
    color: "#FFFFFF",
  },
  bubbleTextReceived: {
    color: "#333",
  },
  bubbleTime: {
    fontSize: 11,
    marginTop: 4,
  },
  bubbleTimeSent: {
    color: "rgba(255,255,255,0.8)",
  },
  bubbleTimeReceived: {
    color: "#999",
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
  waitingText: {
    fontSize: 14,
    color: "#E15816",
    fontWeight: "600",
  },
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
  inputDisabled: {
    backgroundColor: "#E8E8E8",
    color: "#999",
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 10,
    opacity: 0.8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});

export default TicketDetail;
