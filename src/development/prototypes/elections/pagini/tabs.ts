import { t } from '@lingui/core/macro'
import { Flag, Landmark, Map as MapIcon, Users, Vote, type LucideIcon } from 'lucide-react'

/**
 * The five views and all 25 tabs of the `rezultate` prototype (owner, 2026-11-28: keep every tab). Each tab says
 * what it draws and whether the API serves it today: `built` is drawn on this prototype from live reads, `later`
 * is served and built in its own change, `partly` draws the served years and dashes the rest, `waits` needs data
 * the API does not serve yet.
 */
export type ViewKey = 'partide' | 'mandate' | 'harta' | 'prezenta' | 'curse'
export type TabState = 'built' | 'later' | 'partly' | 'waits'
export type TabSpec = { readonly key: string; readonly label: string; readonly state: TabState; readonly note: string }
export type ViewSpec = { readonly key: ViewKey; readonly label: string; readonly icon: LucideIcon; readonly question: string; readonly tabs: readonly TabSpec[] }

export function views(): readonly ViewSpec[] {
  return [
    {
      key: 'partide',
      label: t`Partide`,
      icon: Users,
      question: t`Cum au votat românii partidele, de la o alegere la alta`,
      tabs: [
        { key: 'timp', label: t`În timp`, state: 'later', note: t`Camera și Senatul, 2020 → 2024; anii dinainte apar când sunt publicați.` },
        { key: 'fise', label: t`Fișe`, state: 'later', note: t`Fișa fiecărui partid: voturi și mandate în 2024, schimbarea față de 2020.` },
        { key: 'castiguri', label: t`Câștiguri`, state: 'later', note: t`Câștigurile și pierderile fiecărui partid, 2020 → 2024.` },
        { key: 'ponderi', label: t`Ponderi`, state: 'later', note: t`Ponderile partidelor la fiecare alegere: parlamentare, europarlamentare, locale.` },
        { key: 'clasament', label: t`Clasament`, state: 'waits', note: t`Clasamentul primăriilor 2016 / 2020 / 2024 așteaptă localele din 2016 și 2020.` },
      ],
    },
    {
      key: 'mandate',
      label: t`Mandate`,
      icon: Landmark,
      question: t`Cine a obținut mandatele la locale 2024`,
      tabs: [
        { key: 'primarii', label: t`Primării`, state: 'built', note: '' },
        { key: 'alegeri', label: t`Pe alegeri`, state: 'partly', note: t`2024 e desenat mai sus; 2016 și 2020 apar când sunt publicate localele lor.` },
        { key: 'consiliu', label: t`Consiliul județean`, state: 'built', note: '' },
        { key: 'judete', label: t`Județe`, state: 'built', note: '' },
        { key: 'consilieri', label: t`Consilieri locali`, state: 'built', note: '' },
      ],
    },
    {
      key: 'harta',
      label: t`Hartă`,
      icon: MapIcon,
      question: t`Unde e puternic fiecare partid`,
      tabs: [
        { key: 'putere', label: t`Putere`, state: 'later', note: t`Ponderea unui partid pe județe; pe localități, în interiorul unui județ.` },
        { key: 'schimbare', label: t`Schimbare`, state: 'later', note: t`Cât a câștigat sau a pierdut un partid între 2020 și 2024 (Camera), pe județe.` },
        { key: 'primarii', label: t`Primării`, state: 'waits', note: t`Primăriile păstrate sau schimbate așteaptă localele din 2016 și 2020 și primarul pe localitate.` },
        { key: 'fluxuri', label: t`Fluxuri`, state: 'waits', note: t`Fluxurile între partide au aceeași nevoie.` },
        { key: 'prezenta', label: t`Prezență`, state: 'later', note: t`Schimbarea prezenței între două zile de vot, pe județe.` },
        { key: 'diferente', label: t`Diferențe`, state: 'later', note: t`Diferența dintre primii doi la primărie, 2024, în interiorul unui județ.` },
      ],
    },
    {
      key: 'prezenta',
      label: t`Prezență`,
      icon: Vote,
      question: t`Câți au votat, unde și când`,
      tabs: [
        { key: 'timp', label: t`În timp`, state: 'partly', note: t`Cele nouă zile de vot din 2020–2025; anii 1992–2019 apar când sunt publicați.` },
        { key: 'judete', label: t`Județe`, state: 'later', note: t`Județele comparate, la fiecare alegere.` },
        { key: 'localitati', label: t`Localități`, state: 'later', note: t`Distribuția pe localități, județ cu județ.` },
        { key: 'strainatate', label: t`Străinătate`, state: 'later', note: t`Votul din străinătate, față de cel din țară.` },
        { key: 'tip', label: t`Tip`, state: 'later', note: t`Prezența după felul localității: municipiu, oraș, comună.` },
      ],
    },
    {
      key: 'curse',
      label: t`Curse`,
      icon: Flag,
      question: t`Cât de strânse au fost cursele pentru primărie`,
      tabs: [
        { key: 'diferente', label: t`Diferențe`, state: 'later', note: t`Diferențele dintre primii doi, toate localitățile, 2024.` },
        { key: 'stranse', label: t`Strânse`, state: 'later', note: t`Cele mai strânse curse, pe partide; un independent apare ca „independent".` },
        { key: 'candidati', label: t`Candidați`, state: 'later', note: t`Câți candidați a avut fiecare cursă.` },
        { key: 'tip', label: t`Tip`, state: 'later', note: t`Ponderea partidelor după felul localității.` },
      ],
    },
  ]
}
