/**
 * National context for the landing strip.
 *
 * Every figure here is an official published statistic for 2025, checked
 * against the issuing institution's own release before being written down.
 * They are hardcoded rather than fetched on purpose: they are annual, they
 * change once a year, and a landing page should not pay for a network round
 * trip to state the size of the country's economy.
 *
 * What they are *not* is platform coverage. The number of institutions this app
 * holds execution data for is a different universe — a subset — and putting it
 * in the same row as a national total invites a reader to divide one by the
 * other. Coverage lives in the provenance band instead.
 *
 * `DESIGN.md` §Data Trust requires source, date and confidence beside every
 * claim, so each fact carries its own and the UI renders them. `publication`
 * names the primary document rather than linking it: `insse.ro` refuses
 * automated requests and `mfinante.gov.ro` refused connection outright, so no
 * deep URL here could be confirmed to resolve. Naming the release is honest;
 * shipping a plausible-looking link nobody has opened is not. Whoever promotes
 * this should resolve them and add the hrefs.
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
  /** The primary release this came from, for whoever has to re-verify it. */
  readonly publication: string
}

export const NATIONAL_FACTS: readonly NationalFact[] = [
  {
    // INS provisional (2) estimate: 1,916.404bn lei at current prices, +0.7%
    // in real terms against 2024. Eurostat carries 1,916.405bn, i.e. the same
    // number.
    //
    // This supersedes the 1,910.390bn flash estimate published first. Labelled
    // "provizoriu" because INS revises again — the semi-final and final
    // accounts will move it.
    value: 1916.4,
    digits: 0,
    unit: 'mld. lei',
    label: 'Produs intern brut',
    source: 'INS · 2025 · provizoriu',
    publication: 'INS, conturi naționale 2025, estimare provizorie (2)',
  },
  {
    // Ministry of Finance, consolidated general budget, full year 2025: total
    // expenditure 808.73bn lei against 662.70bn lei of revenue.
    value: 808.7,
    digits: 0,
    unit: 'mld. lei',
    label: 'Cheltuieli bugetare consolidate',
    source: 'MFin · 2025',
    publication: 'MFin, execuția bugetului general consolidat la 31.12.2025',
  },
  {
    // Same release: cash deficit 146.03bn lei.
    //
    // "(cash)" is in the label because the methodology changes the answer. The
    // EU-comparable ESA 2010 deficit for the same year is 151.063bn lei, 7.9%
    // of GDP — a different number for the same country and period, and the one
    // Brussels uses.
    //
    // The ratio is deliberately not printed. MF stated 7.65% of GDP, computed
    // against the ~1,909bn GDP estimate available when the execution was
    // published. Against the revised 1,916.4bn above it works out at 7.62%, so
    // showing MF's ratio beside our GDP would invite a reader to divide the two
    // tiles and find a figure that does not match. Either number is defensible
    // alone; printed together they contradict each other.
    value: 146,
    digits: 0,
    unit: 'mld. lei',
    label: 'Deficit bugetar (cash)',
    source: 'MFin · 2025',
    publication: 'MFin, execuția bugetului general consolidat la 31.12.2025',
  },
  {
    // INS definitive figure for 1 January 2025: 19,043,151 people, down about
    // 24,400 year on year.
    //
    // Labelled "rezidentă" deliberately. INS publishes two figures 2.7 million
    // apart — resident (19.04M) and by domicile (21.74M, which still counts
    // citizens living abroad). Per-capita normalisation uses the resident
    // figure, and an unlabelled number would be the wrong one to half the
    // readers.
    value: 19.04,
    digits: 2,
    unit: 'mil.',
    label: 'Populație rezidentă',
    source: 'INS · 1 ian. 2025',
    publication: 'INS, populația rezidentă la 1 ianuarie 2025',
  },
]

/** Romanian formatting: decimal comma, dot as the thousands separator. */
export function formatFact(fact: NationalFact): string {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: fact.digits,
    maximumFractionDigits: fact.digits,
  }).format(fact.value)
}
