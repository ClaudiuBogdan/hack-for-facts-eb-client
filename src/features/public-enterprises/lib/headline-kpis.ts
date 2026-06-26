import type { IndicatorDictEntry } from '@/schemas/public-enterprise'

/**
 * Conservative, data-driven set of headline KPIs surfaced on the landing and
 * profile summary. Each entry maps a KPI code to a plain label and the
 * indicator key it reads from the fixture dataset.
 */
export type HeadlineKpiDefinition = {
  readonly kpiCode: string
  readonly indicator: string
  readonly label: string
  readonly measureUnit: string | null
  /** Lower priority surfaces first in headline strips. */
  readonly priority: number
}

export const HEADLINE_KPIS: readonly HeadlineKpiDefinition[] = [
  {
    kpiCode: 'MS',
    indicator: 'Cota de piață',
    label: 'Market share',
    measureUnit: '%',
    priority: 1,
  },
  {
    kpiCode: 'ROE',
    indicator: 'Rentabilitatea capitalului propriu (ROE)',
    label: 'Return on equity',
    measureUnit: '%',
    priority: 2,
  },
  {
    kpiCode: 'ROA',
    indicator: 'Rentabilitatea activelor (ROA)',
    label: 'Return on assets',
    measureUnit: '%',
    priority: 3,
  },
  {
    kpiCode: 'CA',
    indicator: 'Cifra de afaceri netă',
    label: 'Net turnover',
    measureUnit: 'mii RON',
    priority: 4,
  },
  {
    kpiCode: 'PN',
    indicator: 'Profit net',
    label: 'Net profit',
    measureUnit: 'mii RON',
    priority: 5,
  },
] as const

export const HEADLINE_KPI_CODES: readonly string[] = HEADLINE_KPIS.map(
  (kpi) => kpi.kpiCode,
)

export function getHeadlineKpiByCode(
  kpiCode: string,
): HeadlineKpiDefinition | undefined {
  return HEADLINE_KPIS.find((kpi) => kpi.kpiCode === kpiCode)
}

/**
 * Filters an indicator dictionary down to headline entries, ordered by the
 * configured priority. Non-headline entries (priority null) are excluded.
 */
export function selectHeadlineDictionaryEntries(
  dictionary: readonly IndicatorDictEntry[],
): readonly IndicatorDictEntry[] {
  const byIndicator = new Map(
    dictionary.map((entry) => [entry.indicator, entry]),
  )
  return HEADLINE_KPIS.map((definition) => ({
    definition,
    entry: byIndicator.get(definition.indicator),
  }))
    .filter(
      (item): item is { definition: HeadlineKpiDefinition; entry: IndicatorDictEntry } =>
        item.entry !== undefined,
    )
    .map(({ entry }) => entry)
}
