import type { RawDaParty, RawDaPurchase, RawDaPurchaseDetail, RawDaPurchaseItem } from '../api/graphql/procurement-da-release-queries'

/**
 * Release-1 purchases as the API answers them (`procurementDaPurchase`),
 * one per example row of the data platform's direct-acquisition serving
 * contract (synthetic). Test backing data only.
 *
 * As in release 1, the free text (title, description, a line's name) is
 * withheld by default; `SERVED_TEXT` / `servedItemText` serve it, as after a
 * field's review.
 */

export const RELEASE_ID = 'a'.repeat(64)

export const BUYER: RawDaParty = { displayKind: 'authority', partyId: 'p-buyer', name: 'Banca Nationala a Romaniei', fiscalCode: '361684' }
export const COMPANY: RawDaParty = { displayKind: 'company', partyId: 'p-firm', name: 'FLORARIA IRIS SRL', fiscalCode: '14837428' }
export const NATURAL_PERSON: RawDaParty = { displayKind: 'natural_person', partyId: null, name: null, fiscalCode: null }

/** A served label in both languages, as the contract words the reasons. */
export const REASONS = {
  not_accepted: { code: 'not_accepted', labelEn: 'Refused or expired: no purchase took place.', labelRo: 'Respinsă sau expirată: achiziția nu s-a realizat.' },
  value_not_qualified: {
    code: 'value_not_qualified',
    labelEn: "The value's currency and VAT basis are not yet confirmed for this period (before 2025).",
    labelRo: 'Moneda și baza TVA ale valorii nu sunt încă confirmate pentru această perioadă (înainte de 2025).',
  },
  reviewed_entry_error: { code: 'reviewed_entry_error', labelEn: 'Left out after review: see the rule.', labelRo: 'Exclusă după verificare: vezi regula.' },
} as const

export const RULES = {
  quantity_unit_mix: {
    rule: 'quantity_unit_mix',
    effect: 'correct',
    descriptionEn: 'We use the quantity stated for the purchase when the reported total was calculated with the wrong unit or quantity scale.',
    descriptionRo: 'Folosim cantitatea declarată a achiziției când totalul raportat a fost calculat cu unitatea sau scara greșită.',
  },
  approximate_only: {
    rule: 'approximate_only',
    effect: 'exclude',
    descriptionEn: 'We leave the purchase out of spending totals when the reported value is unreliable and the record does not establish an exact replacement.',
    descriptionRo: 'Lăsăm achiziția în afara totalurilor când valoarea raportată nu e de încredere și înregistrarea nu stabilește o valoare exactă în loc.',
  },
  exceeds_buyer_spending: {
    rule: 'exceeds_buyer_spending',
    effect: 'exclude',
    descriptionEn: "We leave the purchase out of spending totals when its reported price is above the buyer's whole annual spending.",
    descriptionRo: 'Lăsăm achiziția în afara totalurilor când prețul raportat depășește toate cheltuielile anuale ale cumpărătorului.',
  },
} as const

export function rawReleasePurchase(fields: Partial<RawDaPurchase> = {}): RawDaPurchase {
  return {
    purchaseId: RELEASE_ID,
    nativeId: '120000001',
    code: 'DA37709621',
    sourceUrl: 'https://e-licitatie.ro/pub/direct-acquisition/view/120000001',
    outcome: 'accepted',
    stateLabel: 'Finalizata',
    publicationDay: '2025-06-01',
    finalizationDay: '2025-06-02',
    buyerDecisionAt: '2025-06-02T09:00:00.123456Z',
    supplierDecisionAt: '2025-06-01T15:00:00.654321Z',
    reportedValue: '12500.00',
    counted: true,
    countedValue: '12500.00',
    notCountedReason: null,
    valueCorrected: false,
    correctedValue: null,
    reviewRule: null,
    symbolicPrice: false,
    listedNow: true,
    title: null,
    titleWithheld: 'privacy',
    description: null,
    descriptionWithheld: 'privacy',
    categoryCode: '03121210-0',
    categoryLabel: 'Aranjamente florale (Rev.2)',
    cpvDivision: '03',
    acquisitionTypeLabel: 'Furnizare',
    buyer: BUYER,
    supplier: COMPANY,
    ...fields,
  }
}

