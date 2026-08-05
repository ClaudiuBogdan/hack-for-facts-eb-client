import type { ParliamentBillInitiatorClassification } from '@/schemas/parliament'

/**
 * Presentation rules for the procedural facts and identifiers the source prints
 * about a bill.
 *
 * These fields are OPEN VOCABULARIES, not enums, and the server says so: the
 * chamber can print a value we have never seen, and on `decisionChamber` it
 * demonstrably does — 11 of 16,421 rows carry prose welded into the cell by the
 * CDep metadata parser (an MP's name spliced into an article reference). So
 * every lookup here is match-or-nothing: a value we recognise gets our wording,
 * and a value we do not gets dropped rather than printed raw into a layout that
 * assumes a short label.
 *
 * Dropping is safe HERE because none of these facts is load-bearing — the page
 * is complete without them. It would not be safe for a value the reader is
 * relying on, which is why the narrative fields are passed through verbatim
 * instead.
 */

/**
 * Fold a source string to a comparison key.
 *
 * The source writes Romanian with CEDILLA letters (ţ U+0163, ş U+015F) where
 * modern Romanian uses COMMA-BELOW ones (ț U+021B, ș U+0219) — 'Camera
 * Deputaţilor' in the database is not string-equal to the same words typed
 * correctly. Both fold to the same key here, so matching survives the source
 * switching convention (and survives us typing it properly).
 */
function vocabularyKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[ţț]/gu, 't')
    .replace(/[şș]/gu, 's')
    .replace(/[ăâ]/gu, 'a')
    .replace(/î/gu, 'i')
    .replace(/\s+/gu, ' ')
}

/**
 * WHICH chamber casts the final, unappealable vote (art. 75 of the
 * Constitution) — where the bill's fate is actually decided.
 *
 * Covers 16,410 of the 16,421 rows that carry a value. The other 11 are the
 * welded ones and return undefined.
 */
const DECISION_CHAMBER_LABELS = new Map<string, string>([
  ['camera deputatilor', 'Camera Deputaților'],
  ['senatul', 'Senatul'],
  ['camera deputatilor + senatul', 'Camera Deputaților și Senatul'],
])

export function getDecisionChamberLabel(
  raw: string | undefined,
): string | undefined {
  if (!raw) return undefined
  return DECISION_CHAMBER_LABELS.get(vocabularyKey(raw))
}

/**
 * The majority the bill needs to pass — the practical meaning of `caracter`.
 *
 * Said as the KIND OF LAW rather than the bare source token, because 'organic'
 * alone reads as an adjective about the text; "lege organică" is the thing a
 * reader can look up.
 */
const LAW_CHARACTER_LABELS = new Map<string, string>([
  ['ordinar', 'Lege ordinară'],
  ['organic', 'Lege organică'],
  ['constitutional', 'Lege constituțională'],
])

export function getLawCharacterLabel(
  raw: string | undefined,
): string | undefined {
  if (!raw) return undefined
  return LAW_CHARACTER_LABELS.get(vocabularyKey(raw))
}

/**
 * NO `hasProcedureFacts` predicate lives here.
 *
 * There was one, and it was a SECOND definition of "is there anything to show"
 * sitting next to the render's own — free to drift from it and to answer yes
 * for a bill the section would then draw empty. The Detalii tab now builds the
 * list of cells first and gates on that list being non-empty, so the question is
 * answered exactly once, by the thing that renders.
 */

/**
 * The fast track, as a flag that is only ever raised when the source raised it.
 *
 * `undefined` (21,242 bills with no procedure block) and `false` (16,051 bills
 * the source marked ordinary) are DIFFERENT facts, and neither is "urgent". The
 * chip renders for `true` only; the explicit `false` is stated in the procedure
 * table, where there is room to say it in words.
 */
export function getUrgencyLabel(urgency: boolean | undefined): string {
  if (urgency === true) return 'Da'
  if (urgency === false) return 'Nu'
  return 'Nu este precizat de sursă'
}

/** OUR classification of the initiator, said as the actor it names. */
export function getInitiatorClassificationLabel(
  classification: ParliamentBillInitiatorClassification,
): string {
  return classification.value === 'government' ? 'Guvernul' : 'Parlamentari'
}

/**
 * WHICH rule produced the classification — the honesty field.
 *
 * Always rendered next to the classification: it names the evidence, so the
 * reader can check the conclusion against the initiators list on the same page.
 * An unknown method returns undefined and the note falls back to saying only
 * that the value is derived.
 */
const INITIATOR_METHOD_LABELS = new Map<string, string>([
  ['initiators:guvern', 'Guvernul figurează în lista de inițiatori.'],
  ['initiators:members', 'Lista de inițiatori conține doar parlamentari.'],
])

export function getInitiatorMethodExplanation(
  method: string | undefined,
): string | undefined {
  if (!method) return undefined
  return INITIATOR_METHOD_LABELS.get(method.trim())
}

/**
 * Why a bill's "last updated" date can move without its event list changing.
 *
 * 'votes' is the only value in the data today (6,081 bills): the most recent
 * thing we know about the bill is a division, not a line in its own printed
 * timeline. Unknown values return undefined rather than a guess.
 */
export function getLastEventSourceNote(
  source: string | undefined,
): string | undefined {
  if (source?.trim() === 'votes') {
    return 'Cea mai recentă mișcare provine dintr-un vot, nu din fișa proiectului.'
  }
  return undefined
}
