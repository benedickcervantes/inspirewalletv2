import { createTicket, type CreateTicketDto } from "@/lib/tickets";
import { Picker } from "@react-native-picker/picker";
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
    View,
} from "react-native";

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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Ticket</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief description of your issue"
              value={formValue.title}
              onChangeText={(value) =>
                setFormValue({ ...formValue, title: value })
              }
              editable={!loading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description *</Text>
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
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formValue.priority}
                onValueChange={(value: any) =>
                  setFormValue({
                    ...formValue,
                    priority: value as "LOW" | "MEDIUM" | "HIGH",
                  })
                }
                enabled={!loading}
              >
                <Picker.Item label="Low" value="LOW" />
                <Picker.Item label="Medium" value="MEDIUM" />
                <Picker.Item label="High" value="HIGH" />
              </Picker>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Category (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Account, Payment, Technical"
              value={formValue.category || ""}
              onChangeText={(value) =>
                setFormValue({ ...formValue, category: value })
              }
              editable={!loading}
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
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  closeButton: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  submitButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
