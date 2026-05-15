'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDictionary, Dictionary, Locale } from './dictionaries';
import { useRouter } from 'next/navigation';

interface I18nContextType {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children, initialLocale }: { children: React.ReactNode, initialLocale: string }) {
  const [locale, setLocaleState] = useState<Locale>((initialLocale as Locale) || 'en');
  const router = useRouter();

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    router.refresh();
  };

  const t = getDictionary(locale);

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
