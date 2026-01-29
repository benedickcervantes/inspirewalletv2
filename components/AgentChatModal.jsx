import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { auth, firestore } from '../configs/firebase';
import MessageBubble from './mobile/MessageBubble';
import * as ImagePicker from 'expo-image-picker';
import { t } from '../utils/languageUtils';
import { getRTLStyles } from '../utils/rtlUtils';
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import realTimeNotificationService from '../services/realTimeNotificationService';
import nestedDatabaseService from '../services/nestedDatabaseService';
import { translateText } from '../services/translationService';

const AgentChatModal = ({ visible, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isTyping] = useState(false);
  const [isAgentOnline] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [messageInputHeight, setMessageInputHeight] = useState(40);
  const [userLanguage, setUserLanguage] = useState("English");
  const [translatedMessages, setTranslatedMessages] = useState({});
  const [translatingMessages, setTranslatingMessages] = useState({});
  const [showTranslationOptions, setShowTranslationOptions] = useState(false);
  const [selectedTranslateLanguage, setSelectedTranslateLanguage] = useState('Japanese');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const messagesListRef = useRef(null);

  // Available languages for translation
  const availableLanguages = [
    { name: 'English', code: 'en', flag: '🇺🇸' },
    { name: 'Japanese', code: 'ja', flag: '🇯🇵' },
    { name: 'Arabic', code: 'ar', flag: '🇸🇦' },
    { name: 'Korean', code: 'ko', flag: '🇰🇷' },
  ];

  // Fetch user language
  const fetchUserLanguage = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Map the stored language to the correct format expected by t() function
          const storedLanguage = userData.preferredLanguage || "English";
          setUserLanguage(storedLanguage);
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
      setUserLanguage("English"); // Default to English instead of lowercase
    }
  };

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, []);

  // Get current user data
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(firestore, 'users', user.uid);
      const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          setUserData(userData);
          
          // Update language when user data changes
          const storedLanguage = userData.preferredLanguage || "English";
          console.log('🔄 AgentChatModal - Language updated:', storedLanguage);
          setUserLanguage(storedLanguage);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // Load messages when modal opens
  useEffect(() => {
    if (visible) {
      loadMessages();
      markMessagesAsRead();
    }
  }, [visible, loadMessages]);

  // Mark messages as read when modal closes
  useEffect(() => {
    if (!visible) {
      // Mark messages as read when modal is closed to clear notifications
      markMessagesAsRead();
    }
  }, [visible]);

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log('Marking messages as read from chat modal');

      // Use the real-time notification service to mark messages as read
      await realTimeNotificationService.markMessagesAsRead(user.uid);

      console.log('Successfully marked messages as read from chat modal');
    } catch (error) {
      console.error('Error marking messages as read from chat modal:', error);
    }
  };

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        console.log('No user found, cannot load messages');
        setLoading(false);
        return;
      }

      // Find the correct conversation path dynamically
      let conversationPath = await realTimeNotificationService.findConversationPath(user.uid);
      if (!conversationPath) {
        console.log('No conversation found for user:', user.uid, '- attempting to create one');
        
        // Try to create a conversation using the nested database service
        try {
          // Use a default admin ID for now - you might want to make this configurable
          const defaultAdminId = 'HzsFreCuN8O9hoUb5LYFGxvhgHt1';
          const assignedUserDocId = 'L6lz1DQ958GkBJp00FlM';
          const conversationId = user.uid;
          
          await nestedDatabaseService.createConversationInNested(
            defaultAdminId,
            assignedUserDocId,
            conversationId,
            {
              userInfo: {
                displayName: userData ? `${userData.firstName} ${userData.lastName}` : t(userLanguage, 'agentChat.user'),
                email: userData?.email || '',
                platform: 'mobile'
              }
            }
          );
          
          conversationPath = `adminUsers/${defaultAdminId}/assignedUsers/${assignedUserDocId}/conversations/${conversationId}/messages`;
          console.log('Created new conversation at path:', conversationPath);
        } catch (createError) {
          console.error('Failed to create conversation:', createError);
          setLoading(false);
          return;
        }
      }

      console.log('Loading messages from path:', conversationPath);
      const messagesRef = collection(firestore, conversationPath);
      const messagesQuery = query(
        messagesRef,
        orderBy('timestamp', 'asc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messagesList = [];
        snapshot.forEach((doc) => {
          const messageData = {
            id: doc.id,
            ...doc.data(),
          };
          messagesList.push(messageData);
          
          // Log received messages
          console.log('📥 Message received:', {
            messageId: doc.id,
            content: messageData.content,
            senderId: messageData.senderId,
            senderType: messageData.senderType,
            timestamp: messageData.timestamp,
            conversationPath: conversationPath
          });
        });
        // Add a test message for debugging translation (remove in production)
        if (__DEV__ && messagesList.length === 0) {
          const testMessage = {
            id: 'test-message',
            content: 'This is a test message from support agent',
            senderType: 'admin',
            senderId: 'test-admin',
            senderName: 'Test Agent',
            timestamp: new Date(),
            isRead: false
          };
          messagesList.push(testMessage);
        }
        
        setMessages(messagesList);
        
        // Auto-scroll to bottom when new messages arrive
        global.setTimeout(() => {
          if (messagesListRef.current) {
            messagesListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert(t(userLanguage, "helpCenter.modals.sendMessageError"), t(userLanguage, "helpCenter.modals.sendMessageFailed"));
    } finally {
      setLoading(false);
    }
  }, [userData, userLanguage]);

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || sending || uploading) return;

    const messageTextToSend = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const user = auth.currentUser;
      if (!user) return;

      // Find the correct conversation path dynamically
      let conversationPath = await realTimeNotificationService.findConversationPath(user.uid);
      if (!conversationPath) {
        console.log('No conversation found for user:', user.uid, '- attempting to create one');
        
        // Try to create a conversation using the nested database service
        try {
          // Use a default admin ID for now - you might want to make this configurable
          const defaultAdminId = 'HzsFreCuN8O9hoUb5LYFGxvhgHt1';
          const assignedUserDocId = 'L6lz1DQ958GkBJp00FlM';
          const conversationId = user.uid;
          
          await nestedDatabaseService.createConversationInNested(
            defaultAdminId,
            assignedUserDocId,
            conversationId,
            {
              userInfo: {
                displayName: userData ? `${userData.firstName} ${userData.lastName}` : t(userLanguage, 'agentChat.user'),
                email: userData?.email || '',
                platform: 'mobile'
              }
            }
          );
          
          conversationPath = `adminUsers/${defaultAdminId}/assignedUsers/${assignedUserDocId}/conversations/${conversationId}/messages`;
          console.log('Created new conversation at path:', conversationPath);
        } catch (createError) {
          console.error('Failed to create conversation:', createError);
          Alert.alert(t(userLanguage, "helpCenter.modals.sendMessageError"), t(userLanguage, "helpCenter.modals.sendMessageFailed"));
          setSending(false);
          setUploading(false);
          return;
        }
      }

      const messagesRef = collection(firestore, conversationPath);

      const messageData = {
        content: messageTextToSend || (selectedFile ? '📎 File attachment' : ''),
        senderId: user.uid,
        senderType: 'user',
        senderName: userData ? `${userData.firstName} ${userData.lastName}` : t(userLanguage, 'agentChat.user'),
        timestamp: serverTimestamp(),
        isRead: false,
      };

      // Handle file upload if file is selected
      if (selectedFile) {
        setUploading(true);
        
        // For now, we'll store the file info directly in the message
        // In a production app, you'd upload to Firebase Storage first
        messageData.file = {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          category: selectedFile.type === 'image' ? 'image' : 'document',
        };
        messageData.messageType = 'file';
        
        setSelectedFile(null);
      }

      await addDoc(messagesRef, messageData);
      
      console.log('📤 Message sent successfully:', {
        messageId: messageData.content,
        senderId: messageData.senderId,
        senderType: messageData.senderType,
        timestamp: messageData.timestamp,
        conversationPath: conversationPath
      });

      // Mark messages as read when user sends a message (they're actively engaged)
      await markMessagesAsRead();

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(t(userLanguage, "helpCenter.modals.sendMessageError"), t(userLanguage, "helpCenter.modals.sendMessageFailed"));
      setMessageText(messageTextToSend); // Restore message on error
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  // File handling functions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t(userLanguage, "helpCenter.modals.missingInfo"), t(userLanguage, 'agentChat.grantCameraPermissions'));
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          type: asset.type,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          size: asset.fileSize || 0,
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t(userLanguage, "helpCenter.modals.sendMessageError"), t(userLanguage, 'agentChat.failedToPickImage'));
    }
  };

  const pickDocuments = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1.0,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          type: asset.type || 'document',
          name: asset.fileName || `document_${Date.now()}`,
          size: asset.fileSize || 0,
        });
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert(t(userLanguage, "helpCenter.modals.sendMessageError"), t(userLanguage, 'agentChat.failedToPickDocument'));
    }
  };

  const showFileOptions = () => {
    Alert.alert(
      t(userLanguage, 'agentChat.shareFile'),
      t(userLanguage, 'agentChat.chooseOption'),
      [
        { text: t(userLanguage, 'agentChat.chooseFromGallery'), onPress: pickImage },
        { text: t(userLanguage, 'agentChat.chooseDocuments'), onPress: pickDocuments },
        { text: t(userLanguage, 'agentChat.cancel'), style: 'cancel' },
      ]
    );
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  // Translation function
  const handleTranslateMessage = async (messageId, originalText) => {
    console.log('handleTranslateMessage called:', { messageId, originalText, userLanguage });
    
    if (!originalText || translatingMessages[messageId]) {
      console.log('Translation skipped:', { hasText: !!originalText, isTranslating: translatingMessages[messageId] });
      return;
    }

    setTranslatingMessages(prev => ({ ...prev, [messageId]: true }));
    
    try {
      console.log('Starting translation...');
      const translatedText = await translateText(originalText, selectedTranslateLanguage, 'en');
      console.log('Translation completed:', translatedText);
      
      setTranslatedMessages(prev => ({
        ...prev,
        [messageId]: translatedText
      }));
    } catch (error) {
      console.error('Translation failed:', error);
      Alert.alert(
        t(userLanguage, "helpCenter.modals.sendMessageError"), 
        'Failed to translate message. Please try again.'
      );
    } finally {
      setTranslatingMessages(prev => {
        const newState = { ...prev };
        delete newState[messageId];
        return newState;
      });
    }
  };

  // Toggle translation for a message
  const toggleMessageTranslation = (messageId, originalText) => {
    console.log('toggleMessageTranslation called:', { messageId, originalText, hasTranslation: !!translatedMessages[messageId] });
    
    if (translatedMessages[messageId]) {
      // Remove translation
      console.log('Removing translation for message:', messageId);
      setTranslatedMessages(prev => {
        const newState = { ...prev };
        delete newState[messageId];
        return newState;
      });
    } else {
      // Add translation
      console.log('Adding translation for message:', messageId);
      handleTranslateMessage(messageId, originalText);
    }
  };

  // Translate all agent messages
  const translateAllAgentMessages = async () => {
    const agentMessages = messages.filter(msg => 
      (msg.senderType === 'admin' || msg.senderType === 'agent') && 
      msg.content && 
      !translatedMessages[msg.id]
    );

    if (agentMessages.length === 0) {
      Alert.alert(t(userLanguage, 'agentChat.info'), t(userLanguage, 'agentChat.noNewMessages'));
      return;
    }

    console.log('Translating all agent messages:', agentMessages.length);
    
    for (const message of agentMessages) {
      await handleTranslateMessage(message.id, message.content);
      // Add a small delay between translations to avoid rate limiting
      await new Promise(resolve => global.setTimeout(resolve, 500));
    }
  };

  // Clear all translations
  const clearAllTranslations = () => {
    setTranslatedMessages({});
    Alert.alert(t(userLanguage, 'agentChat.success'), t(userLanguage, 'agentChat.allTranslationsCleared'));
  };

  const renderMessage = ({ item }) => {
    const user = auth.currentUser;
    const isOwn = item.senderType === 'user' && item.senderId === user?.uid;
    const isAgentMessage = item.senderType === 'admin' || item.senderType === 'agent';
    const hasTranslation = translatedMessages[item.id];
    const isTranslating = translatingMessages[item.id];

    console.log('Rendering message:', {
      id: item.id,
      content: item.content,
      senderType: item.senderType,
      isAgentMessage,
      hasTranslation,
      isTranslating
    });

    return (
      <View style={styles.messageContainer}>
        <MessageBubble
          message={item}
          isOwn={isOwn}
          showSenderName={!isOwn}
        />
        
        {/* Translation section for agent messages */}
        {isAgentMessage && item.content && (
          <View style={styles.translationContainer}>
            {hasTranslation && (
              <View style={styles.translatedMessageContainer}>
                <Text style={[styles.translatedMessageLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "helpCenter.modals.translatedTo")} {selectedTranslateLanguage}:
                </Text>
                <Text style={[styles.translatedMessage, getRTLStyles(userLanguage)]}>
                  {hasTranslation}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={styles.translateButton}
              onPress={() => {
                console.log('Translate button pressed for message:', item.id);
                toggleMessageTranslation(item.id, item.content);
              }}
              disabled={isTranslating}
            >
              {isTranslating ? (
                <ActivityIndicator size="small" color={Colors.redTheme.background} />
              ) : (
                <Ionicons 
                  name={hasTranslation ? "eye-off" : "language"} 
                  size={16} 
                  color={Colors.redTheme.background} 
                />
              )}
              <Text style={[styles.translateButtonText, getRTLStyles(userLanguage)]}>
                {hasTranslation ? t(userLanguage, 'agentChat.hideTranslation') : t(userLanguage, 'agentChat.translate')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Debug info - remove this in production */}
        {__DEV__ && isAgentMessage && (
          <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
            Debug: {item.senderType} | {item.content ? 'Has content' : 'No content'}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerStatusBar} />
            <View style={styles.headerContent}>
              <Ionicons
                name="chatbubble-ellipses"
                size={24}
                color={Colors.redTheme.background}
                style={styles.headerIcon}
              />
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, 'agentChat.title')}</Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusDot, isAgentOnline && styles.statusDotOnline]} />
                  <Text style={[styles.headerSubtitle, getRTLStyles(userLanguage)]}>
                    {isAgentOnline ? t(userLanguage, 'agentChat.supportOnline') : t(userLanguage, 'agentChat.supportTeam')}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.translateToggleButton}
                onPress={() => setShowTranslationOptions(!showTranslationOptions)}
              >
                <Ionicons 
                  name="language" 
                  size={20} 
                  color={Colors.redTheme.background} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close-circle" size={28} color={Colors.redTheme.background} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.redTheme.background} />
              <Text style={[styles.loadingText, getRTLStyles(userLanguage)]}>{t(userLanguage, 'agentChat.loadingMessages')}</Text>
            </View>
          ) : (
            <FlatList
              ref={messagesListRef}
              data={messages}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              renderItem={renderMessage}
              style={[
                styles.messagesList,
                {
                  flex: 1,
                  backgroundColor: '#f8f9fa',
                  marginBottom: 230, // Even more space to move messages further up from translation options
                }
              ]}
              contentContainerStyle={styles.messagesListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIcon}>
                    <Ionicons name="chatbubbles" size={48} color={Colors.redTheme.background} opacity={0.3} />
                  </View>
                  <Text style={[styles.emptyStateText, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'agentChat.welcomeTitle')}
                  </Text>
                  <Text style={[styles.emptyStateSubtext, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, 'agentChat.welcomeSubtext')}
                  </Text>
                </View>
              }
              onContentSizeChange={() => {
                global.setTimeout(() => {
                  if (messagesListRef.current) {
                    messagesListRef.current.scrollToEnd({ animated: true });
                  }
                }, 100);
              }}
            />
          )}

          {/* Translation Controls */}
          <View style={[
            styles.translationControlsContainer,
            {
              position: 'absolute',
              bottom: isKeyboardVisible && Platform.OS === 'ios' ? keyboardHeight + 30 : 80, // Position directly above input container
              left: 0,
              right: 0,
              zIndex: 600,
            }
          ]}>
            <View style={styles.translationControlsHeader}>
              <Text style={[styles.translationControlsTitle, getRTLStyles(userLanguage)]}>
                {t(userLanguage, "helpCenter.modals.translationOptions")}
              </Text>
            </View>
            
            <View style={styles.translationControlsContent}>
              {/* Language Selection */}
              <View style={styles.languageSelectionContainer}>
                <Text style={[styles.languageSelectionLabel, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "helpCenter.modals.translateTo")}
                </Text>
                <TouchableOpacity
                  style={styles.languageDropdown}
                  onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
                >
                  <Text style={styles.languageDropdownText}>
                    {availableLanguages.find(lang => lang.name === selectedTranslateLanguage)?.flag} {selectedTranslateLanguage}
                  </Text>
                  <Ionicons 
                    name={showLanguageDropdown ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color={Colors.redTheme.background} 
                  />
                </TouchableOpacity>
              </View>

              {/* Language Dropdown Options */}
              {showLanguageDropdown && (
                <View style={styles.languageDropdownOptions}>
                  {availableLanguages.map((language) => (
                    <TouchableOpacity
                      key={language.code}
                      style={[
                        styles.languageOption,
                        selectedTranslateLanguage === language.name && styles.languageOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedTranslateLanguage(language.name);
                        setShowLanguageDropdown(false);
                      }}
                    >
                      <Text style={styles.languageOptionText}>
                        {language.flag} {language.name}
                      </Text>
                      {selectedTranslateLanguage === language.name && (
                        <Ionicons name="checkmark" size={16} color={Colors.redTheme.background} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Translation Action Buttons */}
              <View style={styles.translationActionButtons}>
                <TouchableOpacity
                  style={styles.translateAllButton}
                  onPress={translateAllAgentMessages}
                >
                  <Ionicons name="language" size={16} color="white" />
                  <Text style={styles.translateAllButtonText}>{t(userLanguage, "helpCenter.modals.translateAll")}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.clearTranslationsButton}
                  onPress={clearAllTranslations}
                >
                  <Ionicons name="trash" size={16} color={Colors.redTheme.background} />
                  <Text style={styles.clearTranslationsButtonText}>{t(userLanguage, "helpCenter.modals.clearAll")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Selected File Preview */}
          {selectedFile && (
            <View style={styles.filePreviewContainer}>
              <View style={styles.filePreview}>
                {selectedFile.type === 'image' ? (
                  <Image source={{ uri: selectedFile.uri }} style={styles.filePreviewImage} />
                ) : (
                  <View style={styles.documentPreviewIcon}>
                    <Ionicons name="document" size={30} color={Colors.redTheme.background} />
                  </View>
                )}
                <View style={styles.filePreviewInfo}>
                  <Text style={styles.filePreviewName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.filePreviewSize}>
                    {selectedFile.size > 0 ? `${Math.round(selectedFile.size / 1024)} KB` : 'Unknown size'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeFileButton}
                  onPress={removeSelectedFile}
                >
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.typingIndicator}>
                <Text style={[styles.typingText, getRTLStyles(userLanguage)]}>{t(userLanguage, 'agentChat.supportTyping')}</Text>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
            </View>
          )}

          {/* Message Input */}
          <View style={[
            styles.inputContainer,
            isKeyboardVisible && Platform.OS === 'ios' && {
              bottom: keyboardHeight > 0 ? keyboardHeight - 50 : 0,
            }
          ]}>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={showFileOptions}
              disabled={sending || uploading}
            >
              <Ionicons 
                name="attach" 
                size={24} 
                color={sending || uploading ? '#ccc' : Colors.redTheme.background} 
              />
            </TouchableOpacity>
            
            <TextInput
              style={[styles.messageInput, { height: Math.max(40, messageInputHeight) }, getRTLStyles(userLanguage)]}
              placeholder={t(userLanguage, 'agentChat.typeMessage')}
              placeholderTextColor="rgba(0,0,0,0.4)"
              value={messageText}
              onChangeText={setMessageText}
              onContentSizeChange={(event) => {
                setMessageInputHeight(event.nativeEvent.contentSize.height);
              }}
              multiline
              maxLength={1000}
              editable={!sending && !uploading}
              textAlignVertical="top"
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                ((!messageText.trim() && !selectedFile) || sending || uploading) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={(!messageText.trim() && !selectedFile) || sending || uploading}
            >
              {sending || uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerStatusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.redTheme.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(254, 125, 72, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  translateToggleButton: {
    padding: 8,
    marginRight: 4,
  },
  closeButton: {
    padding: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginRight: 6,
  },
  statusDotOnline: {
    backgroundColor: '#4CAF50',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.redTheme.background,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.redTheme.background,
    opacity: 0.8,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesListContent: {
    padding: 16,
    paddingBottom: 20,
  },
  filePreviewContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(254, 125, 72, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(254, 125, 72, 0.2)',
  },
  filePreviewImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  documentPreviewIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: 'rgba(254, 125, 72, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filePreviewInfo: {
    flex: 1,
  },
  filePreviewName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  filePreviewSize: {
    fontSize: 12,
    color: '#666',
  },
  removeFileButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16, // Extra padding for iOS safe area
    borderTopWidth: 1,
    borderTopColor: 'rgba(254, 125, 72, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'absolute',
    bottom: -10,
    left: 0,
    right: 0,
    zIndex: 1000, // Ensure it stays above other content
  },
  attachmentButton: {
    padding: 12,
    marginRight: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(254, 125, 72, 0.2)',
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
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0.1,
  },
  emptyStateIcon: {
    marginBottom: 24,
    opacity: 0.6,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginRight: 8,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#999',
    marginHorizontal: 1,
  },
  typingDot1: {
    animationDelay: '0ms',
  },
  typingDot2: {
    animationDelay: '150ms',
  },
  typingDot3: {
    animationDelay: '300ms',
  },
  messageContainer: {
    marginBottom: 8,
  },
  translationContainer: {
    marginTop: 4,
    marginHorizontal: 16,
  },
  translatedMessageContainer: {
    backgroundColor: 'rgba(254, 125, 72, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.redTheme.background,
  },
  translatedMessageLabel: {
    fontSize: 12,
    color: Colors.redTheme.background,
    fontWeight: '600',
    marginBottom: 4,
  },
  translatedMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(254, 125, 72, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(254, 125, 72, 0.3)',
  },
  translateButtonText: {
    fontSize: 12,
    color: Colors.redTheme.background,
    marginLeft: 4,
    fontWeight: '500',
  },
  translationControlsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(254, 125, 72, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  translationControlsHeader: {
    marginBottom: 12,
  },
  translationControlsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.redTheme.background,
  },
  translationControlsContent: {
    gap: 12,
  },
  languageSelectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageSelectionLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  languageDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(254, 125, 72, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
  },
  languageDropdownText: {
    fontSize: 14,
    color: Colors.redTheme.background,
    marginRight: 8,
    fontWeight: '500',
  },
  languageDropdownOptions: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(254, 125, 72, 0.3)',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(254, 125, 72, 0.1)',
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(254, 125, 72, 0.1)',
  },
  languageOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  translationActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  translateAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.redTheme.background,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  translateAllButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  clearTranslationsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  clearTranslationsButtonText: {
    color: Colors.redTheme.background,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AgentChatModal;
