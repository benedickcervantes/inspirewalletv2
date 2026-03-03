import { createTicket, type CreateTicketDto } from "@/lib/tickets";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface TicketCreationProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (ticketId: string) => void;
  accessToken: string;
}

export default function TicketCreation({
  open,
  onClose,
  onSuccess,
  accessToken,
}: TicketCreationProps) {
  const [formValue, setFormValue] = useState<CreateTicketDto>({
    title: "",
    description: "",
    priority: "MEDIUM",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formValue.title.trim()) {
      Alert.alert("Error", "Please enter a ticket title");
      return;
    }

    if (!formValue.description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }

    setLoading(true);
    try {
      console.log("[TicketCreation] Submitting:", formValue);
      console.log("[TicketCreation] Token:", accessToken ? `${accessToken.substring(0, 20)}...` : "NO TOKEN");
      const result = await createTicket(accessToken, formValue);
      console.log("[TicketCreation] Success:", result);
      Alert.alert("Success", `Ticket created! ID: ${result.id}`);
      setFormValue({ title: "", description: "", priority: "MEDIUM" });
      onSuccess?.(result.id);
      onClose();
    } catch (error: any) {
      console.log("[TicketCreation] Error:", error);
      Alert.alert("Error", error.message || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Ticket</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#E15816" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

      <ScrollView style={styles.content}>
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.formIconContainer}>
              <Ionicons name="ticket" size={24} color="#E15816" />
            </View>
            <View>
              <Text style={styles.formTitle}>Create Support Ticket</Text>
              <Text style={styles.formSubtitle}>Describe your issue in detail</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Title <Text style={styles.required}>*</Text>
            </Text>
          <TextInput
            style={styles.input}
            placeholder="Brief description of your issue"
            value={formValue.title}
            onChangeText={(value) =>
              setFormValue({ ...formValue, title: value })
            }
            editable={!loading}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Detailed description of your issue"
            value={formValue.description}
            onChangeText={(value) =>
              setFormValue({ ...formValue, description: value })
            }
            multiline
            numberOfLines={4}
            editable={!loading}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityButtonsContainer}>
            {["LOW", "MEDIUM", "HIGH"].map((priority) => (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.priorityButton,
                  formValue.priority === priority && styles.priorityButtonActive,
                ]}
                onPress={() =>
                  setFormValue({
                    ...formValue,
                    priority: priority as "LOW" | "MEDIUM" | "HIGH",
                  })
                }
              >
                <Text
                  style={[
                    styles.priorityButtonText,
                    formValue.priority === priority && styles.priorityButtonTextActive,
                  ]}
                >
                  {priority}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Category (Optional)</Text>
          <TextInput
            style={[styles.input, styles.categoryTextArea]}
            placeholder="e.g., Account, Payment, Technical"
            value={formValue.category || ""}
            onChangeText={(value) =>
              setFormValue({ ...formValue, category: value })
            }
            editable={!loading}
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Create Ticket</Text>
          )}
        </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#E15816",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E15816",
  },
  backButtonContainer: {
    padding: 8,
    marginLeft: -8,
  },
  closeButton: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(225, 88, 22, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 10,
  },
  required: {
    color: "#E15816",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  categoryTextArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
  },
  dropdownPlaceholder: {
    color: "#9E9E9E",
    fontWeight: "400",
  },
  priorityButtonsContainer: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  priorityButtonActive: {
    backgroundColor: "#E15816",
    borderColor: "#E15816",
  },
  priorityButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  priorityButtonTextActive: {
    color: "#FFFFFF",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  submitButton: {
    backgroundColor: "#E15816",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 32,
    shadowColor: "#E15816",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalContent: {
    padding: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "#F9F9F9",
  },
  optionRowSelected: {
    backgroundColor: "rgba(225, 88, 22, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(225, 88, 22, 0.3)",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
});
