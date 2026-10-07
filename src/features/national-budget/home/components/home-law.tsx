import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { plural, t } from '@lingui/core/macro'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { BandRead, NotesMarker } from '@/features/national-budget/analytics/components/analytics-parts'
import { approvedRecordsOptions, approvedTotalsOptions, useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { FUND_OF, SPENDING_TOTAL_OF, approvedStatusText, changeText, chapterLabel, fundLabel, lawText } from '@/features/national-budget/analytics/lib/analytics-view'
import type { LawFund } from '@/features/national-budget/analytics/lib/analytics-state'
import { plotOf } from '@/features/national-budget/analytics/lib/exact'
import { HUB_BESIDE_TITLE_CLASS, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { inSentence } from '@/features/national-budget/analytics/lib/analytics-format'
import { cn } from '@/lib/utils'
import type { BudgetApprovedEdition } from '@/schemas/national-budget-api'
import { PartRows, Treemap } from './home-charts'
import { type Part } from '../lib/home-geometry'
import { useHomeYear } from '../hooks/use-home-year'
import { lawEditionOf } from '../lib/home-data'
import { lawDeficitInput, leiFor, planTotalsInput, previousEdition } from '../lib/home-law'
import { useLawChapters } from '../hooks/use-home-data'
import { moneyText, restOf, shareNumber, shareOf } from '../lib/home-format'
import { AnalyticsLink, type BandProps } from './home-shell'

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


function Head({ index, titleId, lede }: Pick<BandProps, 'index' | 'titleId'> & { readonly lede: ReactNode }) {
  return <HubSectionHead titleId={titleId} index={index} title={t`Ce a aprobat Parlamentul`} lede={lede} />
}

/** A year no law answers: says so, and offers the nearest law's year. */
function NoLaw({ view, index, titleId }: BandProps) {
  const catalog = useNationalCatalog()
  const { setYear } = useHomeYear()
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
  const { data } = useSuspenseQuery(approvedRecordsOptions(client, catalog.snapshots.approved, lawDeficitInput(edition)))
  if (edition.hasConflictingInterpretations) return null
  return leiFor(
    data.rows.find((row) => row.codes.capitol === '9901'),
    edition.budgetYear,
  )
}

// ──────────────────────────────────────────────────────── the year's plan ──

/** Each fund's spending and revenue in this law and the one before, each for its own year: one read. */
function usePlanTotals(edition: BudgetApprovedEdition, previous: BudgetApprovedEdition | null) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(approvedTotalsOptions(client, catalog.snapshots.approved, planTotalsInput(edition, previous)))
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
 * the year's law as a plan. The state budget's planned
 * revenue against its approved spending, the deficit the law prints hatched
 * between them, and the change on the previous year's law; the three funds
 * with laws of their own as rows (never added to it). Under them, what the
 * law sets aside chapter by chapter, as the page's treemap, each chapter with
 * its change on the previous law. The caveats sit behind one marker.
 */
/** Whether the page runs in the browser: false on the server and through hydration, true after. */
const subscribeNever = () => () => {}
const useHydrated = () =>
  useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )

function LawPlan({ index, titleId, edition }: BandProps & { readonly edition: BudgetApprovedEdition }) {
  const hydrated = useHydrated()
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
              <p className="text-sm text-muted-foreground">
                {totals.now('stat', 'spending')?.status === 'NO_MATCHING_RECORD' || !totals.now('stat', 'spending')
                  ? t`Anexa de sinteză a legii pe ${year} nu are totalul cheltuielilor marcat drept credite bugetare, așa că nu putem arăta planul.`
                  : approvedStatusText(totals.now('stat', 'spending')!.status)}
              </p>
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
        {/* Read in the browser: the law's rows come in pages of 100, one after another (some 5 s), and the server's document would wait for them. */}
        <BandRead resetKey={edition.id} fallback={<HubPending rows={8} />}>
          {hydrated ? <PlanChapters edition={edition} previous={previous} /> : <HubPending rows={8} />}
        </BandRead>
      </div>
    </div>
  )
}

const PLAN_NAMED = 11

/** What the law sets aside, chapter by chapter: the treemap and its rows, each chapter with its change on the previous law. */
function PlanChapters({ edition, previous }: { readonly edition: BudgetApprovedEdition; readonly previous: BudgetApprovedEdition | null }) {
  const { now, before } = useLawChapters(edition, previous)
  const [active, setActive] = useState<string | null>(null)
  const total = now.total
  const earlier = new Map((before?.chapters ?? []).map((chapter) => [chapter.code, chapter.lei]))
  const ranked = [...now.chapters].sort((a, b) => (plotOf(b.lei) ?? 0) - (plotOf(a.lei) ?? 0))
  // 2016, 2017: the synthesis lists its rows without a credit type, so a read of budget credits finds none (the chapters exist).
  if (ranked.length === 0) return <p className="text-sm text-muted-foreground">{t`Anexa de sinteză a legii pe ${edition.budgetYear} nu are rânduri marcate drept credite bugetare, așa că nu putem arăta capitolele ei.`}</p>
  // Without the printed 5001 total there is nothing to divide by: the law's chapters stand, but not as shares of a whole.
  if (!total) return <p className="text-sm text-muted-foreground">{t`Legea pe ${edition.budgetYear} nu tipărește totalul cheltuielilor bugetului de stat (rândul 5001), așa că nu putem arăta capitolele ca părți ale lui.`}</p>
  const shown = ranked.slice(0, PLAN_NAMED)
  const parts: Part[] = shown.map((chapter) => ({
    key: chapter.code,
    label: chapterLabel(chapter.code, chapter.printed),
    amount: moneyText(chapter.lei),
    ...shareOf(chapter.lei, total),
    change: changeText(chapter.lei, earlier.get(chapter.code) ?? null),
  }))
  const rest = restOf(
    total,
    shown.map((chapter) => chapter.lei),
  )
  if (rest && (shareNumber(rest, total) ?? 0) > 0.05) {
    const others = ranked.slice(PLAN_NAMED)
    parts.push({
      key: 'rest',
      label: plural(others.length, { one: 'Încă un capitol', few: 'Celelalte # capitole', other: 'Celelalte # de capitole' }),
      hint: others.map((chapter) => chapterLabel(chapter.code, chapter.printed)).join(', '),
      amount: moneyText(rest),
      ...shareOf(rest, total),
      rest: true,
    })
  }
  const [first, second] = parts
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <MonoLabel className="text-primary">{t`Pe ce a aprobat bani legea, pe capitole`}</MonoLabel>
          {first && second ? (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {t`Din ${moneyText(total)} aprobați pentru bugetul de stat, cei mai mulți au mers la ${inSentence(first.label)} (${first.shareLabel}) și la ${inSentence(second.label)} (${second.shareLabel}).`}
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

const LawPlanGuarded = withLaw(LawPlan)

export function LawBand(props: BandProps) {
  return <LawPlanGuarded {...props} />
}
