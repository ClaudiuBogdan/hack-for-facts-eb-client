import { useId, useState } from 'react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type {
  InsObservation,
  InsPeriodicity,
  NativeInsObservation,
} from '@/schemas/ins'
import { activeNumberLocale, groupWireValue } from '../../lib/format'
import { formatHubPeriod, periodSortKey } from '../../lib/period'
import { validatedSourceRows } from '../../lib/source-observations'
import { statisticsTheme } from '../../lib/statistics-theme'
import { figureUnitWord } from '../../lib/units'
import { ValueStatusLegend, ValueStatusMarker } from '../value-status-legend'

type Props = {
  /** The rows the chart draws — or, for a selection that is not one series yet, the rows read to inspect it. */
  readonly observations: readonly InsObservation[]
  readonly sourceDescriptor?: unknown
  /** Pins the series a row belongs to. Offered only when the rows hold more than one. */
  readonly onSelectSource?: (observation: NativeInsObservation) => void
  /** The heading that names the table. */
  readonly labelledBy?: string
}

/**
 * The series as a table: what the chart cannot give, the exact value of
 * every period, as INS published it — unrounded, with its quality flag.
 *
 * Only what tells one row from another. The rail already names the
 * selection, so an axis whose member is the same on every row is not a
 * column, and neither is the unit: it goes into the value's header. What
 * remains of a complete series is the period and the value. The archive
 * behind each row — its identifier, the publication, the raw coordinates —
 * belongs to the CSV, which carries all of it.
 *
 * Newest first, compact, and only the latest periods until the reader asks
 * for the rest: the chart above already carries the shape, so the table's
 * first job is the last few exact values. Opened, the rows scroll inside a
 * bounded box under a header that stays put, so a monthly series of 400 rows
 * does not push the rest of the page 12,000px down, and closing it again
 * moves the page by at most that box.
 *
 * A row can still pin its series — but only where the rows hold more than
 * one: on a complete series every row would pin the one already on screen.
 */
