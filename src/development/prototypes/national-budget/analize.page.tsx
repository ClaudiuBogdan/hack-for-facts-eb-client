import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { ArrowLeft, Coins, Landmark, ScrollText, Wallet, X, type LucideIcon } from 'lucide-react'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import {
  useAnafStateBudget,
  useApprovedSeries,
  useApprovedTotals,
  useBudgetCatalog,
  useExecutionRelease,
} from '@/features/national-budget/page/hooks/use-national-budget-page'
import { approvedAmountToLei } from '@/features/national-budget/page/model/amounts'
import { Bone } from '@/features/procurement/components/home/home-chrome'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import type { BudgetCatalog } from '@/schemas/national-budget-page'
import { authorityName, countText, coverageText, lineLabel, missingText, moneyText, monthText, percentText, scopeName, shortName, untilText } from './budget.format'
import { anafRanking, cellLei, headlineOf, lineRows, topShare } from './budget.model'
import { HUB_PATH, SampleMark } from './budget.parts'
import { BandRead, BudgetShell } from './budget.shell'
import { AXES, useAnalysisState, type AnalysisState, type Population } from './budget.state'
import { YearsChart, type YearPoint } from './budget.years'
import { AnswerBar, LawAuthorities, LawFundsTable, LawMatrix, LinesTable, MinistriesTable } from './analize.answer'
import { FilterSheet, FiltersButton, NotesMarker, QuestionsMenu, ShareIcon, YearMenu } from './analize.controls'
import { editionOfYear, headlineParts, headlineText, newestReleaseMonth, populationLabel, releaseMonthOf } from './analize.view'

/**
 * The national budget's analysis page, on the procurement analytics page's
 * grid: the head (the way back, how recent the data is, the period; the
 * question as the headline, its budget phrase opening the filters; filters,
 * questions, the link, the caveats), the pinned bar of what the page reads,
 * four figures, the answer as a table of every number, the years, one source
 * line. Every control writes the address: a question is a link.
 */
export function BudgetAnalysisVariant() {
  const { state, set } = useAnalysisState()
  return (
    <BudgetShell demo={state.demo}>
      {state.demo === 'loading' ? (
        <AnalysisPending state={state} />
      ) : (
        <BandRead framed fallback={<AnalysisPending state={state} />}>
          <Analysis state={state} set={set} />
        </BandRead>
      )}
    </BudgetShell>
  )
}

function Analysis({ state, set }: { readonly state: AnalysisState; readonly set: (patch: Partial<AnalysisState>) => void }) {
  const { data: catalog } = useBudgetCatalog()
  const { data: anaf } = useAnafStateBudget()
  const [filters, setFilters] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => () => stopCounting(), [])
  if (catalog.status !== 'ok') {
    return (
      <RuledFrame className="py-16">
        <h1 className="text-3xl font-extrabold tracking-tighter sm:text-5xl">{t`Analize ale bugetului`}</h1>
        <p className="mt-6 text-base text-muted-foreground">{missingText(catalog.reason)}</p>
      </RuledFrame>
    )
  }
  const anafYears = anaf.status === 'ok' ? anaf.years.map((point) => point.year) : []
  // A tab switch keeps only what the new population reads: its first axis, no drilled line.
  const move = (patch: Partial<AnalysisState>) => {
    const tip = patch.tip ?? state.tip
    const next: Partial<AnalysisState> = patch.tip && patch.tip !== state.tip ? { dupa: AXES[tip][0], rand: null, ...patch } : patch
    set(next)
  }
  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <AnalysisHead state={state} catalog={catalog} anafYears={anafYears} anafMonth={anaf.status === 'ok' ? anaf.lastMonth : null} onChange={move} onFilters={() => setFilters(true)} />
      <PopulationNav state={state} catalog={catalog} anafMonth={anaf.status === 'ok' ? anaf.lastMonth : null} onChange={move} />
      <BandRead framed fallback={<FiguresPending />}>
        <AnalysisFigures state={state} catalog={catalog} />
      </BandRead>
      <section className="border-b" aria-label={t`Răspunsul`}>
        <RuledFrame className="py-12 sm:py-16">
          <AnswerBar state={state} onChange={move} />
          <div className="mt-3">
            <BandRead fallback={<TablePending />}>
              <Answer state={state} catalog={catalog} onChange={move} />
            </BandRead>
          </div>
        </RuledFrame>
      </section>
      <YearsSection state={state} onChange={move} />
      <RuledFrame className="py-8">
        <BandRead fallback={<Bone className="w-80" />}>
          <AnalysisSource state={state} catalog={catalog} />
        </BandRead>
      </RuledFrame>
      <FilterSheet state={state} catalog={catalog} anafYears={anafYears} onChange={move} open={filters} onOpenChange={setFilters} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the head ──

