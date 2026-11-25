import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { cn } from '@/lib/utils'
import { CaveatsMarker, CrossGrid, RankedTable, StackedYears } from '@/features/legal/components/analytics/analytics-charts'
import {
  DENSITY_BG,
  DENSITY_FILL,
  SERIES_BG,
  SERIES_FILL,
  STACK_BG,
  type Ranked,
} from '@/features/legal/lib/analytics-format'
import { BAND_LABEL, FX, fmt } from './analytics.model'

import { ERA_LABEL, FAMILY_LABEL, MAP, MAP_COLS, MAP_IS_TEST, MAP_PLACED, MAP_POPULATION, MAP_ROWS, type MapCell } from './analytics.map'

// Moved to the feature folder (the promoted pages share them); re-exported for the prototype's pages.
export { CaveatsMarker, CrossGrid, RankedTable, StackedYears, STACK_BG, SERIES_BG }

// ───────────────────────────────────────────────────── notes ──

/** The source line (G4): said once, at the foot, with the snapshot's date and the generated-at stamp. */
export function SourceLine({ notes, className }: { readonly notes: readonly string[]; readonly className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-6 gap-y-2', className)}>
      <p className="max-w-[80ch] text-xs leading-relaxed text-muted-foreground">
        {t`Sursa: Portalul Legislativ al Ministerului Justiției, corpusul servit la ${FX.stamp.snapshotDate} (${FX.stamp.snapshot}). Instantaneu generat la ${FX.stamp.generatedAt}; nu urmărește actele publicate după.`}
      </p>
      <CaveatsMarker notes={notes} />
    </div>
  )
}

/** The map's tag: „date de test" over the placeholder map, else the real fit's experimental label. */
export function TestDataTag({ className }: { readonly className?: string }) {
  return (
    <MonoLabel className={cn('inline-block border border-status-partial-fg px-1.5 py-1 text-status-partial-fg', className)}>
      {MAP_IS_TEST ? t`date de test` : t`experimental · potrivire din 24 noiembrie`}
    </MonoLabel>
  )
}

// ───────────────────────────────────────────────────── map ──

export type ColourBy = 'densitate' | 'tema' | 'tip' | 'epoca'
const COLOUR_OPTIONS: readonly { readonly key: ColourBy; readonly label: string }[] = [
  { key: 'densitate', label: 'Densitate' },
  { key: 'tema', label: 'Familie de teme' },
  { key: 'tip', label: 'Tip' },
  { key: 'epoca', label: 'Epocă' },
]

function argmax(xs: readonly number[]) {
  let best = 0
  xs.forEach((x, j) => {
    if (x > (xs[best] ?? 0)) best = j
  })
  return best
}

/**
 * The topic map, drawn from cells, never from acts (§5): density in navy steps by default, or each cell's
 * leading theme family, type band or era (≤ 6 hues plus grey). A filter repaints the same cells counted over
 * the selection, the rest ghosted. Theme names sit at their centres; a selected topic outlines its cells.
 * Fed by the fit of 24 November (`analytics.map.ts`): only the acts the fit put in a topic, out of its population
 * (the rule-making acts placed firmly); the caption states both.
 */
