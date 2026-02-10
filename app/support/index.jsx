import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { getFirestore, doc, collection, query, orderBy, limit, onSnapshot, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { LinearGradient } from "expo-linear-gradient";
import AdminAssignmentService from "../../services/adminAssignmentService";

const { width } = Dimensions.get("window");

export default function Support() {
  const router = useRouter();
  const db = getFirestore();
  const auth = getAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeSupportChat = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.replace("/welcome");
          return;
        }

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

          // Assign user to admin if not already assigned
          await AdminAssignmentService.assignUserToAdmin(user.uid, userProfile);
        }

        // Check if user has any existing tickets
        const ticketsRef = collection(db, "users", user.uid, "tickets");
        const ticketsQuery = query(ticketsRef, orderBy("updatedAt", "desc"), limit(1));
        
        const unsubscribe = onSnapshot(ticketsQuery, async (snapshot) => {
          if (!snapshot.empty) {
            // User has existing ticket, navigate to it
            const latestTicket = snapshot.docs[0];
            router.replace(`/chat?ticketId=${latestTicket.id}`);
          } else {
            // No existing ticket, create one
            try {
              const result = await AdminAssignmentService.createChatTicket(
                user.uid,
                "Support Chat",
                "General support inquiry"
              );
              
              // Navigate to the newly created ticket
              router.replace(`/chat?ticketId=${result.ticketId}`);
            } catch (error) {
              console.error("Error creating ticket:", error);
              setLoading(false);
            }
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error initializing support chat:", error);
        setLoading(false);
      }
    };

    initializeSupportChat();
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={["#E25A17", "#F28934"]}
          style={styles.loadingContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Connecting to support...</Text>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
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
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