/** A phrase of the headline that opens the filters: inline, so the comma after it stays on its line. */
const PHRASE = 'inline text-left underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em] transition-colors hover:decoration-foreground'
const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'

function headlineSize(text: string): string {
  if (text.length <= 36) return 'text-4xl sm:text-6xl'
  if (text.length <= 72) return 'text-3xl sm:text-5xl'
  return 'text-2xl sm:text-4xl'
}

/** What the reader should know before this question's numbers. */
function notesOf(state: AnalysisState, catalog: BudgetCatalog): { readonly alerts: readonly string[]; readonly facts: readonly string[] } {
  const alerts: string[] = []
  const facts: string[] = [t`Machetă: rânduri reale din eșantionul revizuit al legilor și al buletinelor MF; plățile ministerelor, din API-ul ANAF de azi. API-ul paginii e în lucru.`]
  if (state.tip === 'cheltuieli' || state.tip === 'venituri') {
    const month = releaseMonthOf(catalog, state.an)
    if (month && !month.endsWith('-12')) alerts.push(t`${state.an} e în curs: buletinul cumulează ${coverageText(month)}; nu se compară cu un an întreg.`)
    facts.push(
      state.buget === 'consolidat'
        ? t`Bugetul general consolidat: toate bugetele publice, fără transferurile dintre ele. Bugetul de stat le include, de aceea are „Transferuri către alte bugete".`
        : t`Bugetul de stat include transferurile către alte bugete (bugetele locale, asigurările sociale).`,
    )
    facts.push(t`„Decembrie" înseamnă cumulat la decembrie, nu contul general de execuție final.`)
  }
  if (state.tip === 'lege') {
    const edition = editionOfYear(catalog, state.an)
    if (edition?.status === 'draft') alerts.push(t`${state.an}: proiectul din martie 2026, extras din PDF și nevalidat; nu legea adoptată.`)
    alerts.push(t`Legea e varianta trimisă la Monitorul Oficial; rectificările de peste an nu sunt în date, deci nu se compară cu execuția.`)
    facts.push(t`Legea tipărește mii de lei; aici, lei. Totalurile se citesc din rândul de total tipărit; rândurile nu se adună.`)
  }
  if (state.tip === 'ministere') {
    facts.push(t`Plățile raportate la ANAF de ordonatorii principali (bugetul de stat, finanțare integral de la buget). Altă sursă și alte date decât buletinul MF: cele două nu se adună.`)
    facts.push(t`Codul unui ordonator în lege nu e CUI-ul lui; legătura dintre lege și plăți cere o corespondență revizuită.`)
  }
  return { alerts, facts }
}

