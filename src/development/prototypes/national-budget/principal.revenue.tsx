import { useState } from 'react'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { HundredGrid, PartRows, ShareStrip, Treemap, type Part } from './principal.charts'
import { REVENUE_PARTS, TOTAL_ITEMS, type YearView } from './principal.data'
import { moneyText } from './principal.format'
import { restRevenue, restRevenueHint, useWholeOf } from './principal.parts'
import { AnalyticsLink, SourceNote, type BandDefinition, type BandProps } from './principal.shell'

/**
 * „De unde vin banii": the consolidated budget's revenue in the lines a
 * reader names — contributions, VAT, income tax, excise, profit tax, the
 * non-tax revenue, EU money, PNRR grants, property taxes — and the rest of
 * the printed total. Three designs of one answer.
 */

function useRevenue(view: YearView) {
  return useWholeOf(view, TOTAL_ITEMS.revenue, REVENUE_PARTS, restRevenue, restRevenueHint)
}

/** The lede: the largest two, in plain words, from the parts the chart draws. */
function lede(parts: readonly Part[], view: YearView): string | null {
  const [first, second] = parts.filter((part) => !part.rest)
  if (!first || !second) return null
  return t`Din fiecare 100 de lei încasați în ${view.text}, ${Math.round(first.share)} au venit din ${first.label.toLocaleLowerCase('ro-RO')} și ${Math.round(second.share)} din ${second.label === 'TVA' ? 'TVA' : second.label.toLocaleLowerCase('ro-RO')}.`
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

/** A: a hundred squares, each a leu; the list beside is the legend. */
function RevenueHundred(props: BandProps) {
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

/** B: a treemap across the band; the rows under it. */
function RevenueTreemap(props: BandProps) {
  const { view } = props
  const { whole, parts } = useRevenue(view)
  const [active, setActive] = useState<string | null>(null)
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <Head {...props} whole={whole} parts={parts} />
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">{lede(parts, view)}</p>
        </div>
        <AnalyticsLink patch={{ tip: 'venituri', perioada: view.label }}>{t`Analizează veniturile`}</AnalyticsLink>
      </div>
      <Treemap className="mt-8" parts={parts} active={active} onActive={setActive} aspect="aspect-[4/3] sm:aspect-[16/7]" />
      <PartRows className="mt-8 sm:columns-2 sm:gap-8 [&>li]:break-inside-avoid" parts={parts} active={active} onActive={setActive} showBars={false} />
      <Sources view={view} />
    </div>
  )
}

/** C: one strip of shares with the hubs' ranked rows under it, each with its change. */
function RevenueStrip(props: BandProps) {
  const { view } = props
  const { whole, parts } = useRevenue(view)
  const [active, setActive] = useState<string | null>(null)
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">
        <Head {...props} whole={whole} parts={parts} />
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">{lede(parts, view)}</p>
        <div className="mt-6">
          <AnalyticsLink patch={{ tip: 'venituri', perioada: view.label }}>{t`Toate veniturile, pe rânduri`}</AnalyticsLink>
        </div>
      </div>
      <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)}>
        <ShareStrip parts={parts} active={active} onActive={setActive} />
        <PartRows className="mt-6" parts={parts} active={active} onActive={setActive} />
        <Sources view={view} />
      </div>
    </div>
  )
}

export const REVENUE_BAND: BandDefinition = {
  id: 'venituri',
  nav: t`De unde`,
  variants: [
    { key: 'suta', title: t`100 de lei`, note: t`O sută de pătrățele, câte unul pentru fiecare leu din 100 încasați; lista e legenda.`, component: RevenueHundred },
    { key: 'treemap', title: t`Hartă de suprafețe`, note: t`Dreptunghiuri cât ponderea fiecărei surse, pe toată lățimea; rândurile dedesubt.`, component: RevenueTreemap },
    { key: 'banda', title: t`Bandă și rânduri`, note: t`O singură bandă împărțită în surse, apoi rândurile cu bară, pondere și variație.`, component: RevenueStrip },
  ],
}
