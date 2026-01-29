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
import { useRouter, useNavigation } from "expo-router";
import { Colors } from "../../constants/Colors";
import { auth, firestore } from "../../configs/firebase";
import { doc, getDoc, onSnapshot, collection, query } from "firebase/firestore";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();
  const [userLanguage, setUserLanguage] = useState("english");
  const [accumulatedPoints, setAccumulatedPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState([]);

  // Real-time listener for user data
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const userDocRef = doc(firestore, "users", user.uid);
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserLanguage(data.preferredLanguage || "english");
          setAccumulatedPoints(data.accumulatedPoints || 0);
          setCompletedTasks(data.completedTasks || []);
          console.log("Task Page: Real-time update - Accumulated Points:", data.accumulatedPoints);
          console.log("Completed tasks:", data.completedTasks || []);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to user data:", error);
        setLoading(false);
      }
    );

    // Cleanup function to unsubscribe when component unmounts
    return () => unsubscribe();
  }, []);

  // Real-time listener for tasks from allTask collection
  useEffect(() => {
    setTasksLoading(true);
    const tasksRef = collection(firestore, "allTask");
    const tasksQuery = query(tasksRef);
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      tasksQuery,
      (querySnapshot) => {
        const fetchedTasks = [];
        querySnapshot.forEach((doc) => {
          fetchedTasks.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setTasks(fetchedTasks);
        setTasksLoading(false);
        console.log("Real-time update - Tasks count:", fetchedTasks.length);
      },
      (error) => {
        console.error("Error listening to tasks:", error);
        setTasksLoading(false);
      }
    );

    // Cleanup function to unsubscribe when component unmounts
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, "task.header.title") || "Tasks",
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [navigation, userLanguage]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Compact Points Card */}
          <TouchableOpacity 
            style={styles.pointsCard}
            onPress={() => router.push("/accumulatedpoints")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FF9500', '#FFB84D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.pointsCardGradient}
            >
              <View style={styles.pointsCardContent}>
                <View style={styles.pointsIconContainer}>
                  <Ionicons 
                    name="star" 
                    size={width * 0.065} 
                    color="#fff" 
                  />
                </View>
                <View style={styles.pointsContent}>
                  <Text style={styles.pointsLabel}>
                    {t(userLanguage, "task.accumulatedPoints") || "Accumulated Points"}
                  </Text>
                  {loading ? (
                    <Text style={styles.pointsValue}>...</Text>
                  ) : (
                    <Text style={styles.pointsValue}>
                      {accumulatedPoints.toLocaleString()}
                    </Text>
                  )}
                </View>
                <Ionicons 
                  name="chevron-forward" 
                  size={width * 0.055} 
                  color="#fff" 
                  style={{ opacity: 0.8 }}
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.taskSection}>
            <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, "task.myTasks") || "My Tasks"}
            </Text>
            
            {/* Tasks List */}
            {tasksLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>
                  {t(userLanguage, "task.loadingTasks") || "Loading tasks..."}
                </Text>
              </View>
            ) : tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons 
                  name="clipboard-outline" 
                  size={width * 0.2} 
                  color="#ccc" 
                />
                <Text style={styles.emptyText}>
                  {t(userLanguage, "task.noTasks") || "No tasks available"}
                </Text>
              </View>
            ) : (
              <View style={styles.tasksList}>
                {tasks.map((task) => {
                  const isCompleted = completedTasks.includes(task.id);
                  return (
                    <TouchableOpacity 
                      key={task.id} 
                      style={styles.taskCardWrapper}
                      onPress={() => router.push(`/task/${task.id}`)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.taskCard,
                        isCompleted && styles.taskCardCompleted
                      ]}>
                        <View style={styles.taskCardLeft}>
                          <View style={[
                            styles.taskIconContainer,
                            isCompleted && styles.taskIconContainerCompleted
                          ]}>
                            {isCompleted ? (
                              <Ionicons 
                                name="checkmark-circle" 
                                size={width * 0.055} 
                                color="#4CAF50" 
                              />
                            ) : (
                              <Ionicons 
                                name="radio-button-off" 
                                size={width * 0.055} 
                                color="#FF9500" 
                              />
                            )}
                          </View>
                          
                          <View style={styles.taskContent}>
                            <View style={styles.taskHeaderRow}>
                              <Text style={[
                                styles.taskTitle, 
                                getRTLStyles(userLanguage),
                                isCompleted && styles.taskTitleCompleted
                              ]}>
                                {task.title || task.name || "Untitled Task"}
                              </Text>
                              {isCompleted && (
                                <View style={styles.completedBadge}>
                                  <Text style={styles.completedBadgeText}>
                                    {t(userLanguage, "task.completed") || "Done"}
                                  </Text>
                                </View>
                              )}
                            </View>
                            
                            {task.description && (
                              <Text style={[
                                styles.taskDescription, 
                                getRTLStyles(userLanguage),
                                isCompleted && styles.taskDescriptionCompleted
                              ]} numberOfLines={1}>
                                {task.description}
                              </Text>
                            )}
                            
                            {task.points && (
                              <View style={styles.taskPointsContainer}>
                                <Ionicons name="star" size={width * 0.035} color="#FF9500" />
                                <Text style={[
                                  styles.taskPoints,
                                  isCompleted && styles.taskPointsCompleted
                                ]}>
                                  {task.points} {t(userLanguage, "task.points") || "pts"}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        
                        <Ionicons 
                          name="chevron-forward" 
                          size={width * 0.04} 
                          color={isCompleted ? "#4CAF50" : "#999"} 
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: height * 0.05,
  },
  content: {
    flex: 1,
    paddingHorizontal: width * 0.045,
  },
  pointsCard: {
    borderRadius: 12,
    marginBottom: height * 0.02,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pointsCardGradient: {
    padding: width * 0.04,
  },
  pointsCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  pointsIconContainer: {
    width: width * 0.1,
    height: width * 0.1,
    borderRadius: width * 0.05,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: width * 0.035,
  },
  pointsContent: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: width * 0.033,
    color: "#fff",
    fontWeight: "500",
    marginBottom: height * 0.003,
    opacity: 0.95,
  },
  pointsValue: {
    fontSize: width * 0.065,
    fontWeight: "700",
    color: "#fff",
  },
  taskSection: {
    flex: 1,
    marginTop: height * 0.01,
  },
  sectionTitle: {
    fontSize: width * 0.045,
    fontWeight: "700",
    color: "#333",
    marginBottom: height * 0.018,
    paddingHorizontal: width * 0.01,
  },
  loadingContainer: {
    padding: height * 0.04,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: width * 0.038,
    color: "#666",
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: height * 0.08,
    paddingHorizontal: width * 0.1,
  },
  emptyText: {
    fontSize: width * 0.04,
    color: "#999",
    marginTop: height * 0.02,
    textAlign: "center",
    fontWeight: "400",
  },
  tasksList: {
    gap: height * 0.012,
  },
  taskCardWrapper: {
    marginBottom: height * 0.01,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: width * 0.038,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  taskCardCompleted: {
    backgroundColor: "#F5F9F5",
    borderColor: "#D4E8D4",
    opacity: 0.9,
  },
  taskCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskIconContainer: {
    width: width * 0.08,
    height: width * 0.08,
    alignItems: "center",
    justifyContent: "center",
    marginRight: width * 0.03,
  },
  taskIconContainerCompleted: {
    // Keep style for consistency
  },
  taskContent: {
    flex: 1,
  },
  taskHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: height * 0.004,
    gap: width * 0.02,
  },
  taskTitle: {
    fontSize: width * 0.038,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  taskTitleCompleted: {
    color: "#4CAF50",
    fontWeight: "500",
  },
  completedBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: width * 0.025,
    paddingVertical: height * 0.004,
    borderRadius: 12,
  },
  completedBadgeText: {
    fontSize: width * 0.028,
    fontWeight: "600",
    color: "#fff",
  },
  taskDescription: {
    fontSize: width * 0.033,
    color: "#666",
    marginBottom: height * 0.006,
    fontWeight: "400",
  },
  taskDescriptionCompleted: {
    color: "#888",
  },
  taskPointsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: height * 0.004,
    gap: width * 0.01,
  },
  taskPoints: {
    fontSize: width * 0.031,
    color: "#FF9500",
    fontWeight: "600",
  },
  taskPointsCompleted: {
    color: "#999",
  },
});


