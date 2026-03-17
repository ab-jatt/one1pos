import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { getTranslation, translations } from '../translations/translations';
import { Api } from '../services/api';

export type Language = 'en' | 'es' | 'ru' | 'de' | 'ur' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const isSupportedLanguage = (lang: string): lang is Language =>
  ['en', 'es', 'ru', 'de', 'ur', 'ar'].includes(lang);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('appLanguage') as Language | null;
    return saved || 'en';
  });

  useEffect(() => {
    const applyStoreSettings = async () => {
      if (!localStorage.getItem('nexus_auth_token')) return;

      try {
        const settings = await Api.settings.get();
        if (!isSupportedLanguage(settings.language)) {
          return;
        }

        setLanguageState(settings.language);
        localStorage.setItem('appLanguage', settings.language);
        localStorage.setItem('loginLanguage', settings.language);
      } catch {
        // Keep current language if settings service is unavailable.
      }
    };

    applyStoreSettings();

    const onSettingsChanged = () => {
      applyStoreSettings();
    };

    window.addEventListener('nexus-auth-changed', onSettingsChanged);
    window.addEventListener('store-settings-updated', onSettingsChanged);

    return () => {
      window.removeEventListener('nexus-auth-changed', onSettingsChanged);
      window.removeEventListener('store-settings-updated', onSettingsChanged);
    };
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('appLanguage', lang);
    localStorage.setItem('loginLanguage', lang); // Sync with login
    // Dispatch storage event for other components
    window.dispatchEvent(new Event('storage'));
  }, []);

  const t = (key: string): string => {
    return getTranslation(language, key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
