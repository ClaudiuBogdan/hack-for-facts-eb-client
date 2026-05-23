/**
 * Normalizes a company CUI for URLs and API requests.
 */
export function normalizeCompanyCui(value: string): string | null {
  const normalized = value.trim().replace(/^ro/i, '')
  if (!/^\d+$/.test(normalized) || /^0+$/.test(normalized)) {
    return null
  }
  return normalized
}
