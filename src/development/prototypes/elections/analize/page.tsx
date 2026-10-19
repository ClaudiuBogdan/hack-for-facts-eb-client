import { useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { cn } from '@/lib/utils'
import { useFormat } from '../shared/parts'
import { COLUMNS, CoverageBand, CubeBand, type Columns } from './cube'
import { FilterSheet } from './filters'
import { answerOf, catalog, DEFAULT_QUERY, referenceEdition, type Query, type Tab } from './model'
import { ALL_AXES, AnalyticsHead, AxisTabs, Figures, LevelsBar, pageNotes, PROTOTYPE_MARKER, SourceFoot, useQuestion } from './parts'
import { RecordsTable } from './records'
import { AnswerTable, PlacesTable, YearsBand } from './table'
import { headlineText } from './text'

/**
 * The three spines of the elections analysis page, on the same head, bar,
 * figures, filters and source line:
 * - `clasament`: procurement's ranked answer over the catalog;
 * - `cub`: elections × one dimension as a pivot, with what the data covers;
 * - `randuri`: the finder — one edition's rows from the live API first.
 */

/** The browser tab says the question (the shell's title stays on the server). */
function useTitle(text: string) {
  useClientDocumentTitle(`${text} · Transparenta.eu`)
}

// ───────────────────────────────────────────────────────── clasament ──

export function AnalyzeRanking() {
  const { cat, query, move } = useQuestion(ALL_AXES)
  const [filters, setFilters] = useState(false)
  const answer = useMemo(() => answerOf(cat, query), [cat, query])
  const notes = pageNotes(query, answer)
  useTitle(headlineText(query, cat))
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background">
      <AnalyticsHead query={query} cat={cat} answer={answer} notes={notes} onChange={move} onFilters={() => setFilters(true)} />
      <LevelsBar query={query} cat={cat} onChange={move} />
      <Figures query={query} answer={answer} cat={cat} />
      <section className="border-b" aria-label={t`Răspunsul`}>
        <RuledFrame className="py-12 sm:py-16">
          <AxisTabs query={query} tabs={ALL_AXES} onChange={move} />
          {query.dupa === 'localitati' ? (
            <PlacesTable query={query} cat={cat} answer={answer} className="mt-3" />
          ) : (
            <AnswerTable query={query} cat={cat} answer={answer} onChange={move} className="mt-3" />
          )}
        </RuledFrame>
      </section>
      <YearsBand query={query} cat={cat} onChange={move} />
      <RuledFrame className="py-8">
        <SourceFoot query={query} answer={answer} cat={cat} />
      </RuledFrame>
      <FilterSheet query={query} cat={cat} answer={answer} onChange={move} open={filters} onOpenChange={setFilters} />
    </div>
  )
}

// ───────────────────────────────────────────────────────── cub ──

const CUBE_TABS: readonly Tab[] = ['alegeri']

export function AnalyzeCube() {
  const { cat, query, move } = useQuestion(CUBE_TABS)
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const columns: Columns = COLUMNS.find((key) => key === search.coloane) ?? 'functii'
  const setColumns = (next: Columns) =>
    void navigate({ to: '.', search: (previous: Record<string, unknown>) => ({ ...previous, coloane: next === 'functii' ? undefined : next }), resetScroll: false })
  const [filters, setFilters] = useState(false)
  const answer = useMemo(() => answerOf(cat, query), [cat, query])
  const notes = pageNotes({ ...query, dupa: 'timp' }, answer)
  useTitle(headlineText(query, cat))
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background">
      <AnalyticsHead query={query} cat={cat} answer={answer} notes={notes} onChange={move} onFilters={() => setFilters(true)} />
      <LevelsBar query={query} cat={cat} onChange={move} />
      <Figures query={query} answer={answer} cat={cat} />
      <CubeBand query={query} cat={cat} answer={answer} columns={columns} onChange={(next) => move({ ...next, dupa: 'alegeri' })} onColumns={setColumns} />
      <CoverageBand query={query} cat={cat} onChange={move} />
      <RuledFrame className="py-8">
        <SourceFoot query={{ ...query, dupa: 'timp' }} answer={answer} cat={cat} />
      </RuledFrame>
      <FilterSheet query={query} cat={cat} answer={answer} onChange={move} open={filters} onOpenChange={setFilters} />
    </div>
  )
}

