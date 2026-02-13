import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { auth, firestore } from "../../configs/firebase";
import { doc, getDoc, onSnapshot, collection, query } from "firebase/firestore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function TaskPage() {
  const router = useRouter();
  const [accumulatedPoints, setAccumulatedPoints] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(firestore, "users", user.uid);
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAccumulatedPoints(data.accumulatedPoints || 0);
        setCompletedTasks(data.completedTasks || []);
        
        // Get task history (last 5 completed tasks)
        const taskHistory = (data.taskHistory || []).slice(0, 5);
        setHistory(taskHistory);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const tasksRef = collection(firestore, "allTask");
    const tasksQuery = query(tasksRef);
    
    const unsubscribe = onSnapshot(tasksQuery, (querySnapshot) => {
      const fetchedTasks = [];
      querySnapshot.forEach((doc) => {
        fetchedTasks.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setTasks(fetchedTasks);
    });

    return () => unsubscribe();
  }, []);

  const getSocialIcon = (taskName) => {
    if (!taskName) return 'star';
    const name = taskName.toLowerCase();
    if (name.includes('facebook')) return 'logo-facebook';
    if (name.includes('instagram')) return 'logo-instagram';
    if (name.includes('tiktok')) return 'logo-tiktok';
    if (name.includes('youtube')) return 'logo-youtube';
    if (name.includes('twitter')) return 'logo-twitter';
    return 'star';
  };

  const getSocialColor = (taskName) => {
    if (!taskName) return '#E15816';
    const name = taskName.toLowerCase();
    if (name.includes('facebook')) return '#1877F2';
    if (name.includes('instagram')) return '#E4405F';
    if (name.includes('tiktok')) return '#000000';
    if (name.includes('youtube')) return '#FF0000';
    if (name.includes('twitter')) return '#1DA1F2';
    return '#E15816';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tasks</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Accumulated Points Card */}
        <LinearGradient
          colors={["#E15816", "#F48F38"]}
          style={styles.pointsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.pointsLeft}>
            <Text style={styles.pointsLabel}>ACCUMULATED POINTS</Text>
            <View style={styles.pointsValueContainer}>
              <Text style={styles.pointsValue}>{accumulatedPoints}</Text>
              <Ionicons name="star" size={32} color="#FFFFFF" />
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.withdrawButton}
            onPress={() => router.push("/accumulatedpoints")}
          >
            <View style={styles.withdrawIconContainer}>
              <MaterialCommunityIcons name="wallet" size={28} color="#E15816" />
            </View>
            <Text style={styles.withdrawText}>Withdraw Points</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* History Section */}
        {history.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="time-outline" size={20} color="#E15816" />
                <Text style={styles.sectionTitle}>History</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/history")}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            {history.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyIconContainer}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyTitle}>{item.taskName || "Task completed"}</Text>
                  <Text style={styles.historyDate}>
                    {item.completedAt ? new Date(item.completedAt).toLocaleString() : "Recently"}
                  </Text>
                </View>
                <Text style={styles.historyPoints}>+{item.points || 0}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tasks for you Section */}
        <View style={styles.section}>
          <Text style={styles.tasksTitle}>Tasks for you</Text>

          {tasks.map((task) => {
            const isCompleted = completedTasks.includes(task.id);
            const taskName = task.taskName || "Task";
            const iconName = getSocialIcon(taskName);
            const iconColor = getSocialColor(taskName);

            return (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskItem, isCompleted && styles.taskItemCompleted]}
                onPress={() => !isCompleted && router.push(`/task/${task.id}`)}
                disabled={isCompleted}
              >
                <View style={[styles.taskIcon, { backgroundColor: iconColor + '15' }]}>
                  <Ionicons name={iconName} size={28} color={iconColor} />
                </View>
                
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{taskName}</Text>
                  <View style={styles.taskPointsContainer}>
                    <Ionicons name="star" size={14} color="#E15816" />
                    <Text style={styles.taskPoints}>{task.points || 0} points</Text>
                  </View>
                </View>

                {isCompleted ? (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                ) : (
                  <Ionicons name="chevron-forward" size={24} color="#CCC" />
                )}
              </TouchableOpacity>
            );
          })}

          {tasks.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={48} color="#CCC" />
              <Text style={styles.emptyStateText}>No tasks available</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  pointsCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  pointsLeft: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pointsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  pointsValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  divider: {
    width: 2,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 20,
  },
  withdrawButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  withdrawIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  withdrawText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E15816",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  historyIconContainer: {
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: "#999",
  },
  historyPoints: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4CAF50",
  },
  tasksTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  taskItemCompleted: {
    opacity: 0.6,
  },
  taskIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  taskPointsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskPoints: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E15816",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
  },
  bottomPadding: {
    height: 40,
  },
});
