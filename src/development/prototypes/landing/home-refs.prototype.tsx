import type { PrototypeDefinition } from '@/development/harness/entry'
import { FIELD_RECT_COUNT } from './home-refs.pixel-art'
import { LandingRefs } from './home-refs.refined'

/**
 * Landing page rewrite — settled.
 *
 * Round one (`landing/home`) settled the information architecture: a grouped
 * table of contents over every surface. Round two settled the skin, the
 * background and the illustrations. Round three settled the motion — the intro
 * wave, the click ripple and the scroll light turned out to occupy different
 * moments rather than compete, so the page carries all three.
 *
 * Round four settled the hero search on Base UI `Autocomplete`, over a
 * hand-rolled combobox on Radix Popover, cmdk and downshift. Round five settled
 * its shape: the results are joined to the field as one surface rather than
 * floating over the page. Both comparisons, with the measurements and the
 * losing arguments, are in `docs/design/landing-search-comparison.md` so
 * neither question gets reopened from scratch.
 */
export const prototype = {
  title: 'Landing page rewrite',
  spec: 'docs/user-stories/landing-page.md',
  variants: {
    landing: {
      title: 'Landing page',
      component: LandingRefs,
      note: `Each figure counts up with every digit smeared by its own rate of change, so the leading digit is sharp while the tail streaks. Section headings decrypt, cells and text arrive as you reach them. Search and results as one grey surface: no gap, no seam under the field, and the divider below the header is the single line between the query and the answers. Diacritic-folded match highlight, two-stage Escape, results that are real links. Intro wave across ${FIELD_RECT_COUNT} cells per side, a ripple on a hero click, and a scroll light closing on the centre of the bottom border.`,
    },
  },
} satisfies PrototypeDefinition
