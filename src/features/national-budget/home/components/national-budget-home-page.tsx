import { Suspense, useEffect } from 'react'
import { t } from '@lingui/core/macro'

import { RevealStyles } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, stopCounting } from '@/features/landing/components/count-up'
import { BandRead } from '@/features/national-budget/analytics/components/analytics-parts'
import { useHomePrefetch } from '../hooks/use-home-data'
import { useAskedYear, useHomeYear, useShownYear } from '../hooks/use-home-year'
import type { YearView } from '../lib/home-data'
import { BalanceBand } from './home-balance'
import { BudgetsBand } from './home-budgets'
import { DomainsBand } from './home-domains'
import { FiguresBand, PageHead, PendingFiguresBand } from './home-head'
import { LawBand } from './home-law'
import { MinistriesBand } from './home-ministries'
import { NowBand } from './home-now'
import { RevenueBand } from './home-revenue'
import { Band, PageBar, PendingBand, type BandEntry } from './home-shell'
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

/**
 * Why the page shows another year than the address asks for: a year the
 * bulletins don't finish, asked for in the address (the menus don't offer
 * it), opens the default year instead. Only an address with a year reads it.
 */
function YearNotice() {
  const asked = useAskedYear()
  if (asked === undefined) return null
  return (
    <BandRead fallback={null} quiet={null}>
      <Notice />
    </BandRead>
  )
}

function Notice() {
  const { notice } = useShownYear()
  if (!notice) return null
  return (
    <div role="status" className="border-b border-amber-500/40 bg-amber-50 dark:bg-amber-950/30">
      <RuledFrame className="py-3 text-sm text-amber-950 dark:text-amber-100">{notice}</RuledFrame>
    </div>
  )
}

/**
 * The page's reads, from the catalog on: every read of the address's year
 * starts at once, then the bands for the year shown.
 */
function PageData({ bands }: { readonly bands: readonly BandEntry[] }) {
  const asked = useHomeYear()
  // Every read of the asked year, at once, before the year is checked: the bands below find theirs in flight.
  useHomePrefetch(asked.view)
  const { view } = useShownYear()
  return <PageBody bands={bands} view={view} />
}

function PageBody({ bands, view }: { readonly bands: readonly BandEntry[]; readonly view: YearView }) {
  return (
    <>
      <FiguresBand view={view} />
      {bands.map((band, position) => (
        <Band key={band.id} band={band} view={view} position={position + 1} />
      ))}
      <StartBand view={view} index={`${String(bands.length + 1).padStart(2, '0')} / ${t`Analize`}`} />
    </>
  )
}

/** The bands before the catalog: as they stand while their reads wait, so nothing moves when it arrives and the footer stays below. */
function PagePending({ bands }: { readonly bands: readonly BandEntry[] }) {
  return (
    <>
      <PendingFiguresBand />
      {bands.map((band, position) => (
        <PendingBand key={band.id} band={band} position={position + 1} />
      ))}
    </>
  )
}

/**
 * The head and the pinned bar are the page's first paint; the year's menus,
 * its balance and its bands follow their reads.
 */
export function NationalBudgetHomePage() {
  const entries = bands()
  // The count-up driver is module state; an unmount mid-flight would leave it ticking against nodes that are gone.
  useEffect(() => () => stopCounting(), [])
  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />
      <YearNotice />
      <PageHead />
      <PageBar title={t`Bugetul național`} bands={entries} />
      <Suspense fallback={<PagePending bands={entries} />}>
        <PageData bands={entries} />
      </Suspense>
    </div>
  )
}