export function rawReleaseItem(fields: Partial<RawDaPurchaseItem> = {}): RawDaPurchaseItem {
  return {
    itemIndex: 0,
    name: null,
    nameWithheld: 'privacy',
    unit: 'bucata',
    quantity: '25',
    requestedQuantity: '25',
    unitPrice: '500.00',
    cataloguePrice: '500.00',
    reportedLineValue: '12500.00',
    supplierRejected: false,
    quantityCorrection: false,
    ...fields,
  }
}

export function rawReleaseDetail(fields: Partial<RawDaPurchase> = {}, items: readonly RawDaPurchaseItem[] = [rawReleaseItem()]): RawDaPurchaseDetail {
  return { purchase: rawReleasePurchase(fields), items: [...items], dataAsOf: '2026-11-18T03:10:00.123456Z', countedValueBasis: 'RON excluding VAT' }
}

/** The purchase's free text served, as after its review. */
export const SERVED_TEXT = { title: 'Aranjamente florale pentru eveniment', titleWithheld: null, description: 'Diverse aranjamente florale', descriptionWithheld: null } as const

/** A line's name served. */
export function servedItemText(name: string): Partial<RawDaPurchaseItem> {
  return { name, nameWithheld: null }
}

/** The contract's example rows, by case. */
export const RELEASE_CASES = {
  countedAsReported: () => rawReleaseDetail(),
  corrected: () =>
    rawReleaseDetail(
      {
        finalizationDay: '2025-03-04',
        reportedValue: '3150000.00',
        countedValue: '3150.00',
        valueCorrected: true,
        correctedValue: '3150.00',
        reviewRule: RULES.quantity_unit_mix,
        categoryLabel: 'Beton refractar (Rev.2)',
      },
      [rawReleaseItem({ unit: 't', quantity: '375', unitPrice: '8400.00', cataloguePrice: '8.40', reportedLineValue: '3150000.00' })],
    ),
  excludedApproximate: () =>
    rawReleaseDetail({ finalizationDay: '2025-09-10', reportedValue: '1680000.00', counted: false, countedValue: null, notCountedReason: REASONS.reviewed_entry_error, reviewRule: RULES.approximate_only }),
  excludedAboveSpending: () =>
    rawReleaseDetail({
      finalizationDay: '2026-09-18',
      reportedValue: '358324000.00',
      counted: false,
      countedValue: null,
      notCountedReason: REASONS.reviewed_entry_error,
      reviewRule: RULES.exceeds_buyer_spending,
    }),
  openCaseKept: () => rawReleaseDetail({ finalizationDay: '2025-10-02', reportedValue: '188800000.00', countedValue: '188800000.00' }),
  refused: () => rawReleaseDetail({ outcome: 'refused', stateLabel: 'Respinsa', finalizationDay: '2025-05-12', reportedValue: '40000.00', counted: false, countedValue: null, notCountedReason: REASONS.not_accepted }),
  before2025: () =>
    rawReleaseDetail({ publicationDay: '2021-11-29', finalizationDay: '2021-11-30', reportedValue: '8400.00', counted: false, countedValue: null, notCountedReason: REASONS.value_not_qualified }),
  noLongerListed: () => rawReleaseDetail({ finalizationDay: '2026-11-13', reportedValue: '5200.00', countedValue: '5200.00', listedNow: false }),
  symbolicPrice: () => rawReleaseDetail({ finalizationDay: '2025-02-11', reportedValue: '0.01', countedValue: '0.01', symbolicPrice: true }),
  naturalPerson: () => rawReleaseDetail({ finalizationDay: '2025-07-07', reportedValue: '900.00', countedValue: '900.00', supplier: NATURAL_PERSON }),
} as const
