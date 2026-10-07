import type { PrototypeDefinition } from '@/development/harness/entry'
import { CitizensGalleryVariant, CitizensPageVariant } from './principal.page'

/**
 * The national budget's citizens' page (5 October 2026): graphical, one year
 * at a time, live on the MF bulletins, ANAF's execution and the budget laws;
 * the front door `/national-budget/analytics` opens from. Each band comes in
 * a few designs, switched by the amber ribbon over it (`?<band>=<design>`),
 * so the owner can pick one per band; `galerie` shows them all in a column.
 * See `principal.RATIONALE.md`.
 */
export const prototype = {
  title: 'Buget național — pagina pentru cetățeni',
  spec: 'docs/design/national-budget/design.md',
  variants: {
    pagina: {
      title: 'Pagina, cu variantele fiecărei secțiuni',
      component: CitizensPageVariant,
      note: 'The page as a reader sees it; the amber ribbon over each band switches its design (kept in the address).',
    },
    galerie: {
      title: 'Galerie: toate variantele, una sub alta',
      component: CitizensGalleryVariant,
      note: 'Every design of every band in one column, named; `&banda=<id>` keeps one band.',
    },
  },
} satisfies PrototypeDefinition
