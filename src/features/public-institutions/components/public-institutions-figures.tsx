import { useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { cn, formatNumber } from '@/lib/utils'
import { figuresQueryOptions, largestQueryOptions } from '../api/public-institutions-queries'
import { changeOf, figuresRead, largestRead } from '../lib/public-institutions-selection'
import type { PublicInstitutionsState } from '../hooks/use-public-institutions-page'
import { percentText } from '../lib/public-institutions-format'
import { BREAKDOWN_ID, jumpTo, partsOf, RANKING_ID } from '../lib/public-institutions-anchors'

/** The selection in a line, and the two parts of the answer to jump between. */
export function PublicInstitutionsBar({ page }: { readonly page: PublicInstitutionsState }) {
  return (
    <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
      <RuledFrame className="flex min-h-11 items-center justify-between gap-6">
        <p className="hidden min-w-0 truncate text-sm font-semibold text-foreground md:block">{page.sentence}</p>
        <nav aria-label={t`Părțile paginii`} className="ml-auto flex shrink-0 items-center gap-5 text-sm">
          <button type="button" onClick={() => jumpTo(RANKING_ID)} className="min-h-11 text-muted-foreground hover:text-foreground">
            {t`Clasament`}
          </button>
          <button type="button" onClick={() => jumpTo(BREAKDOWN_ID)} className="min-h-11 text-muted-foreground hover:text-foreground">
            <span className="sm:hidden">{t`Structură`}</span>
            <span className="hidden sm:inline">{page.income ? t`De unde vin banii` : t`Pe ce se cheltuie`}</span>
          </button>
        </nav>
      </RuledFrame>
    </div>
  )
}

type FigureCell = { readonly key: string; readonly value: string | null; readonly unit?: string | null; readonly exact?: string; readonly label: string; readonly detail?: string }

/**
 * The selection's own figures, which the table's pages cannot add up: its
 * amount (from one series over the year and the one before), the change on
 * the year before (only for a whole year), how many institutions, and the
 * ten largest's share. None for a period that is not one year, or for a
 * measure the head does not offer.
 */
export function PublicInstitutionsFigures({ page }: { readonly page: PublicInstitutionsState }) {
  const { selection, perCapita, locale, coverage } = page
  const series = useQuery(figuresQueryOptions(selection))
  const largest = useQuery(largestQueryOptions(selection))
  const ownLargestRead = largestRead(selection) != null
  const year = selection.year
  if (figuresRead(selection) == null || year == null) return null

  const valueOf = (id: string, at: number) => series.data?.find((one) => one.seriesId === id)?.data.find((point) => Number(point.x) === at)?.y
  const measure = perCapita ? 'per-capita' : 'total'
  const current = valueOf(measure, year)
  const total = valueOf('total', year)
  const pending = series.isPending
  const amount = (key: string, value: number | undefined, label: string): FigureCell => {
    if (pending) return { key, value: null, label }
    if (value == null) return { key, value: '—', label }
    const parts = partsOf(value, { currency: page.currency, locale })
    return { key, value: parts.digits, unit: parts.scale, exact: parts.exact, label }
  }
  const change = (): FigureCell => {
    const label = t`Față de ${year - 1}`
    if (coverage?.status === 'partial') return { key: 'change', value: '—', label, detail: t`anul ${year} e în curs` }
    if (pending || coverage?.status === 'pending') return { key: 'change', value: null, label }
    const ratio = coverage?.status === 'complete' ? changeOf(current, valueOf(measure, year - 1)) : null
    return { key: 'change', value: ratio == null ? '—' : percentText(ratio, locale, true), label }
  }
  // The ten largest (or, in a selection of ten or fewer, the largest one): the ranking's own page when it is them, else their own read.
  const count = page.ranking.data?.pageInfo.totalCount
  const many = (count ?? 0) > 10
  const largestRows = ownLargestRead ? (largest.data?.nodes ?? null) : (page.ranking.data?.nodes.slice(0, 10) ?? null)
  const counted = largestRows ? largestRows.slice(0, many ? 10 : 1) : null
  const topShare = total && counted && counted.length > 0 ? counted.reduce((sum, row) => sum + row.total_amount, 0) / total : null
  // A read that failed says so with a dash; only a read still on its way shows a placeholder.
  const largestFailed = (ownLargestRead && largest.isError) || page.ranking.isError
  const countCell: FigureCell = { key: 'count', value: count != null ? formatNumber(count) : page.ranking.isError ? '—' : null, label: t`Instituții` }
  const cells: readonly FigureCell[] = [
    perCapita ? amount('measure', current, t`Pe locuitor, toată selecția`) : amount('measure', total, page.income ? t`Venituri` : t`Cheltuieli`),
    change(),
    countCell,
    perCapita
      ? amount('total', total, t`Total`)
      : {
          key: 'top',
          value: largestFailed ? '—' : pending || largestRows == null || count == null ? null : topShare == null ? '—' : percentText(topShare, locale),
          label: many ? t`Primele 10 instituții` : t`Cea mai mare instituție`,
          detail: t`din total`,
        },
  ]
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        {series.isError ? (
          <p role="alert" className="py-6 text-sm text-muted-foreground">
            {t`Cifrele selecției nu au putut fi citite.`}{' '}
            <button type="button" onClick={() => void series.refetch()} className="font-medium text-foreground underline underline-offset-4">
              {t`Încearcă din nou`}
            </button>
          </p>
        ) : (
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {cells.map((cell, index) => (
              <div key={cell.key} className={cn('flex flex-col px-4 py-5 sm:px-5 sm:py-7', index % 2 === 1 && 'border-l', index >= 2 && 'border-t lg:border-t-0', index >= 1 && 'lg:border-l')}>
                <dt className="order-2 mt-2">
                  <MonoLabel className="block leading-relaxed text-foreground">{cell.label}</MonoLabel>
                  {/* Room for a note on every figure, so the band keeps its height as notes come and go. */}
                  <span className={cn('mt-1 block text-xs text-muted-foreground', !cell.detail && 'invisible')} aria-hidden={cell.detail ? undefined : 'true'}>
                    {cell.detail ?? '·'}
                  </span>
                </dt>
                <dd className="order-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl" title={cell.exact}>
                  {cell.value === null ? (
                    <span className="inline-block h-8 w-24 animate-pulse rounded-sm bg-muted align-middle sm:h-9 sm:w-28" />
                  ) : (
                    <span aria-hidden={cell.exact ? 'true' : undefined}>{cell.value}</span>
                  )}
                  {cell.unit && cell.value !== null ? (
                    <span className="ml-1.5 text-sm font-medium tracking-normal text-muted-foreground sm:text-xl" aria-hidden="true">
                      {cell.unit}
                    </span>
                  ) : null}
                  {cell.exact ? <span className="sr-only">{cell.exact}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </RuledFrame>
    </section>
  )
}
