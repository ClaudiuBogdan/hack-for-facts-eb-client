import type { PrototypeDefinition } from '@/development/harness/entry'
import { UatMapBand } from './uat-map.variants'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/**
 * The INS hub's UAT map — a band of its own under the counties: 3,181 UATs,
 * six series, each read three ways (the count, per 1,000 inhabitants, the
 * change from the year before), each UAT opening onto its territory page. The
 * data is a snapshot (`scripts/generate-ins-uat-map.ts`).
 */
function ThreeReadings() {
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <UatMapBand />
    </div>
  )
}

export const prototype = {
  title: 'INS — harta localităților',
  spec: 'docs/design/statistics/design.md',
  variants: {
    'trei-vederi': {
      title: 'Total · la 1.000 locuitori · față de anul trecut',
      component: ThreeReadings,
      note: 'un comutator pentru toate seriile; numerele în cercuri, raportările în culori; toate trei în tooltip',
    },
  },
} satisfies PrototypeDefinition
