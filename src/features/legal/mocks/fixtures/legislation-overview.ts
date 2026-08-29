import type { LegislationOverview } from '@/schemas/legal'
import { LEGAL_CORPUS_MEASURED_AT } from '../../lib/legal-coverage'

/**
 * Overview fixture. The headline counts left this payload with the overview
 * schema (2026-08-26) — they live in `legislation-status-counts.ts`, behind
 * the status aggregate's own request.
 *
 * The **act titles and gazette issues are illustrative** — the surface labels
 * the whole payload `mock` either way. `inDegree` for the Codul Fiscal
 * (2 621) is the one measured per-act figure we have; the rest of the ranking
 * is plausible filler at the right order.
 */
export const legislationOverviewFixture: LegislationOverview = {
  mostCitedActs: [
    {
      actId: '66150',
      displayCitation: 'Legea nr. 227/2015',
      actType: 'lege',
      actNumber: '227',
      actYear: 2015,
      issuerSlug: 'parlamentul',
      status: 'abrogat-partial',
      inDegree: 2_621,
    },
    {
      actId: '30412',
      displayCitation: 'Legea nr. 53/2003',
      actType: 'lege',
      actNumber: '53',
      actYear: 2003,
      issuerSlug: 'parlamentul',
      status: 'modificat',
      inDegree: 1_980,
    },
    {
      actId: '51877',
      displayCitation: 'Legea nr. 287/2009',
      actType: 'lege',
      actNumber: '287',
      actYear: 2009,
      issuerSlug: 'parlamentul',
      status: 'in-vigoare',
      inDegree: 1_744,
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
    },
    {
      actId: '66149',
      displayCitation: 'Legea nr. 207/2015',
      actType: 'lege',
      actNumber: '207',
      actYear: 2015,
      issuerSlug: 'parlamentul',
      status: 'modificat',
      inDegree: 1_338,
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
    },
    {
      actId: '51880',
      displayCitation: 'Legea nr. 286/2009',
      actType: 'lege',
      actNumber: '286',
      actYear: 2009,
      issuerSlug: 'parlamentul',
      status: 'modificat',
      inDegree: 964,
    },
  ],
  latestGazetteIssues: [
    {
      moIssueId: '412771',
      partCode: 'PI',
      issueLabel: 'Partea I nr. 712',
      issueNumber: 712,
      issueYear: 2026,
      issueDate: '2026-07-31',
      pdfUrl: 'https://monitoruloficial.ro/e-monitor/pdf/PI-712-2026.pdf',
      hasEmonitorLink: true,
    },
    {
      moIssueId: '412770',
      partCode: 'PI',
      issueLabel: 'Partea I nr. 711',
      issueNumber: 711,
      issueYear: 2026,
      issueDate: '2026-07-30',
      pdfUrl: 'https://monitoruloficial.ro/e-monitor/pdf/PI-711-2026.pdf',
      hasEmonitorLink: true,
    },
    {
      moIssueId: '412698',
      partCode: 'PVI',
      issueLabel: 'Partea VI nr. 143',
      issueNumber: 143,
      issueYear: 2026,
      issueDate: '2026-07-30',
      pdfUrl: null,
      hasEmonitorLink: false,
    },
    {
      moIssueId: '412769',
      partCode: 'PI',
      issueLabel: 'Partea I nr. 710',
      issueNumber: 710,
      issueYear: 2026,
      issueDate: '2026-07-29',
      pdfUrl: 'https://monitoruloficial.ro/e-monitor/pdf/PI-710-2026.pdf',
      hasEmonitorLink: true,
    },
    {
      moIssueId: '412768',
      partCode: 'PI',
      issueLabel: 'Partea I nr. 709',
      issueNumber: 709,
      issueYear: 2026,
      issueDate: '2026-07-28',
      pdfUrl: null,
      hasEmonitorLink: false,
    },
  ],
  coverage: {
    authorities: ['Portal Legislativ', 'Monitorul Oficial'],
    yearsRange: [1990, 2026],
    retrievedAt: LEGAL_CORPUS_MEASURED_AT,
    publishedAt: null,
    knownGaps: [
      'Deciziile Curții Constituționale nu modifică statutul actelor vizate.',
      'Structura pe articole lipsește pentru ~31% dintre documente.',
      '36,3% dintre trimiterile între acte nu se rezolvă la un act.',
      'Doar 46,4% dintre publicările din Monitor se leagă sigur de un act.',
      'Monitorul Oficial: fără strat de text înainte de 2012.',
    ],
    inaccessibleCount: 0,
    dataStatus: 'mock',
  },
}
