import type { PrototypeDefinition } from '@/development/harness/entry'
import { AboutPage } from './about.page'

/**
 * The page the landing's people band will link to — a sketch, not a settled
 * design.
 *
 * The band itself shipped with the landing (`src/features/landing/components/
 * people-band.tsx`); the two shapes it beat are recorded in
 * `docs/design/landing/design.md`. What is left here is the page, which still
 * carries `[Provizoriu]` copy and so has no route yet. It imports the promoted
 * people data, so the names, portraits and links stay one list.
 */
export const prototype = {
  title: 'Despre — pagina dedicată',
  spec: 'docs/design/landing/design.md',
  variants: {
    page: {
      title: 'Pagina dedicată — schiță',
      component: AboutPage,
      note: 'What the people band links to once it exists as `/despre`. Judge the copy, not the band.',
    },
  },
} satisfies PrototypeDefinition
