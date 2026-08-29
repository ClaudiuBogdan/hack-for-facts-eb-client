import type { LegalActListItem } from '@/schemas/legal'

/**
 * Finder fixture (`legalSearch`, acts channel) — the Caută tab's mock corpus.
 *
 * Act ids, citations, types, years and statuses are REAL production values
 * (the same acts as `legislation-overview.ts`, plus act 187041, the repealed
 * 2003 fiscal code that makes 'codul fiscal' genuinely ambiguous — the
 * resolver fixture's second candidate). `searchAliases` stands in for what
 * production matches with `display_citation ILIKE`: the code acts' real
 * display citations CONTAIN their code name ("CODUL MUNCII din …"), while
 * this fixture's directory-style citations do not. `description` lines are
 * abbreviated stand-ins for the enrichment sentence (the mock lane renders
 * under the mock badge); 98/2016 deliberately carries none so the card
 * without a snippet stays exercised.
 *
 * The row set covers every finder state: an exact-citation hit, a name hit,
 * the two-act ambiguity, a repealed act behind the historical gate (both by
 * name — 'codul fiscal' — and by citation — "legea 571/2003"), and no row at
 * all for genuine text phrases ("concediu de odihna"), which is the corpus
 * truth the tab's honesty message exists for.
 */
export type LegislationFinderFixtureRow = LegalActListItem & {
  readonly searchAliases: readonly string[]
  readonly description: string | null
}

export const legislationFinderFixture: readonly LegislationFinderFixtureRow[] =
  [
    {
      actId: '30412',
      displayCitation: 'Legea nr. 53/2003',
      actType: 'lege',
      actNumber: '53',
      actYear: 2003,
      issuerSlug: 'parlamentul',
      status: 'modificat',
      inDegree: 1_980,
      searchAliases: ['codul muncii'],
      description:
        'Codul muncii reglementează raporturile de muncă, contractul individual de muncă și răspunderea părților.',
    },
    {
      actId: '66150',
      displayCitation: 'Legea nr. 227/2015',
      actType: 'lege',
      actNumber: '227',
      actYear: 2015,
      issuerSlug: 'parlamentul',
      status: 'abrogat-partial',
      inDegree: 2_621,
      searchAliases: ['codul fiscal'],
      description:
        'Codul fiscal stabilește impozitele, taxele și contribuțiile sociale obligatorii.',
    },
    {
      actId: '187041',
      displayCitation: 'CODUL FISCAL din 22 decembrie 2003',
      actType: 'lege',
      actNumber: '571',
      actYear: 2003,
      issuerSlug: 'parlamentul',
      status: 'abrogat',
      inDegree: 1_154,
      searchAliases: ['codul fiscal'],
      description:
        'Vechiul Cod fiscal, abrogat la 1 ianuarie 2016 prin Legea nr. 227/2015.',
    },
    {
      actId: '84003',
      displayCitation: 'Ordonanța de urgență nr. 57/2019',
      actType: 'oug',
      actNumber: '57',
      actYear: 2019,
      issuerSlug: 'guvernul',
      status: 'modificat',
      inDegree: 1_512,
      searchAliases: ['codul administrativ'],
      description:
        'Codul administrativ reglementează administrația publică centrală și locală.',
    },
    {
      actId: '71204',
      displayCitation: 'Legea nr. 98/2016',
      actType: 'lege',
      actNumber: '98',
      actYear: 2016,
      issuerSlug: 'parlamentul',
      status: 'in-vigoare',
      inDegree: 1_107,
      searchAliases: [],
      description: null,
    },
  ]
