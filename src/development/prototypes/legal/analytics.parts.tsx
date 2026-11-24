import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { TriangleAlert } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { BAND_LABEL, FX, fmt, pct, type Ranked } from './analytics.model'
import { ERA_LABEL, FAMILY_LABEL, MAP, MAP_COLS, MAP_ROWS, type MapCell } from './analytics.map'

// ───────────────────────────────────────────────────── colours ──

/** Series colours, navy first (G9); the last is „altele". Literal classes so Tailwind keeps them. */
export const SERIES_BG = ['bg-chart-1', 'bg-chart-sky', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5', 'bg-muted-foreground/25'] as const
const SERIES_FILL = ['fill-chart-1', 'fill-chart-sky', 'fill-chart-2', 'fill-chart-3', 'fill-chart-4', 'fill-chart-5', 'fill-muted-foreground/25'] as const
const DENSITY_FILL = ['fill-choropleth-1', 'fill-choropleth-2', 'fill-choropleth-3', 'fill-choropleth-4', 'fill-choropleth-5'] as const
const DENSITY_BG = ['bg-choropleth-1', 'bg-choropleth-2', 'bg-choropleth-3', 'bg-choropleth-4', 'bg-choropleth-5'] as const
const HEAT_BG = ['bg-primary/5', 'bg-primary/15', 'bg-primary/30', 'bg-primary/50', 'bg-primary/70'] as const

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

/** The caveats behind one amber marker (G5). */
export function CaveatsMarker({ notes }: { readonly notes: readonly string[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 text-status-partial-fg hover:opacity-80 sm:min-h-0 sm:min-w-0"
          aria-label={t`De știut despre aceste cifre: ${notes.length}`}
        >
          <TriangleAlert className="size-4" aria-hidden="true" />
          <MonoLabel className="tabular-nums">{notes.length}</MonoLabel>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,26rem)] text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">{t`De știut`}</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/** A „date de test" tag: every surface fed by the placeholder map carries it. */
export function TestDataTag({ className }: { readonly className?: string }) {
  return <MonoLabel className={cn('inline-block border border-status-partial-fg px-1.5 py-1 text-status-partial-fg', className)}>{t`date de test`}</MonoLabel>
}

// ───────────────────────────────────────────────────── ranked ──

/** Ranked rows with an inline share bar (G8), how many of how many, the denominator under the list. */
export function RankedTable({
  rows,
  total,
  limit,
  caption,
  denominator,
  onPick,
  pickedKey,
}: {
  readonly rows: readonly Ranked[]
  readonly total: number
  readonly limit: number
  readonly caption: string
  readonly denominator: string
  readonly onPick?: (key: string) => void
  readonly pickedKey?: string | null
}) {
  const shown = rows.slice(0, limit)
  const max = Math.max(1, ...shown.map((r) => r.n))
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <MonoLabel>#</MonoLabel>
            </TableHead>
            <TableHead>
              <MonoLabel>{caption}</MonoLabel>
            </TableHead>
            <TableHead className="text-right">
              <MonoLabel>{t`acte`}</MonoLabel>
            </TableHead>
            <TableHead className="hidden w-[38%] sm:table-cell">
              <MonoLabel>{t`din selecție`}</MonoLabel>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((r, j) => (
            <TableRow
              key={r.key}
              className={cn(onPick && 'cursor-pointer', pickedKey === r.key && 'bg-muted/60')}
              onClick={onPick ? () => onPick(r.key) : undefined}
            >
              <TableCell className="py-1.5 font-mono text-xs tabular-nums text-muted-foreground">{j + 1}</TableCell>
              <TableCell className="py-1.5">
                {onPick ? (
                  <button type="button" className="text-left underline-offset-4 hover:underline" onClick={() => onPick(r.key)}>
                    {r.label}
                  </button>
                ) : (
                  r.label
                )}
              </TableCell>
              <TableCell className="py-1.5 text-right tabular-nums">{fmt(r.n)}</TableCell>
              <TableCell className="hidden py-1.5 sm:table-cell">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 bg-muted">
                    <div className="h-2 bg-chart-1" style={{ width: `${(r.n / max) * 100}%` }} />
                  </div>
                  <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">{pct(r.share)}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-3 text-xs text-muted-foreground">
        {t`Primele ${Math.min(limit, rows.length)} din ${rows.length}.`} {denominator} {t`Total: ${fmt(total)} acte.`}
      </p>
    </div>
  )
}

// ───────────────────────────────────────────────────── series ──

/** Acts per year stacked by lens value: a column a year, the unit said once (G9: navy first). */
export function StackedYears({
  years,
  labels,
  caption,
  footnote,
  axis,
}: {
  readonly years: readonly { readonly year: number; readonly values: readonly number[] }[]
  readonly labels: readonly string[]
  readonly caption: string
  readonly footnote?: ReactNode
  /** The first and last column's names when the columns are not years (months). */
  readonly axis?: readonly [string, string]
}) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...years.map((y) => y.values.reduce((s, v) => s + v, 0)))
  const shown = active === null ? null : years.find((y) => y.year === active)
  return (
    <figure>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <MonoLabel className="block text-muted-foreground">{caption}</MonoLabel>
        <p className="min-h-5 text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {shown
            ? `${axis ? '' : `${shown.year}: `}${fmt(shown.values.reduce((s, v) => s + v, 0))} ${t`acte`} · ${labels
                .map((l, j) => `${l} ${fmt(shown.values[j] ?? 0)}`)
                .join(' · ')}`
            : t`Indică un an pentru cifrele lui.`}
        </p>
      </div>
      <ol
        className="mt-3 grid h-48 items-end gap-px border-b border-foreground/20 sm:h-60"
        style={{ gridTemplateColumns: `repeat(${years.length}, minmax(0, 1fr))` }}
        onPointerLeave={() => setActive(null)}
      >
        {years.map((y) => {
          const sum = y.values.reduce((s, v) => s + v, 0)
          return (
            <li
              key={y.year}
              className="flex h-full flex-col justify-end"
              tabIndex={0}
              aria-label={`${y.year}: ${fmt(sum)} ${t`acte`}`}
              onPointerEnter={() => setActive(y.year)}
              onFocus={() => setActive(y.year)}
            >
              <div className={cn('flex flex-col-reverse', active === y.year && 'opacity-80')} style={{ height: `${(sum / max) * 100}%` }}>
                {y.values.map((v, j) => (
                  <div key={j} className={SERIES_BG[Math.min(j, SERIES_BG.length - 1)]} style={{ height: sum ? `${(v / sum) * 100}%` : 0 }} />
                ))}
              </div>
            </li>
          )
        })}
      </ol>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>{axis ? axis[0] : years[0]?.year}</span>
        <span>{axis ? axis[1] : years[years.length - 1]?.year}</span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {labels.map((l, j) => (
          <li key={l} className="flex items-center gap-1.5">
            <span className={cn('size-2.5', SERIES_BG[Math.min(j, SERIES_BG.length - 1)])} aria-hidden="true" />
            {l}
          </li>
        ))}
      </ul>
      {footnote ? <figcaption className="mt-2 text-xs text-muted-foreground">{footnote}</figcaption> : null}
    </figure>
  )
}

