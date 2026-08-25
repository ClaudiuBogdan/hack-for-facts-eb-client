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

/**
 * The first year with gazette issues in the corpus. Measured live 2026-08-26:
 * `moIssues(filter: {year})` is 0 for every probed year up to 1988 and 9 for
 * 1989 — the corpus opens with MO nr. 1/1989 of 22 December 1989, the day of
 * the Revolution. Re-validate if pre-1989 numbers are ever backfilled.
 */
export const GAZETTE_FIRST_ISSUE_YEAR = 1989

/**
 * The newest issue date in the corpus. Upstream issue discovery has been
 * FROZEN since this date, so the gazette surface must say "date până la" this
 * day rather than let a reader believe they are seeing today's Monitor.
 * Measured live 2026-08-26 (issues 565–566/2026, both 2026-07-09); update it
 * when discovery resumes — the gazette tab's default year derives from it.
 */
export const GAZETTE_LATEST_ISSUE_DATE = '2026-07-09'

/**
 * The newest ALREADY-in-force event in the global change feed — the top of
 * `legalRecentChanges(until: today)`. Measured live 2026-08-26 (a `completare`
 * on OUG nr. 92/2021, effective 2026-07-11); nothing newer has taken effect in
 * the corpus although six weeks had passed, so the changes tab captions itself
 * "date până la" this day and carries a staleness note. The feed ALSO holds
 * future-dated events beyond it (8 rows out to 2027-01-05, announced by acts
 * already published) — those are ahead of this frontier by design, not a
 * contradiction of it. Update when event capture moves again.
 */
export const CHANGES_LATEST_EFFECTIVE_DATE = '2026-07-11'
