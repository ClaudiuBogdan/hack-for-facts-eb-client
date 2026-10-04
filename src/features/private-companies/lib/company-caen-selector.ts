import { COMPANY_CAEN_REVISIONS, ONRC_CAEN_SELECTOR, type CompanyCaenRevision } from '@/schemas/private-company-registry'

/**
 * The directory's exact CAEN selection: a code in ONE revision
 * (`rev2:6201`, `rev0:1111`), matched by the API on the current ONRC edition's
 * observations of the same identifier — next to the broad `caen` filter,
 * which matches the digits in any revision. Rev.0 is a revision like the
 * others; a code with no known revision cannot be selected exactly.
 */

export interface CaenSelector {
  readonly revision: CompanyCaenRevision
  readonly code: string
}

/** The URL form, normalised: trimmed and lower case; anything else is kept as given so the page can say it is invalid. */
export function normalizeCaenSelector(raw: string): string {
  const trimmed = raw.trim()
  return ONRC_CAEN_SELECTOR.test(trimmed.toLowerCase()) ? trimmed.toLowerCase() : trimmed
}

export function parseCaenSelector(value: string): CaenSelector | null {
  if (!ONRC_CAEN_SELECTOR.test(value)) return null
  const [revision, code] = value.split(':')
  const known = COMPANY_CAEN_REVISIONS.find((entry) => entry === revision)
  return known && code ? { revision: known, code } : null
}

export function caenSelectorKey({ revision, code }: CaenSelector): string {
  return `${revision}:${code}`
}

/** The selectors a URL carries that are not exact selectors: shown as invalid, never sent or dropped silently. */
export function invalidCaenSelectors(values: readonly string[] | undefined): readonly string[] {
  return (values ?? []).filter((value) => parseCaenSelector(value) === null)
}
