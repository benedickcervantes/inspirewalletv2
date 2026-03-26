import React, { createContext, useContext, useMemo, useState } from "react";

interface LanguageModalContextValue {
  languageModalVisible: boolean;
  openLanguageModal: () => void;
  closeLanguageModal: () => void;
}

const LanguageModalContext = createContext<LanguageModalContextValue | null>(
  null,
);

export function LanguageModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const value = useMemo(
    () => ({
      languageModalVisible,
      openLanguageModal: () => setLanguageModalVisible(true),
      closeLanguageModal: () => setLanguageModalVisible(false),
    }),
    [languageModalVisible],
  );

  return (
    <LanguageModalContext.Provider value={value}>
      {children}
    </LanguageModalContext.Provider>
  );
}

export function useLanguageModal(): LanguageModalContextValue {
  const ctx = useContext(LanguageModalContext);
  if (!ctx) {
    throw new Error("useLanguageModal must be used within LanguageModalProvider");
  }
  return ctx;
}
