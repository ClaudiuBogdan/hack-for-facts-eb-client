import { t } from '@lingui/core/macro'
import { Flag, Landmark, Map as MapIcon, Users, Vote, type LucideIcon } from 'lucide-react'
import { ELECTIONS_ANALYTICS_VIEW_ORDER, ELECTIONS_ANALYTICS_VIEWS, type ElectionsAnalyticsView } from '@/schemas/elections-search'

/**
 * The five views and all 25 sections (owner, 2026-11-28: keep every tab).
 * The keys are the address's (`ELECTIONS_ANALYTICS_VIEWS`); here they get
 * their names, icons and what each section says until it is drawn:
 * - `drawn`: drawn from the API's figures;
 * - `later`: the API serves it; it is drawn in its own change („În curând");
 * - `waits`: it needs figures the API does not serve yet („Încă nu e în date").
 */
export type SectionState = 'drawn' | 'later' | 'waits'
export type SectionSpec = { readonly key: string; readonly label: string; readonly title: string; readonly state: SectionState; readonly note: string }
export type ViewSpec = { readonly key: ElectionsAnalyticsView; readonly label: string; readonly icon: LucideIcon; readonly question: string; readonly sections: readonly SectionSpec[] }

type Named = Omit<SectionSpec, 'key' | 'title'> & { readonly title?: string }

function namesOf(view: ElectionsAnalyticsView): Readonly<Record<string, Named>> {
  switch (view) {
    case 'partide':
      return {
        timp: { label: t`În timp`, state: 'later', note: t`Camera și Senatul, 2020 → 2024; anii dinainte apar când sunt publicați.` },
        fise: { label: t`Fișe`, state: 'later', note: t`Fișa fiecărui partid: voturi și mandate în 2024, schimbarea față de 2020.` },
        castiguri: { label: t`Câștiguri`, state: 'later', note: t`Câștigurile și pierderile fiecărui partid, 2020 → 2024.` },
        ponderi: { label: t`Ponderi`, state: 'later', note: t`Ponderile partidelor la fiecare alegere: parlamentare, europarlamentare, locale.` },
        clasament: { label: t`Clasament`, state: 'waits', note: t`Clasamentul primăriilor 2016 / 2020 / 2024 așteaptă localele din 2016 și 2020.` },
      }
    case 'mandate':
      return {
        primarii: { label: t`Primării`, title: t`Primăriile, pe partide`, state: 'drawn', note: '' },
        alegeri: { label: t`Pe alegeri`, title: t`Primăriile, la ultimele trei alegeri locale`, state: 'drawn', note: '' },
        consiliu: { label: t`Consiliul județean`, title: t`Consiliile județene, cele două repartizări`, state: 'drawn', note: '' },
        judete: { label: t`Județe`, title: t`Cine are cele mai multe primării, pe județe`, state: 'drawn', note: '' },
        consilieri: { label: t`Consilieri locali`, title: t`Consilierii locali, pe partide`, state: 'drawn', note: '' },
      }
    case 'harta':
      return {
        putere: { label: t`Putere`, state: 'later', note: t`Ponderea unui partid pe județe; pe localități, în interiorul unui județ.` },
        schimbare: { label: t`Schimbare`, state: 'later', note: t`Cât a câștigat sau a pierdut un partid între 2020 și 2024 (Camera), pe județe.` },
        primarii: { label: t`Primării`, state: 'waits', note: t`Primăriile păstrate sau schimbate așteaptă localele din 2016 și 2020 și primarul pe localitate.` },
        fluxuri: { label: t`Fluxuri`, state: 'waits', note: t`Fluxurile între partide așteaptă aceleași date.` },
        prezenta: { label: t`Prezență`, state: 'later', note: t`Schimbarea prezenței între două zile de vot, pe județe.` },
        diferente: { label: t`Diferențe`, state: 'later', note: t`Diferența dintre primii doi la primărie, 2024, în interiorul unui județ.` },
      }
    case 'prezenta':
      return {
        timp: { label: t`În timp`, state: 'later', note: t`Zilele de vot din 2020–2025; anii 1992–2019 apar când sunt publicați.` },
        judete: { label: t`Județe`, state: 'later', note: t`Județele comparate, la fiecare alegere.` },
        localitati: { label: t`Localități`, state: 'later', note: t`Distribuția pe localități, județ cu județ.` },
        strainatate: { label: t`Străinătate`, state: 'later', note: t`Votul din străinătate, față de cel din țară.` },
        tip: { label: t`Tip`, state: 'later', note: t`Prezența după felul localității: municipiu, oraș, comună.` },
      }
    case 'curse':
      return {
        diferente: { label: t`Diferențe`, state: 'later', note: t`Diferențele dintre primii doi, toate localitățile, 2024.` },
        stranse: { label: t`Strânse`, state: 'later', note: t`Cele mai strânse curse, pe partide; un independent apare ca „independent".` },
        candidati: { label: t`Candidați`, state: 'later', note: t`Câți candidați a avut fiecare cursă.` },
        tip: { label: t`Tip`, state: 'later', note: t`Ponderea partidelor după felul localității.` },
      }
  }
}

const HEAD: Readonly<Record<ElectionsAnalyticsView, () => Pick<ViewSpec, 'label' | 'icon' | 'question'>>> = {
  partide: () => ({ label: t`Partide`, icon: Users, question: t`Cum au votat românii partidele, de la o alegere la alta` }),
  mandate: () => ({ label: t`Mandate`, icon: Landmark, question: t`Cine a obținut mandatele la alegerile locale din 2024` }),
  harta: () => ({ label: t`Hartă`, icon: MapIcon, question: t`Unde e puternic fiecare partid` }),
  prezenta: () => ({ label: t`Prezență`, icon: Vote, question: t`Câți au votat, unde și când` }),
  curse: () => ({ label: t`Curse`, icon: Flag, question: t`Cât de strânse au fost cursele pentru primărie` }),
}

/** One view, named in the current language. */
export function viewSpec(view: ElectionsAnalyticsView): ViewSpec {
  const names = namesOf(view)
  const sections = ELECTIONS_ANALYTICS_VIEWS[view].map((key) => {
    const named = names[key] as Named
    return { key, title: named.title ?? named.label, label: named.label, state: named.state, note: named.note }
  })
  return { key: view, ...HEAD[view](), sections }
}

/** The five views in the bar's order. */
export function viewSpecs(): readonly ViewSpec[] {
  return ELECTIONS_ANALYTICS_VIEW_ORDER.map(viewSpec)
}

/** A section's element id: the view and the section, so two views' sections never share one. */
export const sectionId = (view: ElectionsAnalyticsView, section: string) => `${view}-${section}`
