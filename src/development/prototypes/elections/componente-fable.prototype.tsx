import type { PrototypeDefinition } from '@/development/harness/entry'
import { Gallery } from './componente-fable/gallery'

/**
 * Visual components for the results page (owner, 2026-10-15: "more variants,
 * not of the layout, but different visual components that make it easy to
 * understand the data … the evolution of the votes to the parties, local and
 * parliament"). Each group shows one question in several forms; the chosen
 * ones move into the main prototype (`principal`).
 */
export const prototype = {
  title: 'Alegeri — componente vizuale (Fable)',
  spec: 'docs/design/elections/design.md',
  variants: {
    evolutie: {
      title: 'Evoluția partidelor',
      component: () => <Gallery group="evolutie" />,
      note: 'Chamber 2008/2016/2020 and mayors 2016/2020/2024: lines, 100% columns, party cards, gains and losses, rank chart.',
    },
    mandate: {
      title: 'Mandatele',
      component: () => <Gallery group="mandate" />,
      note: 'Waffles (one square = 10 mayors), three waffles side by side, the county councillors hemicycle, a county tile grid.',
    },
    harti: {
      title: 'Hărți',
      component: () => <Gallery group="harti" />,
      note: 'A party’s strength by UAT, the 2016→2020 swing, mayors kept or changed 2016→2024 with a Sankey of flows, turnout change, race margins.',
    },
    prezenta: {
      title: 'Prezența',
      component: () => <Gallery group="prezenta" />,
      note: 'Turnout 1992–2024 by election type, county dumbbells, the UAT distribution, the diaspora, towns vs villages.',
    },
    intreceri: {
      title: 'Cursele',
      component: () => <Gallery group="intreceri" />,
      note: 'Margin histogram, the 15 closest mayor races, candidates per race, party strength by place kind.',
    },
  },
  compare: ['evolutie', 'harti'],
} satisfies PrototypeDefinition
