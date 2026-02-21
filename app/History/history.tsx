import { useNavigation, useRoute } from "@react-navigation/native";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function History() {
  const navigation = useNavigation();
  const route = useRoute();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#E15816" />
      </TouchableOpacity>
      <Text style={styles.title}>{route.name ?? "History"}</Text>
      <Text style={styles.subtitle}>Transaction history coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  back: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
  },
});
