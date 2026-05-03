import type { Currency } from '@/schemas/charts';
import { createIsomorphicFn } from '@tanstack/react-start';

export const USER_CURRENCY_STORAGE_KEY = 'user-currency';
export const USER_INFLATION_ADJUSTED_STORAGE_KEY = 'user-inflation-adjusted';

export const DEFAULT_CURRENCY: Currency = 'RON';
export const DEFAULT_INFLATION_ADJUSTED = false;
const PREFERENCE_COOKIE_MAX_AGE_DAYS = 365;

const VALID_CURRENCIES: readonly Currency[] = ['RON', 'EUR', 'USD'];

function parseStoredValue(value: string | null): unknown | null {
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeCurrency(value: unknown): Currency | null {
  if (typeof value !== 'string') return null;
  if (VALID_CURRENCIES.includes(value as Currency)) return value as Currency;
  return null;
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

const readRequestCookie = createIsomorphicFn()
  .client(async (_name: string): Promise<string | null> => null)
  .server(async (name: string): Promise<string | null> => {
    const { getCookie } = await import('@tanstack/react-start/server');
    return getCookie(name) ?? null;
  });

export function readClientCurrencyPreference(): Currency | null {
  if (typeof window === 'undefined') return null;
  try {
    const localValue = normalizeCurrency(
      parseStoredValue(window.localStorage.getItem(USER_CURRENCY_STORAGE_KEY))
    );
    if (localValue) return localValue;
  } catch {
    // Fall back to the cookie when localStorage is unavailable.
  }
  return normalizeCurrency(readCookieValue(USER_CURRENCY_STORAGE_KEY));
}

export function readClientInflationAdjustedPreference(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const localValue = normalizeBoolean(
      parseStoredValue(window.localStorage.getItem(USER_INFLATION_ADJUSTED_STORAGE_KEY))
    );
    if (localValue !== null) return localValue;
  } catch {
    // Fall back to the cookie when localStorage is unavailable.
  }
  return normalizeBoolean(readCookieValue(USER_INFLATION_ADJUSTED_STORAGE_KEY));
}

export async function readUserCurrencyPreference(): Promise<Currency> {
  const requestCookieValue = await readRequestCookie(USER_CURRENCY_STORAGE_KEY);
  if (requestCookieValue !== null) {
    return normalizeCurrency(requestCookieValue) ?? DEFAULT_CURRENCY;
  }
  return readClientCurrencyPreference() ?? DEFAULT_CURRENCY;
}

export async function readUserInflationAdjustedPreference(): Promise<boolean> {
  const requestCookieValue = await readRequestCookie(
    USER_INFLATION_ADJUSTED_STORAGE_KEY
  );
  if (requestCookieValue !== null) {
    return normalizeBoolean(requestCookieValue) ?? DEFAULT_INFLATION_ADJUSTED;
  }
  const clientValue = readClientInflationAdjustedPreference();
  return clientValue ?? DEFAULT_INFLATION_ADJUSTED;
}

export function setPreferenceCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  const maxAgeSeconds = PREFERENCE_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  const cookieParts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'SameSite=Lax',
  ];
  if (window.location.protocol === 'https:') {
    cookieParts.push('Secure');
  }
  document.cookie = cookieParts.join('; ');
}