function AnalysisHead({
  state,
  catalog,
  anafYears,
  anafMonth,
  onChange,
  onFilters,
}: {
  readonly state: AnalysisState
  readonly catalog: BudgetCatalog
  readonly anafYears: readonly number[]
  readonly anafMonth: string | null
  readonly onChange: (patch: Partial<AnalysisState>) => void
  readonly onFilters: () => void
}) {
  const parts = headlineParts(state, catalog, anafMonth)
  const notes = notesOf(state, catalog)
  const newest = state.tip === 'ministere' ? anafMonth : state.tip === 'lege' ? null : newestReleaseMonth(catalog)
  const fresh = newest ? (state.tip === 'ministere' ? t`Date ANAF până în ${monthText(newest)}` : t`Date MF până în ${monthText(newest)}`) : null
  return (
    <section className="relative border-b" aria-labelledby="budget-analysis-title">
      <TwoLayerLattice idPrefix="budget-analysis-head" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-center justify-between gap-4">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <a href={HUB_PATH} className="group inline-flex items-center gap-1.5 hover:text-foreground">
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              <span>{t`Bugetul statului`}</span>
            </a>
            <span className="hidden items-center gap-2 sm:flex">
              <span aria-hidden="true">/</span>
              <span>{t`Analize`}</span>
            </span>
          </MonoLabel>
          <div className="flex items-center gap-4">
            {fresh ? <span className="hidden text-xs text-muted-foreground sm:inline">{fresh}</span> : null}
            <span className="flex items-center gap-2">
              <MonoLabel className="sr-only text-muted-foreground sm:not-sr-only">{t`Perioada`}</MonoLabel>
              <YearMenu state={state} catalog={catalog} anafYears={anafYears} onChange={onChange} />
            </span>
          </div>
        </div>
        {fresh ? <p className="mt-2 text-right text-xs text-muted-foreground sm:hidden">{fresh}</p> : null}
        <h1 id="budget-analysis-title" className={cn('mt-6 max-w-5xl font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-8', headlineSize(headlineText(state, catalog, anafMonth)))}>
          {parts.map((part, index) => (
            <Fragment key={index}>
              {part.role === 'budget' ? (
                <button type="button" onClick={onFilters} className={PHRASE}>
                  {part.text}
                </button>
              ) : part.role === 'row' ? (
                <span className="group/phrase relative">
                  <button type="button" onClick={onFilters} className={PHRASE}>
                    {part.text}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ rand: null })}
                    aria-label={t`Scoate „${part.text}"`}
                    className="ml-0.5 inline-flex size-[0.7em] items-center justify-center align-[0.05em] text-muted-foreground/70 hover:text-foreground"
                  >
                    <X className="size-[0.55em]" aria-hidden="true" />
                  </button>
                </span>
              ) : (
                part.text
              )}
            </Fragment>
          ))}
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1">
          <FiltersButton state={state} onClick={onFilters} className={LINK} />
          <QuestionsMenu onPick={onChange} className={LINK} />
          <ShareIcon className={cn(LINK, 'size-11 justify-center sm:size-auto')} />
          <NotesMarker alerts={notes.alerts} facts={notes.facts} />
          <SampleMark className="sm:ml-auto" />
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

// ───────────────────────────────────────────────────────────── the bar ──

const POPULATION_ICON: Readonly<Record<Population, LucideIcon>> = { cheltuieli: Wallet, venituri: Coins, lege: ScrollText, ministere: Landmark }
const ORDER: readonly Population[] = ['cheltuieli', 'venituri', 'lege', 'ministere']

/** What the page reads, as the analytics page lays out its populations: the question at the left (from a wide screen), the four at the right, each with its mark. */
function PopulationNav({
  state,
  catalog,
  anafMonth,
  onChange,
}: {
  readonly state: AnalysisState
  readonly catalog: BudgetCatalog
  readonly anafMonth: string | null
  readonly onChange: (patch: Partial<AnalysisState>) => void
}) {
  return (
    <nav aria-label={t`Ce citești`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground lg:block lg:max-w-md">{headlineText(state, catalog, anafMonth)}</span>
        <ol className="grid w-full grid-cols-4 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:gap-6 lg:ml-auto">
          {ORDER.map((tip) => {
            const active = state.tip === tip
            const Icon = POPULATION_ICON[tip]
            return (
              <li key={tip}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ tip })}
                  className={cn(
                    'flex h-full min-h-11 w-full flex-col items-start gap-1 border-b-2 py-2 text-left text-[0.8125rem] leading-tight transition-colors sm:w-auto sm:flex-row sm:items-center sm:gap-2 sm:py-0 sm:text-sm',
                    active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', active && 'text-primary')} aria-hidden="true" />
                  {populationLabel(tip)}
                </button>
              </li>
            )
          })}
        </ol>
      </RuledFrame>
    </nav>
  )
}

