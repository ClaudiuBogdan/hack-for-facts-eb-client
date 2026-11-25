import { Suspense, type ReactNode } from 'react'

import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { cn } from '@/lib/utils'
import { VIZ_PALETTE } from './persoana.palette'
import { BudgetsFlow, BudgetsMosaic, BudgetsWaffle, NoBudgets, useBudgets } from './persoana.budgets'
import { MonthsHeatmap, RevenueTreemap, SpendingComposition, SpendingWaterfall } from './persoana.charts'
import { ShareCard } from './persoana.share'
import { Section, YearPicker, YearProvider, usePersonYear } from './persoana.shell'

/**
 * A gallery of chart elements for the national budget page (owner, 25
 * November 2026: prototype the budgets compared three ways, and elements
 * from a list of chart types). Each section is one candidate, on the page's
 * own data and year; the owner picks what moves into the working version.
 */

function Budgets({ visual }: { readonly visual: 'mosaic' | 'waffle' | 'flow' }) {
  const { view } = usePersonYear()
  const rows = useBudgets(view)
  if (!rows) return <NoBudgets view={view} />
  if (visual === 'mosaic') return <BudgetsMosaic rows={rows} />
  if (visual === 'waffle') return <BudgetsWaffle rows={rows} caption={<span className="text-sm font-semibold">Din fiecare 100 de lei cheltuiți de toate bugetele</span>} />
  return <BudgetsFlow rows={rows} caption={<span className="text-sm font-semibold">De unde și-a luat banii fiecare buget</span>} />
}

const CANDIDATES: readonly { readonly id: string; readonly title: string; readonly lede: string; readonly body: ReactNode }[] = [
  {
    id: 'mozaic',
    title: 'Bugetele: mozaic',
    lede: 'Fiecare buget, cât de mare e și din ce bani trăiește: încasările lui, bani de la alte bugete, fonduri UE, împrumut.',
    body: <Budgets visual="mosaic" />,
  },
  {
    id: 'o-suta',
    title: 'Bugetele: 100 de lei',
    lede: 'Din fiecare 100 de lei cheltuiți de toate bugetele, câți trec prin fiecare.',
    body: <Budgets visual="waffle" />,
  },
  {
    id: 'flux',
    title: 'Bugetele: fluxul banilor',
    lede: 'De unde și-a luat banii fiecare buget, ca benzi: doar sumele tipărite în buletin.',
    body: <Budgets visual="flow" />,
  },
  {
    id: 'cascada',
    title: 'De ce s-au schimbat cheltuielile',
    lede: 'O cascadă: de la cheltuielile anului trecut la cele de anul acesta, cât a adăugat sau a scăzut fiecare fel de cheltuială.',
    body: <SpendingWaterfall />,
  },
  {
    id: 'luni',
    title: 'Lunile anului, din 2006',
    lede: 'O hartă termică: cât s-a cheltuit în fiecare lună, față de media lunilor din același an. Se vede decembrie.',
    body: <MonthsHeatmap />,
  },
  {
    id: 'compozitie',
    title: 'Din ce sunt făcute cheltuielile, în timp',
    lede: 'Arii suprapuse: asistența socială, salariile, investițiile, dobânzile și celelalte, an de an din 2006.',
    body: <SpendingComposition />,
  },
  {
    id: 'venituri',
    title: 'Veniturile, pe niveluri',
    lede: 'Un treemap al veniturilor: fiecare dală, cât de mare e; o dală cu „›" se deschide în liniile ei.',
    body: <RevenueTreemap />,
  },
  {
    id: 'card',
    title: 'Card de distribuit',
    lede: 'Imaginea care apare când cineva distribuie pagina: partea fiecăruia din cheltuielile statului.',
    body: <ShareCard />,
  },
]

function Head() {
  return (
    <section className="border-b">
      <RuledFrame className="py-10 sm:py-14">
        <p className="text-sm text-muted-foreground">Prototip · galerie de grafice</p>
        <h1 className="mt-3 max-w-[22ch] text-4xl font-extrabold leading-[0.96] tracking-[-0.04em] [word-spacing:0.06em] sm:text-5xl">Grafice pentru bugetul național</h1>
        <p className="mt-4 max-w-[60ch] text-base text-muted-foreground">Fiecare secțiune e o variantă, pe datele paginii. Alege ce merge în versiunea de lucru.</p>
        <YearPicker className="mt-6" />
        <nav aria-label="Variantele" className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {CANDIDATES.map((candidate) => (
            <a key={candidate.id} href={`#${candidate.id}`} className="font-medium transition-colors hover:text-primary">
              {candidate.title}
            </a>
          ))}
        </nav>
      </RuledFrame>
    </section>
  )
}

function Page() {
  const { pending } = usePersonYear()
  return (
    <>
      <Head />
      <div aria-busy={pending} className={cn('transition-opacity duration-200', pending && 'opacity-60')}>
        {CANDIDATES.map((candidate) => (
          <Section key={candidate.id} id={candidate.id} title={candidate.title} lede={candidate.lede}>
            {candidate.body}
          </Section>
        ))}
      </div>
    </>
  )
}

export function PersonChartsVariant() {
  return (
    <div className={cn("relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']", VIZ_PALETTE)}>
      <Suspense fallback={<div className="h-[36rem] animate-pulse bg-muted/30" />}>
        <YearProvider>
          <Page />
        </YearProvider>
      </Suspense>
    </div>
  )
}
