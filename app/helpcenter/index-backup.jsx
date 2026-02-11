import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableWithoutFeedback,
  SafeAreaView,
  Keyboard,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
  FlatList,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { send, EmailJSResponseStatus } from "@emailjs/react-native";
import { getFirestore, doc, getDoc, addDoc, collection, onSnapshot, query, orderBy, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { ScrollView } from "react-native";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { auth, firestore } from "../../configs/firebase";

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();
  const db = getFirestore();
  const auth = getAuth();
  const [userData, setUserData] = useState({ firstName: "", lastName: "" });
  const [open, setOpen] = useState(false);
  const [openPriority, setOpenPriority] = useState(false);
  const [openCategory, setOpenCategory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();
  const messageInputRef = useRef(null);
  const messagesListRef = useRef(null);
  const [userLanguage, setUserLanguage] = useState("english");

  // Fetch user language
  const fetchUserLanguage = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserLanguage(userData.preferredLanguage || "english");
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, "helpCenter.header.title"),
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [userLanguage]);

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
            // Pre-fill form with user data
            setFirstName(data.firstName);
            setLastName(data.lastName);
            setEmailAddress(user.email);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  // Fetch user's tickets
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const ticketsQuery = query(
        collection(db, "users", user.uid, "tickets"),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
        const ticketsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTickets(ticketsData);
      }, (error) => {
        console.error("Error fetching tickets:", error);
      });

      return () => unsubscribe();
    }
  }, []);

  const [firstName, setFirstName] = useState();
  const [lastName, setLastName] = useState();
  const [emailAddress, setEmailAddress] = useState();
  const [reason, setReason] = useState();
  const [title, setTitle] = useState();
  const [priority, setPriority] = useState();
  const [category, setCategory] = useState();

  const handleTicketSelect = (ticket) => {
    setSelectedTicket(ticket);
    if (ticket.status === "approved" || ticket.status === "in-progress") {
      setShowChat(true);
    } else {
      setShowChat(false);
    }
  };

  // Auto-select first open ticket when tickets are loaded (but don't auto-open modal)
  useEffect(() => {
    if (tickets.length > 0 && !selectedTicket) {
      const openTicket = tickets.find(t => t.status === "open" || t.status === "in-progress");
      if (openTicket) {
        setSelectedTicket(openTicket);
        setShowChat(true);
        // Removed auto-opening of modal - user must click the floating button
      }
    }
  }, [tickets]);

  // Real-time listener for selected ticket updates
  useEffect(() => {
    if (!selectedTicket || !auth.currentUser) return;

    const ticketRef = doc(db, "users", auth.currentUser.uid, "tickets", selectedTicket.id);
    
    const unsubscribe = onSnapshot(ticketRef, (doc) => {
      if (doc.exists()) {
        const updatedTicket = {
          id: doc.id,
          ...doc.data()
        };
        
        // Check if there are new messages
        const hasNewMessages = updatedTicket.messages && 
          updatedTicket.messages.length > (selectedTicket.messages ? selectedTicket.messages.length : 0);
        
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
  }, [selectedTicket?.id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    const messageToSend = newMessage.trim();
    setNewMessage(""); // Clear input immediately
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
        title: t(userLanguage, "helpCenter.modals.sendMessageError"),
        message: t(userLanguage, "helpCenter.modals.sendMessageFailed"),
        type: "error",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const onSubmit = async () => {
    if (!firstName || !lastName || !emailAddress || !reason || !title || !priority || !category) {
      showModal({
        title: t(userLanguage, "helpCenter.modals.missingInfo"),
        message: t(userLanguage, "helpCenter.modals.fillAllFields"),
        type: "warning",
      });
      return; // Stop execution if any field is empty
    }

    setLoading(true);
    try {
      // Get current user
      const user = auth.currentUser;
      if (!user) {
        showModal({
          title: t(userLanguage, "helpCenter.modals.authenticationError"),
          message: t(userLanguage, "helpCenter.modals.loginToSubmit"),
          type: "error",
        });
        return;
      }

      // Prepare ticket data for Firebase
      const ticketData = {
        // User information
        userId: user.uid,
        customerName: `${firstName} ${lastName}`,
        customerEmail: emailAddress,
        
        // Ticket details
        title: title,
        description: reason,
        status: "pending",
        priority: priority,
        category: category,
        
        // Request metadata
        requestType: "Help Center Ticket",
        assignedTo: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        
        // Messages array for conversation history
        messages: [
          {
            id: 1,
            sender: `${firstName} ${lastName}`,
            message: reason,
            timestamp: new Date(),
            isCustomer: true,
          },
        ],
        
        // Additional fields
        notes: "",
        resolution: "",
        resolvedAt: null,
        closedAt: null,
      };

      // Save to user's personal tickets subcollection
      const ticketRef = await addDoc(
        collection(db, "users", user.uid, "tickets"),
        ticketData
      );

      console.log("✅ Help ticket saved to Firebase with ID:", ticketRef.id);

      // Send email notification
      await send(
        process.env.EXPO_PUBLIC_SERVICE_ID,
        process.env.EXPO_PUBLIC_TEMPLATE_ID,
        {
          email: emailAddress,
          message: `Ticket ID: ${ticketRef.id}\nFirst Name: ${firstName}\nLast Name: ${lastName}\nEmail Address: ${emailAddress}\nTitle: ${title}\nPriority: ${priority}\nCategory: ${category}\nType of Request: Help Center Ticket\nDescription: ${reason}`,
        },
        {
          publicKey: process.env.EXPO_PUBLIC_API_KEY,
        }
      );

      console.log("✅ Email notification sent successfully!");

      showModal({
        title: t(userLanguage, "helpCenter.modals.submittedSuccessfully"),
        message: t(userLanguage, "helpCenter.modals.submittedMessage").replace("{ticketId}", ticketRef.id),
        type: "success",
      });

      // Reset form after successful submission
      setFirstName("");
      setLastName("");
      setEmailAddress("");
      setReason("");
      setTitle("");
      setPriority(null);
      setCategory(null);

    } catch (err) {
      console.error("Error submitting help ticket:", err);
      
      if (err instanceof EmailJSResponseStatus) {
        console.log("EmailJS Request Failed...", err);
        showModal({
          title: t(userLanguage, "helpCenter.modals.partialSuccess"),
          message: t(userLanguage, "helpCenter.modals.savedButEmailFailed"),
          type: "warning",
        });
      } else {
        showModal({
          title: t(userLanguage, "helpCenter.modals.submissionFailed"),
          message: t(userLanguage, "helpCenter.modals.unableToSubmit").replace("{error}", err.message),
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea}>
        {/* Floating Action Button for Active Tickets */}
        {tickets.filter(t => t.status === "open" || t.status === "in-progress").length > 0 && (
          <TouchableOpacity
            style={styles.floatingActionButton}
            onPress={() => setChatModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.fabContent}>
              <Ionicons
                name="chatbubble-ellipses"
                size={24}
                color="white"
              />
              <View style={styles.fabBadge}>
                <Text style={styles.fabBadgeText}>
                  {tickets.filter(t => t.status === "open" || t.status === "in-progress").length}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.headerContent}>
              <Ionicons
                name="help-circle-outline"
                size={32}
                color={Colors.redTheme.background}
                style={styles.headerIcon}
              />
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.title")}</Text>
                <Text style={[styles.headerSubtitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "helpCenter.content.subtitle")}
                </Text>
              </View>
            </View>
          </View>

          {/* Instructions Card */}
          <View style={styles.instructionCard}>
            <View style={styles.instructionHeader}>
              <Ionicons
                name="chatbubble-ellipses"
                size={20}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.instructionTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.submitRequestTitle")}</Text>
            </View>
            <Text style={[styles.instructionText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "helpCenter.content.instructions")}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.contactInfo")}</Text>

            {/* Personal Information Section */}
            <View style={styles.formSection}>
              <Text style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.yourDetails")}</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.firstName")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "helpCenter.content.firstNamePlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  value={firstName}
                  onChangeText={(value) => setFirstName(value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.lastName")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "helpCenter.content.lastNamePlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  value={lastName}
                  onChangeText={(value) => setLastName(value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.emailAddress")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "helpCenter.content.emailPlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  value={emailAddress}
                  onChangeText={(value) => setEmailAddress(value)}
                />
              </View>
            </View>

            {/* Ticket Details Section */}
            <View style={styles.formSection}>
              <Text style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.ticketDetails")}</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.ticketTitle")}</Text>
                <TextInput
                  style={[styles.input, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "helpCenter.content.ticketTitlePlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  value={title}
                  onChangeText={(value) => setTitle(value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.priorityLevel")}</Text>
                <TouchableOpacity
                  style={styles.modalSelector}
                  onPress={() => setOpenPriority(true)}
                >
                  <Text style={[styles.modalSelectorText, getRTLStyles(userLanguage)]}>
                    {priority ? 
                      (priority === "high" ? t(userLanguage, "helpCenter.content.highPriority") :
                       priority === "medium" ? t(userLanguage, "helpCenter.content.mediumPriority") :
                       priority === "low" ? t(userLanguage, "helpCenter.content.lowPriority") : priority)
                      : t(userLanguage, "helpCenter.content.selectPriority")}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.category")}</Text>
                <TouchableOpacity
                  style={styles.modalSelector}
                  onPress={() => setOpenCategory(true)}
                >
                  <Text style={[styles.modalSelectorText, getRTLStyles(userLanguage)]}>
                    {category ? 
                      (category === "payment" ? t(userLanguage, "helpCenter.content.paymentIssues") :
                       category === "withdrawal" ? t(userLanguage, "helpCenter.content.withdrawalIssues") :
                       category === "verification" ? t(userLanguage, "helpCenter.content.accountVerification") :
                       category === "security" ? t(userLanguage, "helpCenter.content.securityConcerns") :
                       category === "technical" ? t(userLanguage, "helpCenter.content.appTechnicalIssues") :
                       category === "general" ? t(userLanguage, "helpCenter.content.generalSupport") :
                       category === "other" ? t(userLanguage, "helpCenter.content.other") : category)
                      : t(userLanguage, "helpCenter.content.selectCategory")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Help Request Section */}
            <View style={styles.formSection}>
              <Text style={[styles.subsectionTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.howCanWeHelp")}</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.describeConcern")}</Text>
                <TextInput
                  style={[styles.textArea, getRTLStyles(userLanguage)]}
                  placeholder={t(userLanguage, "helpCenter.content.describePlaceholder")}
                  placeholderTextColor="#999"
                  keyboardType="default"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  value={reason}
                  onChangeText={(value) => setReason(value)}
                />
              </View>
            </View>
          </View>

          {/* Disclaimer Card */}
          <View style={styles.disclaimerCard}>
            <View style={styles.disclaimerHeader}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.redTheme.background}
              />
              <Text style={[styles.disclaimerTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.whatHappensNext")}</Text>
            </View>
            <Text style={[styles.disclaimerText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "helpCenter.content.disclaimerText")}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={onSubmit}
            disabled={loading}
          >
            <View style={styles.submitButtonContent}>
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="white"
                  style={styles.loadingIcon}
                />
              ) : (
                <Ionicons
                  name="send-outline"
                  size={20}
                  color="white"
                  style={styles.submitIcon}
                />
              )}
              <Text style={[styles.submitButtonText, getRTLStyles(userLanguage)]}>
                {loading ? t(userLanguage, "helpCenter.content.sending") : t(userLanguage, "helpCenter.content.submitRequest")}
              </Text>
            </View>
          </TouchableOpacity>



          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>

      {/* Chat Modal */}
      <Modal
        visible={chatModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setChatModalVisible(false)}
      >
        <SafeAreaView style={styles.ticketModalSafeArea}>
          {/* Modal Header */}
          <View style={styles.ticketModalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setChatModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={Colors.redTheme.background} />
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <Ionicons
                name="chatbubble-ellipses"
                size={24}
                color={Colors.redTheme.background}
                style={styles.modalTitleIcon}
              />
              <Text style={[styles.ticketModalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.activeSupportTickets")}</Text>
            </View>
            <View style={styles.placeholderView} />
          </View>

          {/* Modal Content - Ticket List Only */}
          <View style={styles.ticketModalContent}>
            <FlatList
              data={tickets.filter(t => t.status === "open" || t.status === "in-progress")}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalTicketItem}
                  onPress={() => {
                    setSelectedTicket(item);
                    setChatModalVisible(false);
                    // Navigate to chat page
                    router.push({
                      pathname: "/chat",
                      params: { ticketId: item.id }
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalTicketHeader}>
                    <View style={styles.modalTicketTitleContainer}>
                      <Ionicons
                        name="document-text-outline"
                        size={20}
                        color={Colors.redTheme.background}
                        style={styles.modalTicketIcon}
                      />
                      <Text style={styles.modalTicketTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                    <View style={[
                      styles.modalStatusBadge,
                      item.status === "open" && styles.modalOpenBadge,
                      item.status === "in-progress" && styles.modalInProgressBadge,
                    ]}>
                      <Text style={styles.modalStatusText}>{item.status}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.modalTicketDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                  
                  <View style={styles.modalTicketFooter}>
                    <View style={styles.modalTicketDateContainer}>
                      <Ionicons name="time-outline" size={14} color="#666" />
                      <Text style={styles.modalTicketDate}>
                        {new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.modalTicketMessages}>
                      <Ionicons name="chatbubble-outline" size={16} color={Colors.redTheme.background} />
                      <Text style={styles.modalTicketMessagesText}>
                        {item.messages ? item.messages.length : 0} {t(userLanguage, "helpCenter.content.messages")}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.modalTicketArrow}>
                    <Ionicons name="chevron-forward" size={20} color={Colors.redTheme.background} />
                  </View>
                </TouchableOpacity>
              )}
              style={styles.modalTicketList}
              contentContainerStyle={styles.modalTicketListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyTicketsContainer}>
                  <View style={styles.emptyTicketsIconContainer}>
                    <Ionicons name="chatbubble-ellipses-outline" size={64} color={Colors.redTheme.background} />
                  </View>
                  <Text style={[styles.emptyTicketsText, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.noActiveTickets")}</Text>
                  <Text style={[styles.emptyTicketsSubtext, getRTLStyles(userLanguage)]}>
                    {t(userLanguage, "helpCenter.content.noActiveTicketsSubtext")}
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyTicketsButton}
                    onPress={() => setChatModalVisible(false)}
                  >
                    <Text style={[styles.emptyTicketsButtonText, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.content.submitNewRequest")}</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Priority Level Selection Modal */}
      <Modal
        visible={openPriority}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpenPriority(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpenPriority(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.modals.selectPriority")}</Text>
                <TouchableOpacity onPress={() => setOpenPriority(false)}>
                  <Ionicons name="close-outline" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setPriority("high");
                    setOpenPriority(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "helpCenter.content.highPriority")}</Text>
                  </View>
                  {priority === "high" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setPriority("medium");
                    setOpenPriority(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "helpCenter.content.mediumPriority")}</Text>
                  </View>
                  {priority === "medium" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setPriority("low");
                    setOpenPriority(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "helpCenter.content.lowPriority")}</Text>
                  </View>
                  {priority === "low" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Category Selection Modal */}
      <Modal
        visible={openCategory}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpenCategory(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpenCategory(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, getRTLStyles(userLanguage)]}>{t(userLanguage, "helpCenter.modals.selectCategory")}</Text>
                <TouchableOpacity onPress={() => setOpenCategory(false)}>
                  <Ionicons name="close-outline" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCategory("payment");
                    setOpenCategory(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "helpCenter.content.paymentIssues")}</Text>
                  </View>
                  {category === "payment" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCategory("withdrawal");
                    setOpenCategory(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "helpCenter.content.withdrawalIssues")}</Text>
                  </View>
                  {category === "withdrawal" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCategory("verification");
                    setOpenCategory(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "helpCenter.content.accountVerification")}</Text>
                  </View>
                  {category === "verification" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCategory("security");
                    setOpenCategory(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "helpCenter.content.securityConcerns")}</Text>
                  </View>
                  {category === "security" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCategory("technical");
                    setOpenCategory(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "helpCenter.content.appTechnicalIssues")}</Text>
                  </View>
                  {category === "technical" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCategory("general");
                    setOpenCategory(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "helpCenter.content.generalSupport")}</Text>
                  </View>
                  {category === "general" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setCategory("other");
                    setOpenCategory(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={getRTLStyles(userLanguage)}>{t(userLanguage, "helpCenter.content.other")}</Text>
                  </View>
                  {category === "other" && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  androidSafeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 100 : 80,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  // Header Card
  headerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderLeftWidth: 5,
    borderLeftColor: Colors.redTheme.background,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 16,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    borderRadius: 20,
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },

  // Instruction Card
  instructionCard: {
    backgroundColor: "rgba(255, 235, 238, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  instructionText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },

  // Form Card
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginBottom: 20,
    textAlign: "center",
    alignSelf: "center",
  },

  // Form Sections
  formSection: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(204, 33, 53, 0.2)",
  },

  // Input Groups
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
    minHeight: 120,
    textAlignVertical: "top",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modalSelector: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modalSelectorText: {
    fontSize: 16,
    color: "#333",
  },



  // Disclaimer Card
  disclaimerCard: {
    backgroundColor: "rgba(255, 235, 238, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.redTheme.background,
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },

  // Submit Button
  submitButton: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#999",
    shadowOpacity: 0.1,
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitIcon: {
    marginRight: 8,
  },
  loadingIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },

  // Floating Action Button
  floatingActionButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.redTheme.background,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  fabContent: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  fabBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ff4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  fabBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },



  // Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(204, 33, 53, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(204, 33, 53, 0.1)",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  modalTitleIcon: {
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    textAlign: "center",
  },
  placeholderView: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  modalTicketList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalTicketListContent: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  modalTicketItem: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  modalTicketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  modalTicketTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  modalTicketIcon: {
    marginRight: 8,
  },
  modalTicketTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  modalStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalOpenBadge: {
    backgroundColor: "rgba(190, 229, 235, 0.8)",
    borderColor: "rgba(190, 229, 235, 0.8)",
  },
  modalInProgressBadge: {
    backgroundColor: "rgba(255, 243, 205, 0.8)",
    borderColor: "rgba(255, 234, 167, 0.8)",
  },
  modalStatusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
    color: "#333",
  },
  modalTicketDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  modalTicketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(204, 33, 53, 0.1)",
  },
  modalTicketDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTicketDate: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  modalTicketMessages: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTicketMessagesText: {
    fontSize: 12,
    color: Colors.redTheme.background,
    marginLeft: 4,
    fontWeight: "500",
  },
  modalTicketArrow: {
    position: "absolute",
    right: 16,
    top: "60%",
    transform: [{ translateY: -10 }],
  },
  emptyTicketsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTicketsIconContainer: {
    marginBottom: 20,
    backgroundColor: "rgba(204, 33, 53, 0.1)",
    borderRadius: 50,
    padding: 20,
  },
  emptyTicketsText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyTicketsSubtext: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyTicketsButton: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 24,
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyTicketsButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  // Modal Styles for Priority and Category Selection
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 0,
    width: '92%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fafbfc',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.redTheme.background,
    flex: 1,
    textAlign: 'center',
    paddingRight: 40,
    paddingLeft: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  optionText: {
    fontSize: 17,
    color: '#222',
    fontWeight: '500',
  },
  checkmarkCircle: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ticket List Modal Styles
  ticketModalSafeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  ticketModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(204, 33, 53, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(204, 33, 53, 0.1)",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  modalTitleIcon: {
    marginRight: 8,
  },
  ticketModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    textAlign: "center",
  },
  placeholderView: {
    width: 40,
  },
  ticketModalContent: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
});