export function DetailObservationsTable({
  observations,
  sourceDescriptor,
  onSelectSource,
  labelledBy,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const regionId = useId()

  let validated: ReturnType<typeof validatedSourceRows>
  try {
    validated = validatedSourceRows(sourceDescriptor, observations)
  } catch {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        <Trans>
          Nu putem verifica identitatea și proveniența observațiilor.
        </Trans>
      </p>
    )
  }
  const { descriptor, observations: rows } = validated
  if (rows.length === 0) return null

  const newestFirst = [...rows].sort(
    (left, right) =>
      periodSortKey(right.time_period) - periodSortKey(left.time_period),
  )

  const varyingAxes = descriptor.dimensions
    .filter((d) => d.type === 'CLASSIFICATION' || d.type === 'TERRITORIAL')
    .sort((a, b) => a.index - b.index)
    .filter(
      (d) =>
        new Set(rows.map((row) => memberOf(row, d.index)?.code)).size > 1,
    )
  const unitVaries = new Set(rows.map((row) => row.unit.code)).size > 1
  const selectable =
    onSelectSource !== undefined &&
    new Set(rows.map(seriesIdentity)).size > 1

  const periodicities = new Set(rows.map((row) => row.time_period.periodicity))
  const periodicity =
    periodicities.size === 1 ? rows[0]!.time_period.periodicity : null
  const sample = rows[0]!.unit
  // In parentheses after „Valoare" the unit is a word in a phrase: „Număr
  // persoane" reads „număr persoane", while „EUR" and „MWh" stay as written.
  const unitWord = unitVaries
    ? ''
    : figureUnitWord(
        { unitSymbol: sample.symbol ?? null, unitNameRo: sample.name_ro ?? null },
        sample.name_ro ?? sample.symbol ?? null,
      ).replace(/^\p{Lu}(?=\p{Ll})/u, (initial) => initial.toLocaleLowerCase('ro'))

  // Folded by period, not by row: an inspection read holds several series,
  // and the latest periods of each are what the reader picks between.
  const latestPeriods = new Set(
    [...new Set(newestFirst.map(periodKey))].slice(0, collapsedPeriodCount(periodicity)),
  )
  const folded = newestFirst.filter((row) => latestPeriods.has(periodKey(row)))
  const collapsible = rows.length - folded.length >= MIN_HIDDEN_ROWS
  const visible = collapsible && !expanded ? folded : newestFirst

  const statuses = [
    ...new Set(
      rows
        .map((row) => row.value_status?.trim() || null)
        .filter((status): status is string => status !== null),
    ),
  ].sort()
  const qualified = rows.filter((row) => row.dimensions.geography?.qualified)

  const locale = activeNumberLocale()

  return (
    <div className="space-y-3">
      <div className={cn(statisticsTheme.band, 'overflow-hidden')}>
        <div
          id={regionId}
          className={cn(
            'overflow-x-auto',
            expanded && 'max-h-[min(60vh,28rem)] overflow-y-auto',
          )}
          // Opened, the box scrolls on its own, and a scrollable region has
          // to be reachable by keyboard.
          {...(expanded
            ? { tabIndex: 0, role: 'region', 'aria-label': t`Toate valorile seriei` }
            : {})}
        >
          {/* `border-separate`: a collapsed border stays behind when its
              header row sticks. */}
          <table
            aria-labelledby={labelledBy}
            className="w-full border-separate border-spacing-0 text-sm"
          >
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="hover:bg-transparent">
                <TableHead className={headClass}>
                  {periodHeader(periodicity)}
                </TableHead>
                {varyingAxes.map((d) => (
                  <TableHead key={d.index} className={headClass}>
                    {d.label_ro ?? `D${d.index}`}
                  </TableHead>
                ))}
                {unitVaries ? (
                  <TableHead className={headClass}>
                    <Trans>Unitate</Trans>
                  </TableHead>
                ) : null}
                <TableHead className={cn(headClass, 'text-right')}>
                  {unitWord ? t`Valoare (${unitWord})` : t`Valoare`}
                </TableHead>
                {selectable ? (
                  <TableHead className={headClass}>
                    <span className="sr-only">
                      <Trans>Serie</Trans>
                    </span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.id} className="border-b-0 hover:bg-muted/40">
                  <TableCell className={cn(cellClass, 'whitespace-nowrap')}>
                    {formatHubPeriod(row.time_period.iso_period)}
                    {row.dimensions.geography?.qualified ? (
                      <GeographyMarker />
                    ) : null}
                  </TableCell>
                  {varyingAxes.map((d) => (
                    <TableCell key={d.index} className={cellClass}>
                      {memberOf(row, d.index)?.name_ro ?? '—'}
                    </TableCell>
                  ))}
                  {unitVaries ? (
                    <TableCell className={cellClass}>
                      {row.unit.name_ro ?? row.unit.symbol ?? '—'}
                    </TableCell>
                  ) : null}
                  <TableCell
                    className={cn(cellClass, 'whitespace-nowrap text-right font-medium tabular-nums')}
                  >
                    {row.value === null ? (
                      <span className="font-normal text-muted-foreground">—</span>
                    ) : (
                      groupWireValue(row.value, locale)
                    )}
                    {row.value_status != null ? (
                      <ValueStatusMarker status={row.value_status} />
                    ) : null}
                  </TableCell>
                  {selectable ? (
                    <TableCell className={cn(cellClass, 'py-0.5 text-right')}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onSelectSource?.(row)}
                      >
                        <Trans>Alege această serie</Trans>
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>
        {collapsible ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={regionId}
            onClick={() => setExpanded((open) => !open)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            {expanded
              ? t`Arată mai puțin`
              : plural(rows.length, {
                  one: 'Arată # valoare',
                  few: 'Arată toate cele # valori',
                  other: 'Arată toate cele # de valori',
                })}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
      <ValueStatusLegend statuses={statuses} />
      {qualified.length > 0 ? <GeographyNote rows={qualified} /> : null}
    </div>
  )
}

const headClass =
  'sticky top-0 z-10 h-8 border-b border-border/70 bg-card px-3 text-xs font-medium'
const cellClass = 'border-b border-border/50 px-3 py-1.5 [tr:last-child_&]:border-b-0'

/** Hiding fewer rows than this is not worth the click that shows them. */
const MIN_HIDDEN_ROWS = 3

/** Five years, a year of quarters, half a year of months. */
function collapsedPeriodCount(periodicity: InsPeriodicity | null): number {
  if (periodicity === 'MONTHLY') return 6
  if (periodicity === 'QUARTERLY') return 4
  return 5
}

function periodHeader(periodicity: InsPeriodicity | null): string {
  if (periodicity === 'ANNUAL') return t`An`
  if (periodicity === 'QUARTERLY') return t`Trimestru`
  if (periodicity === 'MONTHLY') return t`Lună`
  return t`Perioadă`
}

function periodKey(row: NativeInsObservation): string {
  return `${row.time_period.periodicity}:${row.time_period.iso_period}`
}

function memberOf(row: NativeInsObservation, index: number) {
  return row.classifications.find((member) => member.type_code === `D${index}`)
}

/** The source identity of a row's series: every axis member and the unit. */
function seriesIdentity(row: NativeInsObservation): string {
  const members = row.classifications
    .map((member) => `${member.type_code}:${member.code}`)
    .sort()
  return `${members.join('|')}#${row.unit.code}`
}

/** A row whose place INS names only by its context, or under a boundary rule. */
function GeographyMarker() {
  return (
    <sup className="ml-0.5 text-[0.65rem] font-semibold text-muted-foreground">
      <span aria-hidden="true">*</span>
      <span className="sr-only">{t`teritoriu interpretat, vezi nota de sub tabel`}</span>
    </sup>
  )
}

/**
 * What the asterisk means, then the rules INS's coordinates were read under —
 * each once, in its published wording, with the evidence behind it.
 */
function GeographyNote({ rows }: { readonly rows: readonly NativeInsObservation[] }) {
  const rules = new Map<string, { readonly rationale: string; readonly evidence: string | null }>()
  for (const row of rows)
    for (const rule of row.dimensions.geography?.applicableRules ?? [])
      rules.set(rule.ruleId, { rationale: rule.rationale, evidence: httpUrl(rule.evidenceUrl) })
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>
        <Trans>
          * Teritoriul rândurilor marcate este interpretat din coordonatele INS,
          nu o unitate administrativă exactă.
        </Trans>
      </p>
      {rules.size > 0 ? (
        <ul className="space-y-1">
          {[...rules.entries()].map(([id, rule]) => (
            <li key={id}>
              {rule.rationale}
              {rule.evidence ? (
                <>
                  {rule.rationale ? ' ' : null}
                  <a
                    href={rule.evidence}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    <Trans>Sursa regulii</Trans>
                  </a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** Only an absolute http(s) address becomes a link; anything else stays text. */
function httpUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? value : null
  } catch {
    return null
  }
}
