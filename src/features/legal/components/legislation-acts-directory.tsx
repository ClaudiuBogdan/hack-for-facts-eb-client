import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { LegalActListItem, LegalActsBrowseFilter, LegalActStatus } from '@/schemas/legal'
import { legalActStatusSchema } from '@/schemas/legal'
import { fetchLegalActsPage } from '../api/legal-acts-api'
import { formatLegalNumber } from '../lib/legal-format'
import { legalActTypeLabel } from '../lib/legal-vocabulary'
import { LegalCitationLookup } from './legal-citation-lookup'
import { LegalStatusBadge } from './legal-status-badge'

const PAGE_SIZE = 20

/** The common instruments, curated; the full ~30-value vocabulary stays reachable by clearing the filter. */
const ACT_TYPE_OPTIONS = [
  'lege',
  'ordonanta-de-urgenta',
  'ordonanta',
  'hotarare',
  'ordin',
  'decret',
  'decizie',
] as const

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

  return (
    <section aria-label={t`Directorul actelor`} className="flex flex-col gap-6">
      <LegalCitationLookup className="max-w-md" />

      <form
        aria-label={t`Filtre`}
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="flex flex-col gap-1 text-sm">
          <Trans>Tip act</Trans>
          <select
            className="h-9 rounded-md border bg-background px-2"
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

        <label className="flex flex-col gap-1 text-sm">
          <Trans>Anul</Trans>
          <Input
            type="number"
            inputMode="numeric"
            className="w-28"
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

        <label className="flex flex-col gap-1 text-sm">
          <Trans>Statut</Trans>
          <select
            className="h-9 rounded-md border bg-background px-2"
            value={filter.status ?? ''}
            onChange={(event) => {
              const parsed = legalActStatusSchema.safeParse(event.target.value)
              setFilter({ ...filter, status: parsed.success ? parsed.data : undefined })
            }}
          >
            <option value="">{t`toate`}</option>
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        {(filter.actType !== undefined ||
          filter.year !== undefined ||
          filter.status !== undefined) && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setFilter({})}>
            <Trans>Șterge filtrele</Trans>
          </Button>
        )}
      </form>

      {firstPage.isLoading && (
        <p className="text-muted-foreground">
          <Trans>Se încarcă actele…</Trans>
        </p>
      )}
      {firstPage.isError && (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p>
            <Trans>Nu am putut încărca directorul de acte.</Trans>
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void firstPage.refetch()}
          >
            <Trans>Încearcă din nou</Trans>
          </Button>
        </div>
      )}

      {firstPage.isSuccess && (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {totalCount !== null ? (
              <Trans>
                {formatLegalNumber(totalCount, i18n.locale)} acte — ordonate după
                cât de citate sunt.
              </Trans>
            ) : (
              <Trans>
                cel puțin {formatLegalNumber(items.length, i18n.locale)} acte —
                ordonate după cât de citate sunt.
              </Trans>
            )}
          </p>

          {items.length === 0 ? (
            <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              <Trans>Niciun act nu corespunde filtrelor.</Trans>
            </p>
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border">
              {items.map((act) => (
                <li key={act.actId} className="flex flex-col gap-1 px-4 py-3">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/legislation/acts/$actId"
                      params={{ actId: act.actId }}
                      className="text-base font-semibold underline underline-offset-2"
                    >
                      {act.displayCitation}
                    </Link>
                    <LegalStatusBadge status={act.status} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {legalActTypeLabel(act.actType)}
                    {act.actYear !== null ? ` · ${act.actYear}` : ''}
                    {' · '}
                    <Trans>
                      citat de {formatLegalNumber(act.inDegree, i18n.locale)} ori
                    </Trans>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {loadMoreFailed && (
            <p className="text-sm text-muted-foreground">
              <Trans>Pagina următoare nu s-a încărcat.</Trans>
            </p>
          )}
          {hasMore && (
            <Button
              variant="outline"
              className="self-start"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? <Trans>Se încarcă…</Trans> : <Trans>Încarcă mai multe</Trans>}
            </Button>
          )}
        </>
      )}
    </section>
  )
}
