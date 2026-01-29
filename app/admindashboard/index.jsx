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
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { useNavigation } from "expo-router";
import { getFirestore, doc, collection, onSnapshot, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import AdminAssignmentService from "../../services/adminAssignmentService";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";

export default function AdminDashboard() {
  const navigation = useNavigation();
  const db = getFirestore();
  const auth = getAuth();
  const [adminData, setAdminData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState("tickets"); // "tickets" or "users"
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    name: "",
    email: "",
    maxUsers: "10"
  });
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: "Admin Dashboard",
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowCreateAdminModal(true)}
        >
          <Ionicons name="person-add" size={24} color={Colors.redTheme.background} />
        </TouchableOpacity>
      ),
    });
  }, []);

  useEffect(() => {
    const initializeAdmin = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Check if current user is an admin
        const adminRef = doc(db, "admins", user.uid);
        const adminDoc = await getDoc(adminRef);

        if (!adminDoc.exists()) {
          // Create admin profile if it doesn't exist
          await AdminAssignmentService.createAdmin({
            adminId: user.uid,
            name: user.displayName || "Admin User",
            email: user.email || "",
            maxUsers: 10
          });
        }

        // Get admin stats
        const stats = await AdminAssignmentService.getAdminStats(user.uid);
        setAdminData(stats);

        // Get assigned users
        const users = await AdminAssignmentService.getAdminAssignedUsers(user.uid);
        setAssignedUsers(users);

        // Listen to admin's tickets
        const ticketsRef = collection(db, "adminChats", user.uid, "tickets");
        const unsubscribe = onSnapshot(ticketsRef, (snapshot) => {
          const adminTickets = [];
          snapshot.forEach((doc) => {
            adminTickets.push({
              id: doc.id,
              ...doc.data()
            });
          });

          // Sort by most recent
          adminTickets.sort((a, b) => {
            const timeA = a.updatedAt?.toDate?.() || a.updatedAt || new Date(0);
            const timeB = b.updatedAt?.toDate?.() || b.updatedAt || new Date(0);
            return timeB - timeA;
          });

          setTickets(adminTickets);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error initializing admin:", error);
        setLoading(false);
        showModal({
          title: "Error",
          message: "Failed to load admin dashboard. Please try again.",
          type: "error",
        });
      }
    };

    initializeAdmin();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (auth.currentUser) {
        const stats = await AdminAssignmentService.getAdminStats(auth.currentUser.uid);
        setAdminData(stats);

        const users = await AdminAssignmentService.getAdminAssignedUsers(auth.currentUser.uid);
        setAssignedUsers(users);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const createNewAdmin = async () => {
    if (!newAdminData.name.trim() || !newAdminData.email.trim()) {
      showModal({
        title: "Validation Error",
        message: "Please provide both name and email for the new admin.",
        type: "error",
      });
      return;
    }

    try {
      const adminId = `admin_${Date.now()}`;
      await AdminAssignmentService.createAdmin({
        adminId,
        name: newAdminData.name.trim(),
        email: newAdminData.email.trim(),
        maxUsers: parseInt(newAdminData.maxUsers) || 10
      });

      setNewAdminData({ name: "", email: "", maxUsers: "10" });
      setShowCreateAdminModal(false);

      showModal({
        title: "Success",
        message: "New admin created successfully!",
        type: "success",
      });
    } catch (error) {
      console.error("Error creating admin:", error);
      showModal({
        title: "Error",
        message: "Failed to create new admin. Please try again.",
        type: "error",
      });
    }
  };

  const openChat = (ticketId) => {
    navigation.navigate("adminchat", { ticketId });
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
        <Text style={styles.userInfo}>
          User: {item.userName}
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

  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userHeader}>
        <Ionicons name="person-circle" size={40} color={Colors.redTheme.background} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.userProfile.firstName} {item.userProfile.lastName}
          </Text>
          <Text style={styles.userEmail}>{item.userProfile.email}</Text>
          <Text style={styles.assignedDate}>
            Assigned: {new Date(item.assignedAt?.toDate?.() || item.assignedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
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
            <Text style={styles.loadingText}>Loading admin dashboard...</Text>
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
          {/* Admin Stats Card */}
          {adminData && (
            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <Text style={styles.adminName}>Welcome, {adminData.name}</Text>
                <Text style={styles.utilizationText}>
                  {adminData.currentUsers}/{adminData.maxUsers} users ({adminData.utilizationPercent}%)
                </Text>
              </View>
              <View style={styles.utilizationBar}>
                <View
                  style={[
                    styles.utilizationFill,
                    { width: `${adminData.utilizationPercent}%` }
                  ]}
                />
              </View>
            </View>
          )}

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === "tickets" && styles.activeTab]}
              onPress={() => setSelectedTab("tickets")}
            >
              <Ionicons
                name="chatbubbles"
                size={20}
                color={selectedTab === "tickets" ? "white" : Colors.redTheme.background}
              />
              <Text style={[
                styles.tabText,
                selectedTab === "tickets" && styles.activeTabText
              ]}>
                Support Tickets ({tickets.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, selectedTab === "users" && styles.activeTab]}
              onPress={() => setSelectedTab("users")}
            >
              <Ionicons
                name="people"
                size={20}
                color={selectedTab === "users" ? "white" : Colors.redTheme.background}
              />
              <Text style={[
                styles.tabText,
                selectedTab === "users" && styles.activeTabText
              ]}>
                Assigned Users ({assignedUsers.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          <View style={styles.contentArea}>
            {selectedTab === "tickets" ? (
              tickets.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No support tickets yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Support tickets from your assigned users will appear here
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={tickets}
                  renderItem={renderTicketItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                  }
                />
              )
            ) : (
              assignedUsers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No assigned users yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Users will be automatically assigned to you as they register
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={assignedUsers}
                  renderItem={renderUserItem}
                  keyExtractor={(item) => item.userId}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                  }
                />
              )
            )}
          </View>
        </View>

        {/* Create Admin Modal */}
        <Modal
          visible={showCreateAdminModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Admin</Text>
                <TouchableOpacity
                  onPress={() => setShowCreateAdminModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Admin Name"
                value={newAdminData.name}
                onChangeText={(text) => setNewAdminData(prev => ({ ...prev, name: text }))}
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Admin Email"
                value={newAdminData.email}
                onChangeText={(text) => setNewAdminData(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Max Users (default: 10)"
                value={newAdminData.maxUsers}
                onChangeText={(text) => setNewAdminData(prev => ({ ...prev, maxUsers: text }))}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.createButton}
                onPress={createNewAdmin}
              >
                <Text style={styles.createButtonText}>Create Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
  headerButton: {
    marginRight: 16,
  },

  // Stats Card
  statsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.1)",
  },
  statsHeader: {
    marginBottom: 12,
  },
  adminName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  utilizationText: {
    fontSize: 14,
    color: "#666",
  },
  utilizationBar: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  utilizationFill: {
    height: "100%",
    backgroundColor: Colors.redTheme.background,
    borderRadius: 4,
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: Colors.redTheme.background,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.redTheme.background,
    marginLeft: 6,
  },
  activeTabText: {
    color: "white",
  },

  // Content Area
  contentArea: {
    flex: 1,
  },

  // Ticket Items
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
  userInfo: {
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

  // User Items
  userItem: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(204, 33, 53, 0.1)",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  assignedDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
  },
  createButton: {
    backgroundColor: Colors.redTheme.background,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
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