import { Suspense, useEffect } from 'react'
import { t } from '@lingui/core/macro'

import { RevealStyles } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, stopCounting } from '@/features/landing/components/count-up'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { useHomePrefetch, useUnfinishedYears } from '../hooks/use-home-data'
import { useHomeYear } from '../hooks/use-home-year'
import { viewOfYear } from '../lib/home-data'
import { useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { reasonText } from '@/features/national-budget/analytics/lib/analytics-view'
import { BalanceBand } from './home-balance'
import { BudgetsBand } from './home-budgets'
import { DomainsBand } from './home-domains'
import { FiguresBand, PageHead } from './home-head'
import { LawBand } from './home-law'
import { MinistriesBand } from './home-ministries'
import { NowBand } from './home-now'
import { RevenueBand } from './home-revenue'
import { Band, PageBar, type BandEntry } from './home-shell'
import { SpendingBand } from './home-spending'
import { StartBand } from './home-start'

/**
 * `/national-budget`: the national budget for every reader, one year at a
 * time (chosen in the head and in the pinned bar), one band per question:
 * what the money is spent on, on which domains, by whom; where it comes
 * from; how much is borrowed; how the year in progress goes; the budgets it
 * passes through; what the law approved; and where to go next. Each band
 * reads, waits and fails on its own. The designs are the ones the owner
 * picked from the `national-budget/principal` prototype (7 October 2026).
 */

/** The bands in a reader's order; their words resolved at render, in the reader's language. */
function bands(): readonly BandEntry[] {
  return [
    { id: 'cheltuieli', nav: t`Pe ce`, title: t`Pe ce se duc banii publici`, component: SpendingBand },
    { id: 'domenii', nav: t`Pe domenii`, title: t`Pe ce domenii plătește bugetul de stat`, component: DomainsBand },
    { id: 'ministere', nav: t`Cine`, title: t`Ministerele care cheltuie cel mai mult`, component: MinistriesBand },
    { id: 'venituri', nav: t`De unde`, title: t`De unde vin banii publici`, component: RevenueBand },
    { id: 'deficit', nav: t`Deficitul`, title: t`Cât cheltuie statul peste ce încasează`, component: BalanceBand },
    { id: 'anul', nav: t`Anul în curs`, title: t`Anul în curs`, component: NowBand, yearless: true },
    { id: 'bugete', nav: t`Bugetele`, title: t`Prin ce bugete trec banii`, component: BudgetsBand },
    { id: 'lege', nav: t`Legea`, title: t`Ce a aprobat Parlamentul`, component: LawBand },
  ]
}

type PageProps = ReturnType<typeof useHomeYear> & { readonly unavailable: ReadonlyMap<number, string | null> }

/**
 * The page with its years' availability (a read that never fails: without
 * it every year is offered). A year the bulletins don't finish, asked for in
 * the address (the menus don't offer it), opens the default year instead,
 * and says why.
 */
function Page() {
  const props = useHomeYear()
  // Every read of the year, at once: the bands below find theirs in flight.
  useHomePrefetch(props.view)
  // The count-up driver is module state; an unmount mid-flight would leave it ticking against nodes that are gone.
  useEffect(() => () => stopCounting(), [])
  const catalog = useNationalCatalog()
  const unavailable = useUnfinishedYears(props.views)
  const asked = props.view.year
  if (!unavailable.has(asked)) return <PageBody {...props} unavailable={unavailable} />
  const shown = viewOfYear(catalog, undefined)
  return (
    <PageBody
      {...props}
      view={shown}
      unavailable={unavailable}
      notice={t`Pentru ${asked} buletinele nu au anul întreg (${reasonText(unavailable.get(asked) ?? null)}); arătăm ${shown.text}.`}
    />
  )
}

function PageBody({ view, views, setYear, unavailable, notice }: PageProps & { readonly notice?: string }) {
  const entries = bands()
  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />
      {notice ? (
        <div role="status" className="border-b border-amber-500/40 bg-amber-50 dark:bg-amber-950/30">
          <RuledFrame className="py-3 text-sm text-amber-950 dark:text-amber-100">{notice}</RuledFrame>
        </div>
      ) : null}
      <PageHead view={view} views={views} unavailable={unavailable} onYear={setYear} />
      <PageBar title={t`Bugetul național`} bands={entries} view={view} views={views} unavailable={unavailable} onYear={setYear} />
      <FiguresBand view={view} />
      {entries.map((band, position) => (
        <Band key={band.id} band={band} view={view} position={position + 1} />
      ))}
      <StartBand view={view} index={`${String(entries.length + 1).padStart(2, '0')} / ${t`Analize`}`} />
    </div>
  )
}

export function NationalBudgetHomePage() {
  return (
    <Suspense
      fallback={
        <RuledFrame className="py-20">
          <HubPending rows={10} />
        </RuledFrame>
      }
    >
      <Page />
    </Suspense>
  )
}
