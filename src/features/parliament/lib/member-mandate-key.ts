import type { ParliamentChamber } from '@/schemas/parliament'

/**
 * The source's own chamber codes, which open every mandate key.
 *
 * `<chamber>:<legislature-year>:<ordinal>` — `2:2024:133` is the 133rd seat of
 * the 2024 Chamber of Deputies. The codes are the ones cdep.ro has used for
 * decades (`cam=1` / `cam=2` in its URLs), and the API is consistent with them:
 * sampled across 372 served mandates, every `1:` key is a senator and every
 * `2:` key a deputy, with no exceptions.
 */
const CHAMBER_BY_KEY_PREFIX: Readonly<Record<string, ParliamentChamber>> = {
  '1': 'senat',
  '2': 'camera',
}

/**
 * The chamber a mandate key belongs to, or `undefined` if the key does not
 * carry one.
 *
 * This is for what can be drawn BEFORE the member arrives — the profile
 * skeleton paints the hero in the chamber's colour and names it, rather than
 * guessing or greying a band that covers a third of the first screen. It is
 * never a substitute for `member.chamber` once the response is in hand.
 *
 * Deliberately strict: an unrecognised prefix returns `undefined` so the caller
 * falls back to neutral instead of announcing the wrong chamber.
 */
export function getChamberFromMandateKey(
  mandateKey: string,
): ParliamentChamber | undefined {
  const [chamberCode, legislature, ordinal] = mandateKey.split(':')
  if (chamberCode === undefined || legislature === undefined || ordinal === undefined) {
    return undefined
  }
  return CHAMBER_BY_KEY_PREFIX[chamberCode]
}