// ───────────────────────────────────────────────────────── the figures ──

function FiguresPending() {
  return (
    <section className="border-b bg-muted/20" aria-busy="true">
      <RuledFrame>
        <div className="h-32 animate-pulse" aria-hidden="true" />
      </RuledFrame>
    </section>
  )
}

const asIs = (label: ReactNode, className: string) => <span className={className}>{label}</span>

function money(key: string, lei: number, label: string, note: ReactNode): HubFact {
  const [scale, unit] = Math.abs(lei) >= 1e9 ? [1e9, t`mld. lei`] : Math.abs(lei) >= 1e6 ? [1e6, t`mil. lei`] : [1, t`lei`]
  return { key, value: Math.round((lei / scale) * 10) / 10, digits: scale === 1 ? 0 : 1, unit, label, note, link: asIs }
}

function percent(key: string, fraction: number, label: string, note: ReactNode): HubFact {
  const value = fraction * 100
  return { key, value, digits: value < 10 ? 2 : 1, unit: '%', label, note, link: asIs }
}

function AnalysisFigures({ state, catalog }: { readonly state: AnalysisState; readonly catalog: BudgetCatalog }) {
  const { i18n } = useLingui()
  const { facts, reason } = useFacts(state, catalog)
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        {facts.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">{reason ?? t`Nicio cifră pentru această selecție.`}</p>
        ) : (
          <HubFiguresBand key={JSON.stringify(facts.map((fact) => [fact.key, fact.value]))} facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
        )}
      </RuledFrame>
    </section>
  )
}

/** Four figures true of the selection, each within its own source; when there are none, why. */
function useFacts(state: AnalysisState, catalog: BudgetCatalog): { readonly facts: readonly HubFact[]; readonly reason: string | null } {
  const facts = useFactList(state, catalog)
  const month = releaseMonthOf(catalog, state.an) ?? `${state.an}-12`
  const { data: release } = useExecutionRelease(month)
  const edition = editionOfYear(catalog, state.an)
  const { data: anaf } = useAnafStateBudget()
  if (facts.length > 0) return { facts, reason: null }
  if (state.tip === 'cheltuieli' || state.tip === 'venituri') {
    if (release.status === 'gap') return { facts, reason: t`Buletinul pentru ${monthText(month)} nu e publicat.` }
    if (release.status === 'unavailable') return { facts, reason: t`Buletinul pentru ${monthText(month)}: ${missingText(release.reason)}.` }
  }
  if (state.tip === 'lege' && !edition) return { facts, reason: t`Legea bugetului pe ${state.an} nu e încă în date.` }
  if (state.tip === 'ministere' && anaf.status === 'unavailable') return { facts, reason: missingText(anaf.reason) }
  return { facts, reason: null }
}

