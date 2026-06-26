/**
 * CUI normalization for public enterprises per the AMEPIP scraper contract.
 *
 * Rules:
 * - Strip every non-digit character (spaces, RO prefix, punctuation, slashes).
 * - Accept normalized values with 1 to 13 digits.
 * - Reject everything else (including empty / all-zero / too long).
 *
 * The canonical form is the digit-only string. `isCanonicalPublicEnterpriseCui`
 * lets routes detect non-canonical params (e.g. `ro-10020943`) so they can
 * redirect to the canonical `/intreprinderi-publice/$cui` path.
 */

const MIN_CUI_DIGITS = 1
const MAX_CUI_DIGITS = 13

export function normalizePublicEnterpriseCui(value: string): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const digits = value.replace(/\D/g, '')
  if (digits.length < MIN_CUI_DIGITS || digits.length > MAX_CUI_DIGITS) {
    return null
  }
  if (/^0+$/.test(digits)) {
    return null
  }
  return digits
}

export function isValidPublicEnterpriseCui(value: string): boolean {
  return normalizePublicEnterpriseCui(value) !== null
}

export function isCanonicalPublicEnterpriseCui(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    return false
  }
  // Canonical = already digit-only and a valid length range, no normalization needed.
  if (!/^\d+$/.test(value)) {
    return false
  }
  if (value.length < MIN_CUI_DIGITS || value.length > MAX_CUI_DIGITS) {
    return false
  }
  if (/^0+$/.test(value)) {
    return false
  }
  return true
}

/**
 * True when a route param needs a redirect to its canonical form. A param is
 * non-canonical when it is valid (would normalize) but is not already canonical
 * — e.g. `RO-10020943`, `10020943 ` (trailing space), or `ro10020943`.
 */
export function isNonCanonicalPublicEnterpriseCuiParam(
  value: string,
): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    return false
  }
  if (isCanonicalPublicEnterpriseCui(value)) {
    return false
  }
  return normalizePublicEnterpriseCui(value) !== null
}
