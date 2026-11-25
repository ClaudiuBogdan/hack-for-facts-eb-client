import {
  LEGAL_ORIGINAL_TEXT_CAVEAT,
  LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT,
  type LegalSearchActHit,
  type LegalSearchResultData,
} from '@/schemas/legal'
import { parseLegalCitationShape } from '../lib/legal-citation'
import type { LegalSearchFilter } from './legal-search-api.live'
import {
  legislationFinderFixture,
  type LegislationFinderFixtureRow,
} from '../mocks/fixtures/legislation-finder'

/**
 * Mock finder lane — the SERVER's `searchLegal` semantics over the fixture
 * corpus, state for state (usecases.ts, measured 2026-08-26):
 *
 *  - a citation-shaped query short-circuits to ONE exact act — `degraded:
 *    false`, `actsTotal: 1`, `totalsExhaustive: true` — and falls through to
 *    the name path when no act carries that number (exactly like the server);
 *  - a name query is a lexical contains-match — `degraded: true` with the
 *    English semantic sentinel, `actsTotal: null` (the Postgres path serves a
 *    bounded slice and never counts), `totalsExhaustive: false`;
 *  - a text phrase matches NOTHING — the corpus truth behind the tab's
 *    honesty message;
 *  - `includeHistorical: false` (the default) gates out abrogated /
 *    out-of-force acts on BOTH paths.
 *
 * Caveat strings are byte-identical to the server constants
 * (`LEGAL_ORIGINAL_TEXT_CAVEAT`, now imported from `@/schemas/legal` because
 * the guide states it too; `historicalCaveats` in core/usecases.ts) — the
 * component test asserts them verbatim, and a paraphrased fixture would pass
 * against itself while diverging from production.
 */

/** The server's `LEGAL_LIVE_STATUSES` (core/legal-engine-filter.ts). */
const LIVE_STATUSES: readonly string[] = [
  'in-vigoare',
  'modificat',
  'abrogat-partial',
  'suspendat',
  'necunoscut',
]

const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()

const toHit = (
  row: LegislationFinderFixtureRow,
  score: number,
): LegalSearchActHit => {
  const { searchAliases: _aliases, description, ...act } = row
  // the fixture's citations already name their acts: no Portal name to stand in for a bare „Doc nr."
  return { score, act, description, name: null }
}

/** Byte-format-identical to the server's `historicalCaveats` lines. */
const statusCaveats = (
  rows: readonly LegislationFinderFixtureRow[],
): string[] =>
  rows
    .filter((row) => row.status !== null && row.status !== 'in-vigoare')
    .map(
      (row) =>
        `${row.displayCitation}: status ${row.status} — verificați versiunea în vigoare.`,
    )

export async function fetchLegalSearchMock(
  q: string,
  options: { readonly historical?: boolean; readonly filter?: LegalSearchFilter } = {},
): Promise<LegalSearchResultData> {
  const historical = options.historical === true
  const filter = options.filter ?? {}
  // The filter as the server applies it to the fixture's own fields. The fixture carries no AI summaries, so a
  // domain, category or penalties filter leaves every row out, as it does any act without a summary.
  const summaryFilter = (filter.domain?.length ?? 0) > 0 || (filter.category?.length ?? 0) > 0 || filter.penaltiesMentioned !== undefined
  const narrowed = (row: LegislationFinderFixtureRow): boolean =>
    !summaryFilter &&
    (!filter.actType?.length || filter.actType.includes(row.actType)) &&
    (!filter.status?.length || (row.status !== null && filter.status.includes(row.status))) &&
    (filter.yearFrom === undefined || (row.actYear !== null && row.actYear >= filter.yearFrom)) &&
    (filter.yearTo === undefined || (row.actYear !== null && row.actYear <= filter.yearTo))
  const gate = (row: LegislationFinderFixtureRow): boolean =>
    narrowed(row) && (historical || (row.status !== null && LIVE_STATUSES.includes(row.status)))

  // Citation shortcut — no status caveats (the server's early return skips
  // them; its version-provenance caveat is not fabricated here).
  const shape = parseLegalCitationShape(q)
  if (shape !== null) {
    const exact = legislationFinderFixture.find(
      (row) =>
        row.actType === shape.actType &&
        row.actNumber === shape.actNumber &&
        row.actYear === shape.actYear,
    )
    if (exact !== undefined && gate(exact)) {
      return {
        acts: [toHit(exact, 1)],
        sections: [],
        caveats: [LEGAL_ORIGINAL_TEXT_CAVEAT],
        engine: 'postgres',
        actsTotal: 1,
        totalsExhaustive: true,
        degraded: false,
        asOf: null,
        unhydratedHits: 0,
      }
    }
  }

  // Lexical name path. `searchAliases` stands in for the production display
  // citations that contain the code names (see the fixture docblock).
  const needle = fold(q.trim())
  const rows =
    needle.length === 0
      ? []
      : legislationFinderFixture
          .filter(
            (row) =>
              gate(row) &&
              (fold(row.displayCitation).includes(needle) ||
                row.searchAliases.some((alias) => alias.includes(needle))),
          )
          .sort(
            (a, b) =>
              (b.inDegree ?? 0) - (a.inDegree ?? 0) ||
              Number(a.actId) - Number(b.actId),
          )

  return {
    acts: rows.map((row, index) => toHit(row, 1 - index * 0.1)),
    // The mock mirrors the Postgres path, whose provision hits are dropped.
    sections: [],
    caveats: [
      LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT,
      ...(rows.length > 0 ? [LEGAL_ORIGINAL_TEXT_CAVEAT] : []),
      ...statusCaveats(rows),
    ],
    engine: 'postgres',
    actsTotal: null,
    totalsExhaustive: false,
    degraded: true,
    asOf: null,
    unhydratedHits: 0,
  }
}
