import { useState } from 'react'
import { t } from '@lingui/core/macro'

import {
  useApprovedSeries,
  useApprovedTotals,
  useBudgetCatalog,
  useExecutionRelease,
} from '@/features/national-budget/page/hooks/use-national-budget-page'
import { approvedAmountToLei } from '@/features/national-budget/page/model/amounts'
import { compare } from '@/features/national-budget/page/model/comparability'
import { executionHeadline } from '@/features/national-budget/page/model/execution-lines'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { ApprovedTotalCell, BudgetCatalog, BudgetEdition, CreditType, UnavailableReason } from '@/schemas/national-budget-page'
import { AuthorityRanking, AuthoritySheet } from './page.authorities'
import { EditionsChart } from './page.chart'
import { ChecksList, Verdict, executionOperand, planOperand } from './page.compare'
import { ExecutionLines, WithRelease, componentOf, executionFigures, releaseSourceLink } from './page.execution'
import { coverageLabel, creditLabel, editionLabel, editionVersion, formatExactLei, formatInUnit, formatPercent, fundLabel, gapText, measureLabel, tableUnit } from './page.format'
import {
  Band,
  BandSkeleton,
  CoverageBand,
  EditionSelect,
  Eyebrow,
  ExternalLink,
  Frame,
  Missing,
  MockStrip,
  Money,
  NotesMarker,
  OriginChip,
  ReleasePicker,
  Segmented,
  Skeleton,
  SourceLine,
  TargetYears,
} from './page.parts'
import { ApiPending, PageShell, PageSkeleton, ShareButton, pageNotes } from './page.shell'
import { creditTypeOf, editionOf, releaseOf, targetOf, usePageState, type PageState, type SetPageState } from './page.state'

/**
 * Variant A — Panorama. Overview first: one sentence, the plan and the
 * execution side by side (each labelled with what it is, never added or
 * divided), then the four budgets, what the money was spent on and where it
 * came from, the laws over time, the authorities, and what the data covers.
 */
export function PanoramaVariant() {
  const { state, set } = usePageState()
  return (
    <PageShell demo={state.demo}>
      <MockStrip />
      {state.demo === 'loading' ? (
        <PageSkeleton />
      ) : (
        <Band label={t`catalogul datelor`} fallback={<PageSkeleton />}>
          <Panorama state={state} set={set} />
        </Band>
      )}
    </PageShell>
  )
}

function cellLei(cell: ApprovedTotalCell): number | null {
  if (cell.status !== 'ok') return null
  return approvedAmountToLei(cell.origin === 'real_sample' ? cell.line.amountThousandLei : cell.amountThousandLei)
}

function cellAmount(cell: ApprovedTotalCell): string | null {
  if (cell.status !== 'ok') return null
  return cell.origin === 'real_sample' ? cell.line.amountThousandLei : cell.amountThousandLei
}

