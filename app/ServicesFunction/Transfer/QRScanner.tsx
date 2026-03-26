import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLanguage } from "../../../context/LanguageContext";
import { pickAndDecodeQR } from "../../../utils/qrUtils";

const getWindow = () => {
  try {
    return (
      require("react-native").Dimensions?.get?.("window") ?? {
        width: 375,
        height: 667,
      }
    );
  } catch {
    return { width: 375, height: 667 };
  }
};
const { width, height } = getWindow();

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (accountNumber: string) => void;
}

export default function QRScanner({
  visible,
  onClose,
  onScan,
}: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
    setTimeout(() => {
      setScanned(false);
      onClose();
    }, 500);
  };

  const { t } = useLanguage();

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <Ionicons name="camera-outline" size={80} color="#E25A17" />
            <Text style={styles.permissionTitle}>
              {t("sendMoney.cameraPermissionRequired")}
            </Text>
            <Text style={styles.permissionMessage}>
              {t("sendMoney.cameraPermissionMessage")}
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <LinearGradient
                colors={["#E25A17", "#F28934"]}
                style={styles.permissionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.permissionButtonText}>
                  {t("sendMoney.grantPermission")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        >
          {/* Header */}
          <LinearGradient
            colors={["rgba(0,0,0,0.8)", "transparent"]}
            style={styles.header}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t("sendMoney.scanQr")}</Text>
            <View style={styles.placeholder} />
          </LinearGradient>

          {/* Scanning Frame */}
          <View style={styles.scannerContainer}>
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Instructions */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.9)"]}
            style={styles.footer}
          >
            <View style={styles.instructionContainer}>
              <Ionicons name="scan" size={40} color="#FFFFFF" />
              <Text style={styles.instructionTitle}>
                {t("sendMoney.positionQrCode")}
              </Text>
              <Text style={styles.instructionText}>
                {t("sendMoney.alignQrFrame")}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginTop: 24,
              }}
            >
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 24,
                }}
                disabled={isProcessing}
                onPress={async () => {
                  try {
                    setIsProcessing(true);
                    setUploadError(null);
                    const data = await pickAndDecodeQR();
                    if (data) {
                      onScan(data);
                      onClose();
                    } else {
                      setUploadError(
                        t("register.noQRFound") ||
                          "No QR code found in the image. Please pick a clearer QR code image.",
                      );
                    }
                  } catch (e) {
                    setUploadError(
                      t("register.errorUnexpected") ||
                        "An unexpected error occurred.",
                    );
                  } finally {
                    setIsProcessing(false);
                  }
                }}
              >
                {isProcessing ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFFF"
                    style={{ marginRight: 10 }}
                  />
                ) : (
                  <Ionicons
                    name="image-outline"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 10 }}
                  />
                )}
                <Text
                  style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 16 }}
                >
                  {isProcessing
                    ? t("register.processing") || "Processing..."
                    : t("register.uploadImage") || "Upload Image"}
                </Text>
              </TouchableOpacity>
            </View>
            {!!uploadError && (
              <View style={styles.errorCard}>
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color="#FFB4B4"
                    style={styles.errorIcon}
                  />
                  <Text style={styles.errorText}>{uploadError}</Text>
                  <TouchableOpacity
                    onPress={() => setUploadError(null)}
                    style={styles.errorCloseButton}
                  >
                    <Ionicons name="close" size={16} color="#FFD2D2" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </LinearGradient>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  placeholder: {
    width: 44,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerFrame: {
    width: width * 0.7,
    height: width * 0.7,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#E25A17",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  footer: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 20,
  },
  instructionContainer: {
    alignItems: "center",
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    opacity: 0.8,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  permissionMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 12,
  },
  permissionGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  errorCard: {
    marginTop: 14,
    backgroundColor: "rgba(190, 38, 38, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 200, 200, 0.4)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 18,
  },
  errorCloseButton: {
    marginLeft: 8,
    padding: 2,
  },
});
