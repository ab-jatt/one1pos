export type SupportedCurrency = 'USD' | 'EUR' | 'RUB' | 'PKR' | 'GBP' | 'AED';

export interface CurrencyConfig {
  currencyCode: SupportedCurrency;
  currencyName: string;
  currencySymbol: string;
  locale: string;
}

export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

export const CURRENCY_CONFIG: Record<SupportedCurrency, CurrencyConfig> = {
  USD: {
    currencyCode: 'USD',
    currencyName: 'US Dollar',
    currencySymbol: '$',
    locale: 'en-US',
  },
  EUR: {
    currencyCode: 'EUR',
    currencyName: 'Euro',
    currencySymbol: '€',
    locale: 'de-DE',
  },
  RUB: {
    currencyCode: 'RUB',
    currencyName: 'Russian Ruble',
    currencySymbol: '₽',
    locale: 'ru-RU',
  },
  PKR: {
    currencyCode: 'PKR',
    currencyName: 'Pakistani Rupee',
    currencySymbol: 'Rs',
    locale: 'en-PK',
  },
  GBP: {
    currencyCode: 'GBP',
    currencyName: 'British Pound',
    currencySymbol: '£',
    locale: 'en-GB',
  },
  AED: {
    currencyCode: 'AED',
    currencyName: 'UAE Dirham',
    currencySymbol: 'د.إ',
    locale: 'ar-AE',
  },
};

export const AVAILABLE_CURRENCIES = Object.values(CURRENCY_CONFIG);

export const isSupportedCurrency = (value: string): value is SupportedCurrency =>
  value in CURRENCY_CONFIG;

export const getCurrencyConfig = (currencyCode: string): CurrencyConfig => {
  if (isSupportedCurrency(currencyCode)) {
    return CURRENCY_CONFIG[currencyCode];
  }
  return CURRENCY_CONFIG[DEFAULT_CURRENCY];
};
