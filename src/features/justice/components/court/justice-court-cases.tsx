import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { caseRowOf, type CourtCaseRow, type CourtSheet } from '../../lib/court-model'
import { formatJudicialDate } from '../../lib/judicial-format'
import { caseCategoryLabel } from '../../lib/judicial-labels'
import { useJusticeCourtMoreCases } from '../../hooks/use-justice-court'

const ROW = 'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 px-1 py-2.5 text-sm'

/**
 * The court's cases, the newest modification on the portal first, a page at
 * a time: the API counts no total, so the list says none. Each opens its case.
 * What a case is about stays on its own page.
 */
export function JusticeCourtCases({ sheet }: { readonly sheet: CourtSheet }) {
  const [more, setMore] = useState(false)
  const query = useJusticeCourtMoreCases(sheet.code, sheet.cases.endCursor, more)
  const extra = query.data?.pages.flatMap((page) => page.rows.map(caseRowOf)) ?? []
  const rows: readonly CourtCaseRow[] = [...sheet.cases.rows, ...extra]
  const hasMore = more ? (query.hasNextPage ?? false) : sheet.cases.hasNextPage
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        <Trans>Portalul nu are niciun dosar al acestei instanțe.</Trans>
      </p>
    )
  }
  return (
    <div>
      <div className={`${ROW} border-b border-border/70 pb-1.5`} aria-hidden="true">
        <MonoLabel className="text-muted-foreground">
          <Trans>Dosarul · materia · etapa</Trans>
        </MonoLabel>
        <MonoLabel className="text-right text-muted-foreground">
          {sheet.level === 'inalta_curte' ? <Trans>Data din arhivă</Trans> : <Trans>Data din portal</Trans>}
        </MonoLabel>
      </div>
      <ul className="divide-y divide-border/70 border-b border-border/70">
        {rows.map((row) => (
          <li key={row.caseId}>
            <Link
              to="/justice/cases/$code/$"
              params={{ code: row.institutionCode, _splat: row.caseNumber }}
              className={`${ROW} transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none`}
            >
              <span className="min-w-0 truncate font-mono text-sm tabular-nums text-foreground">{row.caseNumber}</span>
              <span className="text-right text-xs tabular-nums text-muted-foreground">{formatJudicialDate(row.sourceOpenedAt) ?? <Trans>fără dată</Trans>}</span>
              <span className="col-span-2 min-w-0 truncate text-muted-foreground">
                {[caseCategoryLabel(row.category), row.stageName].filter(Boolean).join(' · ')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {more && query.isFetching && !query.isFetchingNextPage ? <Skeleton className="mt-2 h-10 w-full" /> : null}
      {query.isError ? (
        <p className="mt-4 text-sm text-muted-foreground" role="alert">
          <Trans>Următoarele dosare nu au putut fi citite.</Trans>{' '}
          <Button variant="link" className="h-auto p-0" onClick={() => void (extra.length === 0 ? query.refetch() : query.fetchNextPage())}>
            <Trans>Încearcă din nou</Trans>
          </Button>
        </p>
      ) : hasMore ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          disabled={query.isFetching}
          onClick={() => (more ? void query.fetchNextPage() : setMore(true))}
        >
          <Trans>Mai multe dosare</Trans>
        </Button>
      ) : null}
    </div>
  )
}
