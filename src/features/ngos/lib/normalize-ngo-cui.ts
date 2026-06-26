/**
 * Normalizes an NGO CUI for URLs and API requests. Mirrors the private-company
 * idiom: strip a leading `RO` prefix and require an all-digit, non-zero CUI.
 * Invalid input yields `null` so the route can `notFound()`.
 */
export function normalizeNgoCui(value: string): string | null {
  const normalized = value.trim().replace(/^ro/i, '')
  if (!/^\d+$/.test(normalized) || /^0+$/.test(normalized)) {
    return null
  }
  return normalized
}
