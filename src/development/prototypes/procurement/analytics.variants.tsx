import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { X } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { AXES, AXIS_ORDER, POPULATIONS, cpvPrefix, nextCpvLevel, searchOf, withFilter, withoutFilter, type AxisId, type Query } from './analytics.model'
import { useAnswer, useRanking, type Ranking } from './analytics.data'
import {
  ControlRow,
  FiguresBand,
  GroupBar,
  hasQuestion,
  MethodNote,
  QuestionGallery,
  RankedAnswer,
  Readout,
  RecordsBlock,
  SelectionFacets,
  TimeAnswer,
  useAnalyticsQuery,
  useNamer,
  YearsStrip,
} from './analytics.parts'
import { countText, groupTab, keyLabel, moneyText, percentText, type Namer } from './analytics.text'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

function Shell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      {children}
    </div>
  )
}

// ───────────────────────────────────────────────────────────── răspuns ──

/**
 * `raspuns` — the answer is the page. One column: the controls in one row,
 * the query read as a sentence, four figures, the ranked list (a row's click
 * narrows to it and ranks the next axis), the selection's other axes, its
 * years, the records on request, how it was counted. With no question in the
 * address, the ready questions sit above the default answer.
 */
const STICKY = 'border-b bg-background/95 backdrop-blur sm:sticky sm:top-0 sm:z-20'

/** „Arată primele 100" for the question it was asked on only: another question, or Back, opens at 25. */
function useExpanded(query: Query): readonly [boolean, (expanded: boolean) => void] {
  const key = JSON.stringify(searchOf(query))
  const [expandedFor, setExpandedFor] = useState<string | null>(null)
  return [expandedFor === key, (expanded: boolean) => setExpandedFor(expanded ? key : null)] as const
}

export function AnalyticsRaspuns() {
  const [query, move, search] = useAnalyticsQuery()
  const [expanded, setExpanded] = useExpanded(query)
  const answer = useAnswer(query, { topN: expanded ? 100 : 25, facets: true, years: true })
  const namer = useNamer(query, answer)
  const fresh = !hasQuestion(search)
  return (
    <Shell>
      <div className={STICKY}>
        <RuledFrame className="py-3">
          <ControlRow query={query} answer={answer} namer={namer} onChange={move} />
        </RuledFrame>
      </div>
      <RuledFrame className="py-8 sm:py-10">
        <MonoLabel className="block text-muted-foreground">{t`Achiziții publice · Analize`}</MonoLabel>
        <div className="mt-3">
          <Readout query={query} answer={answer} namer={namer} />
        </div>
        {fresh ? <QuestionGallery onChange={move} className="mt-8 border-y py-6" /> : null}
        <FiguresBand query={query} answer={answer} className="mt-8" />
        <GroupBar query={query} onChange={move} className="mt-10" />
        <RankedAnswer query={query} answer={answer} namer={namer} onChange={move} expanded={expanded} onExpand={setExpanded} className="mt-4" />
        <TimeAnswer query={query} answer={answer} onChange={move} className="mt-4" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <MonoLabel className="block text-muted-foreground">{t`În această selecție`}</MonoLabel>
            <SelectionFacets query={query} answer={answer} namer={namer} onChange={move} className="mt-3" />
          </div>
          <YearsStrip query={query} answer={answer} onChange={move} />
        </div>
        <RecordsBlock key={JSON.stringify([query.tip, query.filters, query.period, query.titlu, query.valoare])} query={query} answer={answer} className="mt-12" />
        <MethodNote query={query} answer={answer} className="mt-10 border-t pt-4" />
      </RuledFrame>
    </Shell>
  )
}

// ─────────────────────────────────────────────────────────────── traseu ──

