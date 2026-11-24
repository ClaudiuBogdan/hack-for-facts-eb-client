import { FX } from './analytics.model'

/**
 * DATE DE TEST. The topic map has no fit yet: this grid is synthetic, drawn from a seeded generator so that the
 * map component, its interactions and its payload size can be judged now. When the fit lands, only this module's
 * data changes (the server will send the same shape: cells with counts per type band and era, themes, topics).
 * Nothing here describes real acts; every place that shows it says „date de test".
 */

export const MAP_COLS = 64
export const MAP_ROWS = 40
export const ERA_LABEL = ['1990–1999', '2000–2009', '2010–2019', '2020–2026'] as const
export const FAMILY_LABEL = ['Stat și administrație', 'Economie și finanțe', 'Social și sănătate', 'Justiție și ordine publică', 'Mediu, teritoriu, bunuri', 'Educație, cultură, cercetare'] as const

export type MapTheme = { readonly id: number; readonly name: string; readonly family: number; readonly x: number; readonly y: number }
export type MapTopic = {
  readonly id: number
  readonly theme: number
  readonly name: string
  readonly keywords: readonly string[]
  readonly x: number
  readonly y: number
  readonly size: number
  readonly stability: number
}
/** One cell: acts per type band (6) and per era (4); the leading theme and topic. */
export type MapCell = { readonly col: number; readonly row: number; readonly bands: readonly number[]; readonly eras: readonly number[]; readonly theme: number; readonly topic: number }

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const WORDS = ['achiziții', 'pensii', 'fiscalitate', 'sănătate', 'învățământ', 'mediu', 'energie', 'transport', 'agricultură', 'justiție', 'poliție', 'apărare', 'cultură', 'muncă', 'asigurări', 'cadastru', 'ape', 'păduri', 'turism', 'comunicații', 'concurență', 'bănci', 'vamă', 'alegeri']

export const MAP = (() => {
  const r = rng(20261124)
  const themes: MapTheme[] = Array.from({ length: 24 }, (_, id) => ({
    id,
    name: `Temă de test ${String.fromCharCode(65 + id)}`,
    family: id % 6,
    x: 4 + r() * (MAP_COLS - 8),
    y: 3 + r() * (MAP_ROWS - 6),
  }))
  const topics: MapTopic[] = []
  for (const th of themes) {
    const k = 3 + Math.floor(r() * 4)
    for (let j = 0; j < k; j++) {
      topics.push({
        id: topics.length,
        theme: th.id,
        name: `Subiect de test ${topics.length + 1}`,
        keywords: [WORDS[(th.id + j) % WORDS.length]!, WORDS[(th.id * 3 + j + 5) % WORDS.length]!, WORDS[(th.id * 7 + j + 11) % WORDS.length]!],
        x: Math.min(MAP_COLS - 1, Math.max(0, th.x + (r() - 0.5) * 7)),
        y: Math.min(MAP_ROWS - 1, Math.max(0, th.y + (r() - 0.5) * 5)),
        size: 0,
        stability: Math.round((0.55 + r() * 0.4) * 100) / 100,
      })
    }
  }
  const weights = topics.map(() => 0.4 + r() * 1.6)
  const bandMix = themes.map(() => Array.from({ length: 6 }, () => r() ** 2))
  const eraMix = themes.map(() => Array.from({ length: 4 }, () => 0.3 + r()))
  const raw: { col: number; row: number; w: number; topic: number }[] = []
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      let best = -1
      let bestW = 0
      let w = 0
      topics.forEach((tp, j) => {
        const d2 = (tp.x - col) ** 2 + ((tp.y - row) * 1.3) ** 2
        const v = weights[j]! * Math.exp(-d2 / 6)
        w += v
        if (v > bestW) {
          bestW = v
          best = j
        }
      })
      if (w > 0.08) raw.push({ col, row, w, topic: best })
    }
  }
  const totalW = raw.reduce((s, c) => s + c.w, 0)
  const scale = FX.stamp.actsWithText / totalW
  const sizes = new Array<number>(topics.length).fill(0)
  const cells: MapCell[] = raw.map((c) => {
    const n = Math.max(1, Math.round(c.w * scale))
    const tp = topics[c.topic]!
    const bm = bandMix[tp.theme]!
    const em = eraMix[tp.theme]!
    const bs = bm.reduce((s, x) => s + x, 0)
    const es = em.reduce((s, x) => s + x, 0)
    sizes[c.topic]! += n
    return { col: c.col, row: c.row, bands: bm.map((x) => Math.round((n * x) / bs)), eras: em.map((x) => Math.round((n * x) / es)), theme: tp.theme, topic: c.topic }
  })
  return { themes, topics: topics.map((tp, j) => ({ ...tp, size: sizes[j]! })), cells }
})()

/** The type bands and eras a question keeps; the test map can only be repainted by these two. */
export function mapFilter(typeBands: readonly number[] | null, years: { readonly from: number; readonly to: number } | null) {
  const eras = years ? [0, 1, 2, 3].filter((e) => 1990 + e * 10 <= years.to && (e === 3 ? 2026 : 1999 + e * 10) >= years.from) : null
  return (cell: MapCell) => {
    const b = typeBands ? typeBands.reduce((s, i) => s + (cell.bands[i] ?? 0), 0) : cell.bands.reduce((s, x) => s + x, 0)
    const all = cell.bands.reduce((s, x) => s + x, 0) || 1
    const e = eras ? eras.reduce((s, i) => s + (cell.eras[i] ?? 0), 0) : all
    return Math.round((b * e) / all)
  }
}
