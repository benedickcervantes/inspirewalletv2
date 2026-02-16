import React from "react";
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  ScrollView,
  Platform,
} from "react-native";

const CARD_MAX_WIDTH = 560;
const HORIZONTAL_MARGIN = 20;
const CONTENT_PADDING = 20;

export default function LoanTab() {
  const { width: windowWidth } = useWindowDimensions();

  const isWeb = Platform.OS === "web";
  const cardWidth = isWeb
    ? Math.min(windowWidth - HORIZONTAL_MARGIN * 2, CARD_MAX_WIDTH)
    : windowWidth - HORIZONTAL_MARGIN * 2;

  const cardStyle = [
    styles.card,
    {
      width: cardWidth,
      padding: Math.max(CONTENT_PADDING, Math.min(24, windowWidth * 0.05)),
    },
  ];

  const content = (
    <View style={[styles.cardWrapper, isWeb && { width: "100%", maxWidth: windowWidth }]}>
    <View style={cardStyle}>
      <Text style={[styles.label, { fontSize: Math.max(14, Math.min(18, windowWidth * 0.04)) }]}>
        Loans
      </Text>
      <Text style={[styles.placeholder, { fontSize: Math.max(12, Math.min(15, windowWidth * 0.035)) }]}>
        Loan features coming soon.
      </Text>
    </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { minHeight: isWeb ? "60vh" : undefined }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingHorizontal: HORIZONTAL_MARGIN,
    alignItems: "center",
  },
  cardWrapper: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  card: {
    marginVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  placeholder: {
    color: "#999",
  },
});