function useFactList(state: AnalysisState, catalog: BudgetCatalog): readonly HubFact[] {
  const month = releaseMonthOf(catalog, state.an) ?? `${state.an}-12`
  const { data: release } = useExecutionRelease(month)
  const edition = editionOfYear(catalog, state.an)
  const { data: totals } = useApprovedTotals({ edition: edition?.key ?? String(state.an), targetYear: state.an, creditType: 'budget_credits' })
  const { data: next } = useApprovedTotals({ edition: edition?.key ?? String(state.an), targetYear: state.an + 1, creditType: 'budget_credits' })
  const { data: anaf } = useAnafStateBudget()
  if (state.tip === 'cheltuieli' || state.tip === 'venituri') {
    if (release.status !== 'ok') return []
    const section = state.tip === 'cheltuieli' ? 'expenditure' : 'revenue'
    const head = headlineOf(release, state.buget, section)
    const balance = headlineOf(release, state.buget, 'balance')
    const leaves = lineRows(release, { scope: state.buget, section, depth: section === 'expenditure' ? 2 : 4 })
    const facts: HubFact[] = []
    const covered = coverageText(month)
    if (head) facts.push(money('total', head.lei, state.tip === 'cheltuieli' ? t`Cheltuieli plătite` : t`Venituri încasate`, `${scopeName(state.buget)}, ${covered}`))
    if (head?.gdpPercent != null) facts.push(percent('gdp', head.gdpPercent / 100, t`Din PIB`, t`PIB-ul folosit de MF în buletin`))
    if (balance && state.tip === 'cheltuieli') facts.push(money('balance', Math.abs(balance.lei), balance.lei < 0 ? t`Deficit` : t`Excedent`, balance.gdpPercent != null ? t`${percentText(Math.abs(balance.gdpPercent) / 100, 2)} din PIB` : covered))
    if (state.tip === 'venituri') {
      const fiscal = lineRows(release, { scope: state.buget, section, depth: 2 }).find((row) => row.lineItem === 'venituri fiscale')
      if (fiscal?.share != null && fiscal.lei !== null) facts.push(percent('fiscal', fiscal.share, t`Din impozite și taxe`, t`venituri fiscale: ${moneyText(fiscal.lei)}`))
    }
    const top = leaves[0]
    if (top?.share != null && top.lei !== null) facts.push(percent('top', top.share, lineLabel(top.lineItem), moneyText(top.lei)))
    return facts.slice(0, 4)
  }
  if (state.tip === 'lege') {
    if (totals.status !== 'ok') return []
    const fund = totals.funds.find((item) => item.fund === 'state_budget')
    const credits = cellLei(fund?.credits)
    const revenue = cellLei(fund?.revenue)
    const ahead = next.status === 'ok' ? cellLei(next.funds.find((item) => item.fund === 'state_budget')?.credits) : null
    const facts: HubFact[] = []
    const draft = totals.edition.status === 'draft'
    if (credits !== null) facts.push(money('credits', credits, draft ? t`Propus, bugetul de stat` : t`Aprobat, bugetul de stat`, t`credite bugetare`))
    if (revenue !== null) facts.push(money('revenue', revenue, t`Venituri prevăzute`, t`bugetul de stat`))
    if (ahead !== null) facts.push(money('ahead', ahead, t`Estimare pentru ${state.an + 1}`, draft ? t`din proiectul pe ${state.an}` : t`din legea pe ${state.an}`))
    if (totals.edition.counts) {
      const { approved, forecasts } = totals.edition.counts
      facts.push({ key: 'lines', value: totals.edition.counts.lines, digits: 0, label: t`Rânduri tipărite în lege`, note: t`${countText(approved)} aprobate, ${countText(forecasts)} estimări`, link: asIs })
    }
    return facts
  }
  if (anaf.status !== 'ok') return []
  const ranking = anafRanking(anaf, state.an)
  if (!ranking || ranking.rows.length === 0) return []
  const top = ranking.rows[0]!
  return [
    money('paid', ranking.total, t`Plăți, bugetul de stat`, ranking.throughMonth.endsWith('-12') ? String(state.an) : untilText(ranking.throughMonth)),
    { key: 'count', value: ranking.rows.length, digits: 0, label: t`Ordonatori principali`, note: t`cu plăți raportate la ANAF`, link: asIs },
    percent('top5', topShare(ranking, 5), t`Primii 5, din lei`, t`din plățile bugetului de stat`),
    percent('top1', top.share, shortName(authorityName(top.name)), moneyText(top.lei)),
  ]
}

// ─────────────────────────────────────────────────────────── the answer ──

function TablePending() {
  return (
    <div className="space-y-3 py-2" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className="h-5 animate-pulse bg-muted/40" style={{ width: `${95 - index * 5}%` }} />
      ))}
    </div>
  )
}

function Answer({ state, catalog, onChange }: { readonly state: AnalysisState; readonly catalog: BudgetCatalog; readonly onChange: (patch: Partial<AnalysisState>) => void }) {
  if (state.tip === 'cheltuieli' || state.tip === 'venituri') return <LinesTable state={state} catalog={catalog} onChange={onChange} />
  if (state.tip === 'lege') {
    if (state.dupa === 'legi') return <LawMatrix state={state} catalog={catalog} />
    if (state.dupa === 'ordonatori') return <LawAuthorities state={state} catalog={catalog} onChange={onChange} />
    return <LawFundsTable state={state} catalog={catalog} />
  }
  return <MinistriesTable state={state} />
}

