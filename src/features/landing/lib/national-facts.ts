import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

/**
 * National context for the landing strip.
 *
 * Every figure here is an official published statistic, the newest annual one
 * its institution has released, checked against the institution's own data
 * before being written down (last checked 22 November 2026: INS Tempo for the
 * two INS figures, with Eurostat carrying the same numbers; the Ministry's
 * December bulletin, as the platform's own budget pages hold it, for the other
 * two). They are hardcoded rather than fetched on purpose: they are annual, and
 * a landing page should not pay for a network round trip to state the size of
 * the country's economy. The price is that INS revises them — GDP three times
 * in 2026 — so whoever touches this file re-checks all four.
 *
 * What they are *not* is platform coverage. The number of institutions this app
 * holds execution data for is a different universe — a subset — and putting it
 * in the same row as a national total invites a reader to divide one by the
 * other. The landing prints no coverage figures.
 *
 * `DESIGN.md` §Data Trust requires source, date and confidence beside every
 * claim, so each fact carries its own and the UI renders them. `publication`
 * names the primary document for whoever re-verifies the figure; `link` is
 * where a reader goes from the tile — the platform's own page on the same
 * data, where the series, its source and its revisions are in full.
 */

/** Where a tile leads: an INS dataset's page, or a view of the national budget's analysis page. */
export type NationalFactLink =
  | { readonly dataset: string }
  | { readonly budget: { readonly tip?: 'sold'; readonly perioada?: number } }

export type NationalFact = {
  /** Stable identity for rendering; two facts can share a publication. */
  readonly key: 'gdp' | 'spending' | 'deficit' | 'population'
  /** The number itself, unformatted. Rendered through `ro-RO`. */
  readonly value: number
  /** Decimal places to show, chosen per figure rather than globally. */
  readonly digits: number
  /** Small unit beside the value, following the compact split in DESIGN.md. */
  readonly unit: MessageDescriptor
  readonly label: MessageDescriptor
  /** Rendered under the label — the "source and date" the data-trust rules ask for. */
  readonly source: MessageDescriptor
  /** The primary release this came from, for whoever has to re-verify it. */
  readonly publication: string
  readonly link: NationalFactLink
}

