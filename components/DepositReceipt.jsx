import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Animated,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import * as ImagePicker from "expo-image-picker";
import { ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { storage } from "../configs/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

const DepositReceipt = ({
  visible,
  onClose,
  depositRequests = [],
  isLoading = false,
  onRefresh,
  userId,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Receipt upload modal state
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const db = getFirestore();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.7,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // Format HH:MM
  };

  const getStatusColor = (isApproved) => {
    return isApproved ? "#10B981" : "#F59E0B";
  };

  const getStatusText = (isApproved) => {
    return isApproved ? "Approved" : "Pending";
  };

  const getStatusIcon = (isApproved) => {
    return isApproved ? "checkmark-circle" : "time";
  };

  // Helper function to check if deposit is pending
  const isPendingDeposit = (deposit) => {
    return deposit.status === "pending";
  };

  const handleUploadReceipt = (deposit) => {
    setSelectedDeposit(deposit);
    setReceiptModalVisible(true);
    setImageUri(null);
  };

  const selectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      alert("Failed to pick image");
    }
  };

  const uploadReceipt = async () => {
    if (!imageUri || !selectedDeposit || !userId) {
      alert("Please select an image first");
      return;
    }

    setUploading(true);
    setUploadProgress("Uploading receipt...");

    try {
      // Upload image to Firebase Storage
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const receiptId = `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const storageRef = ref(storage, `depositReceipts/${userId}/${receiptId}.jpg`);
      
      await uploadBytes(storageRef, blob);
      const receiptUrl = await getDownloadURL(storageRef);

      // Update the deposit document with the receipt URL
      const depositRef = doc(db, "users", userId, "depositRequest", selectedDeposit.depositId);
      await updateDoc(depositRef, {
        receiptUrl: receiptUrl,
        receiptUploadedAt: new Date(),
      });

      setUploadProgress("Receipt uploaded successfully!");
      
      // Close modal and refresh
      setTimeout(() => {
        setReceiptModalVisible(false);
        setSelectedDeposit(null);
        setImageUri(null);
        setUploading(false);
        setUploadProgress("");
        onRefresh(); // Refresh the deposit list
      }, 1500);

    } catch (error) {
      console.error("Error uploading receipt:", error);
      setUploadProgress("Failed to upload receipt. Please try again.");
      setUploading(false);
    }
  };

  const closeReceiptModal = () => {
    if (!uploading) {
      setReceiptModalVisible(false);
      setSelectedDeposit(null);
      setImageUri(null);
      setUploadProgress("");
    }
  };

  const DepositRequestCard = ({ request, index }) => (
    <Animated.View 
      style={[
        styles.depositCard,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.depositIconContainer}>
            <Ionicons 
              name="card" 
              size={20} 
              color={Colors.redTheme.background} 
            />
          </View>
          <View style={styles.depositInfo}>
            <Text style={styles.depositType}>
              {request.depositType || "Deposit"}
            </Text>
            <Text style={styles.depositId}>
              ID: {request.depositId?.slice(-8) || "N/A"}
            </Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(request.isApproved) }
        ]}>
          <Ionicons 
            name={getStatusIcon(request.isApproved)} 
            size={12} 
            color="white" 
            style={styles.statusIcon}
          />
          <Text style={styles.statusText}>
            {getStatusText(request.isApproved)}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(parseFloat(request.amount) || 0)}
          </Text>
          {request.currency && request.currency !== "PHP" && (
            <Text style={styles.currencyText}>
              ({request.amount} {request.currency})
            </Text>
          )}
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>
              {request.Name || "N/A"}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>
              {request.emailAddress || "N/A"}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>
              {formatDate(request.date) || "N/A"}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>
              {formatTime(request.time) || "N/A"}
            </Text>
          </View>

          {request.contractType && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Contract</Text>
              <Text style={styles.detailValue}>
                {request.contractType.replace('_', ' ')}
              </Text>
            </View>
          )}

          
        </View>

        {request.receiptUrl ? (
          <View style={styles.receiptContainer}>
            <Text style={styles.receiptLabel}>Receipt</Text>
            <TouchableOpacity style={styles.receiptImageContainer}>
              <Image 
                source={{ uri: request.receiptUrl }} 
                style={styles.receiptImage}
                resizeMode="cover"
              />
              <View style={styles.receiptOverlay}>
                <Ionicons name="eye" size={20} color="white" />
              </View>
            </TouchableOpacity>
          </View>
        ) : isPendingDeposit(request) && (
          <View style={styles.uploadReceiptContainer}>
            <TouchableOpacity 
              style={styles.uploadReceiptButton}
              onPress={() => handleUploadReceipt(request)}
            >
              <Ionicons name="cloud-upload-outline" size={20} color={Colors.redTheme.background} />
              <Text style={styles.uploadReceiptText}>Upload Receipt</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );

  if (!visible) {
    console.log("DepositReceipt modal is not visible");
    return null;
  }
  
  console.log("DepositReceipt modal is visible, depositRequests:", depositRequests.length);

  return (
    <Modal transparent={true} animationType="none" visible={visible}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
            <Animated.View
              style={[
                styles.modalContainer,
                { 
                  transform: [
                    { scale: scaleAnim },
                    { translateY: slideAnim }
                  ] 
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={styles.headerContent}>
                  <View style={styles.headerIconContainer}>
                    <Ionicons 
                      name="receipt" 
                      size={24} 
                      color={Colors.redTheme.background} 
                    />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.modalTitle}>Pending Deposits</Text>
                    <Text style={styles.modalSubtitle}>
                      {depositRequests.length} request{depositRequests.length !== 1 ? 's' : ''} pending
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={onClose}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator 
                      size="large" 
                      color={Colors.redTheme.background} 
                    />
                    <Text style={styles.loadingText}>Loading deposits...</Text>
                  </View>
                ) : depositRequests.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons 
                      name="receipt-outline" 
                      size={64} 
                      color="#ccc" 
                    />
                    <Text style={styles.emptyTitle}>No Pending Deposits</Text>
                    <Text style={styles.emptySubtitle}>
                      All your deposit requests have been processed
                    </Text>
                  </View>
                ) : (
                  depositRequests.map((request, index) => (
                    <DepositRequestCard 
                      key={request.depositId || index} 
                      request={request} 
                      index={index}
                    />
                  ))
                )}
              </ScrollView>

              {depositRequests.length > 0 && (
                <View style={styles.footer}>
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={onRefresh}
                    disabled={isLoading}
                  >
                    <Ionicons 
                      name="refresh" 
                      size={20} 
                      color={Colors.redTheme.background} 
                    />
                    <Text style={styles.refreshButtonText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </BlurView>
        ) : (
          <View style={styles.androidModalOverlay}>
            <Animated.View
              style={[
                styles.modalContainer,
                { 
                  transform: [
                    { scale: scaleAnim },
                    { translateY: slideAnim }
                  ] 
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={styles.headerContent}>
                  <View style={styles.headerIconContainer}>
                    <Ionicons 
                      name="receipt" 
                      size={24} 
                      color={Colors.redTheme.background} 
                    />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.modalTitle}>Pending Deposits</Text>
                    <Text style={styles.modalSubtitle}>
                      {depositRequests.length} request{depositRequests.length !== 1 ? 's' : ''} pending
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={onClose}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator 
                      size="large" 
                      color={Colors.redTheme.background} 
                    />
                    <Text style={styles.loadingText}>Loading deposits...</Text>
                  </View>
                ) : depositRequests.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons 
                      name="receipt-outline" 
                      size={64} 
                      color="#ccc" 
                    />
                    <Text style={styles.emptyTitle}>No Pending Deposits</Text>
                    <Text style={styles.emptySubtitle}>
                      All your deposit requests have been processed
                    </Text>
                  </View>
                ) : (
                  depositRequests.map((request, index) => (
                    <DepositRequestCard 
                      key={request.depositId || index} 
                      request={request} 
                      index={index}
                    />
                  ))
                )}
              </ScrollView>

              {depositRequests.length > 0 && (
                <View style={styles.footer}>
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={onRefresh}
                    disabled={isLoading}
                  >
                    <Ionicons 
                      name="refresh" 
                      size={20} 
                      color={Colors.redTheme.background} 
                    />
                    <Text style={styles.refreshButtonText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </View>
        )}

        {/* Receipt Upload Modal */}
        <Modal
          visible={receiptModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={closeReceiptModal}
        >
          <View style={styles.receiptModalOverlay}>
            <View style={styles.receiptModalContainer}>
              <View style={styles.receiptModalHeader}>
                <Text style={styles.receiptModalTitle}>Upload Receipt</Text>
                <TouchableOpacity onPress={closeReceiptModal} style={styles.receiptCloseButton}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.receiptModalContent}>
                {selectedDeposit && (
                  <View style={styles.depositInfoCard}>
                    <Text style={styles.depositInfoTitle}>Deposit Information</Text>
                    <Text style={styles.depositInfoText}>
                      ID: {selectedDeposit.depositId?.slice(-8) || "N/A"}
                    </Text>
                    <Text style={styles.depositInfoText}>
                      Amount: {formatCurrency(parseFloat(selectedDeposit.amount) || 0)}
                    </Text>
                    <Text style={styles.depositInfoText}>
                      Type: {selectedDeposit.depositType || "N/A"}
                    </Text>
                  </View>
                )}

                <View style={styles.uploadSection}>
                  <Text style={styles.uploadSectionTitle}>Select Receipt Image</Text>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={selectImage}
                    disabled={uploading}
                  >
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Ionicons name="camera-outline" size={48} color={Colors.redTheme.background} />
                        <Text style={styles.uploadPlaceholderText}>Tap to select receipt image</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {uploadProgress ? (
                  <View style={styles.progressContainer}>
                    <ActivityIndicator size="small" color={Colors.redTheme.background} />
                    <Text style={styles.progressText}>{uploadProgress}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.submitUploadButton,
                    (!imageUri || uploading) && styles.submitUploadButtonDisabled
                  ]}
                  onPress={uploadReceipt}
                  disabled={!imageUri || uploading}
                >
                  <Text style={styles.submitUploadButtonText}>
                    {uploading ? "Uploading..." : "Upload Receipt"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: "transparent",
  },
  blurContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  androidModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    minHeight: 600,
    maxHeight: "90%",
    width: "95%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 35,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fafbfc",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    minHeight: 400,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 20,
  },
  depositCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  depositIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  depositInfo: {
    flex: 1,
  },
  depositType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  depositId: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  cardBody: {
    flex: 1,
  },
  amountContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  amountLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  currencyText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  detailsGrid: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  receiptContainer: {
    marginTop: 8,
  },
  receiptLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 8,
  },
  receiptImageContainer: {
    position: "relative",
    width: "100%",
    height: 120,
    borderRadius: 8,
    overflow: "hidden",
  },
  receiptImage: {
    width: "100%",
    height: "100%",
  },
  receiptOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  refreshButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.redTheme.background,
  },

  // Upload Receipt Button Styles
  uploadReceiptContainer: {
    marginTop: 16,
  },
  uploadReceiptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  uploadReceiptText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.redTheme.background,
  },

  // Receipt Upload Modal Styles
  receiptModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  receiptModalContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  receiptModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fafbfc",
  },
  receiptModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  receiptCloseButton: {
    padding: 8,
    backgroundColor: "#f2f2f2",
    borderRadius: 16,
  },
  receiptModalContent: {
    padding: 24,
  },
  depositInfoCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  depositInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  depositInfoText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  uploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  uploadedImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    resizeMode: "cover",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  progressText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.redTheme.background,
    fontWeight: "500",
  },
  submitUploadButton: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 16,
  },
  submitUploadButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitUploadButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DepositReceipt;
