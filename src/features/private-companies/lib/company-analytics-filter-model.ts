import { companyMetricUnit, type CompanyAnalysisKeyFilterInput, type CompanyAnalysisMetric } from '@/schemas/company-analytics'

/**
 * The filters panel's changes, as pure steps: a value toggled in or out of
 * a list (an empty list is no filter at all — the API refuses one), a key
 * filter's unknown group toggled as its own value, a bound a reader typed
 * read as the exact decimal the API takes.
 */

export function toggled<T>(values: readonly T[] | undefined, value: T): T[] | undefined {
  const current = values ?? []
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
  return next.length > 0 ? next : undefined
}

/** A key toggled in or out; `null` toggles the unknown group. */
export function keyToggled(filter: CompanyAnalysisKeyFilterInput | undefined, value: string | null): CompanyAnalysisKeyFilterInput | undefined {
  const values = filter?.in ?? []
  const includeUnknown = value === null ? !filter?.includeUnknown : Boolean(filter?.includeUnknown)
  const next = value === null ? values : values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
  if (next.length === 0 && !includeUnknown) return undefined
  return { ...(next.length > 0 ? { in: next } : {}), ...(includeUnknown ? { includeUnknown: true } : {}) }
}

/**
 * A bound as a reader writes it — „1.000.000,50", „1000000.50", „1 000 000"
 * — as the decimal the API takes („1000000.50"): lei with at most two
 * decimals, employees whole. Null when it is no such number; never rounded.
 */
export function boundOf(text: string, metric: CompanyAnalysisMetric): string | null {
  // `\s` takes the no-break space a copied figure carries, too.
  const trimmed = text.trim().replace(/\s/gu, '')
  if (trimmed === '') return null
  const money = companyMetricUnit(metric) === 'RON'
  const comma = trimmed.lastIndexOf(',')
  const dot = trimmed.lastIndexOf('.')
  let normalized = trimmed
  // Both marks: the last one is the decimals' („1.000.000,50", „1,000,000.50").
  if (comma >= 0 && dot >= 0) normalized = comma > dot ? trimmed.replace(/\./gu, '').replace(',', '.') : trimmed.replace(/,/gu, '')
  // A comma alone marks the decimals, as Romanian writes them („1000,50").
  else if (comma >= 0) normalized = trimmed.replace(',', '.')
  // Dots alone in threes group thousands („1.000.000"); one dot otherwise marks the decimals („1000.50").
  else if (/^-?\d{1,3}(\.\d{3})+$/u.test(trimmed)) normalized = trimmed.replace(/\./gu, '')
  const pattern = money ? /^-?\d{1,16}(?:\.\d{1,2})?$/u : /^-?\d{1,18}$/u
  return pattern.test(normalized) ? normalized : null
}
