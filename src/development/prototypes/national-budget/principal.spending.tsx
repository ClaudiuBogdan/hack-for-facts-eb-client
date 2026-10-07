import { useState } from 'react'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { HundredGrid, PartRows, Swatch, Treemap, cellsOutOfHundred, type Part } from './principal.charts'
import { SPENDING_PARTS, TOTAL_ITEMS, type YearView } from './principal.data'
import { moneyText } from './principal.format'
import { restSpending, restSpendingHint, useWholeOf } from './principal.parts'
import { AnalyticsLink, SourceNote, type BandDefinition, type BandProps } from './principal.shell'

/**
 * „Pe ce se duc banii": the consolidated budget's spending by its nature —
 * pensions and benefits, salaries, goods and services, investments, interest,
 * EU and PNRR projects — and the rest of the printed total. Three designs.
 */

function useSpending(view: YearView) {
  return useWholeOf(view, TOTAL_ITEMS.spending, SPENDING_PARTS, restSpending, restSpendingHint)
}

function lede(parts: readonly Part[], view: YearView): string | null {
  const [first, second, third] = parts.filter((part) => !part.rest)
  if (!first || !second || !third) return null
  return t`Din fiecare 100 de lei cheltuiți în ${view.text}, ${Math.round(first.share)} au mers la ${first.label.toLocaleLowerCase('ro-RO')}, ${Math.round(second.share)} la ${second.label.toLocaleLowerCase('ro-RO')} și ${Math.round(third.share)} la ${third.label.toLocaleLowerCase('ro-RO')}.`
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

/** A: a hundred squares, each a leu out of every hundred spent; the list is the legend. */
function SpendingHundred(props: BandProps) {
  const { view } = props
  const { whole, parts } = useSpending(view)
  const [active, setActive] = useState<string | null>(null)
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">
        <Head {...props} whole={whole} />
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">{lede(parts, view)}</p>
        <div className="mt-8 max-w-sm">
          <MonoLabel className="mb-3 block text-muted-foreground">{t`Din fiecare 100 de lei cheltuiți`}</MonoLabel>
          <HundredGrid parts={parts} active={active} onActive={setActive} />
        </div>
      </div>
      <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)}>
        <PartRows parts={parts} active={active} onActive={setActive} showBars={false} />
        <Links view={view} />
        <Sources view={view} />
      </div>
    </div>
  )
}

/**
 * B: the citizen's receipt. Every hundred lei the state spent, itemised as a
 * till prints it: what was bought and how many lei of the hundred it took,
 * with the year's total at the foot.
 */
function SpendingReceipt(props: BandProps) {
  const { view } = props
  const { whole, parts } = useSpending(view)
  const lei = cellsOutOfHundred(parts)
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">
        <Head {...props} whole={whole} />
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">{lede(parts, view)}</p>
        <Links view={view} />
        <Sources view={view} />
      </div>
      <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)}>
        <div className="mx-auto max-w-md border border-dashed bg-card px-6 py-7 font-mono text-sm shadow-sm sm:px-8">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">{t`Bonul cetățeanului`}</p>
          <p className="mt-1 text-center text-xs text-muted-foreground">{t`Bugetul general consolidat · ${view.text}`}</p>
          <p className="mt-4 border-y border-dashed py-2 text-center text-xs text-muted-foreground">{t`Pentru fiecare 100 de lei cheltuiți`}</p>
          <ol className="mt-3 space-y-2.5">
            {parts.map((part, rank) => (
              <li key={part.key} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3">
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    <Swatch part={part} rank={rank} count={parts.filter((entry) => !entry.rest).length} className="translate-y-0.5" />
                    <span className="truncate text-foreground">{part.label}</span>
                  </span>
                  <span className="mt-0.5 block pl-5 text-[11px] text-muted-foreground">{part.amount}</span>
                </span>
                <span className="tabular-nums text-foreground">{t`${lei[rank] ?? 0} lei`}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 grid grid-cols-[1fr_auto] border-t border-dashed pt-3 font-semibold text-foreground">
            <span>{t`Total`}</span>
            <span className="tabular-nums">{t`100 lei`}</span>
          </p>
          {whole ? <p className="mt-1 grid grid-cols-[1fr_auto] text-xs text-muted-foreground">
            <span>{t`În tot anul`}</span>
            <span className="tabular-nums">{moneyText(whole)}</span>
          </p> : null}
          <p className="mt-5 text-center text-[11px] text-muted-foreground">{t`Lei din 100, rotunjiți: adună exact 100.`}</p>
        </div>
      </div>
    </div>
  )
}

/** C: a treemap across the band, then the rows with each part's change. */
function SpendingTreemap(props: BandProps) {
  const { view } = props
  const { whole, parts } = useSpending(view)
  const [active, setActive] = useState<string | null>(null)
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <Head {...props} whole={whole} />
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">{lede(parts, view)}</p>
        </div>
        <AnalyticsLink patch={{ tip: 'cheltuieli', perioada: view.label }}>{t`Analizează cheltuielile`}</AnalyticsLink>
      </div>
      <Treemap className="mt-8" parts={parts} active={active} onActive={setActive} aspect="aspect-[4/3] sm:aspect-[16/7]" />
      <PartRows className="mt-8 sm:columns-2 sm:gap-8 [&>li]:break-inside-avoid" parts={parts} active={active} onActive={setActive} showBars={false} />
      <Sources view={view} />
    </div>
  )
}

export const SPENDING_BAND: BandDefinition = {
  id: 'cheltuieli',
  nav: t`Pe ce`,
  variants: [
    { key: 'suta', title: t`100 de lei`, note: t`O sută de pătrățele, câte unul pentru fiecare leu din 100 cheltuiți; lista e legenda.`, component: SpendingHundred },
    { key: 'bon', title: t`Bonul cetățeanului`, note: t`Ca un bon de casă: din fiecare 100 de lei, câți lei pe fiecare lucru, cu totalul anului jos.`, component: SpendingReceipt },
    { key: 'treemap', title: t`Hartă de suprafețe`, note: t`Dreptunghiuri cât ponderea fiecărei cheltuieli, pe toată lățimea; rândurile cu variația dedesubt.`, component: SpendingTreemap },
  ],
}
