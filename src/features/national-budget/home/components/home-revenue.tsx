import { useState } from 'react'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { inSentence } from '@/features/national-budget/analytics/lib/analytics-format'
import { cn } from '@/lib/utils'
import { HundredGrid, PartRows } from './home-charts'
import { cellsOutOfHundred, type Part } from '../lib/home-geometry'
import { REVENUE_PARTS, TOTAL_ITEMS, type YearView } from '../lib/home-data'
import { moneyText } from '../lib/home-format'
import { restRevenue, restRevenueHint, useWholeOf } from '../hooks/use-whole-of'
import { AnalyticsLink, SourceNote, type BandProps } from './home-shell'

/**
 * „De unde vin banii": the consolidated budget's revenue in the lines a
 * reader names — contributions, VAT, income tax, excise, profit tax, the
 * non-tax revenue, EU money, PNRR grants, property taxes — and the rest of
 * the printed total. Three designs of one answer.
 */

function useRevenue(view: YearView) {
  return useWholeOf(view, TOTAL_ITEMS.revenue, REVENUE_PARTS, restRevenue, restRevenueHint)
}

/** The lede: the largest two, in the lei out of 100 the grid draws for them (its own counts, so the two agree). */
function lede(parts: readonly Part[], view: YearView): string | null {
  const [first, second] = parts
  const [one, two] = cellsOutOfHundred(parts)
  if (!first || !second || first.rest || second.rest) return null
  return t`Din fiecare 100 de lei încasați în ${view.text}, ${one} au venit din ${inSentence(first.label)} și ${two} din ${inSentence(second.label)}.`
}

function Sources({ view }: { readonly view: YearView }) {
  return (
    <SourceNote>
      {t`Încasările bugetului general consolidat (toate bugetele publice, fără transferurile dintre ele), ${view.text}. Sursa: buletinele lunare de execuție ale Ministerului Finanțelor. Variația, față de aceeași perioadă a anului trecut, în lei curenți.`}
    </SourceNote>
  )
}

function Head({ view, index, titleId, whole }: BandProps & { readonly whole: string | null; readonly parts: readonly Part[] }) {
  return (
    <HubSectionHead
      titleId={titleId}
      index={index}
      title={t`De unde vin banii publici`}
      lede={whole ? t`În ${view.text}, statul a încasat ${moneyText(whole)}.` : null}
    />
  )
}

/** a hundred squares, each a leu; the list beside is the legend. */
export function RevenueBand(props: BandProps) {
  const { view } = props
  const { whole, parts } = useRevenue(view)
  const [active, setActive] = useState<string | null>(null)
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">
        <Head {...props} whole={whole} parts={parts} />
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">{lede(parts, view)}</p>
        <div className="mt-8 max-w-sm">
          <MonoLabel className="mb-3 block text-muted-foreground">{t`Din fiecare 100 de lei încasați`}</MonoLabel>
          <HundredGrid parts={parts} active={active} onActive={setActive} />
        </div>
      </div>
      <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)}>
        <PartRows parts={parts} active={active} onActive={setActive} showBars={false} />
        <div className="mt-4 flex flex-wrap gap-x-5">
          <AnalyticsLink patch={{ tip: 'venituri', perioada: view.label }}>{t`Toate veniturile, pe rânduri`}</AnalyticsLink>
          <AnalyticsLink patch={{ tip: 'venituri', dupa: 'timp' }}>{t`Veniturile în timp`}</AnalyticsLink>
        </div>
        <Sources view={view} />
      </div>
    </div>
  )
}

