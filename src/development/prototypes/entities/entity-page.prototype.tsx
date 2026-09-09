import type { PrototypeDefinition } from '@/development/harness/entry'
import { EntityPageBands } from './entity-page.bands'
import { ENTITY_PAGE_FIXTURE } from './entity-page.fixtures'
import { EntityPageKeep } from './entity-page.keep'
import { EntityPageRail } from './entity-page.rail'
import { useEntityPageState } from './entity-page.state'

/**
 * Entity page rewrite — `/entities/$cui` in the landing rewrite's language.
 *
 * What is being decided, in order: the main layout, then the header, then the
 * bands. Both variants render the same pieces from the same fixture; only the
 * arrangement differs. The fixture is a labelled local stand-in
 * (`entity-page.fixtures.ts`), because the API is a separate repo and is
 * usually not running under this harness.
 *
 * Deep links: `?v=bands&view=main-info&year=2025&normalization=per_capita`.
 */

function Bands() {
  const { state, onStateChange } = useEntityPageState()
  return <EntityPageBands data={ENTITY_PAGE_FIXTURE} state={state} onStateChange={onStateChange} />
}

function Keep() {
  const { state, onStateChange } = useEntityPageState()
  return <EntityPageKeep data={ENTITY_PAGE_FIXTURE} state={state} onStateChange={onStateChange} />
}

function Rail() {
  const { state, onStateChange } = useEntityPageState()
  return <EntityPageRail data={ENTITY_PAGE_FIXTURE} state={state} onStateChange={onStateChange} />
}

export const prototype = {
  title: 'Entity page rewrite',
  spec: 'docs/user-stories/entity-details.md',
  variants: {
    bands: {
      title: 'Stacked bands',
      component: Bands,
      note: 'One column in the landing rhythm: identity band, figures band, then one band per section between rules. A compact name · period · view bar pins to the top on scroll. Same layout at every width.',
    },
    rail: {
      title: 'Sticky rail',
      component: Rail,
      note: 'Desktop two-column: identity, figures, section index and period pinned in a left rail; the sections scroll on the right. Below lg it is the stacked layout.',
    },
    keep: {
      title: 'Shell only, existing components',
      component: Keep,
      note: 'The landing frame, rules, bands and the new header wrapped around the components the entity page has today (treemap, grouped line items, category evolution, subordinates, reports, FAQ), fed from the same fixture where they take props. The two that fetch for themselves render live and show their own loading or error state until the API is up.',
    },
  },
  compare: ['bands', 'rail', 'keep'],
} satisfies PrototypeDefinition
