import React, { useState, useEffect } from 'react';
import Notification from '../../components/Notification';
import userService from "../../services/userService";

export default function NotificationPage() {
  const [userLanguage, setUserLanguage] = useState('English');

  const fetchUserLanguage = async () => {
    try {
      const profile = await userService.getUserProfile();
      setUserLanguage(profile?.preferredLanguage || 'English');
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  return <Notification language={userLanguage} />;
}
