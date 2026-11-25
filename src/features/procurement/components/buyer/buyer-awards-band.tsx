import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { HubLoadError, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { PROCUREMENT_BUYER_AWARD_MAX_PAGE, type ProcurementBuyerAwardOrder } from '@/schemas/procurement-buyer'
import { CaRecordsOffError, type BuyerContractAwardTotalsRequest } from '../../api/procurement-contract-award-api'
import { useBuyerContractAwards, useBuyerContractAwardTotals } from '../../hooks/use-procurement-contract-award'
import { caWindowOf, type BuyerContractAwards, type CaRecordRow, type CaServedText, type CaSort } from '../../lib/contract-award-model'
import { beforeFloorText, caAmountText, caKindText, caTotalText, winnersUnnamedText } from '../../lib/contract-award-text'
import type { BuyerProfile } from '../../lib/buyer-model'
import { categoryOfCode } from '../../lib/home-categories'
import { countText, dayText } from '../../lib/home-format'
import { periodYear } from '../../lib/profile-period'
import { periodText } from '../../lib/profile-period-text'
import { getUserLocale } from '@/lib/utils'
import { HomeBand } from '../home/home-chrome'
import { CaPartyName } from '../contract-award/contract-award-party'

/**
 * „Contractele atribuite" (PROC-KB0Z step 1): the buyer's contract awards in
 * the period, served from procurement v3 — how many, how many with a value,
 * how many under identity review — and one page of them, newest, oldest or
 * largest first. Read in the browser only (every answer is no-store at the
 * API), so the server render stays free of winner codes. The money is the
 * money build's, one figure per value kind and never added up (owner, 25
 * November 2026).
 */

const SORT_OF: Readonly<Record<ProcurementBuyerAwardOrder, CaSort>> = { noi: 'awardDayDesc', vechi: 'awardDayAsc', valoare: 'amountDesc' }

/** The deepest row a list reaches (the API's bound). */
const LIST_DEPTH = 10_000

/** Winners named on a row before „and N more winners" (not „firms": a withheld winner may be a person). */
const WINNERS_SHOWN = 3

export function BuyerAwardsBand({
  profile,
  index,
  order,
  page,
  onOrder,
  onPage,
}: {
  readonly profile: BuyerProfile
  readonly index: string
  readonly order: ProcurementBuyerAwardOrder
  readonly page: number
  readonly onOrder: (order: ProcurementBuyerAwardOrder) => void
  readonly onPage: (page: number) => void
}) {
  const published = caWindowOf(profile.period)
  const query = useBuyerContractAwards(published ? { cui: profile.identity.cui, from: published.from, to: published.to, sort: SORT_OF[order], page } : null)
  // A failed read shows nothing of an earlier answer: no rows, no counts, no notes.
  const data = query.isError ? undefined : query.data
  const period = periodText(profile.period)
  return (
    <HomeBand id="contracte" labelledBy="buyer-awards-title">
      <HubSectionHead
        titleId="buyer-awards-title"
        index={index}
        title={<Trans>Contractele atribuite</Trans>}
        lede={data && published ? awardsLede(data, period) : null}
        aside={
          published ? (
            <IndicatorToggle
              label={t`Ordine`}
              options={[
                { key: 'noi', label: t`Cele mai noi` },
                { key: 'vechi', label: t`Cele mai vechi` },
                { key: 'valoare', label: t`Cele mai mari` },
              ]}
              value={order}
              onChange={onOrder}
            />
          ) : undefined
        }
      />
      <div className="mt-8" data-reveal>
        {!published ? (
          <p className="border-y py-4 text-sm text-muted-foreground">{beforeFloorText()}</p>
        ) : query.error instanceof CaRecordsOffError ? (
          <p className="border-y py-4 text-sm text-muted-foreground">
            <Trans>Contractele atribuite nu sunt disponibile acum.</Trans>
          </p>
        ) : query.isError ? (
          // A failed read wins over rows kept from before it.
          <HubLoadError onRetry={() => void query.refetch()} />
        ) : !data ? (
          <HubPending rows={6} />
        ) : (
          <div>
            {/* The window's money, whatever page of the list is shown. */}
            <AwardsTotals request={{ cui: profile.identity.cui, from: published.from, to: published.to }} />
            {data.total === 0 && data.page === 1 ? (
              <p className="border-y py-4 text-sm text-muted-foreground">
                <Trans>Niciun contract atribuit în {period}.</Trans>
              </p>
            ) : data.rows.length === 0 ? (
              <p className="border-y py-4 text-sm text-muted-foreground">
                <Trans>Pagina aceasta nu are contracte.</Trans>{' '}
                <button type="button" onClick={() => onPage(1)} className="font-medium text-foreground underline underline-offset-4">
                  <Trans>Înapoi la prima pagină</Trans>
                </button>
              </p>
            ) : (
              <ol className="border-b">
                {data.rows.map((row) => (
                  <AwardRow key={row.recordId} row={row} year={periodYear(profile.period) ?? undefined} />
                ))}
              </ol>
            )}
            {/* A page past the list's end offers the first page instead. */}
            {data.rows.length > 0 ? <Pager data={data} onPage={onPage} /> : null}
          </div>
        )}
        <AwardsNotes data={data} clipped={published?.clipped ?? false} />
      </div>
    </HomeBand>
  )
}

/** „124 de contracte atribuite în 2024, 118 cu valoare publicată; 3 în verificare, cu valoarea în afara totalurilor." */
function awardsLede(data: BuyerContractAwards, period: string): string {
  const parts = [
    plural(data.recordCount, {
      one: `# contract atribuit în ${period}`,
      few: `# contracte atribuite în ${period}`,
      other: `# de contracte atribuite în ${period}`,
    }),
  ]
  if (data.recordCount > 0) {
    const valued = countText(data.valuedCount)
    parts.push(t`${valued} cu valoare publicată`)
  }
  const head = parts.join(', ')
  if (data.identityReviewCount === 0) return `${head}.`
  const review = countText(data.identityReviewCount)
  // Counted among the records; only their value stays out of any total (the API's `additive`).
  return `${head}; ${t`${review} în verificare, cu valoarea în afara totalurilor`}.`
}

function AwardRow({ row, year }: { readonly row: CaRecordRow; readonly year: number | undefined }) {
  const { i18n } = useLingui()
  const title = row.title ?? (row.cpvCode ? i18n._(categoryOfCode(row.cpvCode).label) : t`Contract atribuit`)
  const more = row.winners.length - WINNERS_SHOWN
  return (
    <li className="grid grid-cols-1 gap-1 border-t py-4 sm:grid-cols-12 sm:gap-6">
      <div className="min-w-0 sm:col-span-8">
        <Link
          to="/procurement/contract-awards/$id"
          params={{ id: row.recordId }}
          className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
        >
          {title}
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">
          {row.winners.length === 0 ? (
            t`Niciun câștigător publicat`
          ) : (
            <>
              {row.winners.slice(0, WINNERS_SHOWN).map((winner, index) => (
                <span key={`${winner.order ?? 'x'}-${index}`}>
                  {index > 0 ? ', ' : null}
                  <CaPartyName shown={winner.shown} role="winner" disclosed={winner.disclosed} year={year} />
                </span>
              ))}
              {more > 0 ? <> {plural(more, { one: 'și încă un câștigător', few: 'și încă # câștigători', other: 'și încă # de câștigători' })}</> : null}
            </>
          )}
        </p>
      </div>
      <div className="text-sm sm:col-span-4 sm:text-right">
        <p className="font-semibold tabular-nums text-foreground">{caAmountText(row, false)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {[row.awardDay ? `${dayText(row.awardDay)} ${row.awardDay.slice(0, 4)}` : null, row.contractKind === 'ordinary' ? null : caKindText(row.contractKind), row.ceiling ? t`valoare maximă` : null, row.underReview ? t`în verificare` : null]
            .filter((part): part is string => part !== null)
            .join(' · ')}
        </p>
      </div>
    </li>
  )
}

/** Said from the answer shown: while another page is on its way, the rows kept are labelled as theirs. */
export function Pager({ data, onPage }: { readonly data: Pick<BuyerContractAwards, 'page' | 'pageSize' | 'total' | 'hasMore'>; readonly onPage: (page: number) => void }) {
  const page = data.page
  const pages = Math.min(Math.ceil(Math.min(data.total, LIST_DEPTH) / data.pageSize), PROCUREMENT_BUYER_AWARD_MAX_PAGE)
  if (pages <= 1 && page === 1) return null
  const button = 'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-40 sm:min-h-0'
  return (
    <nav className="mt-4 flex items-center justify-between gap-4" aria-label={t`Paginile contractelor`}>
      <button type="button" className={button} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="size-4" aria-hidden="true" />
        <Trans>Înapoi</Trans>
      </button>
      <p className="text-sm text-muted-foreground tabular-nums">
        <Trans>
          Pagina {countText(page)} din {countText(Math.max(pages, 1))}
        </Trans>
      </p>
      <button type="button" className={button} disabled={!data.hasMore || page >= pages} onClick={() => onPage(page + 1)}>
        <Trans>Înainte</Trans>
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  )
}

function AwardsNotes({ data, clipped }: { readonly data: BuyerContractAwards | undefined; readonly clipped: boolean }) {
  const notes: string[] = []
  if (data?.winnersUnnamed) notes.push(winnersUnnamedText())
  if (clipped) notes.push(beforeFloorText())
  if (data && data.depthLimited) notes.push(t`Lista ajunge până la al 10.000-lea contract: alege un an ca s-o restrângi.`)
  if (data && data.undatedCount > 0) {
    notes.push(
      plural(data.undatedCount, {
        one: 'Încă un contract al instituției nu are dată de atribuire, așa că nu apare în nicio perioadă.',
        few: 'Încă # contracte ale instituției nu au dată de atribuire, așa că nu apar în nicio perioadă.',
        other: 'Încă # de contracte ale instituției nu au dată de atribuire, așa că nu apar în nicio perioadă.',
      }),
    )
  }
  notes.push(t`Valoarea e a întregului contract, atribuită, nu plătită; la un acord-cadru, cea maximă.`)
  return <p className="mt-4 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">{notes.join(' ')}</p>
}

/**
 * The buyer's contract-award money in the window: awarded, price changes and
 * framework ceilings, each with the API's own label, side by side and never
 * added up. A failure here leaves the counts and the list as they are.
 */
function AwardsTotals({ request }: { readonly request: BuyerContractAwardTotalsRequest }) {
  const query = useBuyerContractAwardTotals(request)
  // In the page's language, as the label table serves it.
  const served = (text: CaServedText) => (getUserLocale() === 'en' ? text.en : text.ro)
  if (query.isPending) return <HubPending rows={1} className="mb-6" />
  if (query.isError || query.data.figures.length === 0) {
    return (
      <p className="mb-6 text-sm text-muted-foreground">
        <Trans>Sumele în lei nu sunt disponibile acum.</Trans>
      </p>
    )
  }
  // No record of any kind in the window: the money has nothing to say beside „none".
  if (query.data.figures.every((figure) => figure.recordCount === 0 && figure.sumLei === 0)) return null
  return (
    <div className="mb-6">
      <dl className="grid grid-cols-1 gap-4 border-y py-4 sm:grid-cols-3">
        {query.data.figures.map((figure) => (
          <div key={figure.valueKind}>
            <dt className="text-xs text-muted-foreground">{served(figure.label)}</dt>
            <dd className="mt-1 font-semibold tabular-nums text-foreground">{caTotalText(figure.sumLei, figure.valueKind === 'modification_change')}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
        <Trans>Cele trei valori nu se adună între ele: plafonul unui acord-cadru este o valoare maximă, nu o sumă atribuită.</Trans> {served(query.data.explanation)}
      </p>
    </div>
  )
}