/** A column's rows: its ranking under every filter but its own, its pick marked. */
function TrailColumn({
  query,
  axis,
  level,
  title,
  namer,
  ranking,
  onChange,
}: {
  readonly query: Query
  readonly axis: AxisId
  readonly level: string
  readonly title: string
  readonly namer: Namer
  readonly ranking: Ranking | undefined
  readonly onChange: (query: Query) => void
}) {
  const picked = query.filters[axis]
  const byValue = ranking?.rankedBy === 'value'
  const buckets = (ranking?.buckets ?? []).filter((bucket) => bucket.kind === 'top' && bucket.key)
  const max = Math.max(1, ...buckets.map((bucket) => (byValue ? (bucket.money ?? 0) : bucket.count)))
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 border-b pb-2">
        <MonoLabel className="text-muted-foreground">{title}</MonoLabel>
        {picked ? (
          <button type="button" onClick={() => onChange(withoutFilter(query, axis))} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="size-3" aria-hidden="true" />
            {t`toate`}
          </button>
        ) : null}
      </div>
      {!ranking ? (
        <HubPending className="mt-3" rows={6} />
      ) : (
        <ol className="mt-1">
          {buckets.map((bucket) => {
            const value = axis === 'cpv' ? cpvPrefix(bucket.key!, level) : bucket.key!
            const selected = picked?.values[0] === value
            const figure = byValue ? (bucket.money ?? 0) : bucket.count
            return (
              <li key={bucket.key}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(selected ? withoutFilter(query, axis) : withFilter(query, axis, level, value))}
                  className={cn('block w-full py-2 pl-2 pr-1 text-left transition-colors hover:bg-muted/50', selected ? 'border-l-2 border-primary bg-primary/5' : 'border-l-2 border-transparent', picked && !selected && 'opacity-60')}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-sm">{keyLabel(axis, level, bucket.key!, namer)}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{byValue ? moneyText(bucket.money ?? 0) : countText(bucket.count)}</span>
                  </span>
                  <span className="mt-1 block h-0.5 bg-muted" aria-hidden="true">
                    <span className="block h-0.5 bg-primary/70" style={{ width: `${Math.max((figure / max) * 100, 0.5).toFixed(1)}%` }} />
                  </span>
                </button>
              </li>
            )
          })}
          <RestLine ranking={ranking} />
        </ol>
      )}
    </div>
  )
}

/** Under a column's top rows: the share the rest and the unknown hold, so the rows never read as the whole. */
function RestLine({ ranking }: { readonly ranking: Ranking }) {
  const rest = ranking.buckets.filter((bucket) => bucket.kind !== 'top').reduce((sum, bucket) => sum + (bucket.share ?? 0), 0)
  if (rest <= 0) return null
  return <li className="px-1.5 pt-1.5 text-xs tabular-nums text-muted-foreground">{t`Restul și necunoscutele: ${percentText(rest, rest < 0.1 ? 1 : 0)}`}</li>
}

/**
 * `traseu` — procurement is a pair: who buys, what, from whom, side by side.
 * No group-by: each column ranks its axis under every other pick, and a pick
 * in any column narrows the other two. Where and when follow, shorter.
 */
