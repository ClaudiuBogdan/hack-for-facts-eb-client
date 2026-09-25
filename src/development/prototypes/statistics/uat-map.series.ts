import type { I18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { formatDerived } from '@/features/statistics/lib/territory-derived'
import { activeNumberLocale } from '@/features/statistics/lib/format'
import type { UatMapFigures, UatMapPartId, UatMapSeries, UatMapSeriesId } from '@/features/statistics/lib/uat-map-snapshot'

/**
 * What each series means, read three ways — the same three for every series,
 * one switch: the count of the latest year, the count per 1,000 inhabitants,
 * and the change from the year before. The tooltip shows all three; the
 * switch decides which one the map draws.
 */

export type View = 'total' | 'rate' | 'change'

export interface SeriesMeta {
  readonly id: UatMapSeriesId
  /** On the series toggle. */
  readonly short: string
  readonly label: string
  readonly total: {
    /** After a count: „locuitori", „persoane", „locuințe". */
    readonly unit: string
    /** A balance has a sign: orange below zero, blue above. */
    readonly signed: boolean
    /** Decimals: water is thousand m³, everything else whole. */
    readonly digits: number
    /** What the count is and when: „Locuitori la 1 ianuarie 2026". */
    readonly legend: (series: UatMapSeries) => string
  }
  /** The count per inhabitant; none for the population itself. */
  readonly rate: {
    /** The symbol after a rate: „‰", „l/zi". */
    readonly unit: string
    /** The rate in words: „la 1.000 de locuitori". */
    readonly words: string
    /** A balance diverges from zero. */
    readonly diverging: boolean
    readonly legend: (series: UatMapSeries) => string
  } | null
  /** What the change is: „Schimbarea față de 2025, în procente". */
  readonly changeLegend: (series: UatMapSeries) => string
  /** The events a balance is made of, one line, for the tooltip. */
  readonly receipt: ((series: UatMapSeries, index: number) => string) | null
  /** The INS matrices the figures come from. */
  readonly sources: string
  /** One line against the likeliest misreading. */
  readonly caveat: string
  readonly missing: (reason: string) => string
}

/** A count in the reader's grouping, signed when it is a balance or a change: „−40.541". */
export function formatCount(value: number, options: { readonly signed?: boolean; readonly digits?: number } = {}): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: options.digits ?? 0,
    minimumFractionDigits: options.digits ?? 0,
    ...(options.signed ? { signDisplay: 'exceptZero' as const } : {}),
  })
    .format(value)
    .replace('-', '−')
}

/** A figure of `view` in its own words: „292.819 locuitori", „−4,3 ‰", „−1,4 %", „+361 persoane". */
export function formatFigure(meta: SeriesMeta, series: UatMapSeries, view: View, value: number | null, withUnit = true): string {
  if (value === null) return '—'
  if (view === 'total') {
    const figure = formatCount(value, { signed: meta.total.signed, digits: meta.total.digits })
    return withUnit ? `${figure} ${meta.total.unit}` : figure
  }
  if (view === 'rate') {
    const figure = formatDerived(value, { signed: meta.rate?.diverging })
    return withUnit ? `${figure} ${meta.rate?.unit ?? ''}` : figure
  }
  if (series.change.kind === 'percent') {
    const figure = formatDerived(value, { signed: true })
    return withUnit ? `${figure} %` : figure
  }
  const figure = formatCount(value, { signed: true, digits: meta.total.digits })
  return withUnit ? `${figure} ${meta.total.unit}` : figure
}

/** The figures a view draws. */
export function figuresOf(series: UatMapSeries, view: View): UatMapFigures | null {
  return view === 'total' ? series.total : view === 'rate' ? series.rate : series.change
}

/** A view whose figures are counts — a total, or a change that is a difference — is drawn in circles. */
export const drawnAsCircles = (series: UatMapSeries, view: View) => view === 'total' || (view === 'change' && series.change.kind === 'difference')

/** Water above this many litres a day per inhabitant — thirteen times the country's — is shown, and marked for checking. */
export const UNUSUAL_WATER = 1000
export const isUnusual = (series: UatMapSeries, index: number) => series.id === 'apa' && (series.rate?.values[index] ?? 0) > UNUSUAL_WATER

/**
 * The six series in the reader's language. `translate` is `useLingui()._`,
 * whose identity changes with the language: a caller memoizes on it.
 */