// ───────────────────────────────────────────────────── grid ──

/** Two lenses crossed: a cell's shade is its share of its row (five navy steps), its figure the acts. */
export function CrossGrid({
  rows,
  cols,
  cells,
  rowCaption,
}: {
  readonly rows: readonly Ranked[]
  readonly cols: readonly string[]
  readonly cells: readonly (readonly number[])[]
  readonly rowCaption: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="py-2 pr-3 text-left font-normal">
              <MonoLabel className="text-muted-foreground">{rowCaption}</MonoLabel>
            </th>
            {cols.map((c) => (
              <th key={c} className="px-1 py-2 text-right align-bottom font-normal">
                <MonoLabel className="text-muted-foreground">{c}</MonoLabel>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => {
            const line = cells[ri] ?? []
            const sum = line.reduce((s, v) => s + v, 0) || 1
            return (
              <tr key={r.key} className="border-t">
                <th className="py-1.5 pr-3 text-left font-normal">{r.label}</th>
                {line.map((v, ci) => {
                  const share = v / sum
                  const step = share === 0 ? -1 : Math.min(4, Math.floor(share * 5))
                  return (
                    <td
                      key={ci}
                      className={cn('px-2 py-1.5 text-right tabular-nums', step >= 0 && HEAT_BG[step], step >= 3 && 'text-primary-foreground')}
                      title={`${r.label} · ${cols[ci]}: ${fmt(v)} (${pct(share)} ${t`din rând`})`}
                    >
                      {v ? fmt(v) : '—'}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted-foreground">{t`Nuanța: ponderea celulei în rândul ei. Primele 10 rânduri și 6 coloane; restul în „altele".`}</p>
    </div>
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
 * Fed by the placeholder grid until the fit lands (`analytics.map.ts`).
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
  const all = MAP.cells.reduce((s, c) => s + c.bands.reduce((a, b) => a + b, 0), 0)
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
            {t`${fmt(inSelection)} acte pe hartă din ${fmt(all)}`}
          </MonoLabel>
        </div>
        {compact ? null : <IndicatorToggle<ColourBy> label={t`Colorează după`} value={colourBy} onChange={setColourBy} options={COLOUR_OPTIONS} />}
      </div>
      <svg
        viewBox={`0 0 ${MAP_COLS} ${MAP_ROWS}`}
        className="mt-3 block h-auto w-full border bg-background"
        role="img"
        aria-label={t`Harta temelor (date de test): ${MAP.cells.length} celule, ${MAP.themes.length} teme.`}
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
      caption={t`Temă (date de test)`}
      denominator={t`Teme de test, nu rezultatul potrivirii.`}
      onPick={(key) => onSelectTheme(Number(key))}
    />
  )
}