export function AnalyticsTraseu() {
  const [query, setQuery] = useAnalyticsQuery()
  // The columns are the answer: no group-by ranking is read.
  const answer = useAnswer(query, { topN: 10, facets: false, years: true, ranking: false })
  const cpvLevel = query.filters.cpv ? (nextCpvLevel(query.filters.cpv.level) ?? query.filters.cpv.level) : 'diviziune'
  const buyers = useRanking(withoutFilter(query, 'cumparator'), { axis: 'cumparator', level: 'cui' }, 12)
  // The category column goes one level down once a category is picked, and keeps the pick's own level to show its siblings otherwise.
  const categoryQuery = query.filters.cpv && nextCpvLevel(query.filters.cpv.level) ? query : withoutFilter(query, 'cpv')
  const categoryLevel = query.filters.cpv && nextCpvLevel(query.filters.cpv.level) ? cpvLevel : 'diviziune'
  const categories = useRanking(categoryQuery, { axis: 'cpv', level: categoryLevel }, 12)
  const sellers = useRanking(withoutFilter(query, 'furnizor'), { axis: 'furnizor', level: 'cui' }, 12)
  const places = useRanking(withoutFilter(query, 'loc'), { axis: 'loc', level: 'judet' }, 10)
  const namer = useNamer(query, answer, [buyers.data, categories.data, sellers.data].filter((ranking): ranking is Ranking => Boolean(ranking)))
  const byValue = query.masura !== 'numar' && POPULATIONS[query.tip].money !== 'none'
  return (
    <Shell>
      <div className={STICKY}>
        <RuledFrame className="py-3">
          <ControlRow query={query} answer={answer} namer={namer} onChange={setQuery} />
        </RuledFrame>
      </div>
      <RuledFrame className="py-8 sm:py-10">
        <MonoLabel className="block text-muted-foreground">{t`Achiziții publice · Analize`}</MonoLabel>
        <div className="mt-3">
          <Readout query={query} answer={answer} namer={namer} withGroup={false} />
        </div>
        <FiguresBand query={query} answer={answer} className="mt-8" />
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t`Un clic într-o coloană o alege și le restrânge pe celelalte două.`}</p>
          <button type="button" onClick={() => setQuery({ ...query, masura: byValue ? 'numar' : POPULATIONS[query.tip].money === 'none' ? 'numar' : 'lei' })} className="shrink-0 border px-2 py-1 text-sm hover:bg-muted" disabled={POPULATIONS[query.tip].money === 'none'}>
            {byValue ? t`Arată numărul` : t`Arată banii`}
          </button>
        </div>
        <div className="mt-4 grid gap-8 lg:grid-cols-3">
          <TrailColumn query={query} axis="cumparator" level="cui" title={t`Cine cumpără`} namer={namer} ranking={buyers.data} onChange={setQuery} />
          <TrailColumn query={query} axis="cpv" level={categoryLevel} title={t`Ce`} namer={namer} ranking={categories.data} onChange={setQuery} />
          <TrailColumn query={query} axis="furnizor" level="cui" title={t`De la cine`} namer={namer} ranking={sellers.data} onChange={setQuery} />
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <TrailColumn query={query} axis="loc" level="judet" title={t`Unde (județul instituției)`} namer={namer} ranking={places.data} onChange={setQuery} />
          <YearsStrip query={query} answer={answer} onChange={setQuery} />
        </div>
        <RecordsBlock key={JSON.stringify([query.tip, query.filters, query.period, query.titlu, query.valoare])} query={query} answer={answer} className="mt-12" />
        <MethodNote query={query} answer={answer} className="mt-10 border-t pt-4" />
      </RuledFrame>
    </Shell>
  )
}

// ──────────────────────────────────────────────────────────────── panou ──

function railLevel(query: Query, axis: AxisId): string {
  if (axis === 'cpv') return query.filters.cpv?.level ?? 'diviziune'
  if (axis === 'loc' || axis === 'loc_firma') return 'judet'
  return AXES[axis].levels[0]!.id
}

