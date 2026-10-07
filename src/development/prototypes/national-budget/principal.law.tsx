import { Suspense, useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { useQueryClient, useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { NotesMarker } from '@/features/national-budget/analytics/components/analytics-parts'
import { approvedRecordsOptions, approvedSeriesOptions, approvedTotalsOptions, useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { FUND_OF, SPENDING_TOTAL_OF, approvedStatusText, changeText, chapterLabel, fundLabel, lawText } from '@/features/national-budget/analytics/lib/analytics-view'
import type { LawFund } from '@/features/national-budget/analytics/lib/analytics-state'
import { exactRounded, plotOf, thousandToLei } from '@/features/national-budget/analytics/lib/exact'
import { toAnalyticsSeries } from '@/features/national-budget/analytics/lib/series'
import { HUB_BESIDE_TITLE_CLASS, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { BudgetApprovedCodes, BudgetApprovedEdition, BudgetApprovedRecord } from '@/schemas/national-budget-api'
import { PartRows, RankedRows, Treemap, YearColumns, shareLabel, type Part, type YearBar } from './principal.charts'
import { lawEditionOf, useLawTotals, useYear } from './principal.data'
import { moneyText, restOf, shareNumber, shareText } from './principal.format'
import { AnalyticsLink, SourceNote, type BandDefinition, type BandProps } from './principal.shell'

/**
 * „Ce a aprobat Parlamentul": the year's budget laws as published — the four
 * funds' approved spending and planned revenue, the state budget's approved
 * chapters (education, defence, …), and the state budget law after law.
 * Every figure is a printed line of a law; the four funds are four separate
 * budgets and are never added. Law and execution never share a chart: the
 * law is the initial one (rectifications are not loaded), so no rate of
 * execution against it. A year without a law (2026: still pending) says so
 * and offers the nearest law.
 */

const FUNDS: readonly LawFund[] = ['stat', 'asigurari', 'sanatate', 'somaj']

/** What each fund pays for, in a reader's words. */
function fundHint(fund: LawFund): string {
  switch (fund) {
    case 'stat':
      return t`ministerele, armata, poliția, școlile; completează celelalte bugete`
    case 'asigurari':
      return t`pensiile din sistemul public`
    case 'sanatate':
      return t`spitale, medicamente compensate, medici de familie`
    case 'somaj':
      return t`ajutoarele de șomaj și programele de ocupare`
  }
}

const blank = (value: string | null | undefined) => !value || value.trim() === ''
const economicCode = (codes: BudgetApprovedCodes) => (codes.grupa ?? '').trim() || (codes.titlu ?? '').trim()
/** A chapter's own total row: every code below the chapter blank. */
const chapterLevel = (codes: BudgetApprovedCodes) => blank(codes.subcapitol) && blank(codes.paragraf) && economicCode(codes) === '' && blank(codes.articol) && blank(codes.alineat)
/** The spending totals' own codes (5000, 5001, 5005): never a chapter. */
const totalCode = (capitol: string) => /^500\d$/u.test(capitol)

/** A record's value for a target year, in lei, exactly (the law prints thousand lei). */
function leiFor(record: BudgetApprovedRecord | undefined, year: number): string | null {
  const slot = record?.values.find((value) => value.measureYear === year)
  return slot?.value ? thousandToLei(slot.value) : null
}

function Head({ index, titleId, lede }: Pick<BandProps, 'index' | 'titleId'> & { readonly lede: ReactNode }) {
  return <HubSectionHead titleId={titleId} index={index} title={t`Ce a aprobat Parlamentul`} lede={lede} />
}

function Initial() {
  return (
    <p className="mt-6 max-w-[56ch] border-l-2 border-primary/60 pl-4 text-sm leading-relaxed text-muted-foreground">
      {t`Legea inițială, așa cum a fost publicată; rectificările din cursul anului nu sunt încă în date. De aceea nu o comparăm cu ce s-a plătit: ar fi două bugete diferite.`}
    </p>
  )
}

function Sources({ year }: { readonly year: number }) {
  return <SourceNote>{t`Sursa: ${lawText(year)} și legile bugetelor de asigurări, cum au fost publicate; credite bugetare. Fiecare fond e un buget separat: nu se adună.`}</SourceNote>
}

/** A year no law answers: says so, and offers the nearest law's year. */
function NoLaw({ view, index, titleId }: BandProps) {
  const catalog = useNationalCatalog()
  const { setYear } = useYear()
  const years = catalog.approved.editions.map((edition) => edition.budgetYear)
  const nearest = years.length > 0 ? years.reduce((best, year) => (Math.abs(year - view.year) < Math.abs(best - view.year) ? year : best)) : null
  return (
    <div className="max-w-2xl">
      <Head index={index} titleId={titleId} lede={null} />
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        {view.year > Math.max(...years)
          ? t`Legea bugetului pe ${view.year} nu e încă în date: avem legile din ${Math.min(...years)}–${Math.max(...years)}.`
          : t`Pentru ${view.year} nu avem legea bugetului: avem legile din ${Math.min(...years)}–${Math.max(...years)}.`}
      </p>
      {nearest !== null ? (
        <button
          type="button"
          onClick={() => setYear(nearest)}
          className="mt-5 inline-flex min-h-11 items-center rounded-sm border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {t`Vezi legea pe ${nearest}`}
        </button>
      ) : null}
    </div>
  )
}

/** The designs read a law only for a year that has one. */
function withLaw(Design: (props: BandProps & { readonly edition: BudgetApprovedEdition }) => ReactNode) {
  return function Guarded(props: BandProps) {
    const catalog = useNationalCatalog()
    const edition = lawEditionOf(catalog, props.view.year)
    return edition ? <Design {...props} edition={edition} /> : <NoLaw {...props} />
  }
}

/** The state budget law's printed deficit (row 9901), in lei. */
function useLawDeficit(edition: BudgetApprovedEdition): string | null {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(
    approvedRecordsOptions(client, catalog.snapshots.approved, { editionId: edition.id, form: 'STATE_BUDGET_SYNTHESIS', rowRoles: ['DESCRIPTOR'], capitols: ['9901'] }),
  )
  if (edition.hasConflictingInterpretations) return null
  return leiFor(
    data.rows.find((row) => row.codes.capitol === '9901'),
    edition.budgetYear,
  )
}

// ───────────────────────────────────────────────────────────── the funds ──

/**
 * A: the four funds, each a card: its approved spending on one scale with
 * the others (never added), its planned revenue, what it pays for; the state
 * budget's printed deficit under it.
 */
function LawFunds({ index, titleId, edition }: BandProps & { readonly edition: BudgetApprovedEdition }) {
  const totals = useLawTotals(edition)
  const deficit = useLawDeficit(edition)
  const year = edition.budgetYear
  const widest = Math.max(...FUNDS.map((fund) => plotOf(totals.spending(fund)?.value) ?? 0), 1)
  const state = totals.spending('stat')?.value ?? null
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-4">
        <Head
          index={index}
          titleId={titleId}
          lede={state ? t`Legea bugetului pe ${year} a aprobat ${moneyText(state)} pentru cheltuielile bugetului de stat. Pensiile, sănătatea și șomajul au legi și bugete separate.` : null}
        />
        <Initial />
        <div className="mt-6 flex flex-wrap gap-x-5">
          <AnalyticsLink patch={{ tip: 'lege', an: year }}>{t`Legea, pe fonduri și ani`}</AnalyticsLink>
          <AnalyticsLink patch={{ tip: 'lege', dupa: 'capitole', an: year }}>{t`Pe capitole`}</AnalyticsLink>
        </div>
      </div>
      <div className={cn('lg:col-span-8', HUB_BESIDE_TITLE_CLASS)}>
        <ul className="grid grid-cols-1 gap-px border bg-border/70 sm:grid-cols-2">
          {FUNDS.map((fund) => {
            const spending = totals.spending(fund)
            const revenue = totals.revenue(fund)
            const lei = plotOf(spending?.value)
            return (
              <li key={fund} className="flex flex-col bg-background p-5">
                <span className="text-sm font-semibold text-foreground">{fundLabel(fund)}</span>
                <span className="mt-1 text-xs leading-snug text-muted-foreground">{fundHint(fund)}</span>
                <MonoLabel className="mt-5 block text-muted-foreground">{t`Cheltuieli aprobate`}</MonoLabel>
                <span className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {spending?.value ? moneyText(spending.value) : <span className="text-base font-normal text-muted-foreground">{spending ? approvedStatusText(spending.status) : t`fără valoare`}</span>}
                </span>
                <span className="mt-2 block h-1.5 w-full bg-muted" aria-hidden="true">
                  <span className="block h-full bg-primary" style={{ width: `${((lei ?? 0) / widest) * 100}%` }} />
                </span>
                <span className="mt-4 grid grid-cols-[1fr_auto] gap-x-3 text-sm">
                  <span className="text-muted-foreground">{t`Venituri prevăzute`}</span>
                  <span className="tabular-nums text-foreground">{revenue?.value ? moneyText(revenue.value) : revenue ? approvedStatusText(revenue.status) : '—'}</span>
                  {fund === 'stat' && deficit ? (
                    <>
                      <span className="text-muted-foreground">{t`Deficit prevăzut`}</span>
                      <span className="tabular-nums text-foreground">{moneyText(deficit.replace(/^-/u, ''))}</span>
                    </>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
        <MonoLabel className="mt-3 block text-muted-foreground">{t`Barele, pe aceeași scară: fonduri separate, nu părți ale unui întreg`}</MonoLabel>
        <Sources year={year} />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the chapters ──

/** The state budget's approved chapters, ranked, with the share of its printed 5001 total. */
function useLawChapters(edition: BudgetApprovedEdition) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(
    approvedRecordsOptions(client, catalog.snapshots.approved, { editionId: edition.id, form: 'STATE_BUDGET_SYNTHESIS', rowRoles: ['CREDIT'], creditTypes: ['BUDGET_CREDITS'] }),
  )
  const year = edition.budgetYear
  const total = leiFor(
    data.rows.find((row) => row.codes.capitol === '5001' && chapterLevel(row.codes)),
    year,
  )
  const chapters = data.rows
    .filter((row) => chapterLevel(row.codes) && !totalCode(row.codes.capitol) && !row.codes.capitol.endsWith('00'))
    .flatMap((row) => {
      const lei = leiFor(row, year)
      return lei ? [{ code: row.codes.capitol, label: chapterLabel(row.codes.capitol, row.contextLabel), lei }] : []
    })
    .sort((a, b) => (plotOf(b.lei) ?? 0) - (plotOf(a.lei) ?? 0))
  return { total, chapters, truncated: data.truncated }
}

const NAMED = 10

function ChapterBars({ edition }: { readonly edition: BudgetApprovedEdition }) {
  const { total, chapters } = useLawChapters(edition)
  const [all, setAll] = useState(false)
  if (chapters.length === 0 || !total) return <p className="text-sm text-muted-foreground">{t`Legea nu are capitole de cheltuieli în această anexă.`}</p>
  const widest = plotOf(chapters[0]?.lei) ?? 1
  const rows = chapters.slice(0, all ? chapters.length : NAMED).map((chapter) => ({
    key: chapter.code,
    label: chapter.label,
    sub: t`${shareText(chapter.lei, total) ?? ''} din bugetul de stat · cap. ${chapter.code}`,
    amount: moneyText(chapter.lei),
    bar: ((plotOf(chapter.lei) ?? 0) / widest) * 100,
  }))
  return (
    <>
      <MonoLabel className="mb-3 block text-muted-foreground">{t`Aprobat în lege pentru ${edition.budgetYear}, pe capitole · din ${moneyText(total)}`}</MonoLabel>
      <RankedRows rows={rows} />
      {chapters.length > NAMED ? (
        <button type="button" onClick={() => setAll(!all)} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline">
          {all ? t`Primele ${NAMED}` : t`Toate cele ${chapters.length} capitole`}
        </button>
      ) : null}
    </>
  )
}

/**
 * B: the state budget's approved chapters as ranked bars — what Parliament
 * set aside for education, defence, roads — clearly approved, not spent.
 */
function LawChapters({ index, titleId, edition }: BandProps & { readonly edition: BudgetApprovedEdition }) {
  const totals = useLawTotals(edition)
  const year = edition.budgetYear
  const state = totals.spending('stat')?.value ?? null
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">
        <Head
          index={index}
          titleId={titleId}
          lede={state ? t`Pentru ${year}, legea a aprobat ${moneyText(state)} pentru bugetul de stat. Așa le-a împărțit pe domenii.` : null}
        />
        <Initial />
        <div className="mt-6 flex flex-wrap gap-x-5">
          <AnalyticsLink patch={{ tip: 'lege', dupa: 'capitole', an: year }}>{t`Capitolele, deschise pe titluri`}</AnalyticsLink>
          <AnalyticsLink patch={{ tip: 'ministere', an: year }}>{t`Pe ministere`}</AnalyticsLink>
        </div>
      </div>
      <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)}>
        <Suspense fallback={<HubPending rows={10} />}>
          <ChapterBars edition={edition} />
        </Suspense>
        <Sources year={year} />
      </div>
    </div>
  )
}

/** B′: the same chapters as one treemap across the band, the largest named, the rest as one. */
function ChapterBlocks({ edition }: { readonly edition: BudgetApprovedEdition }) {
  const { total, chapters } = useLawChapters(edition)
  const [active, setActive] = useState<string | null>(null)
  if (chapters.length === 0 || !total) return <p className="text-sm text-muted-foreground">{t`Legea nu are capitole de cheltuieli în această anexă.`}</p>
  const shown = chapters.slice(0, NAMED)
  const rest = restOf(
    total,
    shown.map((chapter) => chapter.lei),
  )
  const parts: Part[] = shown.map((chapter) => ({ key: chapter.code, label: chapter.label, amount: moneyText(chapter.lei), share: shareNumber(chapter.lei, total) ?? 0 }))
  if (rest && (shareNumber(rest, total) ?? 0) > 0.05) {
    parts.push({ key: 'rest', label: t`Celelalte ${chapters.length - shown.length} capitole`, amount: moneyText(rest), share: shareNumber(rest, total) ?? 0, rest: true })
  }
  return (
    <>
      <Treemap parts={parts} active={active} onActive={setActive} aspect="aspect-[4/3] sm:aspect-[16/7]" />
      <PartRows className="mt-8 sm:columns-2 sm:gap-8 [&>li]:break-inside-avoid" parts={parts} active={active} onActive={setActive} showBars={false} />
    </>
  )
}

// ──────────────────────────────────────────────────────────── law by law ──

/** Each year's own law: the state budget's approved spending, 2016 on. */
function useLawYears() {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const years = catalog.approved.editions.map((edition) => edition.budgetYear)
  const start = Math.min(...years)
  const end = Math.max(...years)
  const { data } = useSuspenseQuery(
    approvedSeriesOptions(client, catalog.snapshots.approved, {
      axis: { ownYearApprovals: {} },
      fund: 'STATE_BUDGET',
      total: 'EXPENDITURE_5001_STATE_BUDGET',
      creditType: 'BUDGET_CREDITS',
      years: { start, end },
    }),
  )
  const chart = toAnalyticsSeries('approved', data)
  return data.periods.map((period): YearBar => {
    const exact = chart.pointDetails[period.date]?.exact ?? null
    return {
      year: Number(period.date),
      value: exact ? exactRounded(exact, 9, 1) : null,
      text: exact ? moneyText(exact) : null,
      gap: exact ? null : period.status === 'NO_MATCHING_RECORD' ? t`legea anului nu are rândul de total al bugetului de stat` : approvedStatusText(period.status),
    }
  })
}

/**
 * C: law after law — the state budget's approved spending in each year's own
 * law, the page's year highlighted (a click makes a year the page's); under
 * it, the year's four funds and the chapters as blocks.
 */
function LawYears({ view, index, titleId }: BandProps) {
  const { setYear } = useYear()
  const bars = useLawYears()
  const catalog = useNationalCatalog()
  const edition = lawEditionOf(catalog, view.year)
  const known = bars.filter((bar) => bar.value !== null)
  const first = known[0]
  const last = known[known.length - 1]
  return (
    <div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Head
            index={index}
            titleId={titleId}
            lede={
              first?.text && last?.text && first.year !== last.year
                ? t`Legea pe ${first.year} a aprobat ${first.text} pentru cheltuielile bugetului de stat; legea pe ${last.year}, ${last.text}, în lei ai fiecărui an.`
                : null
            }
          />
          {edition ? null : (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t`Legea bugetului pe ${view.year} nu e încă în date. Alege un an pe grafic.`}</p>
          )}
          <Initial />
          <div className="mt-6 flex flex-wrap gap-x-5">
            <AnalyticsLink patch={{ tip: 'lege', dupa: 'legi' }}>{t`Lege după lege, cu estimările`}</AnalyticsLink>
          </div>
        </div>
        <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)}>
          <YearColumns bars={bars} selected={view.year} onSelect={setYear} label={t`Bugetul de stat aprobat, pe legi · alege un an`} />
          <Sources year={edition?.budgetYear ?? last?.year ?? view.year} />
        </div>
      </div>
      {edition ? (
        <div className="mt-12">
          <MonoLabel className="mb-3 block text-muted-foreground">{t`Legea pe ${edition.budgetYear}: bugetul de stat pe capitole (aprobat, nu plătit)`}</MonoLabel>
          <Suspense fallback={<HubPending rows={6} />}>
            <ChapterBlocks edition={edition} />
          </Suspense>
        </div>
      ) : null}
    </div>
  )
}

// ──────────────────────────────────────────────────────── the year's plan ──

/** The edition before this one, when it is loaded: its own year's figures are what a change compares with. */
function previousEdition(editions: readonly BudgetApprovedEdition[], edition: BudgetApprovedEdition): BudgetApprovedEdition | null {
  return editions.find((entry) => entry.budgetYear === edition.budgetYear - 1) ?? null
}

/** Each fund's spending and revenue in this law and the one before, each for its own year: one read. */
function usePlanTotals(edition: BudgetApprovedEdition, previous: BudgetApprovedEdition | null) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(
    approvedTotalsOptions(client, catalog.snapshots.approved, {
      totals: ['EXPENDITURE_5001_STATE_BUDGET', 'EXPENDITURE_5000_TOTAL_GENERAL', 'REVENUE_TOTAL'],
      editionIds: previous ? [previous.id, edition.id] : [edition.id],
      creditTypes: ['BUDGET_CREDITS'],
      measureYears: previous ? [previous.budgetYear, edition.budgetYear] : [edition.budgetYear],
    }),
  )
  const cell = (of: BudgetApprovedEdition | null, fund: LawFund, kind: 'spending' | 'revenue') =>
    of
      ? (data.find(
          (entry) =>
            entry.edition.budgetYear === of.budgetYear &&
            entry.measureYear === of.budgetYear &&
            entry.fund === FUND_OF[fund] &&
            entry.total === (kind === 'spending' ? SPENDING_TOTAL_OF[fund] : 'REVENUE_TOTAL'),
        ) ?? null)
      : null
  return {
    now: (fund: LawFund, kind: 'spending' | 'revenue') => cell(edition, fund, kind),
    before: (fund: LawFund, kind: 'spending' | 'revenue') => cell(previous, fund, kind),
  }
}

/** The state budget's approved chapters in this law and, by chapter code (the functional classification, stable from law to law), in the one before. */
function usePlanChapters(edition: BudgetApprovedEdition, previous: BudgetApprovedEdition | null) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const options = (of: BudgetApprovedEdition) =>
    approvedRecordsOptions(client, catalog.snapshots.approved, { editionId: of.id, form: 'STATE_BUDGET_SYNTHESIS', rowRoles: ['CREDIT'], creditTypes: ['BUDGET_CREDITS'] })
  // Without a law the year before, the second read is this law's own (the same key: one request), and is not used.
  const results = useSuspenseQueries({ queries: [options(edition), options(previous ?? edition)] })
  const chaptersOf = (rows: readonly BudgetApprovedRecord[], year: number) =>
    new Map(
      rows
        .filter((row) => chapterLevel(row.codes) && !totalCode(row.codes.capitol) && !row.codes.capitol.endsWith('00'))
        .flatMap((row) => {
          const lei = leiFor(row, year)
          return lei ? [[row.codes.capitol, { label: chapterLabel(row.codes.capitol, row.contextLabel), lei }] as const] : []
        }),
    )
  const now = chaptersOf(results[0].data.rows, edition.budgetYear)
  const before = previous ? chaptersOf(results[1].data.rows, previous.budgetYear) : new Map<string, { readonly label: string; readonly lei: string }>()
  const total = leiFor(
    results[0].data.rows.find((row) => row.codes.capitol === '5001' && chapterLevel(row.codes)),
    edition.budgetYear,
  )
  return { now, before, total }
}

/** The plan's balance: planned revenue and approved spending on one scale, the deficit the law prints hatched between them. */
function PlanBalance({ revenue, spending, deficit }: { readonly revenue: string; readonly spending: string; readonly deficit: string | null }) {
  const income = plotOf(revenue) ?? 0
  const outgo = plotOf(spending) ?? 0
  const max = Math.max(income, outgo, 1)
  const rows = [
    { key: 'venituri', label: t`Venituri prevăzute`, amount: revenue, value: income, fill: 'bg-chart-sky' },
    { key: 'cheltuieli', label: t`Cheltuieli aprobate`, amount: spending, value: outgo, fill: 'bg-primary' },
  ]
  return (
    <dl className="space-y-4">
      {rows.map((row) => (
        <div key={row.key}>
          <dt className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-semibold tabular-nums text-foreground">{moneyText(row.amount)}</span>
          </dt>
          <dd className="relative mt-1.5 h-6 bg-muted">
            <span className={cn('block h-full rounded-r-[3px]', row.fill)} style={{ width: `${(row.value / max) * 100}%` }} />
            {row.key === 'cheltuieli' && outgo > income ? (
              <span
                aria-hidden="true"
                className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,hsl(var(--background)/0.55)_0_2px,transparent_2px_6px)]"
                style={{ left: `${(income / max) * 100}%`, width: `${((outgo - income) / max) * 100}%` }}
              />
            ) : null}
          </dd>
        </div>
      ))}
      {deficit ? (
        <div className="flex items-baseline justify-between gap-4 border-t pt-3 text-sm">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <span aria-hidden="true" className="inline-block size-3 rounded-[2px] bg-primary bg-[repeating-linear-gradient(135deg,hsl(var(--background)/0.55)_0_2px,transparent_2px_6px)]" />
            {t`Deficit prevăzut`}
          </dt>
          <dd className="font-semibold tabular-nums text-foreground">{moneyText(deficit.replace(/^-/u, ''))}</dd>
        </div>
      ) : null}
    </dl>
  )
}

