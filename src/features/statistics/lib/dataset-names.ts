import type { StatisticsDatasetSummary } from '@/schemas/statistics'

/**
 * A dataset's names in the reader's language, the other language as the
 * fallback — the rule the context tree already follows. INS publishes an
 * English name for 1,915 of its 1,916 matrices and an English context name
 * for every one (2026-09-23), so an English page is English down to its rows.
 */
function inLocale(locale: string, ro: string | null | undefined, en: string | null | undefined): string | null {
  const [first, second] = locale.toLowerCase().startsWith('en') ? [en, ro] : [ro, en]
  return first?.trim() || second?.trim() || null
}

export function datasetDisplayName(
  dataset: Pick<StatisticsDatasetSummary, 'code' | 'nameRo' | 'nameEn'>,
  locale: string,
): string {
  return inLocale(locale, dataset.nameRo, dataset.nameEn) ?? dataset.code
}

export function contextDisplayName(
  dataset: Pick<StatisticsDatasetSummary, 'contextNameRo' | 'contextNameEn'>,
  locale: string,
): string | null {
  return inLocale(locale, dataset.contextNameRo, dataset.contextNameEn)
}