function RailAxis({ query, axis, level, ranking, namer, onChange }: { readonly query: Query; readonly axis: AxisId; readonly level: string; readonly ranking: Ranking | undefined; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  const picked = query.filters[axis]
  if (!AXES[axis].populations.includes(query.tip)) return null
  const buckets = (ranking?.buckets ?? []).filter((bucket) => bucket.kind === 'top' && bucket.key)
  const byValue = ranking?.rankedBy === 'value'
  return (
    <div className="border-t pt-3">
      <MonoLabel className="block text-muted-foreground">{groupTab(axis)}</MonoLabel>
      <ul className="mt-2 space-y-0.5">
        {buckets.map((bucket) => {
          const value = axis === 'cpv' ? cpvPrefix(bucket.key!, level) : bucket.key!
          const selected = picked?.values[0] === value
          return (
            <li key={bucket.key}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(selected ? withoutFilter(query, axis) : withFilter(query, axis, level, value))}
                className={cn('flex w-full items-baseline justify-between gap-2 px-1.5 py-1 text-left text-sm hover:bg-muted', selected && 'bg-primary/10 font-semibold')}
              >
                <span className="min-w-0 truncate">{keyLabel(axis, level, bucket.key!, namer)}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{bucket.share !== null ? percentText(bucket.share, bucket.share < 0.1 ? 1 : 0) : byValue ? moneyText(bucket.money ?? 0) : countText(bucket.count)}</span>
              </button>
            </li>
          )
        })}
        {ranking ? <RestLine ranking={ranking} /> : <li className="text-xs text-muted-foreground">…</li>}
      </ul>
    </div>
  )
}

/**
 * `panou` — the control: every axis in a rail with its top options and
 * shares (each ranked under the other filters), the answer beside it. What
 * an analyst's workbench looks like when nothing is behind a sheet.
 */
export function AnalyticsPanou() {
  const [query, move] = useAnalyticsQuery()
  const [expanded, setExpanded] = useExpanded(query)
  const answer = useAnswer(query, { topN: expanded ? 100 : 25, facets: false, years: true })
  // Each axis ranked under every filter but its own, read here so their names come with the rest.
  const rail = [
    useRanking(withoutFilter(query, 'cumparator'), { axis: 'cumparator', level: railLevel(query, 'cumparator') }, 6),
    useRanking(withoutFilter(query, 'furnizor'), { axis: 'furnizor', level: railLevel(query, 'furnizor') }, 6),
    useRanking(withoutFilter(query, 'cpv'), { axis: 'cpv', level: railLevel(query, 'cpv') }, 6),
    useRanking(withoutFilter(query, 'loc'), { axis: 'loc', level: 'judet' }, 6),
    useRanking(withoutFilter(query, 'loc_firma'), { axis: 'loc_firma', level: 'judet' }, 6),
    useRanking(withoutFilter(query, 'procedura'), { axis: 'procedura', level: 'tip' }, 6),
  ]
  const namer = useNamer(query, answer, rail.map((read) => read.data).filter((ranking): ranking is Ranking => Boolean(ranking)))
  return (
    <Shell>
      <RuledFrame className="py-6 sm:py-8">
        {/* On a phone the rail follows the answer: the controls, the answer, then the axes to narrow by. */}
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-12">
          <aside className="contents lg:col-span-3 lg:block lg:space-y-4">
            <ControlRow query={query} answer={answer} namer={namer} onChange={move} />
            <div className="order-last space-y-4 lg:order-none">
              {AXIS_ORDER.map((axis, index) => (
                <RailAxis key={axis} query={query} axis={axis} level={railLevel(query, axis)} ranking={rail[index]?.data} namer={namer} onChange={move} />
              ))}
            </div>
          </aside>
          <main className="min-w-0 lg:col-span-9">
            <Readout query={query} answer={answer} namer={namer} />
            <FiguresBand query={query} answer={answer} className="mt-6" />
            <GroupBar query={query} onChange={move} className="mt-8" />
            <RankedAnswer query={query} answer={answer} namer={namer} onChange={move} expanded={expanded} onExpand={setExpanded} className="mt-4" />
            <TimeAnswer query={query} answer={answer} onChange={move} className="mt-4" />
            <YearsStrip query={query} answer={answer} onChange={move} className="mt-10" />
            <RecordsBlock key={JSON.stringify([query.tip, query.filters, query.period, query.titlu, query.valoare])} query={query} answer={answer} className="mt-12" />
            <MethodNote query={query} answer={answer} className="mt-10 border-t pt-4" />
          </main>
        </div>
      </RuledFrame>
    </Shell>
  )
}
