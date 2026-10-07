import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'

import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { nextSearch, type AdvancedState } from '@/features/national-budget/analytics/lib/analytics-state'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import type { YearView } from './principal.data'

/** The questions a reader can take further: each a view of the analysis page, for the page's year. */
function questions(view: YearView): readonly { readonly title: string; readonly text: string; readonly patch: Partial<AdvancedState> }[] {
  return [
    { title: t`Fiecare rând al cheltuielilor`, text: t`Toate liniile buletinului, cu ponderea, variația și evoluția din 2006.`, patch: { tip: 'cheltuieli', perioada: view.label } },
    { title: t`Lună de lună`, text: t`Cheltuielile, veniturile și deficitul pe luni și trimestre.`, patch: { tip: 'sold', dupa: 'timp', pas: 'luna' } },
    { title: t`Bugetul de stat, separat`, text: t`Bugetul de stat, bugetele locale, pensiile și sănătatea, fiecare cu istoria lui.`, patch: { tip: 'cheltuieli', dupa: 'bugete', perioada: view.label } },
    { title: t`Legea bugetului, pe capitole`, text: t`Ce aprobă legea pe învățământ, sănătate, apărare și celelalte capitole.`, patch: { tip: 'lege', dupa: 'capitole' } },
    { title: t`Lege după lege`, text: t`Ce a prevăzut fiecare lege pentru fiecare an, din 2016.`, patch: { tip: 'lege', dupa: 'legi' } },
    { title: t`Ministerele, în lege`, text: t`Ce aprobă legea fiecărui ordonator principal de credite.`, patch: { tip: 'ministere' } },
  ]
}

export function StartBand({ view, index }: { readonly view: YearView; readonly index: string }) {
  return (
    <section aria-labelledby="start-title">
      <RuledFrame className="py-14 sm:py-20">
        <HubSectionHead titleId="start-title" index={index} title={t`De aici poți începe`} lede={t`Fiecare întrebare deschide pagina de analize avansate, cu toate cifrele.`} />
        <ul className="mt-8 grid gap-px border bg-border/70 sm:grid-cols-2 lg:grid-cols-3">
          {questions(view).map((question) => (
            <li key={question.title}>
              <Link to="/national-budget/analytics" search={nextSearch({}, question.patch) as never} className="block h-full bg-background p-5 transition-colors hover:bg-muted/40">
                <span className="block text-base font-semibold tracking-tight text-foreground">{question.title}</span>
                <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">{question.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </RuledFrame>
    </section>
  )
}
