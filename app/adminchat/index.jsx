import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useNavigation, useLocalSearchParams } from "expo-router";
import { getFirestore, doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";

export default function AdminChat() {
  const navigation = useNavigation();
  const { ticketId } = useLocalSearchParams();
  const db = getFirestore();
  const auth = getAuth();
  const [adminData, setAdminData] = useState({ name: "" });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [userTicket, setUserTicket] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const messageInputRef = useRef(null);
  const messagesListRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: "Admin Chat",
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={updateTicketStatus}
        >
          <Ionicons
            name={selectedTicket?.status === "closed" ? "checkmark-circle" : "close-circle"}
            size={24}
            color={Colors.redTheme.background}
          />
        </TouchableOpacity>
      ),
    });
  }, [selectedTicket]);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const adminDocRef = doc(db, "admins", user.uid);
          const adminDocSnap = await getDoc(adminDocRef);

          if (adminDocSnap.exists()) {
            const data = adminDocSnap.data();
            setAdminData({
              name: data.name,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
      }
    };

    fetchAdminData();
  }, []);

  // Real-time listener for admin ticket updates
  useEffect(() => {
    if (!ticketId || !auth.currentUser) return;

    const adminTicketRef = doc(db, "adminChats", auth.currentUser.uid, "tickets", ticketId);

    const unsubscribeAdmin = onSnapshot(adminTicketRef, (doc) => {
      if (doc.exists()) {
        const updatedTicket = {
          id: doc.id,
          ...doc.data()
        };

        const hasNewMessages = updatedTicket.messages &&
          updatedTicket.messages.length > (selectedTicket?.messages ? selectedTicket.messages.length : 0);

        setSelectedTicket(updatedTicket);

        if (hasNewMessages) {
          setTimeout(() => {
            if (messagesListRef.current) {
              messagesListRef.current.scrollToEnd({ animated: true });
            }
          }, 200);
        }
      }
    });

    // Also listen to user ticket for sync
    if (selectedTicket?.userId) {
      const userTicketRef = doc(db, "users", selectedTicket.userId, "tickets", ticketId);

      const unsubscribeUser = onSnapshot(userTicketRef, (doc) => {
        if (doc.exists()) {
          setUserTicket({
            id: doc.id,
            ...doc.data()
          });
        }
      });

      return () => {
        unsubscribeAdmin();
        unsubscribeUser();
      };
    }

    return () => unsubscribeAdmin();
  }, [ticketId, selectedTicket?.userId]);

  const updateTicketStatus = async () => {
    if (!selectedTicket) return;

    const newStatus = selectedTicket.status === "closed" ? "open" : "closed";

    try {
      // Update admin ticket
      const adminTicketRef = doc(db, "adminChats", auth.currentUser.uid, "tickets", selectedTicket.id);
      await updateDoc(adminTicketRef, {
        status: newStatus,
        updatedAt: new Date(),
      });

      // Update user ticket
      if (selectedTicket.userId) {
        const userTicketRef = doc(db, "users", selectedTicket.userId, "tickets", selectedTicket.id);
        await updateDoc(userTicketRef, {
          status: newStatus,
          updatedAt: new Date(),
        });
      }

      showModal({
        title: "Status Updated",
        message: `Ticket status changed to ${newStatus}`,
        type: "success",
      });
    } catch (error) {
      console.error("Error updating ticket status:", error);
      showModal({
        title: "Error",
        message: "Failed to update ticket status. Please try again.",
        type: "error",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    const messageToSend = newMessage.trim();
    setNewMessage("");
    setSendingMessage(true);

    try {
      const user = auth.currentUser;
      if (!user) return;

      const newMessageData = {
        id: Date.now(),
        sender: adminData.name || "Admin",
        message: messageToSend,
        timestamp: new Date(),
        isCustomer: false,
        isAdmin: true,
      };

      const updatedMessages = [...selectedTicket.messages, newMessageData];

      // Update admin ticket
      const adminTicketRef = doc(db, "adminChats", user.uid, "tickets", selectedTicket.id);
      await updateDoc(adminTicketRef, {
        messages: updatedMessages,
        updatedAt: new Date(),
        status: "in_progress",
      });

      // Update user ticket
      if (selectedTicket.userId) {
        const userTicketRef = doc(db, "users", selectedTicket.userId, "tickets", selectedTicket.id);
        await updateDoc(userTicketRef, {
          messages: updatedMessages,
          updatedAt: new Date(),
          status: "in_progress",
        });
      }

      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }

      setTimeout(() => {
        if (messagesListRef.current) {
          messagesListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      showModal({
        title: "Error",
        message: "Failed to send message. Please try again.",
        type: "error",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  if (!selectedTicket) {
    return (
      <ImageBackground
        source={require("../../assets/images/bg2.png")}
        style={styles.container}
      >
        <SafeAreaView style={styles.androidSafeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.redTheme.background} />
            <Text style={styles.loadingText}>Loading chat...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Chat Info Header */}
          <View style={styles.chatInfoHeader}>
            <View style={styles.userInfo}>
              <Ionicons name="person-circle" size={24} color={Colors.redTheme.background} />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{selectedTicket.userName}</Text>
                <Text style={styles.userEmail}>{selectedTicket.userEmail}</Text>
              </View>
            </View>

            <View style={styles.ticketInfo}>
              <Text style={styles.ticketTitle}>{selectedTicket.title}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(selectedTicket.status) }
              ]}>
                <Text style={styles.statusText}>
                  {selectedTicket.status ? selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1) : "Unknown"}
                </Text>
              </View>
            </View>
          </View>

          {/* Messages List */}
          <FlatList
            ref={messagesListRef}
            data={selectedTicket.messages || []}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[
                styles.messageContainer,
                item.isCustomer ? styles.customerMessage : styles.adminMessage
              ]}>
                <Text style={item.isCustomer ? styles.customerMessageSender : styles.adminMessageSender}>
                  {item.sender}
                </Text>

                <Text style={item.isCustomer ? styles.customerMessageText : styles.adminMessageText}>
                  {item.message}
                </Text>

                <Text style={item.isCustomer ? styles.customerMessageTime : styles.adminMessageTime}>
                  {new Date(item.timestamp?.toDate?.() || item.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            )}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesListContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              setTimeout(() => {
                if (messagesListRef.current) {
                  messagesListRef.current.scrollToEnd({ animated: true });
                }
              }, 50);
            }}
            onLayout={() => {
              setTimeout(() => {
                if (messagesListRef.current) {
                  messagesListRef.current.scrollToEnd({ animated: true });
                }
              }, 50);
            }}
          />

          {/* Message Input */}
          <View style={styles.messageInputContainer}>
            <TextInput
              ref={messageInputRef}
              style={styles.messageInput}
              placeholder="Type your response..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline={false}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              blurOnSubmit={false}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sendingMessage}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ProfessionalModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={hideModal}
        onConfirm={modalConfig.onConfirm}
      />
    </ImageBackground>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case "open":
      return "#4CAF50";
    case "in_progress":
      return "#FF9800";
    case "closed":
      return "#757575";
    default:
      return "#757575";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  androidSafeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 0 : 0,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  headerButton: {
    marginRight: 16,
  },

  // Chat Info Header
  chatInfoHeader: {
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    paddingHorizontal: 20,
    paddingTop: 68,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(254, 125, 72, 0.08)",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  userDetails: {
    marginLeft: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  userEmail: {
    fontSize: 12,
    color: "#666",
  },
  ticketInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: "white",
    fontWeight: "600",
    textTransform: "capitalize",
  },

  // Messages
  messagesList: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  messagesListContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    maxWidth: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  customerMessage: {
    backgroundColor: "rgba(230, 230, 230, 0.95)",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(200, 200, 200, 0.3)",
  },
  adminMessage: {
    backgroundColor: Colors.redTheme.background,
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  customerMessageSender: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    color: "#666",
  },
  adminMessageSender: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    color: "white",
  },
  customerMessageText: {
    fontSize: 15,
    color: "#333",
    marginBottom: 6,
    lineHeight: 20,
  },
  adminMessageText: {
    fontSize: 15,
    color: "white",
    marginBottom: 6,
    lineHeight: 20,
  },
  customerMessageTime: {
    fontSize: 10,
    color: "#999",
    textAlign: "right",
  },
  adminMessageTime: {
    fontSize: 10,
    color: "white",
    textAlign: "right",
    opacity: 0.8,
  },

  // Message Input
  messageInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(254, 125, 72, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageInput: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(254, 125, 72, 0.2)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 120,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: Colors.redTheme.background,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0.1,
  },
});