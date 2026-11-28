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
import { formatLegalDate, formatLegalNumber, localIsoDate } from '../../lib/legal-format'
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
  const today = localIsoDate()
  const tomorrow = localIsoDate(1)
  const frontier = useLegislationFreshness().data?.latestEffectiveChangeDate ?? null

  const state = changesStateOf(search)
  const setState = (next: ChangesState) => void navigate({ to: '/legislation/changes', search: changesSearchOf(next) as never, replace: true })
  const [panelOpen, setPanelOpen] = useState(false)
  const filterButton = useRef<HTMLButtonElement>(null)

  const tabKinds = kindsOf(state.tab)
  const kinds = narrowKinds(tabKinds, state.kinds)
  const filtered = state.kinds.some((kind) => tabKinds.includes(kind)) || state.since !== null || state.until !== null
  // The period's end is capped at today on the first tab: what comes later is in the upcoming group above.
  const rangeEnd = state.until !== null && state.until < today ? state.until : today

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
  })
  const filteredCount = useCount(listFilter, filtered)
  const upcoming = useQuery({
    queryKey: ['legal', 'changes-upcoming', kinds, tomorrow],
    queryFn: ({ signal }) => fetchRecentChangesPage({ kinds, since: tomorrow }, { first: 50, signal }),
    staleTime: 5 * 60 * 1000,
    enabled: state.tab === 'schimbari',
  })

  const rows = list.data?.pages.flatMap((page) => page.items) ?? []
  const upcomingRows = state.tab === 'schimbari' ? (upcoming.data?.items ?? []) : []
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
        <div role="tablist" aria-label={t`Ce schimbări`} className="-mb-px flex min-w-0 gap-x-5 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={state.tab === tab.id}
              // A new tab keeps the period but not the kinds, which belong to the tab.
              onClick={() => setState({ ...state, tab: tab.id, kinds: [] })}
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

      {filtered ? <ChangesActiveFilters state={state} tabKinds={tabKinds} onChange={setState} locale={i18n.locale} /> : null}

      {upcomingRows.length > 0 ? (
        <section aria-labelledby="changes-upcoming" className="flex flex-col gap-2">
          <h2 id="changes-upcoming" className="text-sm font-semibold">
            {t`Urmează să intre în vigoare`} <span className="font-normal tabular-nums text-muted-foreground">{n(upcomingRows.length)}</span>
          </h2>
          <ChangeBlocks blocks={groupChanges(upcomingRows)} today={today} locale={i18n.locale} />
        </section>
      ) : null}

      <section aria-labelledby="changes-list" className="flex flex-col gap-2">
        <h2 id="changes-list" className="text-sm font-semibold">
          {state.tab === 'schimbari' ? t`Intrate în vigoare` : state.tab === 'legi-noi' ? t`Legi noi și ordonanțe aprobate` : t`Schimbări fără dată de intrare în vigoare`}
          {filtered && filteredCount.isSuccess && typeof filteredCount.data === 'number' ? (
            <span className="font-normal tabular-nums text-muted-foreground"> {t`${n(filteredCount.data)} după filtre`}</span>
          ) : null}
        </h2>

        {list.isPending ? <ChangesSkeleton /> : null}
        {list.isError && !list.isFetchNextPageError ? (
          <div className="rounded-lg border p-4 text-sm">
            <p>{t`Nu am putut încărca schimbările.`}</p>
            <button type="button" onClick={() => void list.refetch()} className="mt-2 underline underline-offset-2">
              {t`Încearcă din nou`}
            </button>
          </div>
        ) : null}
        {list.isSuccess && rows.length === 0 ? <p className="text-sm text-muted-foreground">{t`Nicio schimbare nu corespunde filtrelor.`}</p> : null}
        {list.isSuccess && rows.length > 0 ? (
          state.tab === 'schimbari' ? (
            <ChangeBlocks blocks={groupChanges(rows)} today={today} locale={i18n.locale} />
          ) : (
            <ChangeRows rows={rows} today={today} locale={i18n.locale} />
          )
        ) : null}

        {list.isFetchNextPageError ? <p className="text-sm text-muted-foreground">{t`Pagina următoare nu s-a încărcat.`}</p> : null}
        {list.hasNextPage ? (
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
        {state.tab === 'schimbari' && rows.length > 0 ? <p className="text-xs text-muted-foreground">{t`Descrierea fiecărui act vine din rezumatul făcut automat al textului lui.`}</p> : null}
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
