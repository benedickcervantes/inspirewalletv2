import type { Ticket } from "@/lib/tickets";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
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

interface TicketDetailProps {
  ticket: Ticket;
  accessToken: string;
  onBack: () => void;
  onUpdate: () => void;
}

interface TicketMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

function TicketDetail({
  ticket,
  onBack,
}: TicketDetailProps) {
  const [messages, setMessages] = useState<TicketMessage[]>([
    {
      id: "1",
      text: ticket.description,
      isUser: true,
      timestamp: new Date(ticket.createdAt),
    },
  ]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Check if admin has replied (for demo, we'll check if there are any non-user messages)
  const hasAdminReply = messages.some((m) => !m.isUser);
  const canUserType = hasAdminReply;

  const handleSend = () => {
    if (!message.trim() || !canUserType) return;

    const newMessage: TicketMessage = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setMessage("");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButtonContainer}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket #{ticket.id.slice(0, 8)}</Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        <ScrollView style={styles.messagesScroll} showsVerticalScrollIndicator={false}>
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubbleRow,
                msg.isUser ? styles.bubbleRowSent : styles.bubbleRowReceived,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  msg.isUser ? styles.bubbleSent : styles.bubbleReceived,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    msg.isUser ? styles.bubbleTextSent : styles.bubbleTextReceived,
                  ]}
                >
                  {msg.text}
                </Text>
                <Text
                  style={[
                    styles.bubbleTime,
                    msg.isUser ? styles.bubbleTimeSent : styles.bubbleTimeReceived,
                  ]}
                >
                  {formatTime(msg.timestamp)}
                </Text>
              </View>
            </View>
          ))}
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
      </KeyboardAvoidingView>
    </View>
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
  messagesScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
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
});

export default TicketDetail;
