import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { auth, firestore } from "../configs/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { t } from "../utils/languageUtils";
import { getRTLStyles } from "../utils/rtlUtils";

const HeaderGN = () => {
  const [greeting, setGreeting] = useState("");
  const [userLanguage, setUserLanguage] = useState("english");

  // Function to fetch user language
  const fetchUserLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserLanguage(userData.preferredLanguage || "english");
        }
      }
    } catch (error) {
      console.error("Error fetching user language:", error);
      setUserLanguage("english");
    }
  };

  useEffect(() => {
    const updateGreeting = () => {
      // Get current time in Philippine timezone (Asia/Manila)
      const now = new Date();
      const philippineHour = parseInt(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Manila",
          hour12: false,
          hour: "numeric",
        })
      );

      let greetingKey = "";

      if (philippineHour >= 5 && philippineHour < 12) {
        greetingKey = "headerGreetings.goodMorning";
      } else if (philippineHour >= 12 && philippineHour < 18) {
        greetingKey = "headerGreetings.goodAfternoon";
      } else {
        greetingKey = "headerGreetings.goodEvening";
      }

      const translatedGreeting = t(userLanguage, greetingKey);
      setGreeting(translatedGreeting);
    };

    // Update greeting immediately
    updateGreeting();

    // Update greeting every minute to handle day changes
    const interval = setInterval(updateGreeting, 60000);

    return () => clearInterval(interval);
  }, [userLanguage]);

  // Fetch user language on component mount and listen for real-time changes
  useEffect(() => {
    fetchUserLanguage();
    
    // Set up real-time listener for language changes
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(firestore, "users", user.uid);
      const unsubscribeLanguage = onSnapshot(userRef, (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const newLanguage = userData.preferredLanguage || "english";
          setUserLanguage(prevLanguage => {
            // Only update if the language actually changed
            if (prevLanguage !== newLanguage) {
              console.log(`HeaderGN: Language changed from ${prevLanguage} to ${newLanguage}`);
              return newLanguage;
            }
            return prevLanguage;
          });
        }
      });

      return () => unsubscribeLanguage();
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={[styles.greetingText, getRTLStyles(userLanguage)]}>
        {t(userLanguage, "headerGreetings.hi")} {greeting}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
});

export default HeaderGN;
