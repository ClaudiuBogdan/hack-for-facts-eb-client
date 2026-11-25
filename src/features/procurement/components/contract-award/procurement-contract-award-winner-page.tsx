import { useId, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowLeft, Clock, FileQuestion } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HubLoadError, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { PROCUREMENT_CONTRACT_AWARD_FIRST_YEAR, type ProcurementContractAwardWinnerSearch } from '@/schemas/procurement-contract-award-winner'
import type { ProcurementBuyerAwardOrder } from '@/schemas/procurement-buyer'
import { CaRecordsOffError } from '../../api/procurement-contract-award-api'
import { useWinnerContractAwards } from '../../hooks/use-procurement-contract-award'
import { caPartyLabel, caWinnerLinkOf, type CaSort, type CaWinnerRow, type WinnerContractAwards } from '../../lib/contract-award-model'
import { caAmountText, caKindText, winnersUnnamedText } from '../../lib/contract-award-text'
import { categoryOfCode } from '../../lib/home-categories'
import { countText, dayText } from '../../lib/home-format'
import { buildContractAwardWinnerDocumentTitle } from '../../lib/procurement-page-titles'
import { Pager } from '../buyer/buyer-awards-band'
import { CaPartyName } from './contract-award-party'

/**
 * A winner code's contract awards (`/procurement/contract-awards/winners/$cui`,
 * KB0Z, owner 25 November 2026): the list a company named from the firms'
 * register but outside the direct purchases' gate is linked to. Its counts and
 * one page of the awards it won — by whom, what, for how much and when — for
 * every year published or one year.
 *
 * Only a code the API shows and gates has a list. Any other reads as one and
 * the same „none", whatever the code won: the page never says more about a
 * code than the API does.
 */

const SORT_OF: Readonly<Record<ProcurementBuyerAwardOrder, CaSort>> = { noi: 'awardDayDesc', vechi: 'awardDayAsc', valoare: 'amountDesc' }

const ALL_YEARS = 'all'

export function ProcurementContractAwardWinnerPage({ cui, search }: { readonly cui: string; readonly search: ProcurementContractAwardWinnerSearch }) {
  const order = search.ordine ?? 'noi'
  const page = search.pagina ?? 1
  const year = search.year ?? null
  const query = useWinnerContractAwards({ code: cui, year, sort: SORT_OF[order], page })
  // A failed read shows nothing of an earlier answer.
  const read = query.isError ? undefined : query.data
  const awards = read?.kind === 'found' ? read.awards : null
  const company = awards?.winner.shown.kind === 'company' ? awards.winner.shown.name : null
  const link = awards ? caWinnerLinkOf(awards.winner.shown, awards.winner.disclosed) : null
  const supplier = link?.to === 'supplier' ? link : null
  const { i18n } = useLingui()
  useClientDocumentTitle(buildContractAwardWinnerDocumentTitle(i18n, { companyName: company }))
  const navigate = useNavigate({ from: '/procurement/contract-awards/winners/$cui' })
  const choose = (patch: ProcurementContractAwardWinnerSearch) => void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true, resetScroll: false })

  if (read?.kind === 'missing') {
    return (
      <WinnerNotice
        icon={<FileQuestion className="size-6 text-muted-foreground" aria-hidden="true" />}
        title={t`Nu sunt contracte atribuite de arătat`}
        text={t`Pentru codul ${cui} nu avem o listă publicată de contracte atribuite.`}
      />
    )
  }
  if (query.error instanceof CaRecordsOffError) {
    return <WinnerNotice icon={<Clock className="size-6 text-muted-foreground" aria-hidden="true" />} title={t`Contractele atribuite nu sunt disponibile acum`} text={t`Platforma nu servește acum contractele atribuite. Revino mai târziu.`} />
  }
  return (
    <>
      <WinnerFrame aside={<WinnerYearSelect value={year} onChoice={(next) => choose({ year: next ?? undefined, pagina: undefined })} />}>
        <MonoLabel className="mt-8 block text-muted-foreground">
          <Trans>Contracte atribuite câștigate</Trans>
        </MonoLabel>
        {awards ? (
          <h1 className="mt-3 max-w-[30ch] text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">{caPartyLabel(awards.winner.shown)}</h1>
        ) : (
          <div className="mt-3 h-9 w-2/3 animate-pulse bg-muted/70 sm:h-11" aria-hidden="true" />
        )}
        <p className="mt-4 min-h-12 max-w-[60ch] text-base text-muted-foreground">{awards ? winnerLede(awards, year) : null}</p>
        {supplier ? (
          // A company in the direct purchases' gate has a supplier's page too.
          <Link
            to="/procurement/suppliers/$cui"
            params={{ cui: supplier.code }}
            search={year === null ? {} : { year }}
            className="mt-2 inline-block text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            <Trans>Achizițiile directe ale firmei</Trans>
          </Link>
        ) : null}
      </WinnerFrame>
      <RuledFrame className="py-10 sm:py-14">
        {query.isError ? (
          <HubLoadError onRetry={() => void query.refetch()} />
        ) : !awards ? (
          <HubPending rows={6} />
        ) : (
          <WinnerList awards={awards} order={order} year={year} onOrder={(next) => choose({ ordine: next === 'noi' ? undefined : next, pagina: undefined })} onPage={(next) => choose({ pagina: next === 1 ? undefined : next })} />
        )}
      </RuledFrame>
    </>
  )
}

