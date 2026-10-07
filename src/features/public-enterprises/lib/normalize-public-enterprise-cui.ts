/**
 * CUI normalization for public enterprises per the AMEPIP scraper contract.
 *
 * Rules:
 * - Strip every non-digit character (spaces, RO prefix, punctuation, slashes).
 * - Accept normalized values with 1 to 13 digits.
 * - Reject everything else (including empty / all-zero / too long).
 *
 * Global search uses it to address a `public_enterprise` hit by its CUI.
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
