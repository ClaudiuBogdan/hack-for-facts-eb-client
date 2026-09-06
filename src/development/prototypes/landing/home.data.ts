import {
  Activity,
  BarChart2,
  Boxes,
  Briefcase,
  Building2,
  FileStack,
  Gavel,
  HeartHandshake,
  Landmark,
  ListOrdered,
  Map,
  Scale,
  Users,
  Vote,
  Wrench,
} from 'lucide-react'
import type { LinkProps } from '@tanstack/react-router'
import { isMockDataEnabled } from '@/lib/scraper-references'
import { isPublicEnterpriseMockEnabled } from '@/features/public-enterprises/lib/mock-mode'

/**
 * The surfaces the landing page can offer, and the gates that decide whether it
 * may. Shared by every variant so the comparison is about layout, not content.
 *
 * `to` is typed against the generated route tree — a path that stops existing
 * fails `yarn run check` rather than 404-ing in someone's browser.
 *
 * Gates mirror the shipped ones verbatim: `nav-main.tsx` hides
 * `/intreprinderi-publice` behind `isPublicEnterpriseMockEnabled()`, and
 * `ParliamentPromoCard` returns null unless `political-parliament` is mocked.
 * Hiding, not badging: the sidebar's precedent, and a homepage that advertises
 * a surface the reader cannot use costs more trust than an absent tile.
 */
export type LandingEntry = {
  readonly title: string
  /** What this surface answers — the thing the sidebar's bare label cannot say. */
  readonly blurb: string
  readonly to: LinkProps['to']
  readonly icon: typeof Landmark
  /** Omitted = always shown. */
  readonly gate?: () => boolean
}

export type LandingGroup = {
  readonly key: string
  readonly title: string
  readonly entries: readonly LandingEntry[]
}

export const LANDING_GROUPS: readonly LandingGroup[] = [
  {
    key: 'bani',
    title: 'Banii publici',
    entries: [
      {
        title: 'Buget național',
        blurb: 'Cheltuielile statului pe capitole, de la minister la linie bugetară.',
        to: '/budget-explorer',
        icon: Boxes,
      },
      {
        title: 'Achiziții publice',
        blurb: 'Contracte, proceduri și furnizori din SEAP, cu grila de încredere.',
        to: '/procurement',
        icon: Landmark,
      },
      {
        title: 'Investiții publice',
        blurb: 'Obiective de investiții, etape și plăți, pe județ și localitate.',
        to: '/investitii-publice',
        icon: Wrench,
      },
      {
        title: 'PNRR',
        blurb: 'Jaloane, proiecte și beneficiari din Planul de Redresare.',
        to: '/pnrr',
        icon: FileStack,
      },
    ],
  },
  {
    key: 'institutii',
    title: 'Instituții și organizații',
    entries: [
      {
        title: 'Analiza entităților',
        blurb: 'Clasamente și comparații între instituții, pe valori agregate.',
        to: '/entity-analytics',
        icon: ListOrdered,
      },
      {
        title: 'Întreprinderi publice',
        blurb: 'Companii de stat: indicatori AMEPIP, guvernanță și proveniență.',
        to: '/intreprinderi-publice',
        icon: Building2,
        gate: isPublicEnterpriseMockEnabled,
      },
      {
        title: 'Firme',
        blurb: 'Firme private, cu situația fiscală și legăturile cu banul public.',
        to: '/companies',
        icon: Briefcase,
      },
      {
        title: 'ONG-uri',
        blurb: 'Organizații neguvernamentale și servicii sociale, cu nivel de identitate.',
        to: '/ong-uri',
        icon: HeartHandshake,
      },
    ],
  },
  {
    key: 'lege',
    title: 'Lege și justiție',
    entries: [
      {
        title: 'Legislație',
        blurb: 'Acte normative din Monitorul Oficial, cu istoricul modificărilor.',
        to: '/legislation',
        icon: Scale,
      },
      {
        title: 'Justiție',
        blurb: 'Dosare în care apar instituții și firme. Persoanele rămân agregate.',
        to: '/justitie',
        icon: Gavel,
      },
    ],
  },
  {
    key: 'politica',
    title: 'Politică',
    entries: [
      {
        title: 'Parlament',
        blurb: 'Membri, grupuri, voturi și traseul legislativ al inițiativelor.',
        to: '/parlament',
        icon: Users,
        gate: () => isMockDataEnabled('political-parliament'),
      },
      {
        title: 'Alegeri',
        blurb: 'Rezultate pe scrutin și geografie. Rezultatele nu sunt voturi în plen.',
        to: '/alegeri',
        icon: Vote,
      },
    ],
  },
  {
    key: 'instrumente',
    title: 'Instrumente',
    entries: [
      {
        title: 'Hartă',
        blurb: 'Aceleași cifre, distribuite pe județe și localități.',
        to: '/map',
        icon: Map,
      },
      {
        title: 'Grafice',
        blurb: 'Construiește-ți propriul grafic din seriile disponibile.',
        to: '/charts',
        icon: BarChart2,
      },
      {
        title: 'Statistici INS',
        blurb: 'Serii oficiale INS, cu acoperirea declarată pentru fiecare nivel.',
        to: '/statistici',
        icon: Activity,
      },
    ],
  },
]

/** Applies each entry's gate and drops groups left empty. */
export function visibleGroups(): readonly LandingGroup[] {
  return LANDING_GROUPS.map((group) => ({
    ...group,
    entries: group.entries.filter((entry) => entry.gate?.() ?? true),
  })).filter((group) => group.entries.length > 0)
}

/** Entries a gate is currently hiding — shown in the harness note, never in the page. */
export function gatedEntryTitles(): readonly string[] {
  return LANDING_GROUPS.flatMap((group) =>
    group.entries.filter((entry) => entry.gate?.() === false).map((entry) => entry.title),
  )
}
