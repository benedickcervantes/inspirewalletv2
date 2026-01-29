import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  TextInput,
  Alert,
  FlatList,
} from "react-native";
import { useNavigation } from "expo-router";
import { getFirestore, doc, collection, getDocs, onSnapshot, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import AdminAssignmentService from "../../services/adminAssignmentService";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";

export default function Support() {
  const navigation = useNavigation();
  const db = getFirestore();
  const auth = getAuth();
  const [userData, setUserData] = useState({ firstName: "", lastName: "", email: "" });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignedAdmin, setAssignedAdmin] = useState(null);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDescription, setNewTicketDescription] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: "Support Center",
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, []);

  useEffect(() => {
    const initializeUserAndAdmin = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch user data
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const userProfile = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email
          };
          setUserData(userProfile);

          // Assign user to admin if not already assigned
          try {
            const assignment = await AdminAssignmentService.assignUserToAdmin(user.uid, userProfile);
            const adminInfo = await AdminAssignmentService.getUserAssignedAdmin(user.uid);
            setAssignedAdmin(adminInfo);
          } catch (error) {
            console.error("Error with admin assignment:", error);
            showModal({
              title: "Assignment Error",
              message: "Could not assign you to a support agent. Please try again later.",
              type: "error",
            });
          }
        }

        // Listen to user's tickets
        const ticketsRef = collection(db, "users", user.uid, "tickets");
        const unsubscribe = onSnapshot(ticketsRef, (snapshot) => {
          const userTickets = [];
          snapshot.forEach((doc) => {
            userTickets.push({
              id: doc.id,
              ...doc.data()
            });
          });

          // Sort by most recent
          userTickets.sort((a, b) => {
            const timeA = a.updatedAt?.toDate?.() || a.updatedAt || new Date(0);
            const timeB = b.updatedAt?.toDate?.() || b.updatedAt || new Date(0);
            return timeB - timeA;
          });

          setTickets(userTickets);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error initializing user and admin:", error);
        setLoading(false);
      }
    };

    initializeUserAndAdmin();
  }, []);

  const createNewTicket = async () => {
    if (!newTicketTitle.trim() || !newTicketDescription.trim()) {
      showModal({
        title: "Validation Error",
        message: "Please provide both a title and description for your support request.",
        type: "error",
      });
      return;
    }

    setCreatingTicket(true);

    try {
      const result = await AdminAssignmentService.createChatTicket(
        auth.currentUser.uid,
        newTicketTitle.trim(),
        newTicketDescription.trim()
      );

      setNewTicketTitle("");
      setNewTicketDescription("");

      showModal({
        title: "Success",
        message: `Your support ticket has been created and assigned to ${result.adminName}. You can now chat with your support agent.`,
        type: "success",
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      showModal({
        title: "Error",
        message: "Failed to create support ticket. Please try again.",
        type: "error",
      });
    } finally {
      setCreatingTicket(false);
    }
  };

  const openChat = (ticketId) => {
    navigation.navigate("chat", { ticketId });
  };

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

  const renderTicketItem = ({ item }) => (
    <TouchableOpacity
      style={styles.ticketItem}
      onPress={() => openChat(item.id)}
    >
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.ticketDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.ticketFooter}>
        <Text style={styles.adminInfo}>
          Agent: {item.adminName || "Assigned"}
        </Text>
        <Text style={styles.ticketTime}>
          {new Date(item.updatedAt?.toDate?.() || item.updatedAt).toLocaleDateString()}
        </Text>
      </View>

      {item.messages && item.messages.length > 1 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>
            {item.messages.length - 1} messages
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ImageBackground
        source={require("../../assets/images/bg2.png")}
        style={styles.container}
      >
        <SafeAreaView style={styles.androidSafeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.redTheme.background} />
            <Text style={styles.loadingText}>Setting up your support...</Text>
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
        <View style={styles.content}>
          {/* Admin Assignment Info */}
          {assignedAdmin && (
            <View style={styles.adminInfoCard}>
              <Ionicons name="person-circle" size={24} color={Colors.redTheme.background} />
              <View style={styles.adminInfoText}>
                <Text style={styles.adminName}>Your Support Agent</Text>
                <Text style={styles.adminDetails}>{assignedAdmin.admin.name}</Text>
              </View>
            </View>
          )}

          {/* Create New Ticket Section */}
          <View style={styles.newTicketSection}>
            <Text style={styles.sectionTitle}>Create New Support Request</Text>

            <TextInput
              style={styles.titleInput}
              placeholder="Subject (e.g., Account Issue, Payment Problem)"
              value={newTicketTitle}
              onChangeText={setNewTicketTitle}
              maxLength={100}
            />

            <TextInput
              style={styles.descriptionInput}
              placeholder="Describe your issue in detail..."
              value={newTicketDescription}
              onChangeText={setNewTicketDescription}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.createTicketButton,
                (!newTicketTitle.trim() || !newTicketDescription.trim() || creatingTicket) && styles.createTicketButtonDisabled
              ]}
              onPress={createNewTicket}
              disabled={!newTicketTitle.trim() || !newTicketDescription.trim() || creatingTicket}
            >
              {creatingTicket ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text style={styles.createTicketButtonText}>Create Support Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Existing Tickets */}
          <View style={styles.ticketsSection}>
            <Text style={styles.sectionTitle}>Your Support Requests</Text>

            {tickets.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No support requests yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Create your first support request above to get help from our team
                </Text>
              </View>
            ) : (
              <FlatList
                data={tickets}
                renderItem={renderTicketItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.ticketsList}
              />
            )}
          </View>
        </View>

        <ProfessionalModal
          visible={modalVisible}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          onClose={hideModal}
          onConfirm={modalConfig.onConfirm}
        />
      </SafeAreaView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 100,
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

  // Admin Info Card
  adminInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.1)",
  },
  adminInfoText: {
    marginLeft: 12,
  },
  adminName: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  adminDetails: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
  },

  // New Ticket Section
  newTicketSection: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.1)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  titleInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.2)",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  descriptionInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.2)",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 100,
    marginBottom: 16,
  },
  createTicketButton: {
    backgroundColor: Colors.redTheme.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
  },
  createTicketButtonDisabled: {
    backgroundColor: "#ccc",
  },
  createTicketButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },

  // Tickets Section
  ticketsSection: {
    flex: 1,
  },
  ticketsList: {
    paddingBottom: 20,
  },
  ticketItem: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.1)",
    position: "relative",
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
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
  ticketDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  ticketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  adminInfo: {
    fontSize: 12,
    color: Colors.redTheme.background,
    fontWeight: "600",
  },
  ticketTime: {
    fontSize: 12,
    color: "#999",
  },
  unreadBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: Colors.redTheme.background,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unreadText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
});