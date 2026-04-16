import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearch, useRouter } from '@tanstack/react-router'
import type { Currency } from '@/schemas/charts'
import {
  parseCurrencyParam,
  parseBooleanParam,
} from '@/lib/globalSettings/params'
import {
  setPreferenceCookie,
  readClientCurrencyPreference,
  readClientInflationAdjustedPreference,
  USER_CURRENCY_STORAGE_KEY,
  USER_INFLATION_ADJUSTED_STORAGE_KEY,
  DEFAULT_CURRENCY,
  DEFAULT_INFLATION_ADJUSTED,
} from '@/lib/user-preferences'

type SSRSettings = {
  currency: Currency // Default value used during SSR
  inflationAdjusted: boolean // Default value used during SSR
}

type ForcedOverrides = {
  currency?: Currency
  inflationAdjusted?: boolean
}

type SettingSource = 'forced' | 'url' | 'persisted'

export type PersistSettingsPatch = Partial<{
  currency: Currency
  inflationAdjusted: boolean
}>

/**
 * Unified global settings hook that handles:
 * - URL params (source of truth for data fetching, enables sharing)
 * - SSR hydration (uses defaults, client syncs user prefs to URL)
 * - Cookie persistence (survives refresh, synced to URL on mount)
 * - Forced overrides (route constraints like total_euro → EUR)
 *
 * Strategy for CDN cacheability:
 * 1. SSR uses URL params only (no cookies) → same URL = same cache entry
 * 2. On mount, client reads actual user prefs from cookies/localStorage
 * 3. If prefs differ from URL, client updates URL → triggers refetch
 * 4. This ensures correct data after brief flash of default currency
 *
 * Currency Display Strategy (Option B):
 * =====================================
 * To prevent currency label/value mismatch during preference sync:
 * - `currency`: Use for data fetching (always current target)
 * - `displayCurrency`: Use for UI display (lags until data arrives)
 *
 * Consumer should:
 * 1. Pass `currency` to data fetching hooks
 * 2. Display `displayCurrency` in the UI
 * 3. Call `confirmSettingsApplied()` when fresh data has loaded
 * 4. This updates `displayCurrency` to match `currency`
 */
