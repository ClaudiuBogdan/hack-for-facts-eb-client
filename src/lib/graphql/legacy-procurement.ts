/**
 * Whether the API has legacy procurement (contracts, procedures, legacy
 * direct-acquisition records) switched off (`PROCUREMENT_LEGACY_ENABLED=false`).
 * The API says so only in its answer, so the transport remembers it: an
 * answer carrying the switch's own error marks legacy off for a minute, and
 * a read marked `legacy` is not sent in that minute — it fails as the API
 * would have answered it. After the minute the next read asks the API again,
 * so the reads return on their own within a minute of the switch.
 *
 * Kept per process (one server pod) and per tab. Pure on purpose: the
 * integration specs read the same signature (`tests/utils/legacy-procurement.ts`).
 */

/** The switch's own answer: this code, with a message that starts so. Another SERVICE_UNAVAILABLE (an outage) is not „off". */
export const LEGACY_OFF_CODE = 'SERVICE_UNAVAILABLE'
export const LEGACY_OFF_MESSAGE = 'legacy procurement data is not served by this API'

/** How long one answer holds. */
export const LEGACY_OFF_TTL_MS = 60_000

interface ErrorEntry {
  readonly message?: unknown
  readonly extensions?: { readonly code?: unknown } | null
}

/** The switch's own error among an answer's errors, by its message. */
function legacyOffEntry(errors: unknown): string | undefined {
  if (!Array.isArray(errors)) return undefined
  const entry = errors.find((error: ErrorEntry | null) => error?.extensions?.code === LEGACY_OFF_CODE && typeof error.message === 'string' && error.message.startsWith(LEGACY_OFF_MESSAGE)) as ErrorEntry | undefined
  return entry?.message as string | undefined
}

/** Whether an answer's errors carry the switch's own error. */
export function isLegacyOffAnswer(errors: unknown): boolean {
  return legacyOffEntry(errors) !== undefined
}

let offUntil = 0
let offMessage = LEGACY_OFF_MESSAGE

/** Marks legacy off for the next minute when the answer says so, and keeps the API's words for the reads it stops. */
export function noteLegacyAnswer(errors: unknown, now = Date.now()): void {
  const message = legacyOffEntry(errors)
  if (message === undefined) return
  offUntil = now + LEGACY_OFF_TTL_MS
  offMessage = message
}

/** The API's own message for legacy off, as it last said it. */
export function legacyOffMessage(): string {
  return offMessage
}

/** Whether legacy was answered off within the last minute. */
export function isLegacyKnownOff(now = Date.now()): boolean {
  return now < offUntil
}

/** Tests only. */
export function resetLegacyOffForTests(): void {
  offUntil = 0
  offMessage = LEGACY_OFF_MESSAGE
}
