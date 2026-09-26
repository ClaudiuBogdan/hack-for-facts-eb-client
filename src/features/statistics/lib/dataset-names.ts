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

/** A word INS sets in capitals: „POPULATIA", „DOMICILIU,". */
const SHOUTED_WORD = /^[A-ZĂÂÎȘȚŞŢ]{2,}[,.]?$/

/**
 * „POPULATIA DUPA DOMICILIU la 1 ianuarie" → „Populatia dupa domiciliu la 1
 * ianuarie". INS opens some matrix names with what they count set in
 * capitals; the run of capitals is set in sentence case and the rest of the
 * name stays. A single capitalised word is left alone — it is an acronym
 * („UAT", „CAEN") more often than a shout.
 */
export function sentenceCaseShouting(text: string): string {
  const words = text.split(' ')
  let run = 0
  while (run < words.length && SHOUTED_WORD.test(words[run]!)) run += 1
  if (run < 2) return text
  const lowered = words.slice(0, run).join(' ').toLocaleLowerCase('ro')
  const rest = words.slice(run).join(' ')
  const opening = lowered.charAt(0).toLocaleUpperCase('ro') + lowered.slice(1)
  return rest ? `${opening} ${rest}` : opening
}

/**
 * The matrix's official name as a title: in the reader's language, and in
 * sentence case where INS shouts its opening. The breakdowns stay — on the
 * catalog and the series page the name is the whole matrix.
 */
export function datasetDisplayName(
  dataset: Pick<StatisticsDatasetSummary, 'code' | 'nameRo' | 'nameEn'>,
  locale: string,
): string {
  const official = inLocale(locale, dataset.nameRo, dataset.nameEn)
  return official ? sentenceCaseShouting(official) : dataset.code
}

export function contextDisplayName(
  dataset: Pick<StatisticsDatasetSummary, 'contextNameRo' | 'contextNameEn'>,
  locale: string,
): string | null {
  return inLocale(locale, dataset.contextNameRo, dataset.contextNameEn)
}
