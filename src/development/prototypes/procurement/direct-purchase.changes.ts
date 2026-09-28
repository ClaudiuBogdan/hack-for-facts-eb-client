/**
 * What the API must change for the direct-purchase page, as the prototype's
 * `api` view checks it (live, per record) — written for the server session.
 * Mirrors `docs/design/procurement/design.md` §16.2. Plain data: readable in
 * the source, rendered by the view.
 */

export type DaChangeId = 'detail-join' | 'item-id' | 'cui-in-name' | 'outcome' | 'line-prices' | 'undated-rows'

export interface DaChange {
  readonly id: DaChangeId
  readonly title: string
  readonly severity: 'blocking' | 'needed' | 'smaller'
  /** What is wrong today, measured. */
  readonly today: string
  /** What the API must serve instead. */
  readonly target: string
  /** Where the fix goes, as far as the client can tell. */
  readonly where: string
  /** How the prototype's `api` view decides it is fixed, per record. */
  readonly check: string
}

export const DA_CHANGES: readonly DaChange[] = [
  {
    id: 'detail-join',
    title: 'Link the detail to its purchase',
    severity: 'blocking',
    today:
      'procurement.da_details holds 11,257,271 rows; only 5,000 have da_id, and the server reads the detail by da_id — so almost every catalogue purchase answers detailAvailability NOT_CAPTURED although its detail is in the database.',
    target:
      'procurementDirectAcquisition(id).detail read by the key the purchase already holds: direct_acquisitions.attrs->>\'direct_acquisition_id\' = da_details.source_ref with source_system = \'elicitatie_da_detail\' (unique index) — detailAvailability AVAILABLE and the detail (description, delivery, payment, contract type, EU fund, documents, both decisions with deadlines and reasons, the lines, the lines\' total and whether it reconciles).',
    where: 'server: the DA detail repository (the join), and the backfill of da_id if the join stays on it.',
    check: 'detailAvailability is no longer NOT_CAPTURED: AVAILABLE, or TEMPORARILY_UNAVAILABLE while change 2 is open (the detail is found, its lines fail).',
  },
  {
    id: 'item-id',
    title: 'Serve the lines without an error',
    severity: 'blocking',
    today: 'ProcurementDaItem.id is ID!, the mapper emits daItemId and nothing renames it: any line fails with „Internal server error" at detail.items[N].id, and the whole detail is null beside AVAILABLE (the 5,000 linked details).',
    target: 'items[].id non-null (the detail item\'s key), every line field as in the target fixture.',
    where: 'server: the DA item mapper (daItemId → id).',
    check: 'detailAvailability AVAILABLE with the target\'s lines count (no GraphQL error under detail). Shown „blocked by 1" while the detail is not found: the lines cannot be seen until change 1 lands.',
  },
  {
    id: 'cui-in-name',
    title: 'Recover the CUI SEAP writes inside the name',
    severity: 'needed',
    today:
      '0.6% of catalogue purchases have no authority CUI; 58% of those carry it in the name behind a mangled prefix („R 361684 Banca Nationala a Romaniei", „r1890420 RAJA S.A"). For BNR that is 82.4% of its 2026 direct purchases: its institution page misses them, and this page cannot read their context.',
    target: 'authority.cui recovered („361684") when the name opens with an R/RO prefix and a CUI the spine knows; the name served without it.',
    where: 'scrapper/server: the party resolution for elicitatie_da rows.',
    check: 'authority.cui equals the target\'s.',
  },
  {
    id: 'outcome',
    title: 'Say how a purchase ended',
    severity: 'needed',
    today:
      'status is only finalized / cancelled. SEAP\'s own state says who stopped it and why — „Condiții refuzate", „Condiții neacceptate la termen", „Ofertă refuzată", „Ofertă neacceptată în termen" — and the reasons sit in the detail. Without the detail, a cancelled purchase can only be „Nefinalizată".',
    target: 'the raw state (status_raw / state_id) on the record, and the detail\'s decisions with their reasons (once linked, the reasons come with it).',
    where: 'server: the DA record type (a stateText or stateCode field).',
    check: 'the detail carries the refusal reason the target has (the state field is not served yet).',
  },
  {
    id: 'line-prices',
    title: 'Per line: other institutions\' prices, and repeats',
    severity: 'needed',
    today: 'not served. Computed per request it is ~1 s for a mid-size firm and far too slow for Dedeman\'s 40,000 lines a year.',
    target:
      'per line, the same product from the same firm at other institutions in the purchase\'s year — matched on firm × catalogue code × name × unit (and the catalogue description), from three institutions up — as { buyers, lines, min, median, max }; and how many other times this institution bought it from the firm that year. A projection: firm × catalogue code × name × unit × month, with count, min, median, max.',
    where: 'scrapper (the projection) and server (items[].peers, items[].repeats).',
    check: 'not served yet — the target fixture shows how the page uses it.',
  },
  {
    id: 'undated-rows',
    title: 'Sort by the purchase\'s own day, and privacy by field',
    severity: 'smaller',
    today:
      'Undated export and notification rows (~615,000) no longer open a list by date — on 28 September they sort last. But the date sort reads the finalization date alone, so a row with a publication date and no finalization date sorts with the undated: 4 of Apa Brașov\'s 168 rows from Dedeman (published 3 December 2025) sit among its 18 undated ones, 5 of the Brașov psychiatric hospital\'s 9 notices from TMG Guard (published 12 June 2024) after its undated one. Separately, 5.5% of details carry a person\'s contact in one field and the server withholds all their text.',
    target:
      'the list\'s date (date_list) is the day the page shows: the finalization date, else the publication date; rows with neither last. Privacy applied to the field that carries the contact, the rest of the text served.',
    where: 'server: date_list for the direct-purchase grain (the index and the date filters read it too); the detail privacy filter.',
    check:
      'for the export and notification records, the pair\'s list by date read whole: no row out of the finalization-else-publication order, no dated row after an undated one. Privacy is not checked per record.',
  },
]