export const NATIONAL_FACTS: readonly NationalFact[] = [
  {
    // INS, 1,929,930.0 million lei at current prices: the „PIB" row of Tempo
    // matrix CON111B for 2025, last updated 9 Oct 2026. Eurostat
    // (`nama_10_gdp`, updated 11 Nov 2026) carries the same number, flagged
    // provisional.
    //
    // The fourth figure for this year: 1,910,390.1 million in the first
    // provisional (6 Mar 2026), 1,916,404.9 million in the second (9 Apr
    // 2026), and this one with the autumn revision of the annual accounts.
    // Still provisional; the tile says so.
    key: 'gdp',
    value: 1929.9,
    digits: 0,
    unit: msg`mld. lei`,
    label: msg`Produs intern brut`,
    source: msg`INS · 2025 · provizoriu`,
    publication: 'INS, PIB 2025, date provizorii; Tempo CON111B, actualizat 9 octombrie 2026',
    link: { dataset: 'CON111B' },
  },
  {
    // Ministry of Finance, consolidated general budget, full year 2025:
    // 808,731.4 million lei of expenditure against 662,698.2 million of
    // revenue, published 27 Jan 2026.
    //
    // The annex labels its own 2025 column "date operative", so that is what
    // the tile says. Not final, and not to be presented as final.
    key: 'spending',
    value: 808.7,
    digits: 0,
    unit: msg`mld. lei`,
    label: msg`Cheltuieli bugetare consolidate`,
    source: msg`MFin · 2025 · date operative`,
    publication:
      'MFin, execuția bugetului general consolidat la 31.12.2025 (publicat 27 ian. 2026)',
    // Spending by category, for the year.
    link: { budget: { perioada: 2025 } },
  },
  {
    // Same release, same "date operative" status: cash deficit 146,033.2
    // million lei.
    //
    // "(cash)" is in the label because the methodology changes the answer. The
    // EU-comparable ESA 2010 deficit for the same year is 149.731bn lei, 7.8%
    // of GDP (Eurostat `gov_10dd_edpt1`, the October 2026 notification) — a
    // different number for the same country and period, and the one Brussels
    // uses.
    //
    // The ratio is deliberately not printed. MF published 7.65% of GDP using a
    // GDP denominator of 1,909,000.0 million lei in that same annex. Against
    // the revised 1,929,930.0 million above it works out at 7.57% — a derived
    // ratio, not MF's published statistic. Printing MF's 7.65% beside our own
    // GDP tile would invite a reader to divide the two and find a figure that
    // matches neither. Both are defensible alone; together they contradict.
    key: 'deficit',
    value: 146,
    digits: 0,
    unit: msg`mld. lei`,
    label: msg`Deficit bugetar (cash)`,
    source: msg`MFin · 2025 · date operative`,
    publication:
      'MFin, execuția bugetului general consolidat la 31.12.2025 (publicat 27 ian. 2026)',
    // The balance, year by year.
    link: { budget: { tip: 'sold' } },
  },
  {
    // INS, 19,041,322 people at 1 January 2026, provisional: Tempo matrix
    // POP105A (total, both sexes, both residence areas), last updated 10 Sep
    // 2026; Eurostat (`demo_gind`) carries the same number. The definitive
    // figure follows around January 2027, as the one for 1 January 2025
    // (19,043,151, definitive since 14 Jan 2026) followed its own provisional.
    // The owner chose the newest figure over the last definitive one (22
    // November 2026): it is the one the dataset page shows as its latest.
    //
    // Labelled "rezidentă" deliberately, because INS publishes two figures 2.6
    // million apart and they measure different things. Resident population is
    // usual residence in Romania whatever the citizenship. Population by
    // domicile (21.646 million at the same date, as reported from the INS
    // release of 2 Apr 2026) is Romanian citizens with a registered domicile
    // address, de jure, so it still counts long-term emigrants. Per-capita
    // normalisation uses the resident figure, and an unlabelled number would
    // be the wrong one to half the readers.
    key: 'population',
    value: 19.04,
    digits: 2,
    unit: msg`mil.`,
    label: msg`Populație rezidentă`,
    source: msg`INS · 1 ian. 2026 · provizoriu`,
    publication:
      'INS, populația rezidentă la 1 ianuarie 2026, date provizorii; Tempo POP105A, actualizat 10 septembrie 2026',
    link: { dataset: 'POP105A' },
  },
]

/** The two languages the app renders numbers in, keyed as `getUserLocale` names them. */
export type NumberLocale = 'ro' | 'en'

const NUMBER_LOCALE_TAG: Readonly<Record<NumberLocale, string>> = { ro: 'ro-RO', en: 'en-GB' }

/**
 * Locale formatting: Romanian writes `1.916,4`, English `1,916.4`. The same
 * digits with the other locale's separators read as a thousandfold error, so
 * the locale is a parameter and the caller passes the active one.
 *
 * Takes the number rather than the fact so a value on its way to the final one
 * is written exactly as the final one will be — same separators, same decimal
 * places — and the count does not change shape as it passes a thousand.
 */
export function formatValue(value: number, digits: number, locale: NumberLocale = 'ro'): string {
  return numberFormat(locale, digits).format(value)
}

/**
 * One formatter per language and precision: the count-ups format every figure
 * on every animation frame, and building an `Intl.NumberFormat` costs far more
 * than using one.
 */
const numberFormats = new Map<string, Intl.NumberFormat>()
function numberFormat(locale: NumberLocale, digits: number): Intl.NumberFormat {
  const key = `${locale}:${digits}`
  let found = numberFormats.get(key)
  if (!found) {
    found = new Intl.NumberFormat(NUMBER_LOCALE_TAG[locale] ?? NUMBER_LOCALE_TAG.ro, { minimumFractionDigits: digits, maximumFractionDigits: digits })
    numberFormats.set(key, found)
  }
  return found
}

export function formatFact(fact: NationalFact, locale: NumberLocale = 'ro'): string {
  return formatValue(fact.value, fact.digits, locale)
}
