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
    // INS, 1,916,404.9 million lei at current prices, +0.7% in real terms
    // against 2024. Eurostat carries 1,916.405bn, i.e. the same number.
    //
    // Three releases, not two: the flash estimate on 13 Feb 2026, the first
    // detailed provisional at 1,910,390.1 million on 6 Mar 2026, then the
    // second provisional (INS archive id `pib_tr4r2025_2`) on 9 Apr 2026 which
    // revised it up to the figure here. The 1,910.390bn we carried first was
    // the first provisional, not the flash. No final annual 2025 estimate has
    // been published, so this stays labelled provisional.
    value: 1916.4,
    digits: 0,
    unit: 'mld. lei',
    label: 'Produs intern brut',
    source: 'INS · 2025 · provizoriu',
    publication: 'INS, PIB 2025, date provizorii (2), publicat 9 aprilie 2026',
  },
  {
    // Ministry of Finance, consolidated general budget, full year 2025:
    // 808,731.4 million lei of expenditure against 662,698.2 million of
    // revenue, published 27 Jan 2026.
    //
    // The annex labels its own 2025 column "date operative", so that is what
    // the tile says. Not final, and not to be presented as final.
    value: 808.7,
    digits: 0,
    unit: 'mld. lei',
    label: 'Cheltuieli bugetare consolidate',
    source: 'MFin · 2025 · date operative',
    publication:
      'MFin, execuția bugetului general consolidat la 31.12.2025 (publicat 27 ian. 2026)',
  },
  {
    // Same release, same "date operative" status: cash deficit 146,033.2
    // million lei.
    //
    // "(cash)" is in the label because the methodology changes the answer. The
    // EU-comparable ESA 2010 deficit for the same year is 151.063bn lei, 7.9%
    // of GDP — a different number for the same country and period, and the one
    // Brussels uses.
    //
    // The ratio is deliberately not printed. MF published 7.65% of GDP using a
    // GDP denominator of 1,909,000.0 million lei in that same annex. Against
    // the revised 1,916,404.9 million above it works out at 7.62% — a derived
    // ratio, not MF's published statistic. Printing MF's 7.65% beside our own
    // GDP tile would invite a reader to divide the two and find a figure that
    // matches neither. Both are defensible alone; together they contradict.
    value: 146,
    digits: 0,
    unit: 'mld. lei',
    label: 'Deficit bugetar (cash)',
    source: 'MFin · 2025 · date operative',
    publication:
      'MFin, execuția bugetului general consolidat la 31.12.2025 (publicat 27 ian. 2026)',
  },
  {
    // INS, 19,043,151 people at 1 January 2025. The only definitive figure in
    // this list: INS published 19,036,031 provisionally on 29 Aug 2025 and the
    // definitive series on 14 Jan 2026.
    //
    // Labelled "rezidentă" deliberately, because INS publishes two figures 2.7
    // million apart and they measure different things. Resident population is
    // usual residence in Romania whatever the citizenship. Population by
    // domicile (21,739,400) is Romanian citizens with a registered domicile
    // address, de jure, so it still counts long-term emigrants — and that
    // figure is itself provisional, from the 28 Apr 2025 release, pending
    // revision. Per-capita normalisation uses the resident figure, and an
    // unlabelled number would be the wrong one to half the readers.
    value: 19.04,
    digits: 2,
    unit: 'mil.',
    label: 'Populație rezidentă',
    source: 'INS · 1 ian. 2025 · definitiv',
    publication:
      'INS, populația rezidentă la 1 ianuarie 2025, date definitive (14 ian. 2026)',
  },
]

/** Romanian formatting: decimal comma, dot as the thousands separator. */
export function formatFact(fact: NationalFact): string {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: fact.digits,
    maximumFractionDigits: fact.digits,
  }).format(fact.value)
}
