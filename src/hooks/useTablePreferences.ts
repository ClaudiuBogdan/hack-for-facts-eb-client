import type { VisibilityState, ColumnPinningState, ColumnSizingState, Updater } from '@tanstack/react-table'
import { useCallback } from 'react'
import { usePersistedState } from '@/lib/hooks/usePersistedState'

export type TablePreferences = {
  density: 'comfortable' | 'compact'
  columnVisibility: VisibilityState
  columnPinning?: ColumnPinningState
  columnSizing?: ColumnSizingState
  columnOrder?: string[]
  currencyFormat?: 'standard' | 'compact' | 'both' | 'euro'
}

const STORAGE_KEY_PREFIX = 'table-preferences:'

type Density = TablePreferences['density']
type CurrencyFormat = NonNullable<TablePreferences['currencyFormat']>

export function useTablePreferences(
  key: string,
  initial: Partial<TablePreferences> = {},
) {
  const storageKey = `${STORAGE_KEY_PREFIX}${key}`
  const [prefs, setPrefs] = usePersistedState<TablePreferences>(storageKey, {
    density: initial.density ?? 'comfortable',
    columnVisibility: initial.columnVisibility ?? {},
    columnPinning: initial.columnPinning ?? {},
    columnSizing: initial.columnSizing ?? {},
    columnOrder: initial.columnOrder ?? [],
    currencyFormat: initial.currencyFormat ?? 'both',
  })

  const setDensity = useCallback((next: Updater<Density>) => {
    setPrefs((prev) => ({ ...prev, density: typeof next === 'function' ? (next as (p: Density) => Density)(prev.density) : next }))
  }, [setPrefs])
  const setColumnVisibility = useCallback((updater: Updater<VisibilityState>) => {
    setPrefs((prev) => ({ ...prev, columnVisibility: typeof updater === 'function' ? updater(prev.columnVisibility) : updater }))
  }, [setPrefs])
  const setColumnPinning = useCallback((updater: Updater<ColumnPinningState>) => {
    setPrefs((prev) => ({ ...prev, columnPinning: typeof updater === 'function' ? updater(prev.columnPinning ?? {}) : updater }))
  }, [setPrefs])
  const setColumnSizing = useCallback((updater: Updater<ColumnSizingState>) => {
    setPrefs((prev) => ({ ...prev, columnSizing: typeof updater === 'function' ? updater(prev.columnSizing ?? {}) : updater }))
  }, [setPrefs])
  const setColumnOrder = useCallback((updater: Updater<string[]>) => {
    setPrefs((prev) => ({ ...prev, columnOrder: typeof updater === 'function' ? updater(prev.columnOrder ?? []) : updater }))
  }, [setPrefs])
  const setCurrencyFormat = useCallback((next: Updater<CurrencyFormat>) => {
    setPrefs((prev) => ({ ...prev, currencyFormat: typeof next === 'function' ? (next as (p: CurrencyFormat) => CurrencyFormat)(prev.currencyFormat ?? 'both') : next }))
  }, [setPrefs])

  return {
    density: prefs.density,
    setDensity,
    columnVisibility: prefs.columnVisibility,
    setColumnVisibility,
    columnPinning: prefs.columnPinning,
    setColumnPinning,
    columnSizing: prefs.columnSizing,
    setColumnSizing,
    columnOrder: prefs.columnOrder,
    setColumnOrder,
    currencyFormat: prefs.currencyFormat ?? 'both',
    setCurrencyFormat,
  }
}

