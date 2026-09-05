import {
  insSourceDimensionCodeSchema,
  insSourceMemberCodeSchema,
} from './source-contract'

/** Parse exact source pins without dropping malformed intent or choosing defaults. */
export function parseSourcePins(
  input: unknown,
  declaredAxes: ReadonlySet<string>,
) {
  const pins = new Map<string, string>()
  if (input === undefined) return { pins, valid: true }
  if (!Array.isArray(input) || input.length === 0 || input.length > 7)
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
