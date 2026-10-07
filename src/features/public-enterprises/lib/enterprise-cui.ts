/**
 * A CUI as the enterprise page and the API take it: 2–10 digits, no leading
 * zero (the API refuses anything else as `INVALID_INPUT`; the companies
 * module's canonical form). A „RO" prefix or spaces are the legacy redirect's
 * to clean. Kept free of zod: the route's eager file imports it.
 */
const CANONICAL_CUI = /^[1-9]\d{1,9}$/u

export function isCanonicalCui(value: string): boolean {
  return CANONICAL_CUI.test(value)
}

export function parsePublicEnterpriseCuiParam(value: string): string | null {
  return isCanonicalCui(value) ? value : null
}

/**
 * A CUI's digits as an address takes them: leading zeros (a formatting
 * artefact of some sources) dropped; null when what is left is not canonical,
 * so a link that would only lead to a 404 is not made.
 */
export function canonicalCuiOf(digits: string): string | null {
  const bare = digits.replace(/^0+/u, '')
  return isCanonicalCui(bare) ? bare : null
}
