import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowUpRight } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { useAnalysisGrouped } from '../../hooks/use-justice-analysis'
import { changeOf, changeShown, COURTS, drilled, GROUPINGS, rankedRows, rateAllowed, type Grouping, type Measure, type Question, type Row } from '../../lib/analysis-model'
import { groupingLabel, rowLabel } from '../../lib/analysis-text'
import { COUNTY_POPULATION } from '../../lib/county-population'
import { countText, percentText, rateText, signedPercentText } from '../../lib/judicial-format'

/**
 * The answer: the grouping's tabs over the ranked table — the year's groups
 * largest first (or by cases per 1,000 residents), the year before and the
 * change, the share; the groups past the list folded into „Restul", the
 * total under them. A group's row narrows the question to it; a court's
 * arrow opens its page in the same year.
 */

type Change = (question: Question) => void

/** The bar's controls: 44 px on a phone, 40 from a small screen up (no small buttons). */
const CONTROL_HEIGHT = '[&>button]:min-h-11 sm:[&>button]:min-h-10 sm:[&>button]:px-4'
const TOP = 25
const TOP_EXPANDED = 100

const allowsRate = (question: Question) => rateAllowed(question, COUNTY_POPULATION.year)

/**
 * The answer under its grouping's tabs (`După ce`) — the measure beside them
 * where a rate can be drawn. The tabs are the address's: the arrow keys move
 * between them, Enter or Space asks the question (a step the browser can go
 * back from), and the table is their panel.
 */
export function AnalysisAnswer({ question, onChange }: { readonly question: Question; readonly onChange: Change }) {
  return (
    <Tabs value={question.dupa} onValueChange={(value) => onChange({ ...question, dupa: value as Grouping })} activationMode="manual">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <TabsList aria-label={t`După ce`} className="h-auto flex-wrap justify-start gap-x-4 gap-y-1 rounded-none border-b bg-transparent p-0">
          {GROUPINGS.map((grouping) => (
            <TabsTrigger
              key={grouping}
              value={grouping}
              className="-mb-px min-h-11 rounded-none border-b-2 border-transparent px-0.5 pb-2 pt-0 text-sm font-normal text-muted-foreground shadow-none hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none sm:min-h-0"
            >
              {groupingLabel(grouping)}
            </TabsTrigger>
          ))}
        </TabsList>
        <MeasureToggle question={question} onChange={onChange} />
      </div>
      <TabsContent value={question.dupa} className="mt-0">
        <RankTable question={question} onChange={onChange} />
      </TabsContent>
    </Tabs>
  )
}

/** Counties only, in the year their residents were counted: no rate is offered that the page would not draw. */
function MeasureToggle({ question, onChange }: { readonly question: Question; readonly onChange: Change }) {
  return allowsRate(question) ? (
    <IndicatorToggle<Measure>
      label={t`Măsura`}
      value={question.masura}
      onChange={(masura) => onChange({ ...question, masura })}
      options={[
        { key: 'dosare', label: t`Dosare` },
        { key: 'locuitori', label: t`La 1.000 de locuitori` },
      ]}
      className={CONTROL_HEIGHT}
    />
  ) : null
}

/** A row's name — for a keyboard, the button that narrows the question to it (the row is the pointer's) — and a court's arrow to its page. */
function RowName({ question, grouping, row, onDrill }: { readonly question: Question; readonly grouping: Grouping; readonly row: Row; readonly onDrill: (() => void) | null }) {
  const { label, sub } = rowLabel(grouping, row.key)
  const court = grouping === 'instante' && row.kind === 'group' && COURTS.has(row.key)
  const name = (
    <>
      <span className="block truncate" title={label}>
        {label}
      </span>
      {sub ? <span className="block truncate text-xs text-muted-foreground">{sub}</span> : null}
    </>
  )
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {onDrill ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onDrill()
          }}
          className="min-w-0 text-left"
          title={t`Doar ${label}`}
        >
          {name}
        </button>
      ) : (
        <span className="min-w-0">{name}</span>
      )}
      {court ? (
        <Link
          to="/justice/courts/$code"
          params={{ code: row.key }}
          search={{ an: question.year }}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={t`Pagina instanței ${label}`}
        >
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </span>
  )
}

function Pending() {
  return (
    <div className="mt-3 space-y-2" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className="h-9 animate-pulse bg-muted/40" />
      ))}
    </div>
  )
}