function Panorama({ state, set }: { readonly state: PageState; readonly set: SetPageState }) {
  const { data: catalog } = useBudgetCatalog()
  if (catalog.status === 'unavailable') return <ApiPending />
  const edition = editionOf(catalog, state.edition)
  const targetYear = targetOf(state, edition)
  const creditType = creditTypeOf(state.credit)
  const month = releaseOf(state, catalog, targetYear)
  const notes = pageNotes({ catalog, edition, targetYear, month, state })
  const authorityQuery = { edition, targetYear, creditType }

  return (
    <>
      <header className="border-b">
        <Frame className="pb-6 pt-8 sm:pb-8 sm:pt-12">
          <Eyebrow>{t`Buget · Național`}</Eyebrow>
          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-[1.05] tracking-tighter sm:text-5xl">
            {t`Bugetul de stat: ce aprobă legea și cât se cheltuiește`}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <EditionSelect catalog={catalog} value={edition.key} onChange={(key) => set({ edition: key, target: null, authority: null })} />
            <TargetYears edition={edition} value={targetYear} onChange={(year) => set({ target: year === edition.budgetYear ? null : year })} />
            <ReleasePicker releases={catalog.releases} value={month} onChange={(value) => set({ release: value })} />
            <Segmented
              label={t`Bugetul`}
              size="sm"
              value={state.scope}
              onChange={(scope) => set({ scope })}
              options={[
                { value: 'state', label: t`De stat` },
                { value: 'consolidated', label: t`General consolidat`, title: t`Bugetul general consolidat: toate bugetele publice, fără transferurile dintre ele` },
              ]}
            />
            <span className="flex items-center">
              <NotesMarker alerts={notes.alerts} facts={notes.facts} />
              <ShareButton />
            </span>
          </div>
        </Frame>
      </header>

      <section aria-label={t`Plan și execuție`} className="border-b bg-muted/20">
        <Band label={t`cifrele principale`} fallback={<FiguresSkeleton />}>
          <Figures catalog={catalog} edition={edition} targetYear={targetYear} creditType={creditType} month={month} state={state} set={set} />
        </Band>
      </section>

      <Frame className="space-y-12 py-10">
        <section aria-labelledby="funds-title" className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="space-y-3">
            <div>
              <h2 id="funds-title" className="text-lg font-semibold">
                {t`Cele patru bugete din lege`}
              </h2>
              <p className="text-xs text-muted-foreground">
                {measureLabel(edition, targetYear)} · {t`nu se adună: își transferă bani între ele`}
              </p>
            </div>
            <Band label={t`bugetele din lege`} fallback={<BandSkeleton rows={5} label={t`Se citesc bugetele`} />}>
              <Funds edition={edition} targetYear={targetYear} creditType={creditType} />
            </Band>
          </div>
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">{t`Pe ce s-a cheltuit`}</h2>
              <p className="text-xs text-muted-foreground">
                {componentLabelFor(state)} · {t`execuție`} {coverageLabel(month)}
              </p>
            </div>
            <Band label={t`execuția pe titluri`} fallback={<BandSkeleton rows={8} label={t`Se citește execuția`} />}>
              <WithRelease month={month}>
                {(release) => (
                  <ExecutionLines release={release} component={componentOf(state.scope)} section="expenditure" foldBelow={2} caption={t`Cheltuieli plătite, pe titluri`} />
                )}
              </WithRelease>
            </Band>
          </div>
        </section>

        <section aria-labelledby="revenue-title" className="space-y-3">
          <div>
            <h2 id="revenue-title" className="text-lg font-semibold">
              {t`De unde au venit banii`}
            </h2>
            <p className="text-xs text-muted-foreground">
              {componentLabelFor(state)} · {t`execuție`} {coverageLabel(month)}
            </p>
          </div>
          <Band label={t`veniturile`} fallback={<BandSkeleton rows={6} label={t`Se citesc veniturile`} />}>
            <WithRelease month={month}>
              {(release) => <ExecutionLines release={release} component={componentOf(state.scope)} section="revenue" foldBelow={2} caption={t`Venituri încasate`} />}
            </WithRelease>
          </Band>
        </section>

        <LawsOverTime catalog={catalog} edition={edition} targetYear={targetYear} creditType={creditType} set={set} />

        <section aria-labelledby="authorities-title" className="space-y-3">
          <div>
            <h2 id="authorities-title" className="text-lg font-semibold">
              {t`Cine primește creditele bugetului de stat`}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t`Ordonatorii principali`} · {measureLabel(edition, targetYear)} · {creditLabel(creditType)}
            </p>
          </div>
          <Band label={t`ordonatorii`} fallback={<BandSkeleton rows={10} label={t`Se citesc ordonatorii`} />}>
            <AuthorityRanking query={authorityQuery} search={state.q} onSearch={(q) => set({ q })} onOpen={(key) => set({ authority: key })} />
          </Band>
          <AuthoritySheet query={authorityQuery} authorityKey={state.authority} onClose={() => set({ authority: null })} />
        </section>

        <CoverageBand catalog={catalog} className="border-t pt-8" />

        <SourceLine
          items={[
            edition.status === 'draft' ? (
              <ExternalLink key="law" href="https://mfinante.gov.ro/ro/acasa/transparenta/proiecte-acte-normative">
                {t`Proiectul bugetului 2026, Anexa 3 (PDF), MF`}
              </ExternalLink>
            ) : (
              <ExternalLink key="law" href={`https://data.gov.ro/dataset?q=bugetuldestat${edition.budgetYear}`}>
                {t`${editionLabel(edition)}, XML, data.gov.ro`}
              </ExternalLink>
            ),
            <ReleaseSource key="release" month={month} />,
          ]}
          method={notes.facts}
        />
      </Frame>
    </>
  )
}

