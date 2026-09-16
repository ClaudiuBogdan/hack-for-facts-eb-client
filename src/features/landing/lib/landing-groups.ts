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
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import { isMockDataEnabled } from '@/lib/scraper-references'
import { isPublicEnterpriseMockEnabled } from '@/features/public-enterprises/lib/mock-mode'

/**
 * The surfaces the landing page can offer, and the gates that decide whether it
 * may.
 *
 * Titles and blurbs are `msg` descriptors rather than translated strings: this
 * module is evaluated once per process, and on the server that process answers
 * every locale. A `t` call here would bake the first request's language into
 * every later one; the descriptor is resolved at render with `i18n._`.
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
  readonly title: MessageDescriptor
  /** What this surface answers — the thing the sidebar's bare label cannot say. */
  readonly blurb: MessageDescriptor
  readonly to: LinkProps['to']
  readonly icon: typeof Landmark
  /** Omitted = always shown. */
  readonly gate?: () => boolean
}

export type LandingGroup = {
  readonly key: string
  readonly title: MessageDescriptor
  readonly entries: readonly LandingEntry[]
}

export const LANDING_GROUPS: readonly LandingGroup[] = [
  {
    key: 'bani',
    title: msg`Banii publici`,
    entries: [
      {
        title: msg`Buget național`,
        blurb: msg`Cheltuielile statului pe capitole, de la minister la linie bugetară.`,
        to: '/budget-explorer',
        icon: Boxes,
      },
      {
        title: msg`Achiziții publice`,
        blurb: msg`Contracte, proceduri și furnizori din SEAP, cu grila de încredere.`,
        to: '/procurement',
        icon: Landmark,
      },
      {
        title: msg`Investiții publice`,
        blurb: msg`Obiective de investiții, etape și plăți, pe județ și localitate.`,
        to: '/investitii-publice',
        icon: Wrench,
      },
      {
        title: msg`PNRR`,
        blurb: msg`Jaloane, proiecte și beneficiari din Planul de Redresare.`,
        to: '/pnrr',
        icon: FileStack,
      },
    ],
  },
  {
    key: 'institutii',
    title: msg`Instituții și organizații`,
    entries: [
      {
        title: msg`Analiza entităților`,
        blurb: msg`Clasamente și comparații între instituții, pe valori agregate.`,
        to: '/entity-analytics',
        icon: ListOrdered,
      },
      {
        title: msg`Întreprinderi publice`,
        blurb: msg`Companii de stat: indicatori AMEPIP, guvernanță și proveniență.`,
        to: '/intreprinderi-publice',
        icon: Building2,
        gate: isPublicEnterpriseMockEnabled,
      },
      {
        title: msg`Firme`,
        blurb: msg`Firme private, cu situația fiscală și legăturile cu banul public.`,
        to: '/companies',
        icon: Briefcase,
      },
      {
        title: msg`ONG-uri`,
        blurb: msg`Organizații neguvernamentale și servicii sociale, cu nivel de identitate.`,
        to: '/ong-uri',
        icon: HeartHandshake,
      },
    ],
  },
  {
    key: 'lege',
    title: msg`Lege și justiție`,
    entries: [
      {
        title: msg`Legislație`,
        blurb: msg`Acte normative din Monitorul Oficial, cu istoricul modificărilor.`,
        to: '/legislation',
        icon: Scale,
      },
      {
        title: msg`Justiție`,
        blurb: msg`Dosare în care apar instituții și firme. Persoanele rămân agregate.`,
        to: '/justitie',
        icon: Gavel,
      },
    ],
  },
  {
    key: 'politica',
    title: msg`Politică`,
    entries: [
      {
        title: msg`Parlament`,
        blurb: msg`Membri, grupuri, voturi și traseul legislativ al inițiativelor.`,
        to: '/parlament',
        icon: Users,
        gate: () => isMockDataEnabled('political-parliament'),
      },
      {
        title: msg`Alegeri`,
        blurb: msg`Rezultate pe scrutin și geografie. Rezultatele nu sunt voturi în plen.`,
        to: '/alegeri',
        icon: Vote,
      },
    ],
  },
  {
    key: 'instrumente',
    title: msg`Instrumente`,
    entries: [
      {
        title: msg`Hartă`,
        blurb: msg`Aceleași cifre, distribuite pe județe și localități.`,
        to: '/map',
        icon: Map,
      },
      {
        title: msg`Grafice`,
        blurb: msg`Construiește-ți propriul grafic din seriile disponibile.`,
        to: '/charts',
        icon: BarChart2,
      },
      {
        title: msg`Statistici INS`,
        blurb: msg`Serii oficiale INS, cu acoperirea declarată pentru fiecare nivel.`,
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
