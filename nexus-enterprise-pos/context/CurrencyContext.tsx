import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { Api } from '../services/api';
import {
  DEFAULT_CURRENCY,
  getCurrencyConfig,
  isSupportedCurrency,
  type SupportedCurrency,
} from '../utils/currencyConfig';

export type Currency = SupportedCurrency;

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (amount: number) => string;
  formatMoney: (amount: number) => string;
  currencySymbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currency') || DEFAULT_CURRENCY;
      return isSupportedCurrency(stored) ? stored : DEFAULT_CURRENCY;
    }
    return DEFAULT_CURRENCY;
  });

  useEffect(() => {
    const applyStoreSettings = async () => {
      if (typeof window === 'undefined') return;
      if (!localStorage.getItem('nexus_auth_token')) return;

      try {
        const settings = await Api.settings.get();
        const normalizedCurrency = String(settings.currency || '').toUpperCase();
        const nextCurrency = isSupportedCurrency(normalizedCurrency)
          ? normalizedCurrency
          : DEFAULT_CURRENCY;

        setCurrencyState(nextCurrency);

        localStorage.setItem('currency', nextCurrency);
      } catch {
        // Keep current values if settings service is temporarily unavailable.
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

  const setCurrency = useCallback((newCurrency: Currency) => {
    setCurrencyState(newCurrency);

    if (typeof window !== 'undefined') {
      localStorage.setItem('currency', newCurrency);
    }
  }, []);

  const currencyConfig = getCurrencyConfig(currency);
  const currencySymbol = currencyConfig.currencySymbol;

  const formatCurrency = (amount: number): string => {
    const localizedAmount = amount.toLocaleString(currencyConfig.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${currencySymbol} ${localizedAmount}`;
  };

  const formatMoney = formatCurrency; // Alias for compatibility

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, formatMoney, currencySymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
