import type { I18n } from '@lingui/core'
import { msg, t } from '@lingui/core/macro'
import { countyNameRo } from '@/lib/territory-counties'
import { activeNumberLocale } from '../../lib/format'
import type { UatKind, UatMapMissing, UatMapPartId, UatMapSeries, UatMapSeriesId } from '../../lib/uat-map-snapshot'

/**
 * What each series means: its total for the latest period, in the reader's
 * words — the unit after the figure, what the colours are and when, the
 * events a balance is made of, and the one misreading to avoid.
 */

export interface SeriesMeta {
  readonly id: UatMapSeriesId
  /** On the series toggle. */
  readonly short: string
  /** After a total: „locuitori", „persoane", „locuințe". */
  readonly unit: string
  /** A balance has a sign, and its colours diverge from zero: orange below, blue above. */
  readonly signed: boolean
  /** Keep recorded zeroes in their own class even when they are rare. */
  readonly separateZero?: boolean
  /** Decimals: water is thousand m³, everything else whole. */
  readonly digits: number
  /** When the total is counted: „la 1 ianuarie 2026", „în 2025". */
  readonly period: (series: UatMapSeries) => string
  /** What the colours are, and when: „Locuitori după domiciliu la 1 ianuarie 2026". */
  readonly legend: (series: UatMapSeries) => string
  /** The events a balance is made of, one line, for the tooltip. */
  readonly receipt: ((series: UatMapSeries, index: number) => string) | null
  /** The INS matrices the figures come from. */
  readonly sources: string
  /** One line against the likeliest misreading. */
  readonly caveat: string
}

/** The capital's code: a county of one UAT, the city itself. */
export const CAPITAL_COUNTY = 'B'

/** A county as the page names it — „Județul Cluj"; the capital is no county: „Municipiul București". */
export function countyLabel(code: string): string {
  return code === CAPITAL_COUNTY ? t`Municipiul București` : t`Județul ${countyNameRo(code) ?? code}`
}

/** Why a UAT has no total, in the reader's words. */
export function missingLabel(reason: UatMapMissing | undefined, series: UatMapSeriesId): string {
  switch (reason) {
    case 'negative':
      return t`valoare INS negativă, nefolosită`
    default:
      if (series === 'apa') return t`date indisponibile pentru uz casnic`
      if (series === 'locuinte-noi') return t`date indisponibile pentru locuințe terminate`
      return t`fără date INS`
  }
}

/** What a UAT is, in the reader's words: „comună", „municipiu, reședință de județ". */
export const kindLabel = (kind: UatKind) =>
  kind === 'comuna'
    ? t`comună`
    : kind === 'oras'
      ? t`oraș`
      : kind === 'municipiu'
        ? t`municipiu`
        : kind === 'resedinta'
          ? t`municipiu, reședință de județ`
          : t`capitala`

/** One formatter per language and style: a series switch formats a hundred figures. */
const formatters = new Map<string, Intl.NumberFormat>()

/** A count in the reader's grouping, signed when it is a balance: „−1.123". */
export function formatCount(value: number, options: { readonly signed?: boolean; readonly digits?: number } = {}): string {
  const locale = activeNumberLocale()
  const digits = options.digits ?? 0
  const key = `${locale}|${digits}|${options.signed === true}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
      ...(options.signed ? { signDisplay: 'exceptZero' as const } : {}),
    })
    formatters.set(key, formatter)
  }
  return formatter.format(value).replace('-', '−')
}

/** A series' total in its own words — „292.819 locuitori", „−1.123 persoane"; `unit: false` drops the unit, „—" where there is none. */
export function formatTotal(meta: SeriesMeta, value: number | null | undefined, options: { readonly unit?: boolean } = {}): string {
  if (value == null) return '—'
  const figure = formatCount(value, { signed: meta.signed, digits: meta.digits })
  return options.unit === false ? figure : `${figure} ${meta.unit}`
}

/**
 * The six series in the reader's language. `translate` is `useLingui()._`,
 * whose identity changes with the language: a caller memoizes on it.
 */
export function seriesMeta(translate: I18n['_']): readonly SeriesMeta[] {
  const count = (series: UatMapSeries, id: UatMapPartId, index: number) => {
    const value = series.parts.find((part) => part.id === id)?.values[index]
    return value == null ? '—' : formatCount(value)
  }
  const inYear = (series: UatMapSeries) => translate(msg`în ${series.year}`)
  const persons = translate(msg`persoane`)

  return [
    {
      id: 'populatie',
      short: translate(msg`Populație`),
      unit: translate(msg`locuitori`),
      signed: false,
      digits: 0,
      period: (series) => translate(msg`la 1 ianuarie ${series.year}`),
      legend: (series) => translate(msg`Locuitori după domiciliu la 1 ianuarie ${series.year}`),
      receipt: null,
      sources: 'POP107D',
      caveat: translate(msg`După domiciliu, nu după cine locuiește efectiv: cine pleacă fără să-și schimbe domiciliul rămâne numărat.`),
    },
    {
      id: 'spor-natural',
      short: translate(msg`Spor natural`),
      unit: persons,
      signed: true,
      digits: 0,
      period: inYear,
      legend: (series) => translate(msg`Născuți-vii minus decedați, în ${series.year}`),
      receipt: (series, index) => translate(msg`Născuți-vii: ${count(series, 'births', index)} · decedați: ${count(series, 'deaths', index)}`),
      sources: 'POP201D, POP206D',
      caveat: translate(msg`Depinde de mărimea localității și de vârsta locuitorilor: o localitate mare sau îmbătrânită are mai multe decese.`),
    },
    {
      id: 'sold-domiciliu',
      short: translate(msg`Mutări`),
      unit: persons,
      signed: true,
      digits: 0,
      period: inYear,
      legend: (series) => translate(msg`Stabiliri minus plecări cu domiciliul, în ${series.year}`),
      receipt: (series, index) => translate(msg`Stabiliri: ${count(series, 'arrivals', index)} · plecări: ${count(series, 'departures', index)}`),
      sources: 'POP307A, POP308A',
      caveat: translate(msg`Doar mutările cu domiciliul: cine pleacă fără să-și schimbe domiciliul nu apare.`),
    },
    {
      id: 'salariati',
      short: translate(msg`Locuri de muncă`),
      unit: translate(msg`locuri de muncă`),
      signed: false,
      digits: 0,
      period: inYear,
      legend: (series) => translate(msg`Locuri de muncă salariate, medie anuală, ${series.year}`),
      receipt: null,
      sources: 'FOM104D',
      caveat: translate(msg`Numărate unde se muncește, nu unde se locuiește.`),
    },
    {
      id: 'locuinte-noi',
      short: translate(msg`Locuințe noi`),
      unit: translate(msg`locuințe`),
      signed: false,
      separateZero: true,
      digits: 0,
      period: inYear,
      legend: (series) => translate(msg`Locuințe terminate în ${series.year}`),
      receipt: null,
      sources: 'LOC104B',
      caveat: translate(msg`Lipsa unei valori pentru locuințe terminate nu înseamnă zero. Hașurile arată date lipsă; 0 este o valoare înregistrată.`),
    },
    {
      id: 'apa',
      short: translate(msg`Apă`),
      unit: translate(msg`mii m³`),
      signed: false,
      digits: 1,
      period: inYear,
      legend: (series) => translate(msg`Apă potabilă distribuită pentru uz casnic, mii m³, ${series.year}`),
      receipt: null,
      sources: 'GOS108A',
      caveat: translate(msg`Apa distribuită pentru uz casnic. Lipsa unei valori nu indică absența rețelei publice.`),
    },
  ]
}
