/**
 * The legislation analytics charts and notes, shared by the pages (`/legislation`, `/legislation/analytics`) and the
 * legal prototypes: ranked rows with a share bar, acts per year stacked
 * by a lens, two lenses crossed, and the caveats marker. Presentational only: every figure comes in as a prop.
 */
import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { TriangleAlert } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { HEAT_BG, STACK_BG, fmt, pct, type Ranked } from '../../lib/analytics-format'

// ───────────────────────────────────────────────────── notes ──

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

// ───────────────────────────────────────────────────── ranked ──

/**
 * Ranked rows with an inline share bar (G8): the bar is the row's share of the selection, the figure printed
 * beside it, never its length against the first row. Under the list: how many rows are shown and how many acts
 * the selection holds outside them, then the denominator.
 */
export function RankedTable({
  rows,
  total,
  limit,
  caption,
  denominator,
  truncated = false,
  onPick,
  pickedKey,
}: {
  readonly rows: readonly Ranked[]
  readonly total: number
  readonly limit: number
  readonly caption: string
  readonly denominator: string
  /** The API cut the list at its limit: there are values beyond `rows`, their number not known. */
  readonly truncated?: boolean
  readonly onPick?: (key: string) => void
  readonly pickedKey?: string | null
}) {
  const shown = rows.slice(0, limit)
  // The acts of the selection outside the rows shown: what the page left out and what the API did.
  const outside = Math.max(0, total - shown.reduce((sum, r) => sum + r.n, 0))
  const cut = truncated || rows.length > shown.length
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
                    <div className="h-2 bg-chart-1" style={{ width: `${(Math.min(Math.max(r.share, 0), 1) * 100).toFixed(1)}%` }} />
                  </div>
                  <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">{pct(r.share)}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-3 text-xs text-muted-foreground">
        {cut ? t`Primele ${shown.length}; alte ${fmt(outside)} acte la ceilalți.` : t`Toate cele ${shown.length}.`} {denominator} {t`Total: ${fmt(total)} acte.`}
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
  pendingFrom,
  lastIsRest,
  plain = false,
}: {
  readonly years: readonly { readonly year: number; readonly values: readonly number[] }[]
  readonly labels: readonly string[]
  readonly caption: string
  readonly footnote?: ReactNode
  /** The first and last column's names when the columns are not years (months). */
  readonly axis?: readonly [string, string]
  /** Columns from this year on are drawn hollow and named in the legend (a figure that may still change). */
  readonly pendingFrom?: { readonly year: number; readonly label: string }
  /** The last label is the rest („altele"), drawn grey. Unset: read from the label, as the first callers wrote it. */
  readonly lastIsRest?: boolean
  /** The caption and the legend's lead-in are words: plain text, as the hub sets its captions, not mono capitals. */
  readonly plain?: boolean
}) {
  const rest = lastIsRest ?? labels[labels.length - 1] === 'altele'
  const colour = (j: number) => (rest && j === labels.length - 1 ? STACK_BG[5] : STACK_BG[Math.min(j, 4)])
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...years.map((y) => y.values.reduce((s, v) => s + v, 0)))
  const shown = active === null ? null : years.find((y) => y.year === active)
  return (
    <figure>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {plain ? <p className="text-xs text-muted-foreground">{caption}</p> : <MonoLabel className="block text-muted-foreground">{caption}</MonoLabel>}
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
              <div
                className={cn('flex flex-col-reverse', active === y.year && 'opacity-80', pendingFrom && y.year >= pendingFrom.year && 'opacity-45 outline-dashed outline-1 outline-foreground/60')}
                style={{ height: `${(sum / max) * 100}%` }}
              >
                {y.values.map((v, j) => (
                  <div key={j} className={colour(j)} style={{ height: sum ? `${(v / sum) * 100}%` : 0 }} />
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
      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <li>{plain ? t`De jos în sus:` : <MonoLabel>{t`de jos în sus`}</MonoLabel>}</li>
        {labels.map((l, j) => (
          <li key={l} className="flex items-center gap-1.5">
            <span className={cn('size-2.5', colour(j))} aria-hidden="true" />
            {l}
          </li>
        ))}
        {pendingFrom ? (
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 bg-choropleth-5 opacity-45 outline-dashed outline-1 outline-foreground/60" aria-hidden="true" />
            {pendingFrom.label}
          </li>
        ) : null}
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
  total,
  rowCaption,
}: {
  readonly rows: readonly Ranked[]
  readonly cols: readonly string[]
  readonly cells: readonly (readonly number[])[]
  /** The selection's acts: those of the rows not shown are stated in acts. Unset, the footer leaves them out. */
  readonly total?: number
  readonly rowCaption: string
}) {
  const outside = total === undefined ? null : Math.max(0, total - rows.reduce((sum, r) => sum + r.n, 0))
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
      <p className="mt-3 text-xs text-muted-foreground">
        {t`Nuanța: ponderea celulei în rândul ei. Coloana „altele" ține valorile nearătate ale rândurilor de aici.`}{' '}
        {outside === null ? null : outside > 0 ? t`Rândurile nearătate: alte ${fmt(outside)} acte.` : t`Toate actele selecției sunt în aceste rânduri.`}
      </p>
    </div>
  )
}
