import { useEffect } from 'react';
import { usePersistedState } from './usePersistedState';
import {
    DEFAULT_CURRENCY,
    readClientCurrencyPreference,
    setPreferenceCookie,
    USER_CURRENCY_STORAGE_KEY,
} from '@/lib/user-preferences';

type CurrencyCode = 'RON' | 'EUR' | 'USD';

export function useUserCurrency(initialCurrency?: CurrencyCode) {
    const shouldUseHydrationCurrency = initialCurrency != null;
    const [currency, setCurrency] = usePersistedState<CurrencyCode>(
        USER_CURRENCY_STORAGE_KEY,
        shouldUseHydrationCurrency
            ? initialCurrency
            : (readClientCurrencyPreference() ?? DEFAULT_CURRENCY),
        {
            readStoredValueOnInit: !shouldUseHydrationCurrency,
            skipInitialPersist: shouldUseHydrationCurrency,
        },
    );

    useEffect(() => {
        if (!shouldUseHydrationCurrency) return;
        const clientCurrency = readClientCurrencyPreference();
        if (clientCurrency && clientCurrency !== currency) {
            setCurrency(clientCurrency);
        }
    }, [currency, setCurrency, shouldUseHydrationCurrency]);

    useEffect(() => {
        setPreferenceCookie(USER_CURRENCY_STORAGE_KEY, currency);
    }, [currency]);

    return [currency, setCurrency] as const;
}
