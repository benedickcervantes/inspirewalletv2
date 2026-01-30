import {
  StyleSheet,
  View,
  Text,
  ImageBackground,
  SafeAreaView,
  Platform,
} from "react-native";
import React, { useEffect, useState } from "react";
import TransactionHistory from "../../components/TransactionHistory";
import { useNavigation } from "expo-router";
import { auth, firestore } from "../../configs/firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export default function Index() {
  const navigation = useNavigation();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: "TRANSACTION HISTORY",
    });
  }, [navigation]);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          setUserId(user.uid);
        } else {
          setError("User not logged in");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();
  }, []);

  if (loading) {
    return <Text>Loading...</Text>; // Show loading text while fetching userId
  }

  if (error) {
    return <Text>Error: {error}</Text>; // Show error if any
  }

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea} />
      {userId ? (
        <TransactionHistory userId={userId} />
      ) : (
        <Text>No User ID Available</Text>
      )}
      <SafeAreaView style={styles.androidSafeArea} />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  androidSafeArea: {
    paddingTop: Platform.OS === "android" ? 80 : 0,
    opacity: 0,
  },
});