function RankTable({ question, onChange }: { readonly question: Question; readonly onChange: Change }) {
  const [expandedFor, setExpandedFor] = useState<string | null>(null)
  const questionKey = JSON.stringify(question)
  const expanded = expandedFor === questionKey
  const grouped = useAnalysisGrouped(question, question.dupa)
  if (grouped.isError && !grouped.data)
    return (
      <div className="mt-4">
        <HubLoadError onRetry={grouped.retry} />
      </div>
    )
  const data = grouped.data
  if (!data) return <Pending />
  const perResident = question.masura === 'locuitori' && allowsRate(question)
  const { rows, total, groups } = rankedRows({ now: data.now, before: data.before, total: data.total, top: expanded ? TOP_EXPANDED : TOP, residents: perResident ? COUNTY_POPULATION.byCounty : null })
  const widest = Math.max(0.0001, ...rows.filter((row) => row.kind === 'group').map((row) => row.share))
  const compared = data.before !== null
  const totalChange = changeOf(total, data.totalBefore)
  if (rows.length === 0) return <p className="mt-6 text-sm text-muted-foreground">{t`Niciun dosar pentru această întrebare.`}</p>
  return (
    <div className={cn('mt-3', grouped.isFetching && 'opacity-70 transition-opacity')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-right">#</TableHead>
            <TableHead>
              <span className="sr-only">{groupingLabel(question.dupa)}</span>
            </TableHead>
            {perResident ? <TableHead className="text-right">{t`La 1.000 loc.`}</TableHead> : null}
            <TableHead className={cn('text-right', perResident && 'hidden sm:table-cell')}>{t`Dosare ${question.year}`}</TableHead>
            {compared ? <TableHead className="hidden text-right md:table-cell">{question.year - 1}</TableHead> : null}
            {compared ? <TableHead className="hidden text-right sm:table-cell">{t`Schimbare`}</TableHead> : null}
            <TableHead className="hidden w-36 text-right sm:table-cell">{t`Cota`}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const next = row.kind === 'group' ? drilled(question, question.dupa, row.key) : null
            const change = changeShown(question.dupa, row.key) ? changeOf(row.count, row.before) : null
            const residents = perResident ? COUNTY_POPULATION.byCounty.get(row.key) : undefined
            return (
              <TableRow key={row.key} className={cn(row.kind !== 'group' && 'text-muted-foreground', next && 'cursor-pointer')} onClick={next ? () => onChange(next) : undefined}>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">{row.kind === 'group' ? index + 1 : ''}</TableCell>
                <TableCell className="max-w-[12rem] sm:max-w-md">
                  <RowName question={question} grouping={question.dupa} row={row} onDrill={next ? () => onChange(next) : null} />
                </TableCell>
                {perResident ? (
                  <TableCell className="text-right font-semibold tabular-nums" title={residents ? t`${countText(residents)} de locuitori` : undefined}>
                    {row.rate !== null ? rateText(row.rate) : '—'}
                  </TableCell>
                ) : null}
                <TableCell className={cn('text-right tabular-nums', perResident && 'hidden sm:table-cell')}>{countText(row.count)}</TableCell>
                {compared ? <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">{row.before !== null ? countText(row.before) : '—'}</TableCell> : null}
                {compared ? <TableCell className="hidden text-right text-xs tabular-nums sm:table-cell">{change !== null ? signedPercentText(change) : '—'}</TableCell> : null}
                <TableCell className="hidden sm:table-cell">
                  <span className="flex items-center justify-end gap-2">
                    <span className="block h-1.5 w-20 bg-muted/70" aria-hidden="true">
                      <span className={cn('block h-1.5', row.kind === 'group' ? 'bg-primary/75' : 'bg-muted-foreground/35')} style={{ width: `${Math.max(Math.min((row.share / widest) * 100, 100), 1).toFixed(1)}%` }} />
                    </span>
                    <span className="w-12 text-right text-xs tabular-nums">{percentText(row.share)}</span>
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="font-semibold">
            <TableCell />
            <TableCell>{t`Total`}</TableCell>
            {perResident ? <TableCell /> : null}
            <TableCell className={cn('text-right tabular-nums', perResident && 'hidden sm:table-cell')}>{countText(total)}</TableCell>
            {compared ? <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">{data.totalBefore !== null ? countText(data.totalBefore) : '—'}</TableCell> : null}
            {compared ? <TableCell className="hidden text-right text-xs tabular-nums sm:table-cell">{totalChange !== null ? signedPercentText(totalChange) : '—'}</TableCell> : null}
            <TableCell className="hidden sm:table-cell" />
          </TableRow>
        </TableFooter>
      </Table>
      {!expanded && groups > TOP ? (
        <div className="mt-2 text-right">
          <button type="button" onClick={() => setExpandedFor(questionKey)} className="min-h-11 text-xs font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0">
            {t`Primele ${TOP_EXPANDED}`}
          </button>
        </div>
      ) : null}
    </div>
  )
}
