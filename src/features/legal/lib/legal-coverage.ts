/**
 * Corpus facts measured on `transparenta_prod` by the scrapper's legal
 * finish-wave. Sources: `prod-db/LEGAL_CURRENT_STATE.md`,
 * `prod-db/LEGAL_DATA_BRIEF.md`, `prod-db/LEGAL_SCHEMA_DESIGN.md`.
 *
 * These are **measurements with a date**, not live counts, and every surface
 * that prints one shows `MEASURED_AT` next to it. They exist as constants
 * because the server has no aggregate that can answer them — see
 * `docs/design/legal/main-page.md` §6.2. Delete each one as soon as a query can
 * answer it; never let one drift silently into looking live.
 */

/** The date the figures below were measured. */
export const LEGAL_CORPUS_MEASURED_AT = '2026-06-29'

/** Total resolved citation edges in `legal.act_references`. */
export const LEGAL_REFERENCE_EDGE_COUNT = 1_103_595

/** Edges resolving to no target at all — rendered as "possible match", never a link. */
export const LEGAL_REFERENCE_UNRESOLVED_COUNT = 400_368

/** Gazette publication events in `legal.mo_act_publications`. */
export const GAZETTE_PUBLICATION_COUNT = 212_221

/** Share of publication events confidently matched to a Portal act (`resolution = unique`). */
export const GAZETTE_MATCH_RATE = 0.464

/** Documents with zero rows in `legal.document_nodes` — no article-level structure. */
export const LEGAL_DOCS_WITHOUT_ARTICLE_STRUCTURE = 69_254

/** Share of the corpus that lacks article-level structure. */
export const LEGAL_ARTICLE_STRUCTURE_GAP_RATE = 0.31

/**
 * Constitutional Court decisions present as `legal.acts`
 * (`decizie:*:curtea-constitutionala`). `act_status_events(event_source='ccr')`
 * is 0 — the status projection is deferred by product decision, so a provision
 * struck down as unconstitutional still folds to its Portal status.
 */
export const CCR_DECISION_COUNT = 23_378
