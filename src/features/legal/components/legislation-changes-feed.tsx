import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  LegalChangesFilter,
  LegalChangesSearch,
  LegalRecentChange,
} from '@/schemas/legal'
import { legalEventKindSchema, legalEventSourceSchema } from '@/schemas/legal'
import {
  fetchRecentChangesCount,
  fetchRecentChangesPage,
} from '../api/legal-changes-api'
import { CHANGES_LATEST_EFFECTIVE_DATE } from '../lib/legal-coverage'
import {
  formatLegalDate,
  formatLegalNumber,
  localIsoDate,
} from '../lib/legal-format'
import {
  legalEventKindLabel,
  legalEventSourceLabel,
} from '../lib/legal-vocabulary'
import {
  LEGISLATION_ACCENT,
  legislationAlertClassName,
  legislationLinkClassName,
  legislationStatLabelClassName,
} from '../lib/legislation-theme'
import { LegalStatusBadge } from './legal-status-badge'
import { LegislationChangesSkeleton } from './legislation-changes-skeleton'
import { LegislationSection } from './legislation-section'

/** The server's own default page size — one `legalRecentChanges` page per screenful. */
const PAGE_SIZE = 20

/** Same compact-control language as the acts and gazette directories. */
const controlClassName =
  'h-11 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-base text-[var(--pnrr-fg)] shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] disabled:opacity-50'

const secondaryButtonClassName =
  'inline-flex h-11 items-center rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-5 text-sm font-semibold text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] disabled:opacity-50'

const segmentButtonClassName = (active: boolean) =>
  cn(
    'inline-flex h-11 items-center rounded-none border-2 border-[var(--pnrr-border)] px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
    active
      ? 'bg-[var(--pnrr-hover)] font-bold text-[var(--pnrr-fg)]'
      : 'bg-[var(--pnrr-card)] font-normal text-[var(--pnrr-muted)] hover:text-[var(--pnrr-fg)]',
  )

/**
 * Which cohort of the effective-date dimension the feed shows. The four named
 * views come from the URL (`view`, absent = `efective`); `interval` is the
 * custom since/until window, implied by the presence of either date param.
 */
type ChangesView = 'efective' | 'viitoare' | 'toate' | 'nedatate' | 'interval'

type Props = {
  readonly search: LegalChangesSearch
}

/**
 * The global change feed (`/legislation/changes`) — the Modificări tab.
 *
 * The feed is ordered by EFFECTIVE date and the raw top of it is the FUTURE
 * (8 events dated out to 2027-01-05, measured 2026-08-26) — announced by acts
 * already published but not yet in force. A tab named "Modificări" must open
 * on what already changed, so the DEFAULT view bounds the feed at `until =
 * today` (63.210 events) and the other cohorts are named, one-click,
 * URL-reflected views — never silently hidden:
 *  - `viitoare` (`since = tomorrow`): what is about to enter into force;
 *  - `toate`: the feed exactly as served, future first, every future row
 *    marked "intră în vigoare la …" in the accent;
 *  - `nedatate` (`undatedOnly`): the 21.266 events (25,2%) with NO recorded
 *    effective date, which every date window excludes by construction.
 * A custom since/until window replaces the presets; when a hand-edited URL
 * carries both a `view` and a window, the view wins and the window is not
 * sent (the server REJECTS `undatedOnly` + window).
 *
 * Paging is keyset-cursor ("încarcă mai multe", never numbered pages), the
 * acts-directory pattern: pages accumulate in memory under ONE filter, and
 * any filter change resets them — the cursor is bound to the filter and the
 * server rejects a cursor that outlives it. The count is a SEPARATE query so
 * a failed full-scan count degrades the count line, never the feed.
 */
