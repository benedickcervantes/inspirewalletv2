import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import * as api from "../../configs/api";

interface GoldEliteRenewalCardProps {
  accessToken: string;
  expiryDate: string;
  onRenewalSuccess?: () => void;
  onRenewalError?: (error: string) => void;
}

export default function GoldEliteRenewalCard({
  accessToken,
  expiryDate,
  onRenewalSuccess,
  onRenewalError,
}: GoldEliteRenewalCardProps) {
  const [isRenewing, setIsRenewing] = useState(false);

  // Calculate days until expiry
  const getDaysUntilExpiry = (): number => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiry = getDaysUntilExpiry();
  const canRenew = daysUntilExpiry <= 3 && daysUntilExpiry > 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleRenew = async () => {
    setIsRenewing(true);
    try {
      const result = await (api as any).renewCard(accessToken, "GOLD_ELITE");
      if (result.success) {
        Alert.alert(
          "Success",
          "Your Gold Elite subscription has been renewed!",
          [{ text: "OK", onPress: () => onRenewalSuccess?.() }]
        );
      } else {
        const errorMsg = result.error || "Failed to renew subscription";
        Alert.alert("Error", errorMsg, [{ text: "OK" }]);
        onRenewalError?.(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Network error";
      Alert.alert("Error", errorMsg, [{ text: "OK" }]);
      onRenewalError?.(errorMsg);
    } finally {
      setIsRenewing(false);
    }
  };

  if (!canRenew) {
    // Show inactive state when not in renewal window
    return (
      <View style={styles.inactiveCard}>
        <View style={styles.inactiveContent}>
          <View style={styles.inactiveIcon}>
            <Ionicons name="checkmark-circle" size={24} color="#059669" />
          </View>
          <View style={styles.inactiveText}>
            <Text style={styles.inactiveLabel}>Gold Elite Active</Text>
            <Text style={styles.inactiveDate}>
              Expires {formatDate(expiryDate)}
            </Text>
            {daysUntilExpiry > 0 && (
              <Text style={styles.inactiveDays}>
                {daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""} remaining
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Show renewal card when within 3 days
  return (
    <View style={styles.renewalCard}>
      <View style={styles.renewalHeader}>
        <View style={styles.renewalIcon}>
          <Ionicons name="alert-circle" size={24} color="#E25A17" />
        </View>
        <View style={styles.renewalTitle}>
          <Text style={styles.renewalLabel}>Renewal Available</Text>
          <Text style={styles.renewalDays}>
            {daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""} left
          </Text>
        </View>
      </View>

      <View style={styles.renewalDetails}>
        <Text style={styles.renewalDetailText}>
          Your Gold Elite subscription expires on {formatDate(expiryDate)}
        </Text>
        <Text style={styles.renewalPrice}>₱10,000/month</Text>
      </View>

      <TouchableOpacity
        style={[styles.renewalButton, isRenewing && styles.renewalButtonDisabled]}
        onPress={handleRenew}
        disabled={isRenewing}
        activeOpacity={0.7}
      >
        {isRenewing ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.renewalButtonText}>Renewing...</Text>
          </>
        ) : (
          <>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.renewalButtonText}>Renew Now</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Inactive state (more than 3 days remaining)
  inactiveCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  inactiveContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inactiveIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  inactiveText: {
    flex: 1,
  },
  inactiveLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
  },
  inactiveDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  inactiveDays: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },

  // Renewal state (within 3 days)
  renewalCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  renewalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  renewalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF08A",
    justifyContent: "center",
    alignItems: "center",
  },
  renewalTitle: {
    flex: 1,
  },
  renewalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D97706",
  },
  renewalDays: {
    fontSize: 12,
    color: "#B45309",
    marginTop: 2,
  },
  renewalDetails: {
    marginBottom: 12,
  },
  renewalDetailText: {
    fontSize: 12,
    color: "#92400E",
    marginBottom: 6,
    lineHeight: 18,
  },
  renewalPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D97706",
  },
  renewalButton: {
    backgroundColor: "#E25A17",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  renewalButtonDisabled: {
    opacity: 0.7,
  },
  renewalButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
