import { useEffect, useState } from "react";

const isQuotaExceededError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED";
  }
  return false;
};

export const usePersistedState = <T>(key: string, initialValue: T) => {
    const [value, setValue] = useState<T>(() => {
        if (typeof window === "undefined") {
            return initialValue;
        }
        try {
            const storedValue = localStorage.getItem(key);
            return storedValue ? JSON.parse(storedValue) : initialValue;
        } catch (error) {
            console.error(`Error parsing stored value for key ${key}:`, error);
            return initialValue;
        }
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            if (isQuotaExceededError(error)) {
                console.warn(`localStorage quota exceeded for key ${key}. State will persist in memory only.`);
            } else {
                console.error(`Failed to persist state for key ${key}:`, error);
            }
        }
    }, [key, value]);

    return [value, setValue] as const;
};

export const getPersistedState = <T>(key: string, initialValue: T) => {
    if (typeof window === 'undefined') return initialValue;
    try {
        const storedValue = localStorage.getItem(key);
        return storedValue ? JSON.parse(storedValue) : initialValue;
    } catch (error) {
        console.error(`Error reading persisted state for key ${key}:`, error);
        return initialValue;
    }
};
