import { plural } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/utils'
import type { JudicialCompanyLitigation } from '@/schemas/judicial'
import { useCompanyLitigationCases } from '../hooks/use-company-litigation'
import { companyLitigationModel } from '../lib/company-litigation-model'
import { formatJudicialDate } from '../lib/judicial-format'
import { caseCategoryLabel, courtLevelLabel, courtName } from '../lib/judicial-labels'

const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5'

/**
 * A company's court cases as the judicial API publishes them: only the cases
 * in which a party's name was matched to the company's CUI through a published
 * match. The count is a floor — the company can be a party to cases no match
 * reaches yet — and no party is named: the API names none. Its breakdowns say
 * what they leave out (undated cases, cases at an unplaced court).
 */
export function CompanyLitigationSummary({ litigation, className }: { readonly litigation: JudicialCompanyLitigation; readonly className?: string }) {
  const model = companyLitigationModel(litigation, new Date().getUTCFullYear())
  const { span, undated, levels, unplaced } = model
  return (
    <div className={className}>
      <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {plural(model.caseCount, {
          one: `Cel puțin # dosar`,
          few: `Cel puțin # dosare`,
          other: `Cel puțin # de dosare`,
        })}
      </p>
      {span !== null || undated > 0 ? (
        <p className="mt-1 text-sm tabular-nums text-muted-foreground">
          {span === null ? null : span.first === span.last ? <Trans>În {span.first}</Trans> : <Trans>Din {span.first} până în {span.last}</Trans>}
          {span !== null && undated > 0 ? ' · ' : null}
          {undated > 0 ? <Trans>{formatNumber(undated)} fără dată</Trans> : null}
        </p>
      ) : null}
      {levels.length > 0 || unplaced > 0 ? (
        <ul className="mt-6 divide-y divide-border/70 border-y border-border/70 text-sm">
          {levels.map((entry) => (
            <li key={entry.level} className="flex items-baseline justify-between gap-4 py-2">
              <span>{courtLevelLabel(entry.level)}</span>
              <span className="tabular-nums text-foreground">{formatNumber(entry.count)}</span>
            </li>
          ))}
          {unplaced > 0 ? (
            <li className="flex items-baseline justify-between gap-4 py-2 text-muted-foreground">
              <span>
                <Trans>La o instanță necunoscută</Trans>
              </span>
              <span className="tabular-nums">{formatNumber(unplaced)}</span>
            </li>
          ) : null}
        </ul>
      ) : null}
      <p className="mt-4 text-sm text-muted-foreground">
        <Trans>
          Numărăm doar dosarele în care numele unei părți a fost potrivit cu CUI-ul firmei printr-o potrivire publicată. Firma poate fi parte
          și în alte dosare. Persoanele din dosare nu sunt numite.
        </Trans>
      </p>
    </div>
  )
}

/** The company's published cases, a page at a time in the API's order (by case id, not by date). */
export function CompanyLitigationCases({ cui, className }: { readonly cui: string; readonly className?: string }) {
  const query = useCompanyLitigationCases(cui, true)
  const cases = query.data?.pages.flatMap((page) => page.cases) ?? []
  const retry = (
    <Button variant="link" className="h-auto p-0" onClick={() => void query.refetch()}>
      <Trans>Încearcă din nou</Trans>
    </Button>
  )

  return (
    <div className={className}>
      <MonoLabel className="block text-muted-foreground">
        <Trans>Dosarele publicate</Trans>
      </MonoLabel>
      {query.isPending ? (
        <div className="mt-4 space-y-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : query.isError && cases.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          <Trans>Dosarele nu au putut fi citite.</Trans> {retry}
        </p>
      ) : cases.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          <Trans>Lista dosarelor nu a întors niciun dosar, deși sumarul numără dosare.</Trans>
        </p>
      ) : (
        <>
          <div className={`${ROW_GRID} mt-4 border-b border-border/70 pb-1.5`} aria-hidden="true">
            <MonoLabel className="text-muted-foreground">
              <Trans>Instanța · materia</Trans>
            </MonoLabel>
            <MonoLabel className="text-right text-muted-foreground">
              <Trans>Dosarul · data din sursă</Trans>
            </MonoLabel>
          </div>
          <ul className="divide-y divide-border/70 border-b border-border/70">
            {cases.map((item) => (
              <li key={item.caseId} className={`${ROW_GRID} py-2.5 text-sm`}>
                <span className="min-w-0 truncate text-foreground">{courtName(item.institutionCode)}</span>
                <span className="text-right font-mono text-xs tabular-nums text-foreground">{item.caseNumber}</span>
                <span className="min-w-0 truncate text-muted-foreground">{caseCategoryLabel(item.category) ?? <Trans>Materie nedeclarată</Trans>}</span>
                <span className="text-right text-xs tabular-nums text-muted-foreground">
                  {formatJudicialDate(item.sourceOpenedAt) ?? <Trans>fără dată</Trans>}
                </span>
              </li>
            ))}
          </ul>
          {query.isFetchNextPageError ? (
            <p className="mt-4 text-sm text-muted-foreground">
              <Trans>Următoarele dosare nu au putut fi citite.</Trans>{' '}
              <Button variant="link" className="h-auto p-0" onClick={() => void query.fetchNextPage()}>
                <Trans>Încearcă din nou</Trans>
              </Button>
            </p>
          ) : query.hasNextPage ? (
            <Button variant="outline" size="sm" className="mt-4" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
              <Trans>Mai multe dosare</Trans>
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