// ──────────────────────────────────────────────────────────── the years ──

/** The years in a band of their own, as the analytics page: a click makes a year the page's. Each population's own source; none mixed. */
function YearsSection({ state, onChange }: { readonly state: AnalysisState; readonly onChange: (patch: Partial<AnalysisState>) => void }) {
  const titleId = 'budget-analysis-years'
  const paidState = (state.tip === 'cheltuieli' && state.buget === 'stat') || state.tip === 'ministere'
  return (
    <section id="ani" className="border-b" aria-labelledby={titleId}>
      <RuledFrame className="py-12 sm:py-16">
        <HubSectionHead
          titleId={titleId}
          index={state.tip === 'lege' ? t`Legile 2019–2026` : paidState ? t`ANAF, 2016–2026` : t`Buletinele MF`}
          title={t`Pe ani`}
          aside={
            state.tip === 'lege' ? (
              <IndicatorToggle<AnalysisState['linie']>
                label={t`Rândul`}
                value={state.linie}
                onChange={(linie) => onChange({ linie })}
                options={[
                  { key: 'cheltuieli', label: t`Cheltuieli` },
                  { key: 'venituri', label: t`Venituri` },
                ]}
              />
            ) : null
          }
        />
        <div className="mt-8">
          <BandRead fallback={<div className="h-56 animate-pulse bg-muted/40 sm:h-64" aria-hidden="true" />}>
            {state.tip === 'lege' ? (
              <LawYears state={state} onChange={onChange} titleId={titleId} />
            ) : paidState ? (
              <PaidYears state={state} onChange={onChange} titleId={titleId} />
            ) : (
              <p className="max-w-[56ch] text-sm text-muted-foreground">
                {state.tip === 'venituri'
                  ? t`Seria lunară a veniturilor, din buletinele MF 2006–2026, e în producție; API-ul ei e în lucru. Veniturile raportate la ANAF sunt altă populație și nu o înlocuiesc.`
                  : t`Seria lunară a bugetului general consolidat, din buletinele MF 2006–2026, e în producție; API-ul ei e în lucru. Pentru bugetul de stat, plățile pe ani vin din ANAF.`}
              </p>
            )}
          </BandRead>
        </div>
      </RuledFrame>
    </section>
  )
}

function PaidYears({ state, onChange, titleId }: { readonly state: AnalysisState; readonly onChange: (patch: Partial<AnalysisState>) => void; readonly titleId: string }) {
  const { data } = useAnafStateBudget()
  if (data.status !== 'ok') return <p className="text-sm text-muted-foreground">{missingText(data.reason)}</p>
  const points = data.years.map<YearPoint>((point) => ({
    year: point.year,
    lei: Number(point.lei),
    partial: point.throughMonth.endsWith('-12') ? undefined : untilText(point.throughMonth),
  }))
  return <YearsChart points={points} caption={t`plăți din bugetul de stat, raportate la ANAF`} selected={state.an} labelledBy={titleId} onSelect={(an) => onChange({ an })} />
}

function LawYears({ state, onChange, titleId }: { readonly state: AnalysisState; readonly onChange: (patch: Partial<AnalysisState>) => void; readonly titleId: string }) {
  const { data } = useApprovedSeries({ fund: 'state_budget', line: state.linie === 'cheltuieli' ? 'credits' : 'revenue', creditType: 'budget_credits' })
  if (data.status !== 'ok') return <p className="text-sm text-muted-foreground">{missingText(data.reason)}</p>
  const points = data.points
    .filter((point) => point.kind !== 'forecast')
    .map<YearPoint>((point) => ({
      year: point.measureYear,
      lei: approvedAmountToLei(point.amountThousandLei),
      partial: point.kind === 'proposed' ? t`proiect` : undefined,
      notes: point.kind === 'proposed' ? [t`Proiectul din martie 2026, nevalidat`] : [t`Legea inițială, fără rectificări`],
    }))
  return (
    <YearsChart
      points={points}
      caption={state.linie === 'cheltuieli' ? t`credite bugetare aprobate de legea fiecărui an` : t`venituri prevăzute de legea fiecărui an`}
      selected={state.an}
      labelledBy={titleId}
      onSelect={(an) => onChange({ an })}
    />
  )
}