export function LegislationChangesFeed({ search }: Props) {
  const { i18n } = useLingui()
  const navigate = useNavigate()

  const view: ChangesView =
    search.view !== undefined
      ? search.view
      : search.since !== undefined || search.until !== undefined
        ? 'interval'
        : 'efective'

  const today = localIsoDate()
  const filter: LegalChangesFilter = {
    ...(view === 'efective' && { until: today }),
    ...(view === 'viitoare' && { since: localIsoDate(1) }),
    ...(view === 'nedatate' && { undated: true }),
    ...(view === 'interval' && {
      ...(search.since !== undefined && { since: search.since }),
      ...(search.until !== undefined && { until: search.until }),
    }),
    ...(search.kind !== undefined && { kind: search.kind }),
    ...(search.source !== undefined && { source: search.source }),
  }

  // The accumulated pages belong to ONE filter. The URL can change without a
  // setter (back/forward, a shared link) — keying the reset on the filter
  // itself covers every path; otherwise stale rows and a stale cursor (whose
  // fhash the server rejects) survive under the new filter's count line.
  const filterKey = JSON.stringify(filter)
  const filterKeyRef = useRef(filterKey)
  const [extraPages, setExtraPages] = useState<readonly LegalRecentChange[]>([])
  // Three states, deliberately NOT the acts-directory donor's two: undefined =
  // "no page loaded beyond the first" (page from the first page's endCursor),
  // string = resume here, null = EXHAUSTED. Folding exhausted into undefined
  // (`cursor ?? firstPage.endCursor`) resurrects the first page's cursor the
  // moment a later page runs out, leaving a live "încarcă mai multe" that
  // re-fetches the same last page forever.
  const [pagedCursor, setPagedCursor] = useState<string | null | undefined>(
    undefined,
  )
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreFailed, setLoadMoreFailed] = useState(false)
  useEffect(() => {
    filterKeyRef.current = filterKey
    setExtraPages([])
    setPagedCursor(undefined)
    setLoadMoreFailed(false)
  }, [filterKey])

  const feedQuery = useQuery({
    queryKey: ['legal', 'changes-feed', filter],
    queryFn: ({ signal }) =>
      fetchRecentChangesPage(filter, { first: PAGE_SIZE, signal }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // The filtered total is a lazy full scan server-side; its own query (keyed
  // on the filter, NEVER the cursor) means a slow count degrades the count
  // line while the feed stays up, and paging never re-runs it.
  const countQuery = useQuery({
    queryKey: ['legal', 'changes-count', filter],
    queryFn: ({ signal }) => fetchRecentChangesCount(filter, { signal }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const persistedSearch = (
    next: Partial<LegalChangesSearch>,
  ): LegalChangesSearch => ({
    ...(search.kind !== undefined && { kind: search.kind }),
    ...(search.source !== undefined && { source: search.source }),
    ...next,
  })

  const setView = (next: Exclude<ChangesView, 'interval'>) => {
    // Presets DROP any custom window — `nedatate` + window is rejected by the
    // server, and the other presets define their own bounds.
    void navigate({
      to: '/legislation/changes',
      search: persistedSearch(next === 'efective' ? {} : { view: next }),
      replace: true,
    })
  }

  const setWindow = (nextSince: string | undefined, nextUntil: string | undefined) => {
    // A custom window replaces the preset (no `view` param). Clearing both
    // bounds falls back to the default view by omission.
    void navigate({
      to: '/legislation/changes',
      search: persistedSearch({
        ...(nextSince !== undefined && { since: nextSince }),
        ...(nextUntil !== undefined && { until: nextUntil }),
      }),
      replace: true,
    })
  }

  const setKindAndSource = (next: Pick<LegalChangesSearch, 'kind' | 'source'>) => {
    // Keeps the current cohort, re-written in canonical form: the view param
    // when one is set, otherwise the custom window — never both.
    void navigate({
      to: '/legislation/changes',
      search: {
        ...(search.view !== undefined
          ? { view: search.view }
          : {
              ...(search.since !== undefined && { since: search.since }),
              ...(search.until !== undefined && { until: search.until }),
            }),
        ...(next.kind !== undefined && { kind: next.kind }),
        ...(next.source !== undefined && { source: next.source }),
      },
      replace: true,
    })
  }

  const nextCursor =
    pagedCursor === undefined
      ? (feedQuery.data?.endCursor ?? null)
      : pagedCursor

  const loadMore = () => {
    const after = nextCursor
    if (after === null) return
    // An in-flight page belongs to the filter it was requested under — if the
    // URL moved on meanwhile, its rows must not repopulate the fresh state.
    const requestKey = filterKey
    setLoadingMore(true)
    setLoadMoreFailed(false)
    fetchRecentChangesPage(filter, { first: PAGE_SIZE, after })
      .then((page) => {
        if (filterKeyRef.current !== requestKey) return
        setExtraPages((prev) => [...prev, ...page.items])
        setPagedCursor(page.endCursor)
      })
      .catch(() => {
        if (filterKeyRef.current === requestKey) setLoadMoreFailed(true)
      })
      .finally(() => setLoadingMore(false))
  }

  const items = [...(feedQuery.data?.items ?? []), ...extraPages]
  const hasMore = nextCursor !== null
  const totalCount = countQuery.isSuccess ? countQuery.data : null
  const countSettled = countQuery.isSuccess || countQuery.isError
  const hasActiveFilters =
    search.view !== undefined ||
    search.since !== undefined ||
    search.until !== undefined ||
    search.kind !== undefined ||
    search.source !== undefined

  const countLine = feedQuery.isSuccess
    ? totalCount !== null
      ? totalCount === 1
        ? t`o modificare înregistrată`
        : t`${formatLegalNumber(totalCount, i18n.locale)} modificări înregistrate`
      : countSettled
        ? t`cel puțin ${formatLegalNumber(items.length, i18n.locale)} modificări — numărul total nu a răspuns`
        : undefined
    : undefined

  const viewOptions: ReadonlyArray<{
    readonly id: Exclude<ChangesView, 'interval'>
    readonly label: string
  }> = [
    { id: 'efective', label: t`deja în vigoare` },
    { id: 'viitoare', label: t`viitoare` },
    { id: 'toate', label: t`toate` },
    { id: 'nedatate', label: t`fără dată` },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* The staleness caveat qualifies everything below it, so it reads
          first. Every claim in it is measured on the feed itself (the date is
          the same constant the shell's "date până la" meta line formats). */}
      <div className={legislationAlertClassName} role="note">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-warning-fg)]"
          aria-hidden
        />
        <p className="text-sm font-medium text-[var(--pnrr-fg)]">
          <Trans>
            Cea mai recentă modificare intrată deja în vigoare are data de{' '}
            {formatLegalDate(CHANGES_LATEST_EFFECTIVE_DATE, i18n.locale)} —
            schimbările produse după această dată nu apar încă aici.
            Modificările cu dată viitoare provin din acte deja publicate.
          </Trans>
        </p>
      </div>

      <LegislationSection
        id="changes-feed-heading"
        title={t`Modificări legislative`}
        {...(countLine !== undefined && { description: countLine })}
        bodyClassName="p-0"
        footnote={
          <Trans>
            Un sfert dintre evenimente nu au dată de intrare în vigoare
            înregistrată — le găsești sub „fără dată”. Filtrele se păstrează
            în adresă — o vedere filtrată este un link pe care îl poți
            trimite.
          </Trans>
        }
      >
        <form
          aria-label={t`Filtre`}
          className="flex flex-wrap items-end gap-x-5 gap-y-4 border-b border-[var(--pnrr-subtle)] px-5 py-4 sm:px-6"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="flex flex-col gap-1.5">
            <span className={legislationStatLabelClassName} id="changes-view-label">
              <Trans>Intrarea în vigoare</Trans>
            </span>
            <div
              role="group"
              aria-labelledby="changes-view-label"
              className="flex flex-wrap gap-2"
            >
              {viewOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={view === option.id}
                  className={segmentButtonClassName(view === option.id)}
                  onClick={() => setView(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={legislationStatLabelClassName}>
              <Trans>De la</Trans>
            </span>
            <input
              type="date"
              className={cn(controlClassName, 'w-44')}
              value={view === 'interval' ? (search.since ?? '') : ''}
              disabled={view === 'nedatate'}
              aria-describedby={
                view === 'nedatate' ? 'changes-undated-hint' : undefined
              }
              onChange={(event) =>
                setWindow(
                  event.target.value === '' ? undefined : event.target.value,
                  view === 'interval' ? search.until : undefined,
                )
              }
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={legislationStatLabelClassName}>
              <Trans>Până la</Trans>
            </span>
            <input
              type="date"
              className={cn(controlClassName, 'w-44')}
              value={view === 'interval' ? (search.until ?? '') : ''}
              disabled={view === 'nedatate'}
              aria-describedby={
                view === 'nedatate' ? 'changes-undated-hint' : undefined
              }
              onChange={(event) =>
                setWindow(
                  view === 'interval' ? search.since : undefined,
                  event.target.value === '' ? undefined : event.target.value,
                )
              }
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={legislationStatLabelClassName}>
              <Trans>Felul modificării</Trans>
            </span>
            <select
              className={cn(controlClassName, 'min-w-[13rem]')}
              value={search.kind ?? ''}
              onChange={(event) => {
                const parsed = legalEventKindSchema.safeParse(event.target.value)
                setKindAndSource({
                  ...(parsed.success && { kind: parsed.data }),
                  ...(search.source !== undefined && { source: search.source }),
                })
              }}
            >
              <option value="">{t`toate felurile`}</option>
              {legalEventKindSchema.options.map((kind) => (
                <option key={kind} value={kind}>
                  {legalEventKindLabel(kind)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={legislationStatLabelClassName}>
              <Trans>Sursa</Trans>
            </span>
            <select
              className={cn(controlClassName, 'min-w-[12rem]')}
              value={search.source ?? ''}
              onChange={(event) => {
                const parsed = legalEventSourceSchema.safeParse(
                  event.target.value,
                )
                setKindAndSource({
                  ...(search.kind !== undefined && { kind: search.kind }),
                  ...(parsed.success && { source: parsed.data }),
                })
              }}
            >
              <option value="">{t`ambele surse`}</option>
              {legalEventSourceSchema.options.map((source) => (
                <option key={source} value={source}>
                  {legalEventSourceLabel(source)}
                </option>
              ))}
            </select>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              className={cn(legislationLinkClassName, 'h-11')}
              onClick={() =>
                void navigate({
                  to: '/legislation/changes',
                  search: {},
                  replace: true,
                })
              }
            >
              <Trans>Șterge filtrele</Trans>
            </button>
          )}

          {view === 'nedatate' && (
            <p
              id="changes-undated-hint"
              className="basis-full text-xs text-[var(--pnrr-muted)]"
            >
              <Trans>
                Evenimentele fără dată nu pot fi filtrate după perioadă —
                alege altă vedere pentru un interval de date.
              </Trans>
            </p>
          )}
        </form>

        {feedQuery.isLoading && <LegislationChangesSkeleton />}

        {feedQuery.isError && (
          <div className="px-5 py-6 sm:px-6">
            <p className="text-sm text-[var(--pnrr-fg)]">
              <Trans>Nu am putut încărca modificările legislative.</Trans>
            </p>
            <button
              type="button"
              className={cn(secondaryButtonClassName, 'mt-3')}
              onClick={() => void feedQuery.refetch()}
            >
              <Trans>Încearcă din nou</Trans>
            </button>
          </div>
        )}

        {feedQuery.isSuccess && items.length === 0 && (
          <p className="px-5 py-6 text-sm text-[var(--pnrr-muted)] sm:px-6">
            <Trans>Nicio modificare nu corespunde filtrelor.</Trans>
          </p>
        )}

        {feedQuery.isSuccess && items.length > 0 && (
          <ul aria-label={t`Modificări`}>
            {items.map((change) => {
              const isFuture =
                change.effectiveDate !== null && change.effectiveDate > today

              return (
                <li
                  key={change.eventId}
                  className="border-b border-[var(--pnrr-subtle)] last:border-b-0"
                >
                  <div className="flex flex-col gap-1 px-5 py-3 sm:px-6">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        to="/legislation/acts/$actId"
                        params={{ actId: change.actId }}
                        className="text-base font-semibold text-[var(--pnrr-fg)] underline underline-offset-2 transition-colors hover:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                      >
                        {change.displayCitation}
                      </Link>
                      <LegalStatusBadge status={change.status} />
                    </span>
                    <span className="text-xs text-[var(--pnrr-muted)]">
                      {legalEventKindLabel(change.eventKind)}
                      {change.sourceAct !== null && (
                        <>
                          {' '}
                          <Trans>prin</Trans>{' '}
                          <Link
                            to="/legislation/acts/$actId"
                            params={{ actId: change.sourceAct.actId }}
                            className={cn(legislationLinkClassName, 'text-xs')}
                          >
                            {change.sourceAct.displayCitation}
                          </Link>
                        </>
                      )}
                      {' · '}
                      {change.effectiveDate === null ? (
                        <Trans>fără dată de intrare în vigoare</Trans>
                      ) : isFuture ? (
                        <span
                          className="font-semibold"
                          style={{ color: LEGISLATION_ACCENT }}
                        >
                          <Trans>
                            intră în vigoare la{' '}
                            {formatLegalDate(change.effectiveDate, i18n.locale)}
                          </Trans>
                        </span>
                      ) : (
                        <Trans>
                          cu efect de la{' '}
                          {formatLegalDate(change.effectiveDate, i18n.locale)}
                        </Trans>
                      )}
                      {' · '}
                      {legalEventSourceLabel(change.eventSource)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {(hasMore || loadMoreFailed) && feedQuery.isSuccess && (
          <div className="border-t border-[var(--pnrr-subtle)] px-5 py-4 sm:px-6">
            {loadMoreFailed && (
              <p className="mb-2 text-sm text-[var(--pnrr-muted)]">
                <Trans>Pagina următoare nu s-a încărcat.</Trans>
              </p>
            )}
            <button
              type="button"
              className={secondaryButtonClassName}
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? (
                <Trans>Se încarcă…</Trans>
              ) : (
                <Trans>Încarcă mai multe</Trans>
              )}
            </button>
          </div>
        )}
      </LegislationSection>
    </div>
  )
}
