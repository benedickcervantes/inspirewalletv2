import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, firestore } from "../../../configs/firebase";

interface TaskItem {
  id: string;
  icon: string;
  iconType: 'ionicons' | 'material';
  title: string;
  points: number;
  color: string;
}

interface HistoryItem {
  id: string;
  task: string;
  date: string;
  points: number;
}

export default function TaskServices() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [accumulatedPoints, setAccumulatedPoints] = useState(0);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchTaskData();
  }, []);

  const fetchTaskData = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated via Firebase
      const user = auth?.currentUser;
      if (user && firestore) {
        // Fetch accumulated points from user document
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setAccumulatedPoints(userData.taskPoints || userData.points || 0);
        }

        // Fetch task history
        const historyRef = collection(firestore, "users", user.uid, "taskHistory");
        const historyQuery = query(historyRef, orderBy("completedAt", "desc"), limit(5));
        const historySnapshot = await getDocs(historyQuery);
        
        const history: HistoryItem[] = historySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            task: data.taskName || data.task || "Task completed",
            date: data.completedAt ? new Date(data.completedAt.seconds * 1000).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : "",
            points: data.points || 0,
          };
        });
        
        setHistoryItems(history);
      } else {
        // If no Firebase auth, try to get from backend
        const accessToken = await AsyncStorage.getItem("access_token");
        if (accessToken) {
          // TODO: Add backend API call here when available
          // For now, set to 0 if no data
          setAccumulatedPoints(0);
          setHistoryItems([]);
        }
      }
    } catch (error) {
      console.error("Error fetching task data:", error);
    } finally {
      setLoading(false);
    }
  };

  const tasks: TaskItem[] = [
    {
      id: '1',
      icon: 'logo-facebook',
      iconType: 'ionicons',
      title: 'Follow Inspire Next Global Inc. on Facebook!',
      points: 3,
      color: '#1877F2',
    },
    {
      id: '2',
      icon: 'logo-instagram',
      iconType: 'ionicons',
      title: 'Follow Inspire Next Global Inc. on Instagram!',
      points: 2,
      color: '#E4405F',
    },
    {
      id: '3',
      icon: 'logo-tiktok',
      iconType: 'ionicons',
      title: 'Follow our Tiktok Account!',
      points: 3,
      color: '#000000',
    },
    {
      id: '4',
      icon: 'logo-instagram',
      iconType: 'ionicons',
      title: 'Follow Inspire Holdings Inc. on Instagram!',
      points: 2,
      color: '#E4405F',
    },
    {
      id: '5',
      icon: 'logo-facebook',
      iconType: 'ionicons',
      title: 'Follow Inspire Holdings Inc. on Facebook!',
      points: 3,
      color: '#1877F2',
    },
    {
      id: '6',
      icon: 'logo-youtube',
      iconType: 'ionicons',
      title: 'Subscribe on Inspire Next Global YouTube Channel!',
      points: 2,
      color: '#FF0000',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#E15816" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tasks</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E15816" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - sits just below status bar / notch */}
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#E15816" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tasks</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Accumulated Points Card */}
        <View style={styles.pointsCardContainer}>
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
            <TouchableOpacity style={styles.withdrawButton}>
              <Ionicons name="wallet-outline" size={24} color="#E15816" />
              <Text style={styles.withdrawButtonText}>Withdraw Points</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* History Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="time-outline" size={20} color="#E15816" />
              <Text style={styles.sectionTitle}>History</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {historyItems.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyIconContainer}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>Earned from task: {item.task}</Text>
                <Text style={styles.historyDate}>{item.date}</Text>
              </View>
              <Text style={styles.historyPoints}>+{item.points}</Text>
            </View>
          ))}
        </View>

        {/* Tasks for you Section */}
        <View style={styles.section}>
          <Text style={styles.tasksForYouTitle}>Tasks for you</Text>

          {tasks.map((task) => (
            <TouchableOpacity key={task.id} style={styles.taskItem}>
              <View style={[styles.taskIconContainer, { backgroundColor: task.color }]}>
                <Ionicons name={task.icon as any} size={28} color="#FFFFFF" />
              </View>
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <View style={styles.taskPointsContainer}>
                  <Ionicons name="star" size={14} color="#E15816" />
                  <Text style={styles.taskPoints}>{task.points} points</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  pointsCardContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  pointsCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  pointsLeft: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
    marginBottom: 8,
  },
  pointsValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  withdrawButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 4,
  },
  withdrawButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#E15816",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    color: "#E15816",
    fontWeight: "500",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyIconContainer: {
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "500",
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
  tasksForYouTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  taskPointsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskPoints: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E15816",
  },
});