function componentLabelFor(state: PageState): string {
  return state.scope === 'state' ? t`Bugetul de stat` : t`Bugetul general consolidat`
}

function ReleaseSource({ month }: { readonly month: string }) {
  const { data } = useExecutionRelease(month)
  if (data.status !== 'ok') return <span>{t`Buletinul execuției bugetare, MF`}</span>
  return releaseSourceLink(data)
}

function FiguresSkeleton() {
  return (
    <Frame className="grid gap-6 py-8 md:grid-cols-2" aria-busy="true">
      <Skeleton className="h-36" />
      <Skeleton className="h-36" />
    </Frame>
  )
}

/** One term and its value: a `div` of `dt`/`dd`, the only child a `dl` takes besides its pairs. A missing value says why. */
function Figure({
  label,
  lei,
  sub,
  origin,
  missing,
  large = false,
  className,
}: {
  readonly label: string
  readonly lei: number | null
  readonly sub?: string
  readonly origin?: 'draft_static' | 'real_sample'
  readonly missing?: UnavailableReason
  readonly large?: boolean
  readonly className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="flex items-center gap-2 text-xs text-muted-foreground">
        {label}
        {origin ? <OriginChip origin={origin} /> : null}
      </dt>
      <dd className={cn('mt-1 font-semibold tracking-tight', large ? 'text-3xl sm:text-5xl' : 'text-xl sm:text-2xl')}>
        {lei !== null ? <Money lei={lei} /> : missing ? <Missing reason={missing} className="text-sm font-normal" /> : <span className="text-base font-normal text-muted-foreground">—</span>}
      </dd>
      {sub ? <dd className="mt-0.5 text-xs text-muted-foreground">{sub}</dd> : null}
    </div>
  )
}

/**
 * The plan and the execution, side by side and labelled apart. The line under
 * them says whether they compare, with the checks behind it; no rate or gap is
 * computed while they do not.
 */