// ───────────────────────────────────────────────────────── randuri ──

const FINDER_TABS: readonly Tab[] = ['randuri', 'functii', 'niveluri', 'tururi', 'judete', 'localitati', 'editii']

/** The finder opens on the newest election's reference edition: the latest data by default. */
function finderDefaults(): Query {
  const cat = catalog()
  const newest = cat.data.events[0]
  const reference = newest ? referenceEdition(newest, DEFAULT_QUERY) : null
  return { ...DEFAULT_QUERY, alegere: newest?.key ?? null, editie: reference?.key ?? null, dupa: 'randuri' }
}

/** The pinned bar of the finder: the election's editions, each with its own rows, the one listed underlined. */
function EditionsBar({ query, onChange }: { readonly query: Query; readonly onChange: (query: Query) => void }) {
  const cat = catalog()
  const format = useFormat()
  const event = cat.data.events.find((item) => item.key === query.alegere)
  const editions = event?.editions ?? []
  return (
    <nav aria-label={t`Ediția`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 py-0">
        <span className="hidden min-w-0 shrink-0 py-3 text-sm font-semibold text-foreground md:block">
          {editions.length === 1 ? t`O ediție de date` : t`${format.n(editions.length)} ediții de date; nu se adună`}
        </span>
        <ol className="flex w-full gap-x-4 overflow-x-auto sm:gap-6 md:ml-auto md:w-auto">
          {editions.map((edition) => {
            const active = query.editie === edition.key
            return (
              <li key={edition.key} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ ...query, editie: edition.key, pagina: 1 })}
                  className={cn(
                    'flex min-h-11 items-center gap-2 border-b-2 py-2 text-left text-sm leading-tight transition-colors sm:py-0',
                    active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="flex min-w-0 flex-col md:flex-row md:items-baseline md:gap-1.5">
                    <span className="whitespace-nowrap font-mono text-xs">{edition.key}</span>
                    <span className="flex h-4 items-center text-xs tabular-nums text-muted-foreground">{t`${format.n(edition.contests)} rânduri`}</span>
                  </span>
                </button>
              </li>
            )
          })}
          {editions.length === 0 ? <li className="py-3 text-sm text-muted-foreground">{t`Alegeți o alegere`}</li> : null}
        </ol>
      </RuledFrame>
    </nav>
  )
}

export function AnalyzeFinder() {
  const defaults = useMemo(finderDefaults, [])
  const { cat, query, move } = useQuestion(FINDER_TABS, defaults)
  const [filters, setFilters] = useState(false)
  const answer = useMemo(() => answerOf(cat, query), [cat, query])
  const notes = pageNotes(query, answer)
  useTitle(headlineText(query, cat))
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background">
      <AnalyticsHead
        query={query}
        cat={cat}
        answer={answer}
        notes={notes}
        onChange={move}
        onFilters={() => setFilters(true)}
        fixedRoles={['alegere']}
        allLabel={t`Alege alegerea`}
      />
      <EditionsBar query={query} onChange={move} />
      <Figures query={query} answer={answer} cat={cat} />
      <section className="border-b" aria-label={t`Răspunsul`}>
        <RuledFrame className="py-12 sm:py-16">
          <AxisTabs query={query} tabs={FINDER_TABS} onChange={move} />
          {query.dupa === 'randuri' ? (
            <RecordsTable query={query} cat={cat} answer={answer} onChange={move} className="mt-3" />
          ) : query.dupa === 'localitati' ? (
            <PlacesTable query={query} cat={cat} answer={answer} className="mt-3" />
          ) : (
            <AnswerTable query={query} cat={cat} answer={answer} onChange={move} className="mt-3" />
          )}
        </RuledFrame>
      </section>
      <RuledFrame className="py-8">
        <SourceFoot query={query} answer={answer} cat={cat} />
      </RuledFrame>
      <FilterSheet query={query} cat={cat} answer={answer} onChange={move} open={filters} onOpenChange={setFilters} />
    </div>
  )
}