/** „37 de contracte atribuite câștigate din 2021, 35 cu valoare publicată; 1 în verificare, cu valoarea în afara totalurilor." */
function winnerLede(awards: WinnerContractAwards, year: number | null): string {
  const period = year === null ? t`din ${PROCUREMENT_CONTRACT_AWARD_FIRST_YEAR} încoace` : t`în ${year}`
  const parts = [
    plural(awards.recordCount, {
      one: `# contract atribuit câștigat ${period}`,
      few: `# contracte atribuite câștigate ${period}`,
      other: `# de contracte atribuite câștigate ${period}`,
    }),
  ]
  if (awards.recordCount > 0) {
    const valued = countText(awards.valuedCount)
    parts.push(t`${valued} cu valoare publicată`)
  }
  const head = parts.join(', ')
  if (awards.identityReviewCount === 0) return `${head}.`
  const review = countText(awards.identityReviewCount)
  return `${head}; ${t`${review} în verificare, cu valoarea în afara totalurilor`}.`
}

function WinnerList({
  awards,
  order,
  year,
  onOrder,
  onPage,
}: {
  readonly awards: WinnerContractAwards
  readonly order: ProcurementBuyerAwardOrder
  readonly year: number | null
  readonly onOrder: (order: ProcurementBuyerAwardOrder) => void
  readonly onPage: (page: number) => void
}) {
  const notes: string[] = []
  if (awards.winnersUnnamed) notes.push(winnersUnnamedText())
  if (awards.depthLimited) notes.push(t`Lista ajunge până la al 10.000-lea contract: alege un an ca s-o restrângi.`)
  if (awards.undatedCount > 0) {
    notes.push(
      plural(awards.undatedCount, {
        one: 'Încă un contract câștigat nu are dată de atribuire, așa că nu apare în nicio perioadă.',
        few: 'Încă # contracte câștigate nu au dată de atribuire, așa că nu apar în nicio perioadă.',
        other: 'Încă # de contracte câștigate nu au dată de atribuire, așa că nu apar în nicio perioadă.',
      }),
    )
  }
  notes.push(t`Valoarea e a întregului contract, atribuită, nu plătită; la un acord-cadru, cea maximă. Într-o asociere, SEAP nu publică partea fiecărei firme.`)
  return (
    <div className="max-w-5xl">
      <div className="flex justify-end">
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
      </div>
      <div className="mt-6">
        {awards.total === 0 && awards.page === 1 ? (
          <p className="border-y py-4 text-sm text-muted-foreground">{year === null ? <Trans>Niciun contract atribuit câștigat.</Trans> : <Trans>Niciun contract atribuit câștigat în {year}.</Trans>}</p>
        ) : awards.rows.length === 0 ? (
          <p className="border-y py-4 text-sm text-muted-foreground">
            <Trans>Pagina aceasta nu are contracte.</Trans>{' '}
            <button type="button" onClick={() => onPage(1)} className="font-medium text-foreground underline underline-offset-4">
              <Trans>Înapoi la prima pagină</Trans>
            </button>
          </p>
        ) : (
          <ol className="border-b">
            {awards.rows.map((row) => (
              <WinnerRow key={row.recordId} row={row} />
            ))}
          </ol>
        )}
        {awards.rows.length > 0 ? <Pager data={awards} onPage={onPage} /> : null}
      </div>
      <p className="mt-4 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">{notes.join(' ')}</p>
    </div>
  )
}

