import {
  parseComparisonToken,
  type ComparisonTerritoryToken,
} from './dataset-selection'

/** Preserve raw invalid intent separately from parsed chips; never turn it into an example. */
export function resolveComparisonTerritories(raw: unknown) {
  const entries = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]
  const tokens: ComparisonTerritoryToken[] = []
  const seen = new Set<string>()
  let valid = raw === undefined || (entries.length >= 1 && entries.length <= 6)
  for (const entry of entries) {
    const parsed = parseComparisonToken(entry)
    if (
      !parsed ||
      (parsed.level === 'LAU' && !/^[1-9][0-9]{0,5}$/.test(parsed.code)) ||
      seen.has(parsed.code)
    ) {
      valid = false
      continue
    }
    seen.add(parsed.code)
    tokens.push(parsed)
  }
  return { tokens, valid }
}