export function useGlobalSettings(
  ssrSettings: SSRSettings,
  forcedOverrides?: ForcedOverrides
) {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)
  const [hasSyncedPrefs, setHasSyncedPrefs] = useState(false)

  // Persisted state - initialized from client preferences if available (returns null during SSR)
  // This ensures client-side navigation uses user's preference immediately, avoiding double-fetch
  const [persistedCurrency, setPersistedCurrency] = useState<Currency>(() =>
    readClientCurrencyPreference() ?? DEFAULT_CURRENCY
  )
  const [persistedInflation, setPersistedInflation] = useState<boolean>(() =>
    readClientInflationAdjustedPreference() ?? DEFAULT_INFLATION_ADJUSTED
  )

  // Display state - initialized from SSR settings, updated when fresh data arrives
  // This prevents showing new currency label with old currency value during preference sync
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(ssrSettings.currency)
  const [displayInflation, setDisplayInflation] = useState<boolean>(ssrSettings.inflationAdjusted)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Parse URL params
  const urlCurrency = parseCurrencyParam(search.currency)
  const urlInflation = parseBooleanParam(search.inflation_adjusted)

  // On mount: read client prefs and sync to URL if params are absent (and not forced)
  // This triggers a refetch with the user's preferred currency
  useEffect(() => {
    if (!isHydrated || hasSyncedPrefs) return

    const clientCurrency = readClientCurrencyPreference()
    const clientInflation = readClientInflationAdjustedPreference()

    // Update persisted state with actual client prefs
    if (clientCurrency !== null) {
      setPersistedCurrency(clientCurrency)
    }
    if (clientInflation !== null) {
      setPersistedInflation(clientInflation)
    }

    // Build URL updates for prefs that differ from current URL
    const searchUpdates: Record<string, unknown> = {}

    // Only sync currency if not forced and different from URL
    if (
      forcedOverrides?.currency === undefined &&
      urlCurrency === undefined &&
      clientCurrency !== null &&
      clientCurrency !== (urlCurrency ?? DEFAULT_CURRENCY)
    ) {
      searchUpdates.currency = clientCurrency
    }

    // Only sync inflation if not forced and different from URL
    if (
      forcedOverrides?.inflationAdjusted === undefined &&
      urlInflation === undefined &&
      clientInflation !== null &&
      clientInflation !== (urlInflation ?? DEFAULT_INFLATION_ADJUSTED)
    ) {
      searchUpdates.inflation_adjusted = clientInflation
    }

    setHasSyncedPrefs(true)

    // If we have updates, navigate to sync URL with user prefs
    if (Object.keys(searchUpdates).length > 0) {
      router.navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => ({ ...prev, ...searchUpdates }),
        replace: true,
        resetScroll: false,
      } as any)
    }
  }, [isHydrated, hasSyncedPrefs, urlCurrency, urlInflation, forcedOverrides, router])

  // Resolve currency with full priority chain
  const { currency, currencySource } = useMemo(() => {
    // 1. Forced override (route constraint)
    if (forcedOverrides?.currency !== undefined) {
      return {
        currency: forcedOverrides.currency,
        currencySource: 'forced' as SettingSource,
      }
    }
    // 2. URL param
    if (urlCurrency !== undefined) {
      return { currency: urlCurrency, currencySource: 'url' as SettingSource }
    }
    // 3. Persisted preference
    return {
      currency: persistedCurrency,
      currencySource: 'persisted' as SettingSource,
    }
  }, [forcedOverrides?.currency, urlCurrency, persistedCurrency])

  // Resolve inflationAdjusted with full priority chain
  const { inflationAdjusted, inflationSource } = useMemo(() => {
    if (forcedOverrides?.inflationAdjusted !== undefined) {
      return {
        inflationAdjusted: forcedOverrides.inflationAdjusted,
        inflationSource: 'forced' as SettingSource,
      }
    }
    if (urlInflation !== undefined) {
      return {
        inflationAdjusted: urlInflation,
        inflationSource: 'url' as SettingSource,
      }
    }
    return {
      inflationAdjusted: persistedInflation,
      inflationSource: 'persisted' as SettingSource,
    }
  }, [forcedOverrides?.inflationAdjusted, urlInflation, persistedInflation])

  // Helper to write to BOTH cookie and React state
  const writeCurrencyPref = useCallback((value: Currency) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(USER_CURRENCY_STORAGE_KEY, JSON.stringify(value))
      } catch (e) {
        console.warn('Failed to write currency preference to localStorage', e)
      }
    }
    setPreferenceCookie(USER_CURRENCY_STORAGE_KEY, value)
    setPersistedCurrency(value)
  }, [])

  const writeInflationPref = useCallback((value: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(USER_INFLATION_ADJUSTED_STORAGE_KEY, JSON.stringify(value))
      } catch (e) {
        console.warn('Failed to write inflation preference to localStorage', e)
      }
    }
    setPreferenceCookie(USER_INFLATION_ADJUSTED_STORAGE_KEY, String(value))
    setPersistedInflation(value)
  }, [])

  const persistSettings = useCallback((patch: PersistSettingsPatch) => {
    if (patch.currency !== undefined) {
      writeCurrencyPref(patch.currency)
    }

    if (patch.inflationAdjusted !== undefined) {
      writeInflationPref(patch.inflationAdjusted)
    }
  }, [writeCurrencyPref, writeInflationPref])

  // Setters: update cookie + React state + URL
  // Use functional search updater (prev) => ({ ...prev, ... }) for atomic updates
  const setCurrency = useCallback(
    (value: Currency) => {
      if (forcedOverrides?.currency !== undefined) {
        console.warn('Cannot change currency: forced by route')
        return
      }
      persistSettings({ currency: value })
      router.navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => ({ ...prev, currency: value }),
        replace: true,
        resetScroll: false,
      } as any)
    },
    [router, forcedOverrides?.currency, persistSettings]
  )

  const setInflationAdjusted = useCallback(
    (value: boolean) => {
      if (forcedOverrides?.inflationAdjusted !== undefined) {
        console.warn('Cannot change inflation_adjusted: forced by route')
        return
      }
      persistSettings({ inflationAdjusted: value })
      router.navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => ({ ...prev, inflation_adjusted: value }),
        replace: true,
        resetScroll: false,
      } as any)
    },
    [router, forcedOverrides?.inflationAdjusted, persistSettings]
  )

  // Batch setter for atomic updates
  const setSettings = useCallback(
    (updates: { currency?: Currency; inflationAdjusted?: boolean }) => {
      const searchUpdates: Record<string, unknown> = {}

      if (
        updates.currency !== undefined &&
        forcedOverrides?.currency === undefined
      ) {
        persistSettings({ currency: updates.currency })
        searchUpdates.currency = updates.currency
      }
      if (
        updates.inflationAdjusted !== undefined &&
        forcedOverrides?.inflationAdjusted === undefined
      ) {
        persistSettings({ inflationAdjusted: updates.inflationAdjusted })
        searchUpdates.inflation_adjusted = updates.inflationAdjusted
      }

      if (Object.keys(searchUpdates).length > 0) {
        router.navigate({
          to: '.',
          search: (prev: Record<string, unknown>) => ({ ...prev, ...searchUpdates }),
          replace: true,
          resetScroll: false,
        } as any)
      }
    },
    [router, forcedOverrides, persistSettings]
  )

  // Confirm that fresh data has loaded - syncs display values with actual values
  // Call this when your data query has completed with the new settings
  const confirmSettingsApplied = useCallback(() => {
    setDisplayCurrency(currency)
    setDisplayInflation(inflationAdjusted)
  }, [currency, inflationAdjusted])

  // Check if display is out of sync (data hasn't caught up yet)
  const isPendingSync = displayCurrency !== currency || displayInflation !== inflationAdjusted

  return {
    // For data fetching - always the current target value
    currency,
    inflationAdjusted,
    // Persisted user preference (cookie/localStorage) - not affected by URL unless explicitly saved
    persistedCurrency,
    persistedInflationAdjusted: persistedInflation,
    // For UI display - lags until confirmSettingsApplied() is called
    displayCurrency,
    displayInflationAdjusted: displayInflation,
    // Sync control
    confirmSettingsApplied,
    isPendingSync,
    // Setters
    persistSettings,
    setCurrency,
    setInflationAdjusted,
    setSettings,
    // Debugging/UI metadata
    source: {
      currency: currencySource,
      inflationAdjusted: inflationSource,
    },
    isForced: {
      currency: forcedOverrides?.currency !== undefined,
      inflationAdjusted: forcedOverrides?.inflationAdjusted !== undefined,
    },
  }
}
