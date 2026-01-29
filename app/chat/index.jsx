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
  Image,
  Alert,
} from "react-native";
import { useNavigation, useLocalSearchParams } from "expo-router";
import { getFirestore, doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";

// Translation utility function
const translateText = async (text, targetLanguage = 'ja') => {
  try {
    const apiKey = 'AIzaSyDw0B7QzCOlTYW7ofPfk916KBIccP9ZQzM';
    if (!apiKey) {
      throw new Error('Translation API key not found');
    }

    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: targetLanguage,
        source: 'en', // Assuming admin messages are in English
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
};

export default function Chat() {
  const navigation = useNavigation();
  const { ticketId } = useLocalSearchParams();
  const db = getFirestore();
  const auth = getAuth();
  const [userData, setUserData] = useState({ firstName: "", lastName: "" });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState({});
  const [translatingMessages, setTranslatingMessages] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fullImageVisible, setFullImageVisible] = useState(false);
  const [fullImageUri, setFullImageUri] = useState(null);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const messageInputRef = useRef(null);
  const messagesListRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: "Support Chat",
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
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

  const handleTranslateMessage = async (messageId, originalText) => {
    if (translatedMessages[messageId]) {
      // If already translated, toggle to show original
      setTranslatedMessages(prev => {
        const newState = { ...prev };
        delete newState[messageId];
        return newState;
      });
      return;
    }

    setTranslatingMessages(prev => ({ ...prev, [messageId]: true }));
    
    try {
      const translatedText = await translateText(originalText, 'ja');
      setTranslatedMessages(prev => ({
        ...prev,
        [messageId]: translatedText
      }));
    } catch (error) {
      console.error('Translation failed:', error);
      showModal({
        title: "Translation Error",
        message: "Failed to translate message. Please try again.",
        type: "error",
      });
    } finally {
      setTranslatingMessages(prev => {
        const newState = { ...prev };
        delete newState[messageId];
        return newState;
      });
    }
  };

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
      
      // Update the ticket with new message
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
          {/* Chat Topic & Status Header */}
          <View style={styles.topicStatusHeader}>
            <Text style={styles.topicText}>{selectedTicket.title}</Text>
            <View style={[
              styles.chatStatusBadge,
              selectedTicket.status === "open"
                ? styles.chatInProgressBadge
                : { backgroundColor: "#eee", borderColor: "#ccc" }
            ]}>
              <Text style={styles.chatStatusText}>
                {selectedTicket.status ? selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1) : "Unknown"}
              </Text>
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
                <Text style={item.isCustomer ? styles.customerMessageSender : styles.messageSender}>{item.sender}</Text>
                
                {/* Message Text */}
                {item.message && (
                  <Text style={item.isCustomer ? styles.customerMessageText : styles.adminMessageText}>
                    {translatedMessages[item.id] || item.message}
                  </Text>
                )}
                
                {/* Image Display */}
                {item.image && (
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: item.image.uri }}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.viewFullImageButton}
                      onPress={() => viewFullImage(item.image.uri)}
                    >
                      <Ionicons name="expand" size={16} color="white" />
                      <Text style={styles.viewFullImageText}>View Full</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Translation Button for Admin Messages */}
                {!item.isCustomer && item.message && (
                  <View style={styles.translationContainer}>
                    <TouchableOpacity
                      style={styles.translateButton}
                      onPress={() => handleTranslateMessage(item.id, item.message)}
                      disabled={translatingMessages[item.id]}
                    >
                      {translatingMessages[item.id] ? (
                        <ActivityIndicator size="small" color={Colors.redTheme.background} />
                      ) : (
                        <>
                          <Ionicons 
                            name={translatedMessages[item.id] ? "language" : "language-outline"} 
                            size={14} 
                            color={Colors.redTheme.background} 
                          />
                          <Text style={styles.translateButtonText}>
                            {translatedMessages[item.id] ? "Show Original" : "See Translation"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                
                <Text style={item.isCustomer ? styles.customerMessageTime : styles.messageTime}>
                  {new Date(item.timestamp?.toDate?.() || item.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            )}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesListContent}
            showsVerticalScrollIndicator={false}
            inverted={false}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
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
              <Ionicons name="image" size={24} color={Colors.redTheme.background} />
            </TouchableOpacity>
            
            <TextInput
              ref={messageInputRef}
              style={styles.messageInput}
              placeholder="Type your message..."
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

  // Chat Header
  chatHeader: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(204, 33, 53, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatHeaderContent: {
    flex: 1,
  },
  chatHeaderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  chatStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  chatInProgressBadge: {
    backgroundColor: "rgba(255, 243, 205, 0.8)",
    borderColor: "rgba(255, 234, 167, 0.8)",
  },
  chatStatusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
    color: "#333",
  },
  chatDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
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
    backgroundColor: Colors.redTheme.background,
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  adminMessage: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(254, 125, 72, 0.1)",
  },
  messageSender: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    color: "#666",
  },
  messageText: {
    fontSize: 15,
    color: "#333",
    marginBottom: 6,
    lineHeight: 20,
  },
  customerMessageText: {
    fontSize: 15,
    color: "white",
    marginBottom: 6,
    lineHeight: 20,
  },
  adminMessageText: {
    fontSize: 15,
    color: "#333",
    marginBottom: 6,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    color: "#999",
    textAlign: "right",
  },
  customerMessageSender: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    color: "white",
  },
  customerMessageTime: {
    fontSize: 10,
    color: "white",
    textAlign: "right",
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
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(254, 125, 72, 0.2)",
    marginRight: 8,
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

  // Translation Styles
  translationContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  translateButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(254, 125, 72, 0.2)",
  },
  translateButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.redTheme.background,
    marginLeft: 4,
  },

  // Image Styles
  selectedImageContainer: {
    position: "relative",
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(254, 125, 72, 0.1)",
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
    borderRadius: 8,
    overflow: "hidden",
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  viewFullImageButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  viewFullImageText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
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

  // Topic & Status Header
  topicStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.97)",
    paddingHorizontal: 20,
    paddingTop: 68,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(254, 125, 72, 0.08)",
  },
  topicText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
    flex: 1,
    marginRight: 12,
  },
});