export function TopicMap({
  count,
  selectedTopic,
  onSelectTopic,
  compact = false,
}: {
  readonly count: (cell: MapCell) => number
  readonly selectedTopic: number | null
  readonly onSelectTopic: (topic: number | null) => void
  readonly compact?: boolean
}) {
  const [colourBy, setColourBy] = useState<ColourBy>('densitate')
  const counts = MAP.cells.map(count)
  const max = Math.max(1, ...counts)
  const inSelection = counts.reduce((s, n) => s + n, 0)
  const cellClass = (cell: MapCell, n: number) => {
    if (n === 0) return 'fill-muted'
    switch (colourBy) {
      case 'densitate':
        return DENSITY_FILL[Math.min(4, Math.floor(Math.sqrt(n / max) * 5))]
      case 'tema':
        return SERIES_FILL[MAP.themes[cell.theme]?.family ?? 6]
      case 'tip':
        return SERIES_FILL[argmax(cell.bands)]
      case 'epoca':
        return SERIES_FILL[argmax(cell.eras)]
    }
  }
  const legend =
    colourBy === 'densitate'
      ? null
      : colourBy === 'tema'
        ? FAMILY_LABEL
        : colourBy === 'tip'
          ? BAND_LABEL
          : ERA_LABEL
  const topic = selectedTopic === null ? null : MAP.topics[selectedTopic]
  return (
    <figure>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TestDataTag />
          <MonoLabel className="text-muted-foreground">
            {inSelection === MAP_PLACED
              ? t`${fmt(MAP_PLACED)} acte pe hartă din ${fmt(MAP_POPULATION)} care stabilesc reguli`
              : t`${fmt(inSelection)} în selecție · ${fmt(MAP_PLACED)} acte pe hartă din ${fmt(MAP_POPULATION)} care stabilesc reguli`}
          </MonoLabel>
        </div>
        {compact ? null : <IndicatorToggle<ColourBy> label={t`Colorează după`} value={colourBy} onChange={setColourBy} options={COLOUR_OPTIONS} />}
      </div>
      <svg
        viewBox={`0 0 ${MAP_COLS} ${MAP_ROWS}`}
        className="mt-3 block h-auto w-full border bg-background"
        role="img"
        aria-label={t`Harta temelor (experimental · potrivire din 24 noiembrie): ${MAP.cells.length} celule, ${MAP.themes.length} teme.`}
      >
        {MAP.cells.map((cell, j) => {
          const n = counts[j] ?? 0
          const picked = topic !== null && cell.topic === topic.id
          return (
            <rect
              key={`${cell.col}-${cell.row}`}
              x={cell.col + 0.04}
              y={cell.row + 0.04}
              width={0.92}
              height={0.92}
              className={cn(cellClass(cell, n), 'cursor-pointer', picked && 'stroke-foreground', topic !== null && !picked && 'opacity-35')}
              strokeWidth={picked ? 0.12 : 0}
              onClick={() => onSelectTopic(cell.topic === selectedTopic ? null : cell.topic)}
            >
              <title>{`${MAP.topics[cell.topic]?.name}: ${fmt(n)} ${t`acte în selecție`}`}</title>
            </rect>
          )
        })}
        {MAP.themes.map((th) => (
          <text
            key={th.id}
            x={th.x}
            y={th.y}
            textAnchor="middle"
            className="pointer-events-none fill-foreground stroke-background text-[1.3px] font-semibold [paint-order:stroke]"
            strokeWidth={0.35}
          >
            {th.name.replace('Temă de test ', '')}
          </text>
        ))}
      </svg>
      {legend ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {legend.map((l, j) => (
            <li key={l} className="flex items-center gap-1.5">
              <span className={cn('size-2.5', SERIES_BG[j])} aria-hidden="true" />
              {l}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t`puține`}</span>
          {DENSITY_BG.map((c) => (
            <span key={c} className={cn('h-2.5 w-6', c)} aria-hidden="true" />
          ))}
          <span>{t`multe acte pe celulă`}</span>
        </div>
      )}
    </figure>
  )
}

/** The table behind the map, for the keyboard and screen readers: themes with their acts in the selection. */
export function MapThemeTable({ count, onSelectTheme }: { readonly count: (cell: MapCell) => number; readonly onSelectTheme: (theme: number) => void }) {
  const by = new Map<number, number>()
  MAP.cells.forEach((c) => by.set(c.theme, (by.get(c.theme) ?? 0) + count(c)))
  const total = [...by.values()].reduce((s, n) => s + n, 0)
  const rows: Ranked[] = MAP.themes
    .map((th) => ({ key: String(th.id), label: th.name, n: by.get(th.id) ?? 0, share: total ? (by.get(th.id) ?? 0) / total : 0 }))
    .sort((a, b) => b.n - a.n)
  return (
    <RankedTable
      rows={rows}
      total={total}
      limit={24}
      caption={t`Temă (experimental · potrivire din 24 noiembrie)`}
      denominator={t`Teme de test, nu rezultatul potrivirii.`}
      onPick={(key) => onSelectTheme(Number(key))}
    />
  )
}