function WinnerRow({ row }: { readonly row: CaWinnerRow }) {
  const { i18n } = useLingui()
  const title = row.title ?? (row.cpvCode ? i18n._(categoryOfCode(row.cpvCode).label) : t`Contract atribuit`)
  const rowYear = row.awardDay ? Number(row.awardDay.slice(0, 4)) : undefined
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
          {row.buyer ? <CaPartyName shown={row.buyer} role="buyer" year={rowYear} /> : t`Cumpărător necunoscut`}
          {row.flags.includes('joint_win') ? <> · {t`în asociere`}</> : null}
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

/** Every year published (the default), or one year since 2021. */
function WinnerYearSelect({ value, onChoice }: { readonly value: number | null; readonly onChoice: (year: number | null) => void }) {
  const labelId = useId()
  const newest = new Date().getUTCFullYear()
  const years = Array.from({ length: Math.max(newest - PROCUREMENT_CONTRACT_AWARD_FIRST_YEAR + 1, 1) }, (_, index) => newest - index)
  const allLabel = t`Toți anii`
  return (
    <div className="flex shrink-0 items-center gap-2">
      <MonoLabel id={labelId} className="sr-only text-muted-foreground sm:not-sr-only">
        <Trans>Perioada</Trans>
      </MonoLabel>
      <Select value={value === null ? ALL_YEARS : String(value)} onValueChange={(next) => onChoice(next === ALL_YEARS ? null : Number(next))}>
        <SelectTrigger
          aria-labelledby={labelId}
          className="h-9 w-auto gap-2 rounded-none border-foreground/25 bg-background px-3 font-semibold tabular-nums shadow-none hover:border-foreground/60 focus:ring-1"
        >
          <SelectValue>{value === null ? allLabel : value}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end" className="rounded-none">
          <SelectItem value={ALL_YEARS} textValue={allLabel} className="rounded-none py-2 font-semibold">
            {allLabel}
          </SelectItem>
          <SelectSeparator />
          {years.map((option) => (
            <SelectItem key={option} value={String(option)} textValue={String(option)} className="rounded-none py-2 font-semibold tabular-nums">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function WinnerFrame({ aside, children }: { readonly aside?: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="bg-background">
      <section className="relative border-b">
        <TwoLayerLattice idPrefix="contract-award-winner" />
        <RuledFrame className="relative py-10 sm:py-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/procurement" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:min-h-0">
              <ArrowLeft className="size-4" aria-hidden="true" />
              <Trans>Achiziții publice</Trans>
            </Link>
            {aside}
          </div>
          {children}
        </RuledFrame>
      </section>
    </div>
  )
}

function WinnerNotice({ icon, title, text }: { readonly icon: ReactNode; readonly title: string; readonly text: string }) {
  return (
    <WinnerFrame>
      <div role="status" className="mt-8 max-w-[60ch]">
        {icon}
        <p className="mt-3 text-lg font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </WinnerFrame>
  )
}
