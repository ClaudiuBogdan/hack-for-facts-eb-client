import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { NGO_REGISTRY_SUMMARY } from '@/features/ngos/hub/registry-summary'
import type { RegistrySearch } from '../api'
import { figuresOf } from '../counts'
import { groupAxes, notesOf, queryOf, questionOf, selectionKey, TABLE_PAGE, type RegistryQuery } from '../model'
import { viewOf } from '../view'
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
 * is a link and every link the hub makes opens unchanged. The answer's
 * view is in it too (`page`, `by`, `view`): Back from a record returns to
 * its page, and a shared link opens the same tab, list or map.
 */

/**
 * One piece of the answer's view: shown at once, written to the address
 * after. The address wins whenever it changes (Back, a link) or the
 * selection does (`scope`) — not by remounting the page on a new address,
 * which would close and reopen the filter sheet, its focus lost.
 */
function useAddressed<T>(fromAddress: T, scope: string, write: (value: T) => void): readonly [T, (value: T) => void] {
  const [local, setLocal] = useState({ from: fromAddress, scope, value: fromAddress })
  const current = local.from === fromAddress && local.scope === scope
  if (!current) setLocal({ from: fromAddress, scope, value: fromAddress })
  return [
    current ? local.value : fromAddress,
    (value: T) => {
      setLocal({ from: fromAddress, scope, value })
      write(value)
    },
  ] as const
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
  onView,
}: {
  readonly search: RegistrySearch
  /** What the server read for the address it rendered. */
  readonly seed: RegistrySeed | null
  /** A new question, as the route's address. */
  readonly onSearch: (query: RegistryQuery) => void
  /**
   * The answer's view, into the address in place (no new history entry); `undefined` drops a key. The page goes
   * as a number: the router writes a numeric string as JSON („page=%222%22").
   */
  readonly onView: (view: { readonly page?: number | undefined; readonly by?: string | undefined; readonly view?: string | undefined }) => void
}) {
  const counties = NGO_REGISTRY_SUMMARY.counties
  const { query, unread } = queryOf(search, counties)
  const key = selectionKey(query)
  // A new question keeps them: the sheet stays open for the next filter, the answer on its axis.
  const [filters, setFilters] = useState(false)
  const addressed = viewOf(search)
  // The answer's tab and the counties' list or map: the reader's choice, kept with a new question as before, now in the address.
  const [axis, setAxis] = useAddressed<AnswerAxis>(addressed.axis, '', (next) => onView({ by: next === 'inregistrari' ? undefined : next }))
  const [countyView, setCountyView] = useAddressed<CountyView>(addressed.countyView, '', (next) => onView({ view: next === 'map' ? 'map' : undefined }))
  // The table's page belongs to one selection: a new one starts on page 1 (its address carries none).
  const [asked, setPage] = useAddressed(addressed.page, key, (next) => onView({ page: next > 1 ? next : undefined }))
  const state = useRegistryRead(query, asked, seed)
  const { read, summary, tally } = state
  // A page past the selection's last (a stale link) shows the last.
  const page = tally && tally.total > 0 ? Math.min(asked, Math.ceil(tally.total / TABLE_PAGE)) : asked
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
