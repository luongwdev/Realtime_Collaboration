"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Locale, messages, type MessageKey } from "@/i18n/messages";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const I18N_STORAGE_KEY = "teamflow_locale";
const I18nContext = createContext<I18nContextValue | null>(null);

function readMessage(locale: Locale, key: MessageKey): string {
  const parts = key.split(".");
  let cursor: unknown = messages[locale];
  for (const part of parts) {
    if (typeof cursor !== "object" || cursor === null || !(part in cursor)) {
      return key;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === "string" ? cursor : key;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem(I18N_STORAGE_KEY);
    if (stored === "en" || stored === "vi") {
      setLocaleState(stored);
      return;
    }
    const browserLocale = navigator.language.toLowerCase();
    const detected = browserLocale.startsWith("vi") ? "vi" : "en";
    setLocaleState(detected);
    localStorage.setItem(I18N_STORAGE_KEY, detected);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (next) => {
        setLocaleState(next);
        localStorage.setItem(I18N_STORAGE_KEY, next);
      },
      t: (key) => readMessage(locale, key),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
