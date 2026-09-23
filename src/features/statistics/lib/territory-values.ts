import { t } from '@lingui/core/macro'
import type { StatisticsIndicatorTile } from '@/schemas/statistics'
import { formatHubValue } from './units'
import { tileUnit } from './territory-groups'

const BLOCKING_STATUSES = new Set([':', 'c', 'x'])

/** INS value-status letters as words, lower-case so they read inline after the period. */
export function tileStatusLabel(status: string | null): string | null {
  if (!status) return null
  const labels: Readonly<Record<string, string>> = {
    ':': t`lipsă`,
    c: t`confidențial`,
    x: t`confidențial`,
    e: t`estimat`,
    p: t`preliminar`,
    r: t`revizuit`,
  }
  return labels[status] ?? t`marcaj INS „${status}”`
}

/** The tile's value as the reader reads it: locale number, Romanian unit word. */
export function formatTileValue(tile: Pick<StatisticsIndicatorTile, 'value' | 'unitSymbol' | 'unitNameRo' | 'valueStatus'>) {
  if (tile.value === null || tile.value.trim() === '' || BLOCKING_STATUSES.has(tile.valueStatus ?? '')) return null
  const numeric = Number(tile.value.trim().replace(',', '.'))
  if (!Number.isFinite(numeric)) return { value: tile.value, unit: '' }
  return formatHubValue(numeric, tileUnit(tile), tile.unitNameRo ?? tile.unitSymbol)
}
