import { useEffect } from 'react';
import { usePersistedState } from './usePersistedState';
import {
  DEFAULT_INFLATION_ADJUSTED,
  readClientInflationAdjustedPreference,
  setPreferenceCookie,
  USER_INFLATION_ADJUSTED_STORAGE_KEY,
} from '@/lib/user-preferences';

export function useUserInflationAdjusted(initialInflationAdjusted?: boolean) {
  const shouldUseHydrationInflationAdjusted = initialInflationAdjusted != null;
  const [inflationAdjusted, setInflationAdjusted] = usePersistedState<boolean>(
    USER_INFLATION_ADJUSTED_STORAGE_KEY,
    shouldUseHydrationInflationAdjusted
      ? initialInflationAdjusted
      : (readClientInflationAdjustedPreference() ?? DEFAULT_INFLATION_ADJUSTED),
    {
      readStoredValueOnInit: !shouldUseHydrationInflationAdjusted,
      skipInitialPersist: shouldUseHydrationInflationAdjusted,
    },
  );

  useEffect(() => {
    if (!shouldUseHydrationInflationAdjusted) return;
    const clientInflationAdjusted = readClientInflationAdjustedPreference();
    if (
      clientInflationAdjusted !== null &&
      clientInflationAdjusted !== inflationAdjusted
    ) {
      setInflationAdjusted(clientInflationAdjusted);
    }
  }, [
    inflationAdjusted,
    setInflationAdjusted,
    shouldUseHydrationInflationAdjusted,
  ]);

  useEffect(() => {
    setPreferenceCookie(USER_INFLATION_ADJUSTED_STORAGE_KEY, String(inflationAdjusted));
  }, [inflationAdjusted]);

  return [inflationAdjusted, setInflationAdjusted] as const;
}
