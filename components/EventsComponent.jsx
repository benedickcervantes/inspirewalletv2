import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore } from "./../configs/firebase";
import { Colors } from "../constants/Colors";

const EventComponents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, "events"),
      (querySnapshot) => {
        const eventData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          // console.log("Raw Data from Firestore:", data);

          const title = data?.titleEvent || "Untitled Event";
          const date =
            data?.dateEvent && data.dateEvent.toDate
              ? data.dateEvent.toDate()
              : null;

          // console.log("Parsed Event:", { title, date });

          return {
            id: doc.id,
            titleEvent: title,
            dateEvent: date,
          };
        });

        // console.log("Formatted Events Array:", eventData);
        setEvents(eventData);
        setLoading(false);
      },
      (error) => {
        // console.error("Error fetching data:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.length > 0 ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.eventItem}>
              <Text style={styles.eventTitle}>
                {item.titleEvent || "No Title Available"}
              </Text>
              {item.dateEvent ? (
                <>
                  <Text style={styles.eventDetails}>
                    Date: {item.dateEvent.toDateString()}
                  </Text>
                  <Text style={styles.eventDetails}>
                    Time: {item.dateEvent.toLocaleTimeString()}
                  </Text>
                </>
              ) : (
                <Text style={styles.eventDetails}>No Date Available</Text>
              )}
            </View>
          )}
        />
      ) : (
        <Text
          style={{
            color: "red",
            textAlign: "center",
            fontSize: 18,
          }}
        >
          No events available.
        </Text>
      )}
    </View>
  );
};

export default EventComponents;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 100,
    width: "100%",
    padding: 10,
  },
  eventItem: {
    backgroundColor: Colors.newYearTheme.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.newYearTheme.text,
  },
  eventDetails: {
    fontSize: 14,
    color: "#00a651",
  },
});
