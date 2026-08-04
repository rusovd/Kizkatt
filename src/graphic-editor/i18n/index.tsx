import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";

import {
  ENGLISH_TRANSLATIONS,
  type EnglishTranslations
} from "./en";

export type Locale = "en";

export const SUPPORTED_LOCALES: ReadonlyArray<{
  id: Locale;
  label: string;
}> = [{ id: "en", label: ENGLISH_TRANSLATIONS.language.english }];

const DEFAULT_LOCALE: Locale = "en";
const LOCALE_STORAGE_KEY = "kizkatt:graphic-editor:i18n:locale";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  strings: EnglishTranslations;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const storedValue = window.localStorage.getItem(LOCALE_STORAGE_KEY);

  return storedValue === "en" ? storedValue : DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(readStoredLocale);

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        setLocaleState(nextLocale);
        window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
      },
      strings: ENGLISH_TRANSLATIONS
    }),
    [locale]
  );

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const contextValue = useContext(I18nContext);

  if (!contextValue) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return contextValue;
}
