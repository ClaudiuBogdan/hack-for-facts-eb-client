import type { PrototypeDefinition } from '@/development/harness/entry'
import { PersonBonVariant } from './persoana.bon'
import { PersonFluxVariant } from './persoana.flux'
import { PersonWorkVariant } from './persoana.lucru'
import { PersonLunaVariant } from './persoana.luna'

/**
 * The citizens' budget page retold at one person's scale (owner, 25 November
 * 2026: the reader should leave knowing their share of it; a new storyline;
 * two or three versions to pick from). Every amount is the live page's,
 * divided by the resident population on 1 January of its year. The head is
 * rewritten in all three: the answer is the title, one year menu, no figures
 * card, no shortcut row. The budgets' transfers and the law move to links.
 */
export const prototype = {
  title: 'Buget național — pe locuitor',
  spec: 'docs/design/national-budget/design.md',
  variants: {
    lucru: {
      title: 'Lucru — versiunea pe care o construim, începând cu hero-ul',
      component: PersonWorkVariant,
      note: 'The working version: the hero in the hubs’ language, design B (title „pe cap de locuitor”, the balance beside it) with the official amounts explained out of 100 lei; the pinned bar; the figures band. The sections follow from the three versions below and the owner’s notes.',
    },
    bon: {
      title: 'Bonul — cheltuielile unui locuitor, ca pe un bon',
      component: PersonBonVariant,
      note: 'Title: lei per resident for the year. A printed receipt of the spending lines, the total, and what paid for it (taxes, then borrowing); the four largest lines beside it.',
    },
    flux: {
      title: 'Fluxul — de unde au venit și pe ce s-au dus, în două coloane',
      component: PersonFluxVariant,
      note: 'Title: revenue and spending per resident. Two columns of the same height: revenue lines plus the borrowed part on the left, spending lines on the right.',
    },
    luna: {
      title: 'Pe lună — totul în lei pe lună, pentru un locuitor',
      component: PersonLunaVariant,
      note: 'Title: lei per resident per month. One month of spending as a single bar, then each line as a large monthly amount; every section in lei per month.',
    },
  },
} satisfies PrototypeDefinition
