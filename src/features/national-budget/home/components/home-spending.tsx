import { useState } from 'react'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { inSentence } from '@/features/national-budget/analytics/lib/analytics-format'
import { cn } from '@/lib/utils'
import { HundredGrid, PartRows } from './home-charts'
import { cellsOutOfHundred, type Part } from '../lib/home-geometry'
import { SPENDING_PARTS, TOTAL_ITEMS, type YearView } from '../lib/home-data'
import { moneyText } from '../lib/home-format'
import { restSpending, restSpendingHint, useWholeOf } from '../hooks/use-whole-of'
import { AnalyticsLink, SourceNote, type BandProps } from './home-shell'

/**
 * „Pe ce se duc banii": the consolidated budget's spending by its nature —
 * pensions and benefits, salaries, goods and services, investments, interest,
 * EU and PNRR projects — and the rest of the printed total. Three designs.
 */

function useSpending(view: YearView) {
  return useWholeOf(view, TOTAL_ITEMS.spending, SPENDING_PARTS, restSpending, restSpendingHint)
}

/** The lede: the largest three, in the lei out of 100 the grid draws for them (its own counts, so the two agree). */
function lede(parts: readonly Part[], view: YearView): string | null {
  const [first, second, third] = parts
  const [one, two, three] = cellsOutOfHundred(parts)
  if (!first || !second || !third || first.rest || second.rest || third.rest) return null
  return t`Din fiecare 100 de lei cheltuiți în ${view.text}, ${one} au mers la ${inSentence(first.label)}, ${two} la ${inSentence(second.label)} și ${three} la ${inSentence(third.label)}.`
}

function Sources({ view }: { readonly view: YearView }) {
  return (
    <SourceNote>
      {t`Plățile bugetului general consolidat (toate bugetele publice, fără transferurile dintre ele), ${view.text}, după natura cheltuielii. Sursa: buletinele lunare de execuție ale Ministerului Finanțelor. Variația, față de aceeași perioadă a anului trecut, în lei curenți.`}
    </SourceNote>
  )
}

function Head({ view, index, titleId, whole }: BandProps & { readonly whole: string | null }) {
  return <HubSectionHead titleId={titleId} index={index} title={t`Pe ce se duc banii publici`} lede={whole ? t`În ${view.text}, statul a cheltuit ${moneyText(whole)}.` : null} />
}

function Links({ view }: { readonly view: YearView }) {
  return (
    <div className="mt-4 flex flex-wrap gap-x-5">
      <AnalyticsLink patch={{ tip: 'cheltuieli', perioada: view.label }}>{t`Toate cheltuielile, pe rânduri`}</AnalyticsLink>
      <AnalyticsLink patch={{ tip: 'cheltuieli', dupa: 'timp' }}>{t`Cheltuielile în timp`}</AnalyticsLink>
    </div>
  )
}

/** a hundred squares, each a leu out of every hundred spent; the list is the legend. */
export function SpendingBand(props: BandProps) {
  const { view } = props
  const { whole, parts, breakdown } = useSpending(view)
  const [active, setActive] = useState<string | null>(null)
  // The total without its lines: said plainly, not drawn as a whole that is all „other".
  const unbroken = whole !== null && !breakdown
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">
        <Head {...props} whole={whole} />
        {unbroken ? (
          <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
            {t`Pentru ${view.text}, datele disponibile au doar totalul cheltuielilor, nu și împărțirea lor după natura cheltuielii.`}
          </p>
        ) : (
          <>
            <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">{lede(parts, view)}</p>
            <div className="mt-8 max-w-sm">
              <MonoLabel className="mb-3 block text-muted-foreground">{t`Din fiecare 100 de lei cheltuiți`}</MonoLabel>
              <HundredGrid parts={parts} active={active} onActive={setActive} />
            </div>
          </>
        )}
      </div>
      <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)}>
        {unbroken ? null : <PartRows parts={parts} active={active} onActive={setActive} showBars={false} />}
        <Links view={view} />
        <Sources view={view} />
      </div>
    </div>
  )
}

