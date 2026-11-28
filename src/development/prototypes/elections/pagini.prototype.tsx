import type { PrototypeDefinition } from '@/development/harness/entry'
import { AnalyticsBudgetHead, AnalyticsLegalShell } from './pagini/analize'
import { DetailsHead } from './pagini/detalii'
import { ElectionsFrontDoor } from './pagini/principal'

/**
 * The elections pages laid out like legislation and the national budget (owner, 2026-11-28), read live from the
 * API the dev server points at. The front door (`/alegeri`), the analytics page (`/alegeri/analize`) in its two
 * candidate heads with all five views and 25 tabs, and the details pages' slim head. Patterns from client-dev-polish
 * (2026-11-28): the national budget's hero, bar and figures; the shared hub parts as on dev.
 */
export const prototype = {
  title: 'Alegeri — paginile',
  spec: 'docs/design/elections/design.md',
  variants: {
    principal: {
      title: 'Prima pagină, /alegeri',
      component: ElectionsFrontDoor,
      note: 'Like /legislation and /national-budget: the way home, the headline, the place search (lands with the place page), shortcuts, the latest elections; the pinned bar; four figures; six bands (Parlament, Primării, Președinte, Harta, Prezența, Toate alegerile), each with a link onward; places to start. Live reads.',
    },
    'analize-buget': {
      title: 'Analize, capul bugetului național',
      component: AnalyticsBudgetHead,
      note: 'The question as the headline over the lattice, the controls row with the one caveats marker, the pinned bar of five views, the view’s tabs as stacked sections under a jump row. Mandate drawn live; the other tabs say what they draw and when.',
    },
    'analize-legislatie': {
      title: 'Analize, capul legislației',
      component: AnalyticsLegalShell,
      note: 'The slim shell with the sibling pages pinned, the question as an h2, the views and the tabs as toggles, one tab’s answer at a time. Same live body.',
    },
    detalii: {
      title: 'Paginile de detaliu, capul subțire',
      component: DetailsHead,
      note: 'An election, a race or a place: the way home, the title, one sentence, the sources. The bodies stay as they are.',
    },
  },
  compare: ['analize-buget', 'analize-legislatie'],
} satisfies PrototypeDefinition
