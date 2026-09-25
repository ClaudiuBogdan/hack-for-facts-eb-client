import type { PrototypeDefinition } from '@/development/harness/entry'
import { UatMapBand } from './uat-map.variants'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/**
 * The INS hub's UAT map, drawn by opacity: the three readings of
 * `statistics/uat-map`, with a ratio's colour faint where few people live
 * (under 2.000, 2.000–5.000, 5.000–20.000, over 20.000) — kept as a map of
 * its own for its look, beside the standard one.
 */
function FadedMap() {
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <UatMapBand style="faded" />
    </div>
  )
}

export const prototype = {
  title: 'INS — harta localităților, opacitate după populație',
  spec: 'docs/design/statistics/design.md',
  variants: {
    opacitate: {
      title: 'Culoare după valoare, opacitate după populație',
      component: FadedMap,
      note: 'aceleași trei vederi; culorile mai slabe unde locuiesc mai puțini oameni',
    },
  },
} satisfies PrototypeDefinition