function Figures({
  catalog,
  edition,
  targetYear,
  creditType,
  month,
  state,
  set,
}: {
  readonly catalog: BudgetCatalog
  readonly edition: BudgetEdition
  readonly targetYear: number
  readonly creditType: CreditType
  readonly month: string
  readonly state: PageState
  readonly set: SetPageState
}) {
  const { data: totals } = useApprovedTotals({ edition: edition.key, targetYear, creditType })
  const { data: release } = useExecutionRelease(month)
  const state_ = totals.status === 'ok' ? totals.funds.find((fund) => fund.fund === 'state_budget') : undefined
  const component = componentOf(state.scope)
  const figures = release.status === 'ok' ? executionFigures(release, component) : null
  const spentFact = release.status === 'ok' ? executionHeadline(release.facts, { component, section: 'expenditure' })?.amount ?? null : null
  const credits = state_ ? cellAmount(state_.credits) : null
  const comparison =
    state.scope === 'state' && credits && spentFact
      ? compare(planOperand({ edition, targetYear, fund: 'state_budget', basis: creditType, amountThousandLei: credits }), executionOperand(spentFact))
      : null
  const releaseEntry = catalog.releases.find((item) => item.periodEnd.startsWith(month))

  return (
    <>
      <Frame className="grid md:grid-cols-2">
        <div className="space-y-4 py-6 md:border-r md:pr-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Eyebrow className="text-foreground">{t`Plan · ${measureLabel(edition, targetYear)}`}</Eyebrow>
            <span className="text-xs text-muted-foreground">
              {editionLabel(edition)}, {editionVersion(edition)}
            </span>
          </div>
          {state.scope === 'consolidated' ? (
            <div className="space-y-2">
              <Missing reason="not_in_edition" />
              <p className="text-xs text-muted-foreground">{t`Legea aprobă patru bugete separate, nu un total consolidat; mai jos, fiecare buget în parte.`}</p>
            </div>
          ) : totals.status !== 'ok' || !state_ ? (
            <Missing reason={totals.status === 'ok' ? 'not_in_sample' : totals.reason} />
          ) : (
            <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Figure
                large
                className="col-span-2"
                label={t`Cheltuieli, ${creditLabel(creditType)}`}
                lei={cellLei(state_.credits)}
                origin={state_.credits.status === 'ok' ? state_.credits.origin : undefined}
                missing={state_.credits.status === 'unavailable' ? state_.credits.reason : undefined}
                sub={state_.credits.status === 'ok' ? (creditType === 'budget_credits' ? t`plafonul de plăți al bugetului de stat` : t`plafonul de angajamente al bugetului de stat`) : undefined}
              />
              <Figure
                className="col-span-2"
                label={t`Venituri prevăzute`}
                lei={cellLei(state_.revenue)}
                origin={state_.revenue.status === 'ok' ? state_.revenue.origin : undefined}
                missing={state_.revenue.status === 'unavailable' ? state_.revenue.reason : undefined}
              />
            </dl>
              <div>
                <Segmented
                  label={t`Tipul de credite`}
                  size="sm"
                  value={state.credit}
                  onChange={(credit) => set({ credit })}
                  options={[
                    { value: 'budget', label: t`Credite bugetare`, title: t`Cât se poate plăti în an` },
                    { value: 'commitment', label: t`Credite de angajament`, title: t`Cât se poate angaja, cu plată și în anii următori` },
                  ]}
                />
              </div>
            </>
          )}
        </div>
        <div className="space-y-4 border-t py-6 md:border-t-0 md:pl-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Eyebrow className="text-foreground">{t`Execuție · ${coverageLabel(month)}`}</Eyebrow>
            <span className="text-xs text-muted-foreground">
              {componentLabelFor(state)}, {t`buletinul MF`}
            </span>
          </div>
          {release.status === 'gap' ? (
            <p className="text-sm text-muted-foreground">{t`Buletin nepublicat: ${gapText(release.reason)}.`}</p>
          ) : release.status === 'unavailable' ? (
            <Missing reason={release.reason} />
          ) : figures && figures.every((figure) => figure.lei === null) ? (
            <p className="text-sm text-muted-foreground">{t`Buletinul nu are rânduri pentru această selecție.`}</p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              {figures?.map((figure) => (
                <Figure
                  key={figure.key}
                  className={figure.key === 'expenditure' ? 'col-span-2' : undefined}
                  large={figure.key === 'expenditure'}
                  label={figure.label}
                  lei={figure.lei}
                  sub={figure.gdpPercent === null ? undefined : t`${formatPercent(figure.gdpPercent, 2)} din PIB`}
                />
              ))}
            </dl>
          )}
          {releaseEntry?.note === 'printed_coverage_to_july_30' ? <p className="text-xs text-muted-foreground">{t`Acoperire tipărită până la 30 iulie.`}</p> : null}
        </div>
      </Frame>
      <div className="border-t">
        <Frame className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
          {comparison ? (
            <>
              <Verdict comparison={comparison} />
              <span className="text-muted-foreground">
                {comparison.verdict === 'comparable' ? t`Aceeași bază: diferența are sens.` : t`Arătăm ambele cifre; nu calculăm un grad de execuție.`}
              </span>
              <Popover>
                <PopoverTrigger className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 hover:text-foreground sm:min-h-0">{t`De ce`}</PopoverTrigger>
                <PopoverContent align="start" className="w-[min(92vw,30rem)]">
                  <ChecksList comparison={comparison} />
                </PopoverContent>
              </Popover>
            </>
          ) : (
            <span className="text-muted-foreground">
              {state.scope === 'consolidated'
                ? t`Bugetul general consolidat are doar execuție; planul lui nu există ca total în lege.`
                : t`Una dintre cifre lipsește; nu le punem față în față.`}
            </span>
          )}
        </Frame>
      </div>
    </>
  )
}

