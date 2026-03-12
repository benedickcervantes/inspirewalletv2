import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, getLanguageCode, normalizeLanguage } from "../constants/locales";
import { getTranslation } from "../translations";

const USER_PREFERRED_LANGUAGE_KEY = "user_preferred_language";

interface LanguageContextValue {
  language: string;
  setLanguage: (label: string) => void;
  t: (key: string, variables?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(USER_PREFERRED_LANGUAGE_KEY).then((stored) => {
      const value = stored && typeof stored === "string" ? stored : "";
      setLanguageState(normalizeLanguage(value));
      setReady(true);
    });
  }, []);

  const setLanguage = useCallback((label: string) => {
    const normalized = normalizeLanguage(label);
    setLanguageState(normalized);
    AsyncStorage.setItem(USER_PREFERRED_LANGUAGE_KEY, normalized);
  }, []);

  const t = useCallback(
    (key: string, variables?: Record<string, string>): string => {
      if (!ready) return key;
      const code = getLanguageCode(language);
      let translated = getTranslation(code, key);
      
      if (variables) {
        Object.entries(variables).forEach(([varKey, varValue]) => {
          translated = translated.replace(new RegExp(`{${varKey}}`, "g"), varValue);
        });
      }
      
      return translated;
    },
    [language, ready]
  );

  const value: LanguageContextValue = { language, setLanguage, t };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
