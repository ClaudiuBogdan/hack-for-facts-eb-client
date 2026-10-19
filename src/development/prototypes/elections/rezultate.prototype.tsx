import type { PrototypeDefinition } from '@/development/harness/entry'
import { ResultsAnalytics } from './rezultate/page'
import { ResultsViews } from './rezultate/views'

/**
 * The results analytics page (owner, 2026-10-19: "I like all the options. I
 * would use them all in an analytics page"): the component gallery's charts
 * (`componente-fable`, the polished copy) in five sections under one head —
 * the figures, a sticky bar with the sections and the party in focus, one map
 * with its modes as tabs. Same panels as the gallery, so a fix lands in both.
 */
export const prototype = {
  title: 'Alegeri — analiza rezultatelor',
  spec: 'docs/design/elections/design.md',
  variants: {
    vederi: {
      title: 'Vederi — five views, each one page of sections',
      component: ResultsViews,
      note: 'Owner, 2026-10-19: „too much info … separate them on different tabs or views", then each view as one page with sections. The analytics pages’ language: the view’s question as the headline over one control row (county as a searchable list and a removable phrase, party, ready questions, link, notes), a sticky bar of five views (Partide, Mandate, Hartă, Prezență, Curse), the view’s four figures, then its sections under sticky links that follow the scroll. URL `tip`, `dupa` (a section to open at), `judet`, `partid`, plus the maps’ own `putere_an`, `schimbare`, `doar`.',
    },
    pagina: {
      title: 'O pagină — every panel in five sections (before the owner’s 2026-10-19 note)',
      component: ResultsAnalytics,
      note: 'Figures; sticky sections + party focus (URL `partid`, dims the other parties in the lines, cards and bars, drives the party maps); one map with five modes (URL `harta`); every gallery panel placed, none dropped.',
    },
  },
  // The default address shows the views page alone: two full analytics pages would share `partid`/`judet`, two sticky bars and two titles.
  compare: ['vederi'],
} satisfies PrototypeDefinition
