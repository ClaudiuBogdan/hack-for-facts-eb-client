import { useEffect, useRef, useState } from "react";

const isQuotaExceededError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED";
  }
  return false;
};

export const usePersistedState = <T>(
    key: string,
    initialValue: T,
    options: {
        readonly readStoredValueOnInit?: boolean;
        readonly skipInitialPersist?: boolean;
        /**
         * Start from `initialValue` and apply the stored value once mounted:
         * for state that shapes server-rendered markup, which the first
         * client render must match. The default is not written over the
         * stored value meanwhile.
         */
        readonly readStoredValueAfterMount?: boolean;
    } = {},
) => {
    const hasPersistedRef = useRef(false);
    const readsAfterMount = options.readStoredValueAfterMount === true;

    // Initialize from localStorage synchronously so the stored value is
    // available on the very first render (no flash of the default).
    const [value, setValue] = useState<T>(() => {
        if (readsAfterMount || options.readStoredValueOnInit === false) return initialValue;
        if (typeof window === 'undefined') return initialValue;
        try {
            const storedValue = localStorage.getItem(key);
            return storedValue !== null ? JSON.parse(storedValue) : initialValue;
        } catch (error) {
            console.error(`Error parsing stored value for key ${key}:`, error);
            return initialValue;
        }
    });

    useEffect(() => {
        if (!readsAfterMount) return;
        try {
            const storedValue = localStorage.getItem(key);
            if (storedValue !== null) setValue(JSON.parse(storedValue));
        } catch (error) {
            console.error(`Error parsing stored value for key ${key}:`, error);
        }
    }, [key, readsAfterMount]);

    useEffect(() => {
        if ((options.skipInitialPersist || readsAfterMount) && !hasPersistedRef.current) {
            hasPersistedRef.current = true;
            return;
        }
        hasPersistedRef.current = true;

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
    }, [key, options.skipInitialPersist, readsAfterMount, value]);

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
