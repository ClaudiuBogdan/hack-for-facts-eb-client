import { useLingui } from '@lingui/react/macro'
import type { StatisticsIndicatorTile } from '@/schemas/statistics'
import { tileDisplayName } from '../lib/territory-tiles'

/** The matrix's name in the reader's language, the Romanian one otherwise. */
export function useTileName() {
  const { i18n } = useLingui()
  return (tile: StatisticsIndicatorTile) => tileDisplayName(tile, i18n.locale)
}
