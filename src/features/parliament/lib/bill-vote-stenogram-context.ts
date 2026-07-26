/**
 * Stenogram context on bill and vote surfaces — the GATE, and why it is shut.
 *
 * "What was said in the chamber about this bill?" is one of the most valuable
 * questions this product could answer, and it is exactly the one that is most
 * dangerous to answer by inference. The plausible joins are all wrong:
 *
 *  - by DATE + CHAMBER — a sitting debates many unrelated items in a day;
 *  - by TITLE similarity — bill titles and agenda headings are written by
 *    different people for different purposes, and near-matches are common;
 *  - via `ParliamentStenogramSegment.agendaRef` — that is the SOURCE'S OWN
 *    printed locator (a CDep section anchor / Senate agenda GUID), documented
 *    as a raw locator and NOT a bill key. Treating it as one manufactures a
 *    citation the institution never made.
 *
 * A wrong "here is the debate on this law" is worse than no link at all: it is
 * the kind of claim a journalist would quote.
 *
 * CURRENT SERVER CONTRACT (checked against the module SDL): `ParliamentBill`
 * exposes events / documents / initiators / relatedVotes / actLinks / voteLinks,
 * and `ParliamentVote` exposes `billKey` — none of which references a stenogram
 * session, segment or speech. `ParliamentSpeech` points *outward* to its sitting
 * but carries no bill or vote key. So there is no exact stored relationship to
 * render, and this surface stays absent rather than guessed.
 *
 * TO OPEN THE GATE: when the API grows a real edge (a `billKey`/`voteKey` on a
 * stenogram segment, or a `stenogramSegments` field on a bill), select it, pass
 * the resolved rows to `resolveBillStenogramContext`, and render the links —
 * with the same provenance language the rest of the stenogram surface uses.
 * Until then `hasExactStenogramRelationship` is the single place that decides,
 * and `bill-vote-stenogram-context.test.ts` fails if a link appears without one.
 */

/**
 * One contribution the API has EXPLICITLY tied to a bill or a vote. The shape
 * is deliberately narrow: a link needs the sitting, the block, and the stored
 * relationship that justifies it.
 */
export interface StenogramRelationship {
  readonly sessionKey: string
  readonly speechKey: string
  /**
   * The stored edge that produced this link — echoed into the UI so a reader
   * can see WHY two records are connected, per the data-trust rules.
   */
  readonly relationshipKind: string
}

/**
 * Does this record carry an exact, server-stated stenogram relationship?
 *
 * The only accepted evidence is a relationship the API returned. There is no
 * date, title or agenda-reference fallback, by design.
 */
export function hasExactStenogramRelationship(
  relationships: readonly StenogramRelationship[] | null | undefined,
): boolean {
  return Array.isArray(relationships) && relationships.length > 0
}

/**
 * The contributions a bill/vote surface may link to. Returns an empty list —
 * meaning "render nothing" — for anything that is not an exact stored edge,
 * including partially-populated rows.
 */
export function resolveStenogramContext(
  relationships: readonly StenogramRelationship[] | null | undefined,
): readonly StenogramRelationship[] {
  if (!hasExactStenogramRelationship(relationships)) return []
  return relationships!.filter(
    (link) =>
      typeof link.sessionKey === 'string' &&
      link.sessionKey.length > 0 &&
      typeof link.speechKey === 'string' &&
      link.speechKey.length > 0 &&
      typeof link.relationshipKind === 'string' &&
      link.relationshipKind.length > 0,
  )
}
