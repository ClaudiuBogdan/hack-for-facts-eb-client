import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type {
  LegalActListItem,
  LegalActsBrowseFilter,
  LegalActsBrowseSearch,
  LegalActStatus,
} from '@/schemas/legal'
import { legalActStatusSchema, legalDomainSlugSchema } from '@/schemas/legal'
import { fetchLegalActsPage } from '../api/legal-acts-api'
import { resolveLegalActs } from '../api/legal-resolve-api'
import { LEGAL_DOMAIN_SLUGS, legalDomainLabel } from '../lib/legal-domains'
import { formatLegalNumber } from '../lib/legal-format'
import { legalActTypeLabel, legalStatusLabel } from '../lib/legal-vocabulary'
import {
  legislationLinkClassName,
  legislationRowClassName,
  legislationStatLabelClassName,
} from '../lib/legislation-theme'
import { LegalStatusBadge } from './legal-status-badge'
import { LegislationSection } from './legislation-section'

const PAGE_SIZE = 20
const LOOKUP_DEBOUNCE_MS = 250
const LOOKUP_MIN_LENGTH = 3
/** Mirrors the resolver's `limit` (legal-resolve-api) — a full page means "primele N", not a total. */
const LOOKUP_LIMIT = 8

/**
 * Form controls in the module's language: 2px near-black border, no radius —
 * `legislationFieldClassName` minus the flex sizing (these are compact
 * controls, not the hero search field).
 */
const controlClassName =
  'h-11 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-base text-[var(--pnrr-fg)] shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

const secondaryButtonClassName =
  'inline-flex h-11 items-center rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-5 text-sm font-semibold text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] disabled:opacity-50'

/** The common instruments, from the server's ACT_TYPE_VALUES vocabulary ('oug'/'og' are the DB values). */
const ACT_TYPE_OPTIONS = ['lege', 'oug', 'og', 'hotarare', 'ordin', 'decret', 'decizie'] as const

// Every schema status gets an <option> — a URL like ?status=necunoscut must
// not render a select that displays a different value than the list obeys.
const STATUS_OPTIONS: readonly LegalActStatus[] = legalActStatusSchema.options

type Props = {
  readonly filter: LegalActsBrowseSearch
}

/**
 * The acts directory (`/legislation/acts`) — ONE section: citation lookup as
 * the first filter, narrowing selects, the list, load more.
 *
 * The lookup FILTERS THE LIST IN PLACE (user decision — no overlay dropdown):
 * while a query is typed, the rows are the resolver's candidates, ambiguity
 * shown as multiple rows the user picks from; clearing the box returns to the
 * browse list. The narrowing selects apply to the BROWSE list only — the
 * resolver answers citations/aliases, not filtered scans — and are disabled
 * while a lookup query is active so nothing pretends otherwise.
 *
 * `status` defaults to `in-vigoare` — law in force is what people come for —
 * and "toate" is an explicit URL value, never a silent widening. Cursor-only
 * paging ("încarcă mai multe", never numbered pages: 223k acts), accumulated
 * in memory; filters live in the URL so a filtered view is a shareable link.
 * The count line is honest: a null totalCount says "cel puțin N", never a
 * number the server did not assert.
 */
