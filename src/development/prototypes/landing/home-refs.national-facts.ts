/**
 * National context for the landing strip.
 *
 * Every figure here is an official published statistic for 2025, verified
 * against two independent reports of the same primary source before being
 * written down. They are hardcoded rather than fetched on purpose: they are
 * annual, they change once a year, and a landing page should not pay for a
 * network round trip to state the size of the country's economy.
 *
 * What they are *not* is platform coverage. The number of institutions this
 * app holds execution data for is a different universe — a subset — and
 * putting it in the same row as a national total invites a reader to divide one
 * by the other. Coverage lives in the provenance band instead.
 *
 * `DESIGN.md` §Data Trust requires source, date and confidence beside every
 * claim, so each fact carries its own and the UI renders them. `sourceUrl`
 * points at the institution's own page rather than at the reporting that
 * carried it.
 */

export type NationalFact = {
  /** The number itself, unformatted. Rendered through `ro-RO`. */
  readonly value: number
  /** Decimal places to show, chosen per figure rather than globally. */
  readonly digits: number
  /** Small unit beside the value, following the compact split in DESIGN.md. */
  readonly unit: string
  readonly label: string
  /** Rendered under the label — the "source and date" the data-trust rules ask for. */
  readonly source: string
  readonly sourceUrl: string
}

export const NATIONAL_FACTS: readonly NationalFact[] = [
  {
    // INS, GDP 2025 at current prices: 1,910,390.1 million lei. This is the
    // flash estimate and INS revises it — treat as provisional, not final.
    // Cross-checks against the Ministry of Finance figures below: 808.73 /
    // 0.4236 = 1,909bn, which agrees to within a rounding step.
    value: 1910.4,
    digits: 0,
    unit: 'mld. lei',
    label: 'Produs intern brut',
    source: 'INS · 2025',
    sourceUrl: 'https://insse.ro/cms/ro/content/produsul-intern-brut',
  },
  {
    // Ministry of Finance, consolidated general budget, full year 2025:
    // total expenditure 808.73bn lei, stated as 42.36% of GDP.
    value: 808.7,
    digits: 0,
    unit: 'mld. lei',
    label: 'Cheltuieli bugetare consolidate',
    source: 'MFin · 2025',
    sourceUrl: 'https://mfinante.gov.ro/static/10/Mfp/buletin/executii/nota_bgc31122025.pdf',
  },
  {
    // Same source and period: cash deficit 146.03bn lei, 7.65% of GDP.
    value: 146,
    digits: 0,
    unit: 'mld. lei',
    label: 'Deficit bugetar',
    source: 'MFin · 2025 · 7,65% din PIB',
    sourceUrl: 'https://mfinante.gov.ro/static/10/Mfp/buletin/executii/nota_bgc31122025.pdf',
  },
  {
    // INS, resident population on 1 January 2025: 19.043 million.
    //
    // Labelled "rezidentă" deliberately. INS publishes two figures 2.7 million
    // apart — resident (19.04M) and permanent resident (21.74M, which counts
    // the diaspora). Per-capita normalisation uses the resident figure, and an
    // unlabelled number would be the wrong one to half the readers.
    value: 19.04,
    digits: 2,
    unit: 'mil.',
    label: 'Populație rezidentă',
    source: 'INS · 1 ian. 2025',
    sourceUrl:
      'https://insse.ro/cms/ro/content/populatia-rezidenta-la-1-ianuarie-2025',
  },
]

/** Romanian formatting: decimal comma, dot as the thousands separator. */
export function formatFact(fact: NationalFact): string {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: fact.digits,
    maximumFractionDigits: fact.digits,
  }).format(fact.value)
}
