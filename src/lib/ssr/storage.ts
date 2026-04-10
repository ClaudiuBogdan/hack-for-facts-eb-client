/**
 * SSR-safe storage utilities.
 * These functions safely handle localStorage operations during SSR
 * by returning safe defaults when running on the server.
 */

const isBrowser = typeof window !== 'undefined';

/**
 * Safely get an item from localStorage.
 * Returns null during SSR or if localStorage is unavailable.
 */
export function safeLocalStorageGetItem(key: string): string | null {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    // Handle cases like private browsing mode or quota exceeded
    return null;
  }
}

/**
 * Safely set an item in localStorage.
 * Returns whether the write reached localStorage.
 */
export function safeLocalStorageSetItem(key: string, value: string): boolean {
  if (!isBrowser) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // Silently fail (quota exceeded, private mode, etc.)
    return false;
  }
}

/**
 * Safely remove an item from localStorage.
 * Returns whether the removal reached localStorage.
 */
export function safeLocalStorageRemoveItem(key: string): boolean {
  if (!isBrowser) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    // Silently fail
    return false;
  }
}

/**
 * Check if code is running in a browser environment.
 */
export function isServerSide(): boolean {
  return !isBrowser;
}

/**
 * Check if code is running in a browser environment.
 */
export function isClientSide(): boolean {
  return isBrowser;
}
