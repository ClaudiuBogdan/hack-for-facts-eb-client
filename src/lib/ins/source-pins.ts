import {
  insSourceDimensionCodeSchema,
  insSourceMemberCodeSchema,
} from './source-contract'

/** Parse exact source pins without dropping malformed intent or choosing defaults. */
/**
 * Whether the reader actually pinned any classification.
 *
 * An EMPTY list pins nothing — it is what `sourceRowSelection` returns for a
 * matrix with no classification or territorial axes — so it must not count as
 * „the reader chose coordinates". Treating it as intent suppressed the
 * server's defaults, the tier-0 bootstrap and the representative badge on
 * every URL carrying `?clasificari=[]`.
 *
 * A malformed NON-array still counts: the reader said something about
 * classifications, and the surface has to report it rather than silently
 * default over it.
 */
export function hasSourcePinIntent(input: unknown): boolean {
  if (input === undefined) return false
  return Array.isArray(input) ? input.length > 0 : true
}

export function parseSourcePins(
  input: unknown,
  declaredAxes: ReadonlySet<string>,
) {
  const pins = new Map<string, string>()
  if (input === undefined) return { pins, valid: true }
  /**
   * An EMPTY list is „no pins", exactly as `undefined` is — not a malformed
   * one. A matrix whose only axes are time and a unit (JUS101A: „Ani" plus
   * „UM: Numar persoane") has no classification coordinate to pin, so
   * `sourceRowSelection` returns `clasificari: []` for every one of its rows.
   * Rejecting that made „Alege această serie" write a URL the page then
   * refused to load: one click from a working chart to „Selecția din adresă nu
   * poate fi aplicată", offering to delete classifications that were never
   * there.
   */
  if (!Array.isArray(input) || input.length > 7)
    return { pins, valid: false }
  let valid = true
  for (const raw of input) {
    const parts = typeof raw === 'string' ? raw.split(':') : []
    const [type, value] = parts
    if (
      parts.length !== 2 ||
      !insSourceDimensionCodeSchema.safeParse(type).success ||
      !insSourceMemberCodeSchema.safeParse(value).success ||
      !declaredAxes.has(type) ||
      pins.has(type)
    )
      valid = false
    else pins.set(type, value)
  }
  return { pins, valid }
}

/** The router decodes a bare numeric unit; canonical source zero remains valid. */
export function parseSourceUnit(input: unknown): string | null {
  const candidate =
    typeof input === 'number' && Number.isSafeInteger(input)
      ? String(input)
      : input
  const parsed = insSourceMemberCodeSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

export function sourcePinsFilter(pins: ReadonlyMap<string, string>) {
  return [...pins]
    .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
    .map(([type, memberCode]) => ({
      dimensionIndex: Number(type.slice(1)),
      memberCode,
    }))
}
