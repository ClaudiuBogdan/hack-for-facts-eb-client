import { useEffect, useRef } from 'react'

import { RevealStyles } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, stopCounting } from '@/features/landing/components/count-up'
import { BandRead } from '@/features/national-budget/analytics/components/analytics-parts'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import { useHomePrefetch, useUnfinishedYears } from '../hooks/use-home-data'
import { useAskedYear, useHomeYear, useShownYear } from '../hooks/use-home-year'
import { useInView } from '../hooks/use-page-year'
import { usePersonPrefetch } from '../hooks/use-person-data'
import { VIZ_PALETTE } from '../lib/chart-palette'
import { BudgetsSection } from './person-budgets'
import { DebtSection } from './person-debt'
import { FlowSection } from './person-flow'
import { FiguresRegion, FurtherSection, Hero, SectionBar } from './person-head'
import { ReceiptSection } from './person-receipt'
import { DataNote, YearScope } from './person-shell'
import { StateSection } from './person-state'
import { YearSection } from './person-year'

/**
 * `/national-budget`: the national budget at one person's scale, one year
 * at a time (from the address, `an`). The head gives the title per
 * resident and the year's balance; the sections answer where the money
 * came from and went (as 100 lei), which budgets it passed through, what
 * the state budget paid on what and through whom, how much is borrowed
 * year after year, how the year in progress goes, and where to go further.
 * Each section reads, waits and fails on its own. Promoted from the
 * prototype `national-budget/persoana`, variant `lucru` (owner, 25 November
 * 2026; the prototype stays, as the owner keeps prototypes).
 */

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

/** The page's reads for the address's year, started at once (the live ones and the page's own); it draws nothing. */
function Prefetch() {
  const asked = useHomeYear()
  useHomePrefetch(asked.view)
  usePersonPrefetch(asked.view)
  // The years the bulletins don't finish, read once now: a year picked later is checked against them without a wait,
  // so the sections keep their figures through the change instead of falling back to their skeletons.
  useUnfinishedYears(asked.views)
  return null
}

/**
 * The head, the pinned bar and every section's title are the page's first
 * paint; the year's menus, its balance, its figures and each section's body
 * follow their own reads.
 */
export function NationalBudgetHomePage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const heroVisible = useInView(heroRef)
  // The count-up driver is module state; an unmount mid-flight would leave it ticking against nodes that are gone.
  useEffect(() => () => stopCounting(), [])
  return (
    <div className={cn("relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']", VIZ_PALETTE)}>
      <RevealStyles />
      <SmearFilters />
      <YearNotice />
      {/* A read that fails here fails quietly: the sections read again and say it themselves. */}
      <BandRead fallback={null} quiet={null}>
        <Prefetch />
      </BandRead>
      <div ref={heroRef}>
        <Hero />
      </div>
      <SectionBar heroVisible={heroVisible} />
      <FiguresRegion />
      <FlowSection />
      <ReceiptSection />
      <BudgetsSection />
      <StateSection />
      <DebtSection />
      <YearSection />
      <FurtherSection />
      <section className="border-b" aria-label={t`Despre date`}>
        <RuledFrame className="py-6">
          <YearScope fallback={null}>
            <DataNote />
          </YearScope>
        </RuledFrame>
      </section>
    </div>
  )
}
