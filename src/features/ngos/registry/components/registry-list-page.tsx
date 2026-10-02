import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { NGO_REGISTRY_SUMMARY } from '@/features/ngos/hub/registry-summary'
import type { RegistrySearch } from '../api'
import { figuresOf } from '../counts'
import { groupAxes, notesOf, queryOf, questionOf, selectionKey, type RegistryQuery } from '../model'
import { useRegistryRead, type RegistrySeed } from '../use-registry-read'
import { AnswerPanel, AnswerTabs, GroupTable, Pending, RecordsTable, RegistryFigures, SourceLine, YearsBars, type AnswerAxis } from './registry-answer'
import { CountyViewToggle, RegistryCountyMap, type CountyView } from './registry-county-map'
import { RegistryFilters } from './registry-filters'
import { RegistryHead, StatusNav } from './registry-head'

/**
 * `/ngos/registry`: the national NGO registry asked as the procurement
 * analytics page asks its records (design.md §15). The question as the
 * headline, each filter a phrase; the statuses in the pinned bar; four
 * figures true of the selection; the answer as the records or the
 * selection split on an axis its filters leave open; one source line; the
 * caveats behind one marker; every filter in a sheet. Promoted from
 * prototype ngos/registry, variant intrebare.
 *
 * Every control writes the address in the route's own keys (`q`, `county`,
 * `category`, `status`, `registryNumber`, `publicUtility`), so a question
 * is a link and every link the hub makes opens unchanged.
 */

/**
 * The table's page, which belongs to one selection: a new one starts on
 * page 1, and back on an earlier one its old page does not return. Not by
 * remounting the page on a new address — that would close and reopen the
 * filter sheet, its focus lost, at every filter set in it.
 */
function useTablePage(key: string): readonly [number, (page: number) => void] {
  const [paging, setPaging] = useState({ key, page: 1 })
  if (paging.key !== key) setPaging({ key, page: 1 })
  return [paging.key === key ? paging.page : 1, (page: number) => setPaging({ key, page })] as const
}

function Shell({ children }: { readonly children: ReactNode }) {
  return (
    // Clip, not hide: the crux marks overhang the frame, and a hidden overflow would unstick the bar.
    <div className="relative w-full overflow-x-clip bg-background">{children}</div>
  )
}

export function NgoRegistryListPage({
  search,
  seed,
  onSearch,
}: {
  readonly search: RegistrySearch
  /** What the server read for the address it rendered. */
  readonly seed: RegistrySeed | null
  /** A new question, as the route's address. */
  readonly onSearch: (query: RegistryQuery) => void
}) {
  const counties = NGO_REGISTRY_SUMMARY.counties
  const { query, unread } = queryOf(search, counties)
  const key = selectionKey(query)
  // A new question keeps them: the sheet stays open for the next filter, the answer on its axis.
  const [filters, setFilters] = useState(false)
  const [axis, setAxis] = useState<AnswerAxis>('inregistrari')
  // The counties as the list or the map: the reader's choice, kept as the axis is.
  const [countyView, setCountyView] = useState<CountyView>('list')
  const [page, setPage] = useTablePage(key)
  const state = useRegistryRead(query, page, seed)
  const { read, summary, tally } = state
  const figures = figuresOf({ query, summary: summary ?? null, tally, read, stopped: state.error })
  const notes = notesOf({
    query,
    unread,
    snapshot: read.snapshot,
    summary: NGO_REGISTRY_SUMMARY,
    summaryMatches: summary === undefined ? null : summary !== null,
    read,
    countsGap: state.countsGap,
    trap: questionOf(query)?.trap ?? null,
  })
  // An axis the new question fixes (a county chosen while „Pe județe" is open) falls back to the records, and so does one that cannot be
  // counted (a name past the cap, a read that failed); one still being counted keeps its tab, its panel waiting.
  const uncountable = tally === null && (read.capped || state.error)
  const shownAxis: AnswerAxis = axis === 'inregistrari' || !groupAxes(query).includes(axis) || uncountable ? 'inregistrari' : axis
  return (
    <Shell>
      <RegistryHead query={query} counties={counties} snapshot={read.snapshot} notes={notes} onChange={onSearch} onFilters={() => setFilters(true)} />
      <StatusNav query={query} counties={counties} onChange={onSearch} />
      {/* A failed first read is said once, in the answer; the band waits for the retry. */}
      {state.error && read.pending ? null : <RegistryFigures figures={figures} />}
      <section className="border-b" aria-label={t`Răspunsul`}>
        <RuledFrame className="py-12 sm:py-16">
          <AnswerTabs query={query} read={read} tally={tally} error={state.error} axis={shownAxis} onAxis={setAxis} />
          <AnswerPanel axis={shownAxis}>
            {shownAxis === 'inregistrari' ? (
              <RecordsTable query={query} counties={counties} state={state} page={page} onPage={setPage} onChange={onSearch} className="mt-3" />
            ) : tally === null ? (
              <Pending rows={8} className="mt-3" />
            ) : shownAxis === 'an' ? (
              <YearsBars key={key} tally={tally} through={read.snapshot?.capturedAt.slice(0, 10) ?? null} className="mt-4" />
            ) : shownAxis === 'judet' && tally.total > 0 ? (
              <>
                <CountyViewToggle view={countyView} onView={setCountyView} className="mt-4" />
                {countyView === 'map' ? (
                  <div className="mt-6">
                    <RegistryCountyMap key={key} query={query} counties={counties} tally={tally} />
                  </div>
                ) : (
                  <GroupTable key={`${shownAxis}:${key}`} query={query} counties={counties} tally={tally} axis={shownAxis} onChange={onSearch} className="mt-3" />
                )}
              </>
            ) : (
              <GroupTable key={`${shownAxis}:${key}`} query={query} counties={counties} tally={tally} axis={shownAxis} onChange={onSearch} className="mt-3" />
            )}
          </AnswerPanel>
        </RuledFrame>
      </section>
      <RuledFrame className="py-8">
        <SourceLine snapshot={read.snapshot} tally={tally} />
      </RuledFrame>
      <RegistryFilters query={query} counties={counties} count={tally?.total ?? null} onChange={onSearch} open={filters} onOpenChange={setFilters} />
    </Shell>
  )
}
