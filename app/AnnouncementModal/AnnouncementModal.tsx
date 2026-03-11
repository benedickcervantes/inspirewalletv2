import { Modal, StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { useState } from "react";

export type AnnouncementItem = {
  id: string;
  title: string;
  message: string;
  imageUrl?: string | null;
};

export function AnnouncementModal(props: {
  visible: boolean;
  announcement: AnnouncementItem | null;
  onClose: () => void;
}) {
  const { visible, announcement, onClose } = props;

  const [fullImageVisible, setFullImageVisible] = useState(false);

  const hasImage = !!announcement?.imageUrl;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>{announcement?.title ?? "Announcement"}</Text>
            {hasImage && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setFullImageVisible(true)}
              >
                <Image
                  source={{ uri: announcement!.imageUrl! }}
                  style={styles.image}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            <Text style={styles.message}>{announcement?.message ?? ""}</Text>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-screen image modal */}
      <Modal
        visible={fullImageVisible && hasImage}
        transparent
        animationType="fade"
        onRequestClose={() => setFullImageVisible(false)}
      >
        <View style={styles.fullOverlay}>
          <View style={styles.fullCard}>
            {hasImage && (
              <Image
                source={{ uri: announcement!.imageUrl! }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </View>
          <TouchableOpacity
            style={styles.fullCloseBar}
            activeOpacity={0.8}
            onPress={() => setFullImageVisible(false)}
          >
            <Text style={styles.fullCloseText}>Tap to close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 10,
    textAlign: "center",
  },
  image: {
    width: "100%",
    height: 170,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#f1f1f1",
  },
  message: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#E15816",
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  fullOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullCard: {
    maxWidth: "90%",
    maxHeight: "80%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  fullCloseBar: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  fullCloseText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    opacity: 0.85,
  },
});

