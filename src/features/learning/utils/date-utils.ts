export function isoToTime(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return isoToTime(a) >= isoToTime(b) ? a : b
}

export function maxIsoRequired(a: string, b: string): string {
  return isoToTime(a) >= isoToTime(b) ? a : b
}
