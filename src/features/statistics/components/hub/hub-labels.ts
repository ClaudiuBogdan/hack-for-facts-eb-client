import { useLingui } from '@lingui/react/macro'
import type { StatisticsHubIndicator } from '@/schemas/statistics'
import { HUB_NATIONAL_DATASETS } from '../../lib/landing-constants'

/** The short row label for a dataset, falling back to the API name. */
export function useIndicatorLabel() {
  const { i18n } = useLingui()
  return (indicator: Pick<StatisticsHubIndicator, 'code' | 'nameRo'>) => {
    const entry = HUB_NATIONAL_DATASETS.find((dataset) => dataset.code === indicator.code)
    return entry ? i18n._(entry.shortLabel) : (indicator.nameRo ?? indicator.code)
  }
}
