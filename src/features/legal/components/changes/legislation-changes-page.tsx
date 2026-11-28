import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LegalChangesFilter, LegalEventKind } from '@/schemas/legal'
import type { LegalChangesSearch } from '@/schemas/legal-search'
import { fetchRecentChangesCount, fetchRecentChangesPage } from '../../api/legal-changes-api'
import { useLegislationFreshness } from '../../hooks/use-legislation'
import { changesSearchOf, changesStateOf, type ChangesState, type ChangesTab } from '../../lib/legal-changes-address'
import { CHANGE_KINDS, NEW_LAW_KINDS, groupChanges, narrowKinds } from '../../lib/legal-changes-blocks'
import { bucharestToday } from '../../lib/legal-coverage'
import { formatLegalDate, formatLegalNumber } from '../../lib/legal-format'
import { ChangeBlocks, ChangeRows, ChangesSkeleton } from './legislation-changes-blocks'
import { ChangesActiveFilters, ChangesPanel } from './legislation-changes-panel'

/**
 * Modificări (owner, 27–28 November 2026; spec docs/superpowers/specs/2026-11-28-legislation-changes-redesign-design.md,
 * prototype `/development/legal/changes`): for watching what is changing. Three tabs — changes to existing acts
 * (default), new laws and approved ordinances, the undated changes. On the first, what comes into force soon sits on
 * top, then one block per act that makes the change. Every choice is in the address; paging stays in memory, under
 * one filter (the server's cursor is bound to it, so a new filter starts again from the first page).
 */

const PAGE = 20
/** The upcoming changes are few (7 on 28 November 2026); every page is read, up to this safety cap (2,000 rows). */
const UPCOMING_PAGES = 40

const dayAfter = (iso: string): string => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
const kindsOf = (tab: ChangesTab): readonly LegalEventKind[] => (tab === 'legi-noi' ? NEW_LAW_KINDS : CHANGE_KINDS)

function useCount(filter: LegalChangesFilter, enabled = true) {
  return useQuery({
    queryKey: ['legal', 'changes-count', filter],
    queryFn: ({ signal }) => fetchRecentChangesCount(filter, { signal }),
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled,
  })
}

