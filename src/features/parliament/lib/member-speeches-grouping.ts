/**
 * Group a member's contributions BY SITTING.
 *
 * A flat, date-stamped list of turns hides the thing a reader is usually after:
 * this member spoke four times in one debate. Grouping restores the sitting as
 * the unit and makes the repeated per-card date redundant.
 *
 * The grouping key is deliberately the CANONICAL `sessionKey` when the row has
 * one, and the spoken DATE + chamber otherwise. Two turns on the same day in
 * the same chamber are almost always the same sitting — but "almost always" is
 * not a link, so a date-grouped bucket carries no `sessionKey` and gets no
 * "read the full sitting" affordance. Only a proven sitting is offered as one.
 */
import type { ParliamentMemberSpeech } from '@/schemas/parliament'

export interface MemberSpeechSittingGroup {
  /** Stable React key — the sessionKey when proven, else the date+chamber pair. */
  readonly key: string
  /** Present ONLY when every turn in the group names the same canonical sitting. */
  readonly sessionKey?: string
  /** `YYYY-MM-DD`; empty when the source row carries no date. */
  readonly spokenAt: string
  readonly chamber?: string
  readonly speeches: readonly ParliamentMemberSpeech[]
}

export function groupMemberSpeechesBySitting(
  speeches: readonly ParliamentMemberSpeech[],
): readonly MemberSpeechSittingGroup[] {
  const order: string[] = []
  const buckets = new Map<
    string,
    {
      sessionKey?: string
      spokenAt: string
      chamber?: string
      speeches: ParliamentMemberSpeech[]
    }
  >()

  for (const speech of speeches) {
    const proven = speech.isCanonical ? speech.sessionKey : undefined
    const key = proven ?? `${speech.spokenAt}|${speech.chamber ?? ''}`

    const existing = buckets.get(key)
    if (existing) {
      existing.speeches.push(speech)
      continue
    }
    order.push(key)
    buckets.set(key, {
      ...(proven && { sessionKey: proven }),
      spokenAt: speech.spokenAt,
      ...(speech.chamber && { chamber: speech.chamber }),
      speeches: [speech],
    })
  }

  return order.map((key) => {
    const bucket = buckets.get(key)!
    return { key, ...bucket }
  })
}