/** A change on the previous law, as a small mono note: „+12,3% față de legea pe 2024". */
function SinceLaw({ change, year }: { readonly change: string | null; readonly year: number }) {
  if (!change) return null
  return <MonoLabel className="text-muted-foreground">{t`${change} față de legea pe ${year}`}</MonoLabel>
}

/**
 * A (6 October): the year's law as a plan. The state budget's planned
 * revenue against its approved spending, the deficit the law prints hatched
 * between them, and the change on the previous year's law; the three funds
 * with laws of their own as rows (never added to it). Under them, what the
 * law sets aside chapter by chapter, as the page's treemap, each chapter with
 * its change on the previous law. The caveats sit behind one marker.
 */
function LawPlan({ index, titleId, edition }: BandProps & { readonly edition: BudgetApprovedEdition }) {
  const catalog = useNationalCatalog()
  const previous = previousEdition(catalog.approved.editions, edition)
  const totals = usePlanTotals(edition, previous)
  const deficit = useLawDeficit(edition)
  const year = edition.budgetYear
  const stateSpending = totals.now('stat', 'spending')?.value ?? null
  const stateRevenue = totals.now('stat', 'revenue')?.value ?? null
  const stateChange = changeText(stateSpending, totals.before('stat', 'spending')?.value ?? null)
  const others: readonly LawFund[] = ['asigurari', 'sanatate', 'somaj']
  const widest = Math.max(...others.map((fund) => plotOf(totals.now(fund, 'spending')?.value) ?? 0), 1)
  return (
    <div>
      {/* On a phone: the head, the state budget's plan, the other funds. On a wide screen the funds sit under the head, the plan beside both. */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-10">
        <div className="lg:col-span-5 lg:row-start-1">
          <Head
            index={index}
            titleId={titleId}
            lede={
              stateSpending
                ? deficit
                  ? t`Pentru ${year}, legea bugetului de stat a aprobat cheltuieli de ${moneyText(stateSpending)}, cu un deficit prevăzut de ${moneyText(deficit.replace(/^-/u, ''))}.`
                  : t`Pentru ${year}, legea bugetului de stat a aprobat cheltuieli de ${moneyText(stateSpending)}.`
                : null
            }
          />
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1">
            <AnalyticsLink patch={{ tip: 'lege', an: year }}>{t`Legea, pe fonduri și ani`}</AnalyticsLink>
            <AnalyticsLink patch={{ tip: 'lege', dupa: 'capitole', an: year }}>{t`Pe capitole și titluri`}</AnalyticsLink>
            <NotesMarker
              alerts={[]}
              facts={[
                t`Legea inițială, așa cum a fost publicată; rectificările din cursul anului nu sunt încă în date, așa că nu o comparăm cu ce s-a plătit.`,
                t`Pensiile, sănătatea și șomajul au bugete și legi proprii: fiecare fond e separat și nu se adună cu bugetul de stat.`,
                t`Sursa: ${lawText(year)} și legile bugetelor de asigurări, cum au fost publicate; credite bugetare.`,
              ]}
            />
          </div>
        </div>
        <div className={cn('lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1', HUB_BESIDE_TITLE_CLASS)}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <MonoLabel className="text-primary">{t`Bugetul de stat, legea pe ${year}`}</MonoLabel>
            <SinceLaw change={stateChange} year={year - 1} />
          </div>
          <div className="mt-4">
            {stateSpending && stateRevenue ? (
              <PlanBalance revenue={stateRevenue} spending={stateSpending} deficit={deficit} />
            ) : (
              <p className="text-sm text-muted-foreground">{approvedStatusText(totals.now('stat', 'spending')?.status ?? 'NO_MATCHING_RECORD')}</p>
            )}
          </div>
        </div>
        <div className="lg:col-span-5 lg:row-start-2">
          <MonoLabel className="block text-muted-foreground">{t`Bugetele cu legi proprii`}</MonoLabel>
          <ul className="mt-2 divide-y divide-border/70 border-y border-border/70">
            {others.map((fund) => {
              const spending = totals.now(fund, 'spending')
              const change = changeText(spending?.value ?? null, totals.before(fund, 'spending')?.value ?? null)
              return (
                <li key={fund} className="grid grid-cols-[1fr_auto] items-start gap-x-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground">{fundLabel(fund)}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{fundHint(fund)}</span>
                    <span className="mt-2 block h-1 w-full bg-muted" aria-hidden="true">
                      <span className="block h-full bg-primary/70" style={{ width: `${Math.max(((plotOf(spending?.value) ?? 0) / widest) * 100, 0.5)}%` }} />
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold tabular-nums text-foreground">
                      {spending?.value ? moneyText(spending.value) : spending ? approvedStatusText(spending.status) : '—'}
                    </span>
                    {change ? <MonoLabel className="mt-1 block text-muted-foreground">{change}</MonoLabel> : null}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <div className="mt-14 border-t pt-10">
        <Suspense fallback={<HubPending rows={8} />}>
          <PlanChapters edition={edition} previous={previous} />
        </Suspense>
      </div>
    </div>
  )
}

const PLAN_NAMED = 11

/** What the law sets aside, chapter by chapter: the treemap and its rows, each chapter with its change on the previous law. */
function PlanChapters({ edition, previous }: { readonly edition: BudgetApprovedEdition; readonly previous: BudgetApprovedEdition | null }) {
  const { now, before, total } = usePlanChapters(edition, previous)
  const [active, setActive] = useState<string | null>(null)
  const ranked = [...now].sort((a, b) => (plotOf(b[1].lei) ?? 0) - (plotOf(a[1].lei) ?? 0))
  if (ranked.length === 0 || !total) return <p className="text-sm text-muted-foreground">{t`Legea pe ${edition.budgetYear} nu are capitole de cheltuieli în anexa de sinteză.`}</p>
  const shown = ranked.slice(0, PLAN_NAMED)
  const parts: Part[] = shown.map(([code, chapter]) => ({
    key: code,
    label: chapter.label,
    amount: moneyText(chapter.lei),
    share: shareNumber(chapter.lei, total) ?? 0,
    change: changeText(chapter.lei, before.get(code)?.lei ?? null),
  }))
  const rest = restOf(
    total,
    shown.map(([, chapter]) => chapter.lei),
  )
  if (rest && (shareNumber(rest, total) ?? 0) > 0.05) {
    const others = ranked.slice(PLAN_NAMED)
    parts.push({ key: 'rest', label: t`Celelalte ${others.length} capitole`, hint: others.map(([, chapter]) => chapter.label).join(', '), amount: moneyText(rest), share: shareNumber(rest, total) ?? 0, rest: true })
  }
  const [first, second] = parts
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <MonoLabel className="text-primary">{t`Pe ce a aprobat bani legea, pe capitole`}</MonoLabel>
          {first && second ? (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {t`Din ${moneyText(total)} aprobați pentru bugetul de stat, cei mai mulți au mers la ${first.label.toLocaleLowerCase('ro-RO')} (${shareLabel(first.share)}) și la ${second.label.toLocaleLowerCase('ro-RO')} (${shareLabel(second.share)}).`}
            </p>
          ) : null}
        </div>
        {previous ? <MonoLabel className="text-muted-foreground">{t`Variația: față de legea pe ${previous.budgetYear}`}</MonoLabel> : null}
      </div>
      <Treemap className="mt-6" parts={parts} active={active} onActive={setActive} aspect="aspect-[4/5] sm:aspect-[16/7]" />
      <PartRows className="mt-8 sm:columns-2 sm:gap-8 [&>li]:break-inside-avoid" parts={parts} active={active} onActive={setActive} showBars={false} />
    </>
  )
}

export const LAW_BAND: BandDefinition = {
  id: 'lege',
  nav: t`Legea`,
  variants: [
    { key: 'plan', title: t`Planul anului`, note: t`Legea bugetului de stat ca plan: venituri prevăzute față de cheltuieli aprobate, deficitul tipărit hașurat, variația față de legea anului trecut; fondurile cu legi proprii ca rânduri; dedesubt, capitolele ca suprafețe.`, component: withLaw(LawPlan) },
    { key: 'fonduri', title: t`Cele patru fonduri`, note: t`Câte un card pentru fiecare lege: cheltuieli aprobate pe aceeași scară (nu se adună), venituri prevăzute, deficitul tipărit al bugetului de stat.`, component: withLaw(LawFunds) },
    { key: 'capitole', title: t`Pe capitole`, note: t`Ce a aprobat legea pentru bugetul de stat, pe domenii (învățământ, apărare, drumuri), ca bare; „aprobat", nu „plătit".`, component: withLaw(LawChapters) },
    { key: 'ani', title: t`Lege după lege`, note: t`Bugetul de stat aprobat în legea fiecărui an, 2016–2025, anul paginii evidențiat; dedesubt, capitolele legii anului ca suprafețe.`, component: LawYears },
  ],
}
