import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
} from "react-native";
import { useRouter, useNavigation, useLocalSearchParams } from "expo-router";
import { Colors } from "../../constants/Colors";
import { auth, firestore } from "../../configs/firebase";
import { doc, getDoc, onSnapshot, updateDoc, increment, collection, addDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ProfessionalModal from "../../components/ProfessionalModal";
import useModal from "../../components/useModal";

const { width, height } = Dimensions.get("window");

export default function TaskDetail() {
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [userLanguage, setUserLanguage] = useState("english");
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkOpened, setLinkOpened] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [pointsClaimed, setPointsClaimed] = useState(false);
  const [accumulatedPoints, setAccumulatedPoints] = useState(0);
  const { modalVisible, modalConfig, showModal, hideModal } = useModal();

  // Real-time listener for user language and check if task is completed
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(firestore, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserLanguage(data.preferredLanguage || "english");
        setAccumulatedPoints(data.accumulatedPoints || 0);
        
        // Check if this task is already completed
        const completedTasks = data.completedTasks || [];
        if (completedTasks.includes(id)) {
          setPointsClaimed(true);
          setLinkOpened(true); // Also set linkOpened to show proper state
        }
      }
    });

    return () => unsubscribe();
  }, [id]);

  // Real-time listener for task data
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    const taskDocRef = doc(firestore, "allTask", id);
    
    const unsubscribe = onSnapshot(
      taskDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setTask({
            id: docSnap.id,
            ...docSnap.data()
          });
        } else {
          showModal({
            title: t(userLanguage, "task.error") || "Error",
            message: t(userLanguage, "task.taskNotFound") || "Task not found",
            type: "error",
            onConfirm: () => router.back()
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to task:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, "task.taskDetails") || "Task Details",
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [navigation, userLanguage]);

  const handleDoTask = async () => {
    if (!task?.link && !task?.url) {
      showModal({
        title: t(userLanguage, "task.error") || "Error",
        message: t(userLanguage, "task.noLink") || "No link available for this task",
        type: "error"
      });
      return;
    }

    let taskLink = task.link || task.url;
    
    // Trim whitespace
    taskLink = taskLink.trim();
    
    // Add protocol if missing
    if (!taskLink.startsWith('http://') && !taskLink.startsWith('https://')) {
      taskLink = 'https://' + taskLink;
    }
    
    console.log("Opening link:", taskLink);
    
    try {
      const canOpen = await Linking.canOpenURL(taskLink);
      console.log("Can open URL:", canOpen);
      
      if (canOpen) {
        await Linking.openURL(taskLink);
        setLinkOpened(true); // Mark link as opened
      } else {
        // Try to open anyway, sometimes canOpenURL is overly restrictive
        try {
          await Linking.openURL(taskLink);
          setLinkOpened(true); // Mark link as opened
        } catch (fallbackError) {
          showModal({
            title: t(userLanguage, "task.error") || "Error",
            message: `${t(userLanguage, "task.invalidLink") || "Cannot open this link"}\n\n${taskLink}`,
            type: "error"
          });
        }
      }
    } catch (error) {
      console.error("Error opening link:", error);
      showModal({
        title: t(userLanguage, "task.error") || "Error",
        message: `${t(userLanguage, "task.linkError") || "Failed to open link"}\n\n${taskLink}\n\nError: ${error.message}`,
        type: "error"
      });
    }
  };

  const handleClaimPoints = async () => {
    const user = auth.currentUser;
    if (!user) {
      showModal({
        title: t(userLanguage, "task.error") || "Error",
        message: t(userLanguage, "task.notLoggedIn") || "You must be logged in to claim points",
        type: "error"
      });
      return;
    }

    if (!task?.points) {
      showModal({
        title: t(userLanguage, "task.error") || "Error",
        message: t(userLanguage, "task.noPoints") || "This task has no points to claim",
        type: "error"
      });
      return;
    }

    try {
      setClaiming(true);

      // Update user's accumulated points and mark task as completed
      const userDocRef = doc(firestore, "users", user.uid);
      const newBalance = accumulatedPoints + task.points;
      
      await updateDoc(userDocRef, {
        accumulatedPoints: increment(task.points),
        completedTasks: arrayUnion(id) // Add task ID to completedTasks array
      });

      // Increment completedCount in allTask document
      const taskDocRef = doc(firestore, "allTask", id);
      try {
        await updateDoc(taskDocRef, {
          completedCount: increment(1),
          notCompletedCount: increment(-1)
        });
        console.log("Successfully incremented completedCount for task:", id);
      } catch (taskUpdateError) {
        console.error("Error incrementing completedCount:", taskUpdateError);
        // Continue with the rest of the process even if this fails
      }

      // Add transaction record
      const transactionsRef = collection(firestore, "users", user.uid, "pointsTransactions");
      await addDoc(transactionsRef, {
        type: "task_completed",
        amount: task.points,
        description: `${t(userLanguage, "task.earnedFrom") || "Earned from task:"} ${task.title || task.name || "Untitled Task"}`,
        createdAt: serverTimestamp(),
        balanceAfter: newBalance,
        taskId: id
      });

      // Add notification to user's notifications subcollection
      const userNotificationsRef = collection(firestore, "users", user.uid, "notifications");
      await addDoc(userNotificationsRef, {
        title: t(userLanguage, "task.pointsClaimedTitle") || "Points Claimed!",
        message: `${t(userLanguage, "task.pointsClaimedMessage") || "You have earned"} ${task.points} ${t(userLanguage, "task.pointsForTask") || "points for completing the task:"} ${task.title || task.name || "Untitled Task"}`,
        createdAt: serverTimestamp(),
        type: "points_claimed",
        taskId: id,
        points: task.points,
        read: false
      });

      setPointsClaimed(true);
      
      showModal({
        title: t(userLanguage, "task.success") || "Success!",
        message: `${t(userLanguage, "task.claimedSuccessfully") || "You have successfully claimed"} ${task.points} ${t(userLanguage, "task.points") || "points"}!`,
        type: "success",
        onConfirm: () => router.back()
      });
    } catch (error) {
      console.error("Error claiming points:", error);
      showModal({
        title: t(userLanguage, "task.error") || "Error",
        message: t(userLanguage, "task.claimError") || "Failed to claim points. Please try again.",
        type: "error"
      });
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {t(userLanguage, "task.loadingTask") || "Loading task..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={width * 0.2} color="#ccc" />
          <Text style={styles.emptyText}>
            {t(userLanguage, "task.taskNotFound") || "Task not found"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Task Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.iconWrapper}>
              <Ionicons 
                name="checkmark-circle" 
                size={width * 0.1} 
                color="#fff" 
              />
            </View>
            
            <Text style={[styles.title, getRTLStyles(userLanguage)]}>
              {task.title || task.name || t(userLanguage, "task.untitled") || "Untitled Task"}
            </Text>

            {/* Points Badge */}
            {task.points && (
              <View style={styles.pointsBadge}>
                <Ionicons name="star" size={width * 0.04} color="#FF9500" />
                <Text style={styles.pointsText}>
                  +{task.points} {t(userLanguage, "task.points") || "pts"}
                </Text>
              </View>
            )}
          </View>

          {/* Task Description */}
          {task.description && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="document-text" size={width * 0.05} color="#FF9500" />
                <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "task.description") || "Description"}
                </Text>
              </View>
              <Text style={[styles.descriptionText, getRTLStyles(userLanguage)]}>
                {task.description}
              </Text>
            </View>
          )}

          {/* Task Instructions */}
          {task.instructions && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="information-circle" size={width * 0.05} color="#FF9500" />
                <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "task.instructions") || "Instructions"}
                </Text>
              </View>
              <Text style={[styles.instructionsText, getRTLStyles(userLanguage)]}>
                {task.instructions}
              </Text>
            </View>
          )}

          {/* Task Link Preview */}
          {(task.link || task.url) && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="link" size={width * 0.05} color="#FF9500" />
                <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
                  {t(userLanguage, "task.link") || "Link"}
                </Text>
              </View>
              <View style={styles.linkContainer}>
                <Text style={styles.linkText} numberOfLines={2}>
                  {task.link || task.url}
                </Text>
              </View>
            </View>
          )}

          {/* Additional Info */}
          {task.category && (
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={width * 0.05} color="#666" />
              <Text style={[styles.infoText, getRTLStyles(userLanguage)]}>
                {task.category}
              </Text>
            </View>
          )}

          {task.difficulty && (
            <View style={styles.infoRow}>
              <Ionicons name="speedometer-outline" size={width * 0.05} color="#666" />
              <Text style={[styles.infoText, getRTLStyles(userLanguage)]}>
                {task.difficulty}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Task Action Button */}
      <View style={styles.buttonContainer}>
        {pointsClaimed ? (
          <View style={styles.claimedButton}>
            <Ionicons name="checkmark-circle" size={width * 0.055} color="#4CAF50" />
            <Text style={styles.claimedButtonText}>
              {t(userLanguage, "task.pointsClaimed") || "Points Claimed!"}
            </Text>
          </View>
        ) : linkOpened ? (
          <TouchableOpacity 
            style={styles.claimButton}
            onPress={handleClaimPoints}
            disabled={claiming}
            activeOpacity={0.8}
          >
            {claiming ? (
              <Text style={styles.buttonText}>
                {t(userLanguage, "task.claiming") || "Claiming..."}
              </Text>
            ) : (
              <>
                <Ionicons name="trophy" size={width * 0.055} color="#fff" />
                <Text style={styles.buttonText}>
                  {t(userLanguage, "task.claimPoints") || "Claim Points"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.doTaskButton}
            onPress={handleDoTask}
            activeOpacity={0.8}
          >
            <Ionicons name="play-circle" size={width * 0.055} color="#fff" />
            <Text style={styles.buttonText}>
              {t(userLanguage, "task.doTask") || "Do the Task"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Professional Modal */}
      <ProfessionalModal
        visible={modalVisible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        showCloseButton={modalConfig.showCloseButton}
        onConfirm={modalConfig.onConfirm}
        confirmText={modalConfig.confirmText}
        showCancelButton={modalConfig.showCancelButton}
        cancelText={modalConfig.cancelText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: height * 0.1,
    paddingBottom: height * 0.16,
  },
  content: {
    flex: 1,
    paddingHorizontal: width * 0.045,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: width * 0.04,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: width * 0.04,
    color: "#999",
    marginTop: height * 0.02,
  },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: width * 0.05,
    marginBottom: height * 0.02,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  iconWrapper: {
    width: width * 0.18,
    height: width * 0.18,
    borderRadius: width * 0.09,
    backgroundColor: "#FF9500",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: height * 0.02,
    shadowColor: "#FF9500",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: width * 0.05,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: height * 0.015,
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4E6",
    paddingHorizontal: width * 0.035,
    paddingVertical: height * 0.008,
    borderRadius: 20,
    gap: width * 0.015,
  },
  pointsText: {
    fontSize: width * 0.038,
    fontWeight: "700",
    color: "#FF9500",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: width * 0.04,
    marginBottom: height * 0.015,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: height * 0.012,
    gap: width * 0.02,
  },
  sectionTitle: {
    fontSize: width * 0.038,
    fontWeight: "700",
    color: "#333",
  },
  descriptionText: {
    fontSize: width * 0.036,
    color: "#666",
    lineHeight: width * 0.055,
    fontWeight: "400",
  },
  instructionsText: {
    fontSize: width * 0.036,
    color: "#666",
    lineHeight: width * 0.055,
    fontWeight: "400",
  },
  linkContainer: {
    backgroundColor: "#F8F9FA",
    padding: width * 0.03,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  linkText: {
    fontSize: width * 0.033,
    color: "#0066cc",
    fontWeight: "400",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: width * 0.035,
    borderRadius: 12,
    marginBottom: height * 0.012,
  },
  infoText: {
    fontSize: width * 0.035,
    color: "#666",
    marginLeft: width * 0.025,
    fontWeight: "400",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: width * 0.045,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  doTaskButton: {
    backgroundColor: "#FF9500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.02,
    borderRadius: 12,
    gap: width * 0.02,
    shadowColor: "#FF9500",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    fontSize: width * 0.042,
    fontWeight: "700",
    color: "#fff",
  },
  claimButton: {
    backgroundColor: "#FFB800",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.02,
    borderRadius: 12,
    gap: width * 0.02,
    shadowColor: "#FFB800",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  claimedButton: {
    backgroundColor: "#F0F9F4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.02,
    borderRadius: 12,
    gap: width * 0.02,
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  claimedButtonText: {
    fontSize: width * 0.042,
    fontWeight: "700",
    color: "#4CAF50",
  },
});

