import { Modal, StyleSheet, Text, TouchableOpacity, View, Image, Dimensions, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";

export type AnnouncementItem = {
  id: string;
  title: string;
  message: string;
  imageUrl?: string | null;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const MAX_IMAGE_WIDTH = screenWidth * 0.9;
const MAX_IMAGE_HEIGHT = screenHeight * 0.75;

export function AnnouncementModal(props: {
  visible: boolean;
  announcement: AnnouncementItem | null;
  onClose: () => void;
}) {
  const { visible, announcement, onClose } = props;
  const { t } = useLanguage();

  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const hasImage = !!announcement?.imageUrl;

  useEffect(() => {
    if (visible && hasImage && announcement?.imageUrl) {
      setLoading(true);
      setImageDimensions(null);
      
      Image.getSize(
        announcement.imageUrl,
        (width, height) => {
          const aspectRatio = width / height;
          let finalWidth = MAX_IMAGE_WIDTH;
          let finalHeight = finalWidth / aspectRatio;

          if (finalHeight > MAX_IMAGE_HEIGHT) {
            finalHeight = MAX_IMAGE_HEIGHT;
            finalWidth = finalHeight * aspectRatio;
          }

          setImageDimensions({ width: finalWidth, height: finalHeight });
          setLoading(false);
        },
        () => {
          setImageDimensions({ width: MAX_IMAGE_WIDTH, height: MAX_IMAGE_WIDTH * 0.75 });
          setLoading(false);
        }
      );
    }
  }, [visible, announcement?.imageUrl, hasImage]);

  useEffect(() => {
    if (!visible) {
      setImageDimensions(null);
      setLoading(true);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.contentContainer}>
          {hasImage ? (
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            ) : (
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: announcement!.imageUrl! }}
                  style={[
                    styles.image,
                    imageDimensions && {
                      width: imageDimensions.width,
                      height: imageDimensions.height,
                    },
                  ]}
                  resizeMode="contain"
                />
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <View style={styles.noImageCard}>
              <Text style={styles.title}>{announcement?.title ?? t("announcement.defaultTitle")}</Text>
              <Text style={styles.message}>{announcement?.message ?? ""}</Text>
              <TouchableOpacity style={styles.button} onPress={onClose}>
                <Text style={styles.buttonText}>{t("announcement.close")}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapper: {
    position: "relative",
  },
  image: {
    borderRadius: 0,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  noImageCard: {
    width: "90%",
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
});