// ──────────────────────────────────────────────────────────── the source ──

function AnalysisSource({ state, catalog }: { readonly state: AnalysisState; readonly catalog: BudgetCatalog }) {
  const month = releaseMonthOf(catalog, state.an)
  const { data: release } = useExecutionRelease(month ?? `${state.an}-12`)
  const { data: anaf } = useAnafStateBudget()
  const edition = editionOfYear(catalog, state.an)
  const link = 'underline-offset-4 hover:text-foreground hover:underline'
  const source =
    state.tip === 'cheltuieli' || state.tip === 'venituri' ? (
      release.status === 'ok' ? (
        <a href={release.sourceUrl} target="_blank" rel="noreferrer" className={link}>
          {t`Sursa: buletinul execuției bugetare, Ministerul Finanțelor, ${coverageText(month ?? '')}`} ↗
        </a>
      ) : (
        <span>{t`Sursa: buletinele execuției bugetare, Ministerul Finanțelor`}</span>
      )
    ) : state.tip === 'lege' ? (
      edition?.status === 'draft' ? (
        <span>{t`Sursa: proiectul legii bugetului pe 2026, Anexa 3, martie 2026 (PDF, nevalidat)`}</span>
      ) : (
        <a href={`https://data.gov.ro/dataset?q=bugetuldestat${state.an}`} target="_blank" rel="noreferrer" className={link}>
          {t`Sursa: legea bugetului pe ${state.an}, XML, data.gov.ro`} ↗
        </a>
      )
    ) : (
      <span>{anaf.status === 'ok' ? t`Sursa: ANAF, execuția raportată de ordonatorii principali, date până în ${monthText(anaf.lastMonth)}` : t`Sursa: ANAF`}</span>
    )
  return (
    <footer className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {source}
      <span aria-hidden="true">·</span>
      <Popover>
        <PopoverTrigger className="min-h-11 underline-offset-4 hover:text-foreground hover:underline sm:min-h-0">{t`Cum am calculat`}</PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,32rem)] space-y-2 text-sm text-muted-foreground">
          {notesOf(state, catalog).facts.map((fact) => (
            <p key={fact}>{fact}</p>
          ))}
          {state.tip === 'cheltuieli' || state.tip === 'venituri' ? (
            <p>{t`Cota unui rând e din totalul aceluiași buletin; un nivel taie arborele buletinului astfel încât rândurile să se adune la total.`}</p>
          ) : null}
          {state.tip === 'ministere' ? <p>{t`Cota unui ordonator e din plățile întregului buget de stat raportate la ANAF în aceeași perioadă.`}</p> : null}
        </PopoverContent>
      </Popover>
    </footer>
  )
}

// ──────────────────────────────────────────────────────────── pending ──

function AnalysisPending({ state }: { readonly state: AnalysisState }) {
  return (
    <div aria-busy="true">
      <section className="relative border-b">
        <RuledFrame className="py-10 sm:py-12 lg:py-14">
          <MonoLabel className="text-muted-foreground">{t`Bugetul statului / Analize`}</MonoLabel>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tighter text-foreground sm:mt-8 sm:text-5xl">
            <Bone className="w-4/5" />
          </h1>
          <p className="mt-6 text-sm">
            <Bone className="w-64" />
          </p>
        </RuledFrame>
      </section>
      <nav className="border-b">
        <RuledFrame className="flex h-12 items-center gap-6">
          {ORDER.map((tip) => (
            <span key={tip} className={cn('text-sm', state.tip === tip ? 'font-medium' : 'text-muted-foreground')}>
              {populationLabel(tip)}
            </span>
          ))}
        </RuledFrame>
      </nav>
      <FiguresPending />
      <RuledFrame className="py-12">
        <TablePending />
      </RuledFrame>
    </div>
  )
}
