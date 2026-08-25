import type { LegalRecentChange } from '@/schemas/legal'

/**
 * Change-feed fixture (`legalRecentChanges`).
 *
 * The rows are REAL events copied from the live API (2026-08-26) — ids,
 * kinds, dates, citations and statuses are production values, so the mock
 * exercises the true shapes: the three furthest future-dated events
 * (2027-01-05, all minted by Legea nr. 2/2026), the 2026-12-31 trio in which
 * ONE amending law modifies, completes and then abrogates the same ordinance,
 * the newest already-in-force event (2026-07-11 — the measured
 * `CHANGES_LATEST_EFFECTIVE_DATE`), two Monitorul Oficial `promulgare`
 * events, and two undated `abrogare-totala` rows with no acting act
 * (`sourceAct: null`, the norm on the undated cohort).
 *
 * The feed's serving order is (effective_date desc NULLS LAST, event_id
 * desc) — the mock lane re-sorts, so keep this array unordered-safe.
 */
export const legislationChangesFixture: readonly LegalRecentChange[] = [
  {
    eventId: '38613',
    eventKind: 'completare',
    effectiveDate: '2027-01-05',
    eventSource: 'portal',
    sourceAct: { actId: '167442', displayCitation: 'Legea nr. 2/2026' },
    actId: '208259',
    displayCitation: 'Legea nr. 204/2006',
    status: 'modificat',
  },
  {
    eventId: '38612',
    eventKind: 'completare',
    effectiveDate: '2027-01-05',
    eventSource: 'portal',
    sourceAct: { actId: '167442', displayCitation: 'Legea nr. 2/2026' },
    actId: '194563',
    displayCitation: 'Legea nr. 411/2004',
    status: 'abrogat-partial',
  },
  {
    eventId: '38611',
    eventKind: 'completare',
    effectiveDate: '2027-01-05',
    eventSource: 'portal',
    sourceAct: { actId: '167442', displayCitation: 'Legea nr. 2/2026' },
    actId: '103566',
    displayCitation: 'Legea nr. 1/2020',
    status: 'modificat',
  },
  {
    eventId: '50212',
    eventKind: 'modificare',
    effectiveDate: '2026-12-31',
    eventSource: 'portal',
    sourceAct: { actId: '68635', displayCitation: 'Legea nr. 352/2015' },
    actId: '34552',
    displayCitation: 'OG nr. 26/2011',
    status: 'modificat',
  },
  {
    eventId: '34052',
    eventKind: 'completare',
    effectiveDate: '2026-12-31',
    eventSource: 'portal',
    sourceAct: { actId: '68635', displayCitation: 'Legea nr. 352/2015' },
    actId: '34552',
    displayCitation: 'OG nr. 26/2011',
    status: 'modificat',
  },
  {
    eventId: '26508',
    eventKind: 'abrogare-totala',
    effectiveDate: '2026-12-31',
    eventSource: 'portal',
    sourceAct: { actId: '68635', displayCitation: 'Legea nr. 352/2015' },
    actId: '34552',
    displayCitation: 'OG nr. 26/2011',
    status: 'modificat',
  },
  {
    eventId: '38682',
    eventKind: 'completare',
    effectiveDate: '2026-09-25',
    eventSource: 'portal',
    sourceAct: { actId: '169010', displayCitation: 'Legea nr. 35/2026' },
    actId: '53515',
    displayCitation: 'OG nr. 58/1998',
    status: 'modificat',
  },
  {
    eventId: '38663',
    eventKind: 'completare',
    effectiveDate: '2026-07-11',
    eventSource: 'portal',
    sourceAct: { actId: '168745', displayCitation: 'Legea nr. 26/2026' },
    actId: '121318',
    displayCitation: 'OUG nr. 92/2021',
    status: 'modificat',
  },
  {
    eventId: '608291',
    eventKind: 'promulgare',
    effectiveDate: '2026-07-03',
    eventSource: 'monitorul-oficial',
    sourceAct: { actId: '1737499', displayCitation: 'Decretul nr. 371/2026' },
    actId: '1737498',
    displayCitation: 'Legea nr. 117/2026',
    status: 'in-vigoare',
  },
  {
    eventId: '608290',
    eventKind: 'promulgare',
    effectiveDate: '2026-07-03',
    eventSource: 'monitorul-oficial',
    sourceAct: { actId: '1737510', displayCitation: 'Decretul nr. 379/2026' },
    actId: '1737509',
    displayCitation: 'Legea nr. 125/2026',
    status: 'in-vigoare',
  },
  {
    eventId: '96433',
    eventKind: 'abrogare-totala',
    effectiveDate: null,
    eventSource: 'portal',
    sourceAct: null,
    actId: '867327',
    displayCitation: 'PROCEDURA din 21 decembrie 2004',
    status: 'abrogat',
  },
  {
    eventId: '96432',
    eventKind: 'abrogare-totala',
    effectiveDate: null,
    eventSource: 'portal',
    sourceAct: null,
    actId: '846278',
    displayCitation: 'Ordinul nr. 202/2002',
    status: 'abrogat',
  },
]