function Funds({ edition, targetYear, creditType }: { readonly edition: BudgetEdition; readonly targetYear: number; readonly creditType: CreditType }) {
  const { data } = useApprovedTotals({ edition: edition.key, targetYear, creditType })
  if (data.status !== 'ok') return <Missing reason={data.reason} />
  const values = data.funds.flatMap((fund) => [cellLei(fund.credits) ?? 0, cellLei(fund.revenue) ?? 0])
  const widest = Math.max(...values, 1)
  const unit = tableUnit(values)
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{t`Venituri și cheltuieli aprobate, pe bugete`}</caption>
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="py-1.5 pr-3 font-normal">{t`Bugetul`}</th>
          <th className="py-1.5 pr-3 text-right font-normal">{t`Venituri, ${unit.label}`}</th>
          <th className="py-1.5 text-right font-normal">{t`Cheltuieli, ${unit.label}`}</th>
        </tr>
      </thead>
      <tbody>
        {data.funds.map((fund) => (
          <tr key={fund.fund} className="border-b last:border-0">
            <th scope="row" className="py-2 pr-3 text-left align-top font-normal">
              {fundLabel(fund.fund)}
            </th>
            {[fund.revenue, fund.credits].map((cell, index) => {
              const lei = cellLei(cell)
              return (
                <td key={index} className="py-2 pl-2 text-right align-top">
                  {lei === null ? (
                    <span className="text-xs text-muted-foreground" title={cell.status === 'unavailable' ? undefined : t`mai multe rânduri de total`}>
                      {cell.status === 'unavailable'
                        ? cell.reason === 'not_in_edition'
                          ? t`netipărit`
                          : cell.reason === 'not_extracted'
                            ? t`neextras`
                            : t`lipsă din eșantion`
                        : t`ambiguu`}
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 tabular-nums" title={formatExactLei(lei)}>
                        {cell.status === 'ok' ? <OriginChip origin={cell.origin} /> : null}
                        {formatInUnit(lei, unit)}
                      </span>
                      <span className="mt-1 ml-auto block h-1 max-w-32 bg-muted" aria-hidden="true">
                        <span className="ml-auto block h-1 bg-primary/70" style={{ width: `${(lei / widest) * 100}%` }} />
                      </span>
                    </>
                  )}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LawsOverTime({
  catalog,
  edition,
  targetYear,
  creditType,
  set,
}: {
  readonly catalog: BudgetCatalog
  readonly edition: BudgetEdition
  readonly targetYear: number
  readonly creditType: CreditType
  readonly set: SetPageState
}) {
  const [line, setLine] = useState<'credits' | 'revenue'>('credits')
  return (
    <section aria-labelledby="laws-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="laws-title" className="text-lg font-semibold">
            {t`Ce a prevăzut fiecare lege, din 2019`}
          </h2>
          <p className="text-xs text-muted-foreground">{t`Bugetul de stat · sume nominale, fără inflație · un clic alege legea și anul`}</p>
        </div>
        <Segmented
          label={t`Ce arată graficul`}
          size="sm"
          value={line}
          onChange={setLine}
          options={[
            { value: 'credits', label: t`Cheltuieli (credite bugetare)` },
            { value: 'revenue', label: t`Venituri` },
          ]}
        />
      </div>
      <Band label={t`legile pe ani`} fallback={<Skeleton className="h-64" />}>
        <LawsChart catalog={catalog} edition={edition} targetYear={targetYear} line={line} creditType={creditType} set={set} />
      </Band>
    </section>
  )
}

function LawsChart({
  catalog,
  edition,
  targetYear,
  line,
  creditType,
  set,
}: {
  readonly catalog: BudgetCatalog
  readonly edition: BudgetEdition
  readonly targetYear: number
  readonly line: 'credits' | 'revenue'
  readonly creditType: CreditType
  readonly set: SetPageState
}) {
  // The editions chart reads budget credits: commitment-credit totals are not in the sample.
  const { data } = useApprovedSeries({ fund: 'state_budget', line, creditType: line === 'credits' ? 'budget_credits' : creditType })
  if (data.status !== 'ok') return <Missing reason={data.reason} />
  return (
    <EditionsChart
      points={data.points}
      editions={catalog.editions}
      selected={edition.key}
      selectedYear={targetYear}
      onSelect={(key, year) => {
        const next = catalog.editions.find((item) => item.key === key)
        set({ edition: key, target: next && year === next.budgetYear ? null : year, authority: null })
      }}
    />
  )
}
