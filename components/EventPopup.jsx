import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { firestore } from "../configs/firebase";
import { Colors } from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

const EventPopup = ({ visible, onClose }) => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!visible) {
      // Reset state when modal is hidden
      setEvents([]);
      setLoading(true);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(firestore, "events"), where("status", "==", true)),
      (querySnapshot) => {
        const eventData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data?.title || "Untitled Event",
            imageUrl: data?.imageUrl || null,
          };
        });

        setEvents(eventData);
        setLoading(false);

        if (eventData.length > 0 && eventData[0].imageUrl) {
          Image.getSize(
            eventData[0].imageUrl,
            (width, height) => {
              setImageDimensions({ width, height });
            },
            (error) => {
              console.log("Error getting image size:", error);
              setImageDimensions({ width: 300, height: 200 }); // fallback
            }
          );
        }
      },
      (error) => {
        console.error("Error fetching events:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [visible]);

  const calculateModalSize = () => {
    if (imageDimensions.width === 0 || imageDimensions.height === 0) {
      return { width: width * 0.95, height: height * 0.85 };
    }

    const maxWidth = width * 0.95;
    const maxHeight = height * 0.85;
    const imageAspectRatio = imageDimensions.width / imageDimensions.height;

    let modalWidth, modalHeight;

    if (imageAspectRatio > 1) {
      // Landscape image
      modalWidth = Math.min(maxWidth, imageDimensions.width);
      modalHeight = modalWidth / imageAspectRatio;
      if (modalHeight > maxHeight) {
        modalHeight = maxHeight;
        modalWidth = modalHeight * imageAspectRatio;
      }
    } else {
      // Portrait image
      modalHeight = Math.min(maxHeight, imageDimensions.height);
      modalWidth = modalHeight * imageAspectRatio;
      if (modalWidth > maxWidth) {
        modalWidth = maxWidth;
        modalHeight = modalWidth / imageAspectRatio;
      }
    }

    return { width: modalWidth, height: modalHeight };
  };

  const handleImagePress = () => {
    onClose(); // Close the modal first
    router.push("/personal"); // Navigate to personal page
  };

  const renderEvent = ({ item }) => {
    const modalSize = calculateModalSize();
    const imageHeight = modalSize.height - 80; // Subtract header height and padding

    return (
      <View style={styles.adCard}>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>NEW</Text>
        </View>
        <TouchableOpacity
          onPress={handleImagePress}
          activeOpacity={0.8}
          style={styles.imageContainer}
        >
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={[styles.adImage, { height: imageHeight }]}
            />
          ) : (
            <View style={[styles.placeholderImage, { height: imageHeight }]}>
              <Ionicons name="image-outline" size={48} color="#ccc" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const modalSize = calculateModalSize();

  // Return null when not visible to prevent any touch blocking
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape"]}
    >
      <View
        style={styles.modalOverlay}
        pointerEvents={visible ? "auto" : "none"}
      >
        <View style={[styles.modalContent, modalSize]}>
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={Colors.redTheme.background}
              />
              <Text style={styles.loadingText}>Loading amazing events...</Text>
            </View>
          ) : events.length > 0 ? (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              renderItem={renderEvent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.eventsList}
              horizontal={false}
              numColumns={1}
            />
          ) : (
            <View style={styles.noEventsContainer}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.noEventsText}>
                No featured events at the moment
              </Text>
              <Text style={styles.noEventsSubtext}>
                Stay tuned for exciting updates!
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "transparent",
    position: "relative",
  },
  closeButtonContainer: {
    position: "absolute",
    top: -40,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  eventsList: {
    padding: 20,
    paddingBottom: 30,
  },
  adCard: {
    backgroundColor: "white",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    position: "relative",
  },
  adBadge: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "#FFD700",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    zIndex: 2,
  },
  adBadgeText: {
    color: "#333",
    fontSize: 12,
    fontWeight: "bold",
  },
  imageContainer: {
    width: "100%",
  },
  adImage: {
    width: "100%",
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  noEventsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  noEventsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 20,
    textAlign: "center",
  },
  noEventsSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
});

export default EventPopup;