export function LegislationChangesPage({ search }: { readonly search: LegalChangesSearch }) {
  const { i18n } = useLingui()
  const navigate = useNavigate()
  // "Already in force" is a Bucharest day, whatever the reader's clock says.
  const today = bucharestToday()
  const tomorrow = dayAfter(today)
  const frontier = useLegislationFreshness().data?.latestEffectiveChangeDate ?? null

  const state = changesStateOf(search)
  // The page's keys over the current address, so the root's own keys (the language) survive every choice.
  const setState = (next: ChangesState) =>
    void navigate({ to: '/legislation/changes', search: ((prev: Record<string, unknown>) => ({ ...prev, ...changesSearchOf(next) })) as never, replace: true })
  const [panelOpen, setPanelOpen] = useState(false)
  const filterButton = useRef<HTMLButtonElement>(null)

  const tabKinds = kindsOf(state.tab)
  const kinds = narrowKinds(tabKinds, state.kinds)
  const filtered = state.kinds.some((kind) => tabKinds.includes(kind)) || state.since !== null || state.until !== null
  // The period's end is capped at today on the first tab: what comes later is in the upcoming group above.
  const rangeEnd = state.until !== null && state.until < today ? state.until : today
  // A period that starts after its end has nothing: no read, never a backwards range (the server's answer to one is
  // not ours to guess). On the first tab the end is capped at today, so a start after today is such a period.
  const emptyPeriod =
    state.tab === 'schimbari'
      ? state.since !== null && state.since > rangeEnd
      : state.tab === 'legi-noi' && state.since !== null && state.until !== null && state.since > state.until

  // The three tabs' totals, unfiltered.
  const changesTotal = useCount({ kinds: CHANGE_KINDS, until: today })
  const newTotal = useCount({ kinds: NEW_LAW_KINDS })
  const undatedTotal = useCount({ kinds: CHANGE_KINDS, undated: true })

  const listFilter: LegalChangesFilter =
    state.tab === 'fara-data'
      ? { kinds, undated: true }
      : state.tab === 'legi-noi'
        ? { kinds, ...(state.since !== null && { since: state.since }), ...(state.until !== null && { until: state.until }) }
        : { kinds, ...(state.since !== null && { since: state.since }), until: rangeEnd }
  const list = useInfiniteQuery({
    queryKey: ['legal', 'changes-list', listFilter],
    queryFn: ({ pageParam, signal }) => fetchRecentChangesPage(listFilter, { first: PAGE, ...(pageParam !== undefined && { after: pageParam }), signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.endCursor ?? undefined,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !emptyPeriod,
  })
  const filteredCount = useCount(listFilter, filtered && !emptyPeriod)
  const upcoming = useQuery({
    queryKey: ['legal', 'changes-upcoming-all', kinds, tomorrow],
    queryFn: async ({ signal }) => {
      const items = []
      let after: string | undefined
      for (let page = 0; page < UPCOMING_PAGES; page++) {
        const read = await fetchRecentChangesPage({ kinds, since: tomorrow }, { first: 50, ...(after !== undefined && { after }), signal })
        items.push(...read.items)
        if (read.endCursor === null) return { items, more: false }
        after = read.endCursor
      }
      // Stopped at the cap with pages left: the count says „at least".
      return { items, more: true }
    },
    staleTime: 5 * 60 * 1000,
    enabled: state.tab === 'schimbari',
  })

  // Rows show while the list is good, or when only its next page failed (the earlier pages stay); a failed reload of
  // the first page shows its error alone, never the previous answer under it.
  const listUsable = list.isSuccess || list.isFetchNextPageError
  const rows = emptyPeriod || !listUsable ? [] : (list.data?.pages.flatMap((page) => page.items) ?? [])
  const upcomingRows = state.tab === 'schimbari' ? (upcoming.data?.items ?? []) : []
  const upcomingBlocks = groupChanges(upcomingRows)
  const listBlocks = state.tab === 'schimbari' ? groupChanges(rows) : []
  const described = [...upcomingBlocks, ...listBlocks].some((block) => Boolean(block.source?.description))
  const n = (value: number) => formatLegalNumber(value, i18n.locale)
  const total = (query: { readonly isSuccess: boolean; readonly data?: number | null }) => (query.isSuccess && typeof query.data === 'number' ? query.data : null)

  const tabs: ReadonlyArray<{ readonly id: ChangesTab; readonly label: string; readonly count: number | null }> = [
    { id: 'schimbari', label: t`Schimbări ale actelor`, count: total(changesTotal) },
    { id: 'legi-noi', label: t`Legi noi și OUG aprobate`, count: total(newTotal) },
    { id: 'fara-data', label: t`Fără dată`, count: total(undatedTotal) },
  ]

  return (
    <div className="flex flex-col gap-5">
      {frontier !== null ? <p className="text-sm text-muted-foreground">{t`Cea mai nouă schimbare intrată în vigoare din date: ${formatLegalDate(frontier, i18n.locale)}.`}</p> : null}

      <div className="flex items-end justify-between gap-x-3 border-b">
        {/* One line on every width: on a phone the tabs scroll sideways inside their row, the page never does. */}
        <div role="group" aria-label={t`Ce schimbări`} className="-mb-px flex min-w-0 gap-x-5 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={state.tab === tab.id}
              // A new tab keeps the period but not the kinds, which belong to the tab; the open one stays as it is.
              onClick={() => {
                if (tab.id !== state.tab) setState({ ...state, tab: tab.id, kinds: [] })
              }}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                state.tab === tab.id ? 'border-foreground font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {tab.count !== null ? <span className="tabular-nums text-muted-foreground">{n(tab.count)}</span> : null}
            </button>
          ))}
        </div>
        <button
          ref={filterButton}
          type="button"
          aria-haspopup="dialog"
          onClick={() => setPanelOpen(true)}
          className={cn(
            'mb-1.5 inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:border-foreground/30',
            filtered ? 'border-primary/50 bg-primary/5' : 'bg-card',
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {filtered ? t`Filtre (active)` : t`Filtre`}
        </button>
      </div>

      {filtered ? <ChangesActiveFilters state={state} tabKinds={tabKinds} today={today} onChange={setState} locale={i18n.locale} /> : null}

      {state.tab === 'schimbari' && upcoming.isPending ? <ChangesSkeleton rows={1} /> : null}
      {state.tab === 'schimbari' && upcoming.isError ? (
        <div className="rounded-lg border p-4 text-sm">
          <p id="changes-upcoming-error">{t`Nu am putut încărca schimbările care urmează.`}</p>
          <button type="button" aria-describedby="changes-upcoming-error" onClick={() => void upcoming.refetch()} className="mt-2 underline underline-offset-2">
            {t`Încearcă din nou`}
          </button>
        </div>
      ) : null}
      {upcomingRows.length > 0 ? (
        <section aria-labelledby="changes-upcoming" className="flex flex-col gap-2">
          <h2 id="changes-upcoming" className="text-sm font-semibold">
            {t`Urmează să intre în vigoare`}{' '}
            <span className="font-normal tabular-nums text-muted-foreground">
              {n(upcomingRows.length)}
              {upcoming.data?.more ? '+' : ''}
            </span>
          </h2>
          <ChangeBlocks blocks={upcomingBlocks} today={today} locale={i18n.locale} />
        </section>
      ) : null}

      <section aria-labelledby="changes-list" className="flex flex-col gap-2">
        <h2 id="changes-list" className="text-sm font-semibold">
          {state.tab === 'schimbari' ? t`Intrate în vigoare` : state.tab === 'legi-noi' ? t`Legi noi și ordonanțe aprobate` : t`Schimbări fără dată de intrare în vigoare`}
          {filtered && filteredCount.isSuccess && typeof filteredCount.data === 'number' ? (
            <span className="font-normal tabular-nums text-muted-foreground"> {t`${n(filteredCount.data)} după filtre`}</span>
          ) : null}
        </h2>

        {list.isPending && !emptyPeriod ? <ChangesSkeleton /> : null}
        {list.isError && !list.isFetchNextPageError ? (
          <div className="rounded-lg border p-4 text-sm">
            <p id="changes-list-error">{t`Nu am putut încărca schimbările.`}</p>
            <button type="button" aria-describedby="changes-list-error" onClick={() => void list.refetch()} className="mt-2 underline underline-offset-2">
              {t`Încearcă din nou`}
            </button>
          </div>
        ) : null}
        {(list.isSuccess || emptyPeriod) && rows.length === 0 ? <p className="text-sm text-muted-foreground">{t`Nicio schimbare nu corespunde filtrelor.`}</p> : null}
        {/* The rows already loaded stay when a next page fails (the query then reports an error, not success). */}
        {rows.length > 0 ? (
          state.tab === 'schimbari' ? (
            <ChangeBlocks blocks={listBlocks} today={today} locale={i18n.locale} />
          ) : (
            <ChangeRows rows={rows} today={today} locale={i18n.locale} />
          )
        ) : null}

        {list.isFetchNextPageError ? <p className="text-sm text-muted-foreground">{t`Pagina următoare nu s-a încărcat.`}</p> : null}
        {list.hasNextPage && listUsable && !emptyPeriod ? (
          <div>
            <button
              type="button"
              disabled={list.isFetching}
              onClick={() => void list.fetchNextPage()}
              className="inline-flex h-10 items-center rounded-lg border bg-card px-4 text-sm font-medium transition-colors hover:border-foreground/30 disabled:opacity-50"
            >
              {list.isFetchingNextPage ? t`Se încarcă…` : t`Încarcă mai multe`}
            </button>
          </div>
        ) : null}
        {described ? <p className="text-xs text-muted-foreground">{t`Descrierea fiecărui act vine din rezumatul făcut automat al textului lui.`}</p> : null}
      </section>

      <ChangesPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        returnFocus={() => filterButton.current?.focus()}
        state={state}
        tabKinds={tabKinds}
        today={today}
        onChange={setState}
      />
    </div>
  )
}
