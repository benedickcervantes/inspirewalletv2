import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { getNotifications } from "../configs/api";

interface UnreadNotificationsContextValue {
  unreadCount: number;
  setUnreadCount: (count: number | ((prev: number) => number)) => void;
  refetchUnreadCount: () => Promise<void>;
}

const UnreadNotificationsContext =
  createContext<UnreadNotificationsContextValue | undefined>(undefined);

export const UnreadNotificationsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [unreadCount, setUnreadCountState] = useState(0);

  const setUnreadCount = useCallback(
    (countOrUpdater: number | ((prev: number) => number)) => {
      setUnreadCountState((prev) =>
        typeof countOrUpdater === "function" ? countOrUpdater(prev) : countOrUpdater,
      );
    },
    [],
  );

  const refetchUnreadCount = useCallback(async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      if (!accessToken) {
        setUnreadCountState(0);
        return;
      }
      const result = await getNotifications(accessToken, { limit: 50 });
      if (result.success && result.data) {
        const count = (
          result.data as { isRead?: boolean }[]
        ).filter((n) => !n.isRead).length;
        setUnreadCountState(count);
      }
    } catch (error) {
      if (__DEV__) {
        console.error("[UnreadNotifications] Failed to refetch count:", error);
      }
    }
  }, []);

  return (
    <UnreadNotificationsContext.Provider
      value={{ unreadCount, setUnreadCount, refetchUnreadCount }}
    >
      {children}
    </UnreadNotificationsContext.Provider>
  );
};

export function useUnreadNotifications(): UnreadNotificationsContextValue {
  const ctx = useContext(UnreadNotificationsContext);
  if (ctx === undefined) {
    throw new Error(
      "useUnreadNotifications must be used within UnreadNotificationsProvider",
    );
  }
  return ctx;
}
