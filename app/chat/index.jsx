import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Image,
  ImageBackground,
  Alert,
  Dimensions,
} from "react-native";
import { useNavigation, useLocalSearchParams, useRouter } from "expo-router";
import { getFirestore, doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";

import { Colors } from "../../constants/Colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";

const { width } = Dimensions.get("window");

export default function Chat() {
  const navigation = useNavigation();
  const router = useRouter();
  const { ticketId } = useLocalSearchParams();
  const db = getFirestore();
  const auth = getAuth();
  const [userData, setUserData] = useState({ firstName: "", lastName: "" });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [fullImageVisible, setFullImageVisible] = useState(false);
  const [fullImageUri, setFullImageUri] = useState(null);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const messageInputRef = useRef(null);
  const messagesListRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserData({
              firstName: data.firstName,
              lastName: data.lastName,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  // Real-time listener for ticket updates
  useEffect(() => {
    if (!ticketId || !auth.currentUser) return;

    const ticketRef = doc(db, "users", auth.currentUser.uid, "tickets", ticketId);
    
    const unsubscribe = onSnapshot(ticketRef, (doc) => {
      if (doc.exists()) {
        const updatedTicket = {
          id: doc.id,
          ...doc.data()
        };
        
        // Check if there are new messages
        const hasNewMessages = updatedTicket.messages && 
          updatedTicket.messages.length > (selectedTicket?.messages ? selectedTicket.messages.length : 0);
        
        setSelectedTicket(updatedTicket);
        
        // Auto-scroll to bottom when new messages arrive
        if (hasNewMessages) {
          setTimeout(() => {
            if (messagesListRef.current) {
              messagesListRef.current.scrollToEnd({ animated: true });
            }
          }, 200);
        }
      }
    }, (error) => {
      console.error("Error listening to ticket updates:", error);
    });

    return () => unsubscribe();
  }, [ticketId]);

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to send images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showModal({
        title: "Error",
        message: "Failed to pick image. Please try again.",
        type: "error",
      });
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  const viewFullImage = (imageUri) => {
    setFullImageUri(imageUri);
    setFullImageVisible(true);
  };

  const closeFullImage = () => {
    setFullImageVisible(false);
    setFullImageUri(null);
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedTicket) return;

    const messageToSend = newMessage.trim();
    const imageToSend = selectedImage;
    
    setNewMessage(""); // Clear input immediately
    setSelectedImage(null); // Clear selected image
    setSendingMessage(true);
    
    try {
      const user = auth.currentUser;
      if (!user) return;

      const ticketRef = doc(db, "users", user.uid, "tickets", selectedTicket.id);
      
      const newMessageData = {
        id: Date.now(),
        sender: `${userData.firstName} ${userData.lastName}`,
        message: messageToSend,
        timestamp: new Date(),
        isCustomer: true,
      };

      // Add image data if image is selected
      if (imageToSend) {
        newMessageData.image = {
          uri: imageToSend.uri,
          width: imageToSend.width,
          height: imageToSend.height,
        };
      }

      // Add message to the ticket
      const updatedMessages = [...selectedTicket.messages, newMessageData];
      
      // Check if this is the first customer message (only system message exists before)
      const customerMessages = selectedTicket.messages.filter(msg => msg.isCustomer === true);
      const isFirstCustomerMessage = customerMessages.length === 0;
      
      // If first customer message, add automatic queue response
      if (isFirstCustomerMessage) {
        const queueMessage = {
          id: Date.now() + 1,
          sender: "System",
          message: "Thank you for contacting customer support. Your request has been received and you are now in the queue. An agent will join this chat momentarily.",
          timestamp: new Date(Date.now() + 500), // Slight delay for natural feel
          isCustomer: false,
        };
        updatedMessages.push(queueMessage);
      }
      
      // Update the ticket with new message(s)
      await updateDoc(ticketRef, {
        messages: updatedMessages,
        updatedAt: new Date(),
      });

      // Update the selectedTicket state with new messages
      setSelectedTicket({
        ...selectedTicket,
        messages: updatedMessages,
        updatedAt: new Date(),
      });

      // Focus back to input after sending
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
      
      // Scroll to bottom after sending message
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
        source={require("../../assets/images/chat support  background.png")}
        style={styles.container}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading chat...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/images/chat support  background.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          {/* Custom Header - No gradient, use transparent background */}
          <View style={styles.headerContainer}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.agentInfo}>
                <View style={styles.agentAvatar}>
                  <MaterialCommunityIcons name="headset" size={28} color="#E25A17" />
                </View>
                <View style={styles.agentDetails}>
                  <Text style={styles.agentName}>Support Agent</Text>
                  <Text style={styles.agentStatus}>
                    Online | ID: {selectedTicket.adminId || "support"}
                  </Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerActionButton}>
                  <Ionicons name="call" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionButton}>
                  <Ionicons name="ellipsis-vertical" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Large Inspire Logo Background */}
          <View style={styles.logoBackground}>
            <Image
              source={require("../../assets/images/inspireloader.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          
          {/* Messages List */}
          <FlatList
            ref={messagesListRef}
            data={selectedTicket.messages || []}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[
                styles.messageContainer,
                item.isCustomer ? styles.customerMessageContainer : styles.adminMessageContainer
              ]}>
                <View style={[
                  styles.messageBubble,
                  item.isCustomer ? styles.customerBubble : styles.adminBubble
                ]}>
                  {/* Message Text */}
                  {item.message && (
                    <Text style={[
                      styles.messageText,
                      item.isCustomer ? styles.customerMessageText : styles.adminMessageText
                    ]}>
                      {item.message}
                    </Text>
                  )}
                  
                  {/* Image Display */}
                  {item.image && (
                    <TouchableOpacity
                      style={styles.imageContainer}
                      onPress={() => viewFullImage(item.image.uri)}
                    >
                      <Image
                        source={{ uri: item.image.uri }}
                        style={styles.messageImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                  
                  <Text style={[
                    styles.messageTime,
                    item.isCustomer ? styles.customerMessageTime : styles.adminMessageTime
                  ]}>
                    {new Date(item.timestamp?.toDate?.() || item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
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

          {/* Selected Image Preview */}
          {selectedImage && (
            <View style={styles.selectedImageContainer}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.selectedImagePreview}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={removeSelectedImage}
              >
                <Ionicons name="close-circle" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {/* Message Input */}
          <View style={styles.messageInputContainer}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={pickImage}
            >
              <Ionicons name="attach" size={24} color="#999" />
            </TouchableOpacity>
            
            <TextInput
              ref={messageInputRef}
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline={false}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              blurOnSubmit={false}
            />

            <TouchableOpacity
              style={styles.emojiButton}
              onPress={() => {}}
            >
              <Ionicons name="happy-outline" size={24} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                ((!newMessage.trim() && !selectedImage) || sendingMessage) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={(!newMessage.trim() && !selectedImage) || sendingMessage}
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

      {/* Full Image Modal */}
      {fullImageVisible && fullImageUri && (
        <View style={styles.fullImageModal}>
          <View style={styles.fullImageContainer}>
            <TouchableOpacity
              style={styles.closeFullImageButton}
              onPress={closeFullImage}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Image
              source={{ uri: fullImageUri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </View>
        </View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#FFFFFF",
  },

  // Custom Header
  headerContainer: {
    backgroundColor: "transparent",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === "android" ? 8 : 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  agentInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  agentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  agentDetails: {
    flex: 1,
    justifyContent: "center",
  },
  agentName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  agentStatus: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  // Logo Background
  logoBackground: {
    position: "absolute",
    top: "30%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1,
  },
  logoImage: {
    width: width * 0.4,
    height: width * 0.4,
    opacity: 0.2,
  },

  // Messages
  messagesList: {
    flex: 1,
    backgroundColor: "transparent",
  },
  messagesListContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: "80%",
  },
  customerMessageContainer: {
    alignSelf: "flex-end",
  },
  adminMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  customerBubble: {
    backgroundColor: "#E15816",
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    backgroundColor: "#F5F5F5",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  customerMessageText: {
    color: "#FFFFFF",
  },
  adminMessageText: {
    color: "#333333",
  },
  messageTime: {
    fontSize: 10,
    marginTop: 2,
  },
  customerMessageTime: {
    color: "#FFFFFF",
    opacity: 0.8,
    textAlign: "right",
  },
  adminMessageTime: {
    color: "#999999",
    textAlign: "left",
  },

  // Message Input
  messageInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  messageInput: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 4,
    fontSize: 15,
    maxHeight: 100,
    color: "#333",
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  sendButton: {
    backgroundColor: "#E15816",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#E25A17",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#CCCCCC",
    shadowOpacity: 0.1,
  },

  // Image Styles
  selectedImageContainer: {
    position: "relative",
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },
  selectedImagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    padding: 2,
  },
  imageContainer: {
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },

  // Full Image Modal Styles
  fullImageModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  fullImageContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  closeFullImageButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    padding: 8,
    zIndex: 1001,
  },
});