export function seriesMeta(translate: I18n['_']): readonly SeriesMeta[] {
  const missing = (reason: string) =>
    translate(
      reason === 'few'
        ? msg`prea puține evenimente pentru o rată`
        : reason === 'network'
          ? msg`fără rețea publică de apă raportată`
          : reason === 'negative'
            ? msg`valoare INS negativă, nefolosită`
            : msg`fără date INS`,
    )
  const percentChange = (series: UatMapSeries) => translate(msg`Schimbarea față de ${series.previousYear}, în procente`)
  const differenceChange = (unit: string) => (series: UatMapSeries) =>
    translate(msg`Schimbarea față de ${series.previousYear}, în ${unit}`)
  const count = (series: UatMapSeries, id: UatMapPartId, index: number) => {
    const value = series.parts.find((part) => part.id === id)?.values[index]
    return value == null ? '—' : formatCount(value)
  }

  const persons = translate(msg`persoane`)
  const dwellings = translate(msg`locuințe`)
  return [
    {
      id: 'populatie',
      short: translate(msg`Populație`),
      label: translate(msg`Populația după domiciliu`),
      total: {
        unit: translate(msg`locuitori`),
        signed: false,
        digits: 0,
        legend: (series) => translate(msg`Locuitori după domiciliu la 1 ianuarie ${series.year}`),
      },
      rate: null,
      changeLegend: (series) => translate(msg`Populația la 1 ianuarie ${series.year} față de 1 ianuarie ${series.previousYear}, în procente`),
      receipt: null,
      sources: 'POP107D',
      caveat: translate(msg`După domiciliu, nu după cine locuiește efectiv: cine pleacă fără să-și schimbe domiciliul rămâne numărat.`),
      missing,
    },
    {
      id: 'spor-natural',
      short: translate(msg`Spor natural`),
      label: translate(msg`Spor natural`),
      total: {
        unit: persons,
        signed: true,
        digits: 0,
        legend: (series) => translate(msg`Născuți-vii minus decedați, în ${series.year}`),
      },
      rate: {
        unit: '‰',
        words: translate(msg`la 1.000 de locuitori`),
        diverging: true,
        legend: (series) => translate(msg`Născuți-vii minus decedați, la 1.000 de locuitori, ${series.year}`),
      },
      changeLegend: differenceChange(persons),
      receipt: (series, index) =>
        translate(msg`Născuți-vii: ${count(series, 'births', index)} · decedați: ${count(series, 'deaths', index)} (${series.year})`),
      sources: 'POP201D, POP206D, POP108D',
      caveat: translate(msg`Depinde de vârsta locuitorilor: o localitate îmbătrânită are mai multe decese.`),
      missing,
    },
    {
      id: 'sold-domiciliu',
      short: translate(msg`Mutări`),
      label: translate(msg`Soldul schimbărilor de domiciliu`),
      total: {
        unit: persons,
        signed: true,
        digits: 0,
        legend: (series) => translate(msg`Stabiliri minus plecări cu domiciliul, în ${series.year}`),
      },
      rate: {
        unit: '‰',
        words: translate(msg`la 1.000 de locuitori`),
        diverging: true,
        legend: (series) => translate(msg`Stabiliri minus plecări cu domiciliul, la 1.000 de locuitori, ${series.year}`),
      },
      changeLegend: differenceChange(persons),
      receipt: (series, index) =>
        translate(msg`Stabiliri: ${count(series, 'arrivals', index)} · plecări: ${count(series, 'departures', index)} (${series.year})`),
      sources: 'POP307A, POP308A, POP108D',
      caveat: translate(msg`Doar mutările cu domiciliul: cine pleacă fără să-și schimbe domiciliul nu apare.`),
      missing,
    },
    {
      id: 'salariati',
      short: translate(msg`Locuri de muncă`),
      label: translate(msg`Locuri de muncă salariate`),
      total: {
        unit: translate(msg`locuri de muncă`),
        signed: false,
        digits: 0,
        legend: (series) => translate(msg`Locuri de muncă salariate, medie anuală, ${series.year}`),
      },
      rate: {
        unit: '‰',
        words: translate(msg`la 1.000 de locuitori`),
        diverging: false,
        legend: (series) => translate(msg`Locuri de muncă salariate la 1.000 de locuitori, ${series.year}`),
      },
      changeLegend: percentChange,
      receipt: null,
      sources: 'FOM104D, POP108D',
      caveat: translate(msg`Numărate unde se muncește, nu unde se locuiește: pot trece de 1.000 la 1.000 de locuitori. Nu e o rată de ocupare.`),
      missing,
    },
    {
      id: 'locuinte-noi',
      short: translate(msg`Locuințe noi`),
      label: translate(msg`Locuințe terminate`),
      total: {
        unit: dwellings,
        signed: false,
        digits: 0,
        legend: (series) => translate(msg`Locuințe terminate în ${series.year}`),
      },
      rate: {
        unit: '‰',
        words: translate(msg`la 1.000 de locuitori`),
        diverging: false,
        legend: (series) => translate(msg`Locuințe terminate la 1.000 de locuitori, ${series.year}`),
      },
      changeLegend: differenceChange(dwellings),
      receipt: null,
      sources: 'LOC104B, POP108D',
      caveat: translate(msg`Construcția vine în salturi: sub 20 de locuințe pe an, schimbarea de la un an la altul nu spune mare lucru.`),
      missing,
    },
    {
      id: 'apa',
      short: translate(msg`Apă`),
      label: translate(msg`Apă potabilă pentru uz casnic`),
      total: {
        unit: translate(msg`mii m³`),
        signed: false,
        digits: 1,
        legend: (series) => translate(msg`Apă potabilă distribuită pentru uz casnic, mii m³, ${series.year}`),
      },
      rate: {
        unit: 'l/zi',
        words: translate(msg`pe locuitor`),
        diverging: false,
        legend: (series) => translate(msg`Litri pe zi pe locuitor, ${series.year} — împărțiți la toți locuitorii, și la cei neracordați`),
      },
      changeLegend: percentChange,
      receipt: null,
      sources: 'GOS108A, POP108D',
      caveat: translate(msg`Amestecă acoperirea rețelei cu consumul: nu e consumul unui abonat.`),
      missing,
    },
  ]
}

/** Rank by value, highest first; ties share a rank. */
export function rankOf(values: readonly (number | null)[]): {
  readonly rank: ReadonlyMap<number, number>
  readonly order: readonly number[]
  readonly total: number
} {
  const order = values
    .map((value, index) => [value, index] as const)
    .filter((entry): entry is readonly [number, number] => entry[0] !== null)
    .sort((a, b) => b[0] - a[0])
  const rank = new Map<number, number>()
  order.forEach(([value, index], position) => {
    const previous = order[position - 1]
    rank.set(index, previous && previous[0] === value ? rank.get(previous[1])! : position + 1)
  })
  return { rank, order: order.map(([, index]) => index), total: order.length }
}
