import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type { LegalActListItem, LegalActsBrowseFilter, LegalActStatus } from '@/schemas/legal'
import { legalActStatusSchema, legalDomainSlugSchema } from '@/schemas/legal'
import { fetchLegalActsPage } from '../api/legal-acts-api'
import { LEGAL_DOMAIN_SLUGS, legalDomainLabel } from '../lib/legal-domains'
import { formatLegalNumber } from '../lib/legal-format'
import { legalActTypeLabel, legalStatusLabel } from '../lib/legal-vocabulary'
import {
  legislationLinkClassName,
  legislationRowClassName,
  legislationStatLabelClassName,
} from '../lib/legislation-theme'
import { LegalCitationLookup } from './legal-citation-lookup'
import { LegalStatusBadge } from './legal-status-badge'
import { LegislationSection } from './legislation-section'

const PAGE_SIZE = 20

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

const STATUS_OPTIONS: readonly LegalActStatus[] = [
  'in-vigoare',
  'modificat',
  'abrogat',
  'abrogat-partial',
  'suspendat',
]

type Props = {
  readonly filter: LegalActsBrowseFilter
}

/**
 * The acts directory (`/legislation/acts`) — filter, list, load more.
 *
 * Cursor-only paging ("încarcă mai multe", never numbered pages: 223k acts),
 * accumulated in memory; filters live in the URL so a filtered view is a
 * shareable link. The count line is honest: a null totalCount says "cel
 * puțin N", never a number the server did not assert.
 */
export function LegislationActsDirectory({ filter }: Props) {
  const { i18n } = useLingui()
  const navigate = useNavigate()
  const [extraPages, setExtraPages] = useState<readonly LegalActListItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreFailed, setLoadMoreFailed] = useState(false)

  const firstPage = useQuery({
    queryKey: ['legal', 'acts-directory', filter],
    queryFn: ({ signal }) => fetchLegalActsPage(filter, { first: PAGE_SIZE, signal }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const setFilter = (next: LegalActsBrowseFilter) => {
    setExtraPages([])
    setCursor(null)
    setLoadMoreFailed(false)
    void navigate({ to: '/legislation/acts', search: next, replace: true })
  }

  const loadMore = () => {
    const after = cursor ?? firstPage.data?.endCursor ?? null
    if (after === null) return
    setLoadingMore(true)
    setLoadMoreFailed(false)
    fetchLegalActsPage(filter, { first: PAGE_SIZE, after })
      .then((page) => {
        setExtraPages((prev) => [...prev, ...page.items])
        setCursor(page.endCursor)
      })
      .catch(() => setLoadMoreFailed(true))
      .finally(() => setLoadingMore(false))
  }

  const items = [...(firstPage.data?.items ?? []), ...extraPages]
  const totalCount = firstPage.data?.totalCount ?? null
  const hasMore = (cursor ?? firstPage.data?.endCursor ?? null) !== null
  const hasActiveFilters =
    filter.actType !== undefined ||
    filter.year !== undefined ||
    filter.status !== undefined ||
    filter.domain !== undefined

  const countLine = firstPage.isSuccess
    ? totalCount !== null
      ? t`${formatLegalNumber(totalCount, i18n.locale)} acte, ordonate după cât de citate sunt`
      : t`cel puțin ${formatLegalNumber(items.length, i18n.locale)} acte, ordonate după cât de citate sunt`
    : undefined

  return (
    <div className="flex flex-col gap-8">
      <LegislationSection
        id="acts-lookup-heading"
        title={t`Sari direct la un act`}
        description={t`O citare exactă sau un nume uzual duce direct la fișa actului.`}
      >
        <LegalCitationLookup className="max-w-xl" />
      </LegislationSection>

      <LegislationSection
        id="acts-directory-heading"
        title={t`Directorul actelor`}
        {...(countLine !== undefined && { description: countLine })}
        bodyClassName="p-0"
        footnote={
          <Trans>
            Filtrele se păstrează în adresă — o vedere filtrată este un link pe
            care îl poți trimite.
          </Trans>
        }
      >
        <form
          aria-label={t`Filtre`}
          className="flex flex-wrap items-end gap-x-5 gap-y-4 border-b border-[var(--pnrr-subtle)] px-5 py-4 sm:px-6"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="flex flex-col gap-1.5">
            <span className={legislationStatLabelClassName}>
              <Trans>Tip act</Trans>
            </span>
            <select
              className={cn(controlClassName, 'min-w-[11rem]')}
              value={filter.actType ?? ''}
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
              value={filter.status ?? ''}
              onChange={(event) => {
                const parsed = legalActStatusSchema.safeParse(event.target.value)
                setFilter({ ...filter, status: parsed.success ? parsed.data : undefined })
              }}
            >
              <option value="">{t`toate`}</option>
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {legalStatusLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={legislationStatLabelClassName}>
              <Trans>Domeniu</Trans>
            </span>
            <select
              className={cn(controlClassName, 'min-w-[13rem]')}
              value={filter.domain ?? ''}
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

          {hasActiveFilters && (
            <button
              type="button"
              className={cn(legislationLinkClassName, 'h-11')}
              onClick={() => setFilter({})}
            >
              <Trans>Șterge filtrele</Trans>
            </button>
          )}
        </form>

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
      </LegislationSection>
    </div>
  )
}