export function LegislationActsDirectory({ filter }: Props) {
  const { i18n } = useLingui()
  const navigate = useNavigate()
  const [extraPages, setExtraPages] = useState<readonly LegalActListItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreFailed, setLoadMoreFailed] = useState(false)

  const [lookup, setLookup] = useState('')
  const [debouncedLookup, setDebouncedLookup] = useState('')
  useEffect(() => {
    const handle = window.setTimeout(
      () => setDebouncedLookup(lookup.trim()),
      LOOKUP_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(handle)
  }, [lookup])
  // Which pane shows follows the RAW input — switching on the debounced value
  // would leave the browse list (or a previous query's candidates) on screen
  // for the debounce window after typing or clearing.
  const lookupActive = lookup.trim().length >= LOOKUP_MIN_LENGTH
  // Hits are only trusted once the debounce settled on the current input;
  // until then the lookup pane shows its loading state, never query A's rows
  // under query B's box.
  const lookupSettled = debouncedLookup === lookup.trim()

  // URL absent → the in-force default; 'toate' → no status filter.
  const statusChoice: LegalActStatus | 'toate' = filter.status ?? 'in-vigoare'
  const queryFilter: LegalActsBrowseFilter = {
    ...(filter.actType !== undefined && { actType: filter.actType }),
    ...(filter.year !== undefined && { year: filter.year }),
    ...(filter.domain !== undefined && { domain: filter.domain }),
    ...(statusChoice !== 'toate' && { status: statusChoice }),
  }

  // The accumulated pages belong to ONE filter. The URL can change without
  // `setFilter` (back/forward, the tab's bare link, a domain tile) — keying
  // the reset on the filter itself, not on the setter, covers every path;
  // otherwise stale rows and a stale cursor (whose fhash the server rejects)
  // survive under the new filter's count line.
  const queryFilterKey = JSON.stringify(queryFilter)
  const queryFilterKeyRef = useRef(queryFilterKey)
  useEffect(() => {
    queryFilterKeyRef.current = queryFilterKey
    setExtraPages([])
    setCursor(null)
    setLoadMoreFailed(false)
  }, [queryFilterKey])

  const firstPage = useQuery({
    queryKey: ['legal', 'acts-directory', queryFilter],
    queryFn: ({ signal }) => fetchLegalActsPage(queryFilter, { first: PAGE_SIZE, signal }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !lookupActive,
  })

  const hitsQuery = useQuery({
    queryKey: ['legal', 'resolve', debouncedLookup],
    queryFn: ({ signal }) => resolveLegalActs(debouncedLookup, { signal }),
    enabled: lookupActive && lookupSettled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const hits = lookupSettled ? (hitsQuery.data ?? []) : []
  const hitsSettled = lookupSettled && hitsQuery.isSuccess

  const setFilter = (next: LegalActsBrowseSearch) => {
    // Paging state resets in the effect above, keyed on the filter itself.
    void navigate({ to: '/legislation/acts', search: next, replace: true })
  }

  const loadMore = () => {
    const after = cursor ?? firstPage.data?.endCursor ?? null
    if (after === null) return
    // An in-flight page belongs to the filter it was requested under — if the
    // URL moved on meanwhile, its rows must not repopulate the fresh state.
    const requestKey = queryFilterKey
    setLoadingMore(true)
    setLoadMoreFailed(false)
    fetchLegalActsPage(queryFilter, { first: PAGE_SIZE, after })
      .then((page) => {
        if (queryFilterKeyRef.current !== requestKey) return
        setExtraPages((prev) => [...prev, ...page.items])
        setCursor(page.endCursor)
      })
      .catch(() => {
        if (queryFilterKeyRef.current === requestKey) setLoadMoreFailed(true)
      })
      .finally(() => setLoadingMore(false))
  }

  const items = [...(firstPage.data?.items ?? []), ...extraPages]
  const totalCount = firstPage.data?.totalCount ?? null
  const hasMore = (cursor ?? firstPage.data?.endCursor ?? null) !== null
  const hasActiveFilters =
    filter.actType !== undefined ||
    filter.year !== undefined ||
    filter.domain !== undefined ||
    statusChoice !== 'in-vigoare'

  const countLine = lookupActive
    ? hitsSettled
      ? hits.length >= LOOKUP_LIMIT
        ? t`primele ${formatLegalNumber(hits.length, i18n.locale)} potriviri pentru „${debouncedLookup}”`
        : t`${formatLegalNumber(hits.length, i18n.locale)} potriviri pentru „${debouncedLookup}”`
      : undefined
    : firstPage.isSuccess
      ? totalCount !== null
        ? t`${formatLegalNumber(totalCount, i18n.locale)} acte, ordonate după cât de citate sunt`
        : t`cel puțin ${formatLegalNumber(items.length, i18n.locale)} acte, ordonate după cât de citate sunt`
      : undefined

  return (
    <LegislationSection
      id="acts-directory-heading"
      title={t`Directorul actelor`}
      {...(countLine !== undefined && { description: countLine })}
      bodyClassName="p-0"
      {...(!lookupActive && {
        // True only of the selects — the lookup lives in the box, not the
        // URL, so the claim hides while a lookup is active.
        footnote: (
          <Trans>
            Filtrele se păstrează în adresă — o vedere filtrată este un link pe
            care îl poți trimite.
          </Trans>
        ),
      })}
    >
      <form
        aria-label={t`Filtre`}
        className="flex flex-wrap items-end gap-x-5 gap-y-4 border-b border-[var(--pnrr-subtle)] px-5 py-4 sm:px-6"
        onSubmit={(event) => event.preventDefault()}
      >
        {/* The deterministic path first: typing filters the list itself. */}
        <label className="flex min-w-[16rem] flex-1 basis-full flex-col gap-1.5 sm:basis-[24rem]">
          <span className={legislationStatLabelClassName}>
            <Trans>Citare sau nume uzual</Trans>
          </span>
          <input
            type="search"
            className={cn(controlClassName, 'h-12 w-full')}
            placeholder={t`ex. Legea 227/2015 sau codul fiscal`}
            value={lookup}
            autoComplete="off"
            onChange={(event) => setLookup(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={legislationStatLabelClassName}>
            <Trans>Tip act</Trans>
          </span>
          <select
            className={cn(controlClassName, 'min-w-[11rem]')}
            value={filter.actType ?? ''}
            disabled={lookupActive}
            aria-describedby={lookupActive ? 'acts-lookup-hint' : undefined}
            onChange={(event) =>
              setFilter({
                ...filter,
                actType: event.target.value === '' ? undefined : event.target.value,
              })
            }
          >
            <option value="">{t`toate`}</option>
            {ACT_TYPE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {legalActTypeLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={legislationStatLabelClassName}>
            <Trans>Anul</Trans>
          </span>
          <input
            type="number"
            inputMode="numeric"
            className={cn(controlClassName, 'w-32')}
            min={1864}
            max={new Date().getFullYear()}
            value={filter.year ?? ''}
            disabled={lookupActive}
            aria-describedby={lookupActive ? 'acts-lookup-hint' : undefined}
            onChange={(event) => {
              const value = event.target.value
              const year = value === '' ? undefined : Number.parseInt(value, 10)
              setFilter({
                ...filter,
                year: year !== undefined && Number.isFinite(year) ? year : undefined,
              })
            }}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={legislationStatLabelClassName}>
            <Trans>Statut</Trans>
          </span>
          <select
            className={cn(controlClassName, 'min-w-[11rem]')}
            value={statusChoice}
            disabled={lookupActive}
            aria-describedby={lookupActive ? 'acts-lookup-hint' : undefined}
            onChange={(event) => {
              const value = event.target.value
              const parsed = legalActStatusSchema.safeParse(value)
              setFilter({
                ...filter,
                status: value === 'toate' ? 'toate' : parsed.success ? parsed.data : undefined,
              })
            }}
          >
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {legalStatusLabel(value)}
              </option>
            ))}
            <option value="toate">{t`toate statuturile`}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={legislationStatLabelClassName}>
            <Trans>Domeniu</Trans>
          </span>
          <select
            className={cn(controlClassName, 'min-w-[13rem]')}
            value={filter.domain ?? ''}
            disabled={lookupActive}
            aria-describedby={lookupActive ? 'acts-lookup-hint' : undefined}
            onChange={(event) => {
              const parsed = legalDomainSlugSchema.safeParse(event.target.value)
              setFilter({ ...filter, domain: parsed.success ? parsed.data : undefined })
            }}
          >
            <option value="">{t`toate`}</option>
            {LEGAL_DOMAIN_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {legalDomainLabel(slug)}
              </option>
            ))}
          </select>
        </label>

        {hasActiveFilters && !lookupActive && (
          <button
            type="button"
            className={cn(legislationLinkClassName, 'h-11')}
            onClick={() => setFilter({})}
          >
            <Trans>Șterge filtrele</Trans>
          </button>
        )}

        {lookupActive && (
          <p
            id="acts-lookup-hint"
            className="basis-full text-xs text-[var(--pnrr-muted)]"
          >
            <Trans>
              Filtrele de mai sus nu se aplică la căutarea de citări — șterge
              căutarea pentru a reveni la listă.
            </Trans>
          </p>
        )}
      </form>

      {lookupActive ? (
        <LookupResults
          hits={hits}
          isLoading={!lookupSettled || hitsQuery.isLoading}
          isError={lookupSettled && hitsQuery.isError}
          isSuccess={hitsSettled}
        />
      ) : (
        <>
          {firstPage.isLoading && (
            <p className="px-5 py-6 text-[var(--pnrr-muted)] sm:px-6">
              <Trans>Se încarcă actele…</Trans>
            </p>
          )}
          {firstPage.isError && (
            <div className="px-5 py-6 sm:px-6">
              <p className="text-sm text-[var(--pnrr-fg)]">
                <Trans>Nu am putut încărca directorul de acte.</Trans>
              </p>
              <button
                type="button"
                className={cn(secondaryButtonClassName, 'mt-3')}
                onClick={() => void firstPage.refetch()}
              >
                <Trans>Încearcă din nou</Trans>
              </button>
            </div>
          )}

          {firstPage.isSuccess && items.length === 0 && (
            <p className="px-5 py-6 text-sm text-[var(--pnrr-muted)] sm:px-6">
              <Trans>Niciun act nu corespunde filtrelor.</Trans>
            </p>
          )}

          {firstPage.isSuccess && items.length > 0 && (
            <ul aria-label={t`Acte`}>
              {items.map((act) => (
                <li key={act.actId}>
                  <Link
                    to="/legislation/acts/$actId"
                    params={{ actId: act.actId }}
                    className={legislationRowClassName}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-base font-semibold text-[var(--pnrr-fg)]">
                        {act.displayCitation}
                      </span>
                      <span className="text-xs text-[var(--pnrr-muted)]">
                        {legalActTypeLabel(act.actType)}
                        {act.actYear !== null ? ` · ${act.actYear}` : ''}
                        {' · '}
                        <Trans>
                          citat de {formatLegalNumber(act.inDegree, i18n.locale)} ori
                        </Trans>
                      </span>
                    </span>
                    <LegalStatusBadge status={act.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {(hasMore || loadMoreFailed) && firstPage.isSuccess && (
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
                {loadingMore ? <Trans>Se încarcă…</Trans> : <Trans>Încarcă mai multe</Trans>}
              </button>
            </div>
          )}
        </>
      )}
    </LegislationSection>
  )
}

/**
 * Resolver candidates rendered as LIST ROWS — ambiguity is the feature:
 * 'codul fiscal' shows its two acts and the user picks; nothing is silently
 * first-picked. Zero hits get a format hint, not an empty box.
 */
function LookupResults({
  hits,
  isLoading,
  isError,
  isSuccess,
}: {
  readonly hits: readonly {
    readonly value: string
    readonly label: string
    readonly hint: string | null
  }[]
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isSuccess: boolean
}) {
  // `role="status"` on every state: the visible list swaps under a focus that
  // stays in the search box, so the change must announce itself.
  if (isLoading) {
    return (
      <p role="status" className="px-5 py-6 text-[var(--pnrr-muted)] sm:px-6">
        <Trans>Se caută…</Trans>
      </p>
    )
  }
  if (isError) {
    return (
      <p role="status" className="px-5 py-6 text-sm text-[var(--pnrr-muted)] sm:px-6">
        <Trans>Căutarea nu a răspuns — încearcă din nou.</Trans>
      </p>
    )
  }
  if (isSuccess && hits.length === 0) {
    return (
      <p role="status" className="px-5 py-6 text-sm text-[var(--pnrr-muted)] sm:px-6">
        <Trans>Niciun act găsit — încearcă numărul și anul (ex. 227/2015).</Trans>
      </p>
    )
  }
  return (
    <>
      <p role="status" className="sr-only">
        <Trans>{hits.length} acte găsite</Trans>
      </p>
      <ul aria-label={t`Acte găsite`}>
      {hits.map((hit) => {
        const parsedStatus = legalActStatusSchema.safeParse(hit.hint)
        return (
          <li key={`${hit.value}-${hit.label}`}>
            <Link
              to="/legislation/acts/$actId"
              params={{ actId: hit.value }}
              className={legislationRowClassName}
            >
              <span className="min-w-0 flex-1 truncate text-base font-semibold text-[var(--pnrr-fg)]">
                {hit.label}
              </span>
              {parsedStatus.success ? (
                <LegalStatusBadge status={parsedStatus.data} />
              ) : hit.hint !== null ? (
                <span className="shrink-0 text-xs text-[var(--pnrr-muted)]">{hit.hint}</span>
              ) : null}
            </Link>
          </li>
        )
      })}
      </ul>
    </>
  )
}
