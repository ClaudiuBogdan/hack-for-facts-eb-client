import type { PrototypeDefinition } from '@/development/harness/entry'
import { FIELD_RECT_COUNT } from './home-refs.pixel-art'
import { LandingRefs, LandingRefsHandover, LandingRefsHeader } from './home-refs.refined'

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
      note: `Each figure counts up with every digit smeared by its own rate of change, so the leading digit is sharp while the tail streaks. Section headings decrypt, cells and text arrive as you reach them. Search and results as one grey surface: no gap, no seam under the field, and the divider below the header is the single line between the query and the answers. Diacritic-folded match highlight, two-stage Escape, results that are real links. Intro wave across ${FIELD_RECT_COUNT} cells per side, a ripple on a hero click, and two lights at once: the margins reporting scroll speed, a circuit on the card you are reading reporting position. The other two variants are arguments that one mark is enough.`,
    },
    header: {
      title: 'Header as a section',
      component: LandingRefsHeader,
      note: `No page-wide margin light at all. The hero gets the same circuit every other section gets — out from its top centre, down the frame rules, closing on its bottom border — so the page is one repeated idea rather than two, and every mark comes and goes with the scroll instead of one of them parking on a border. Everything else matches the default variant.`,
    },
    handover: {
      title: 'Margins hand over',
      component: LandingRefsHandover,
      note: `The default page, except the margin light stands down as the reader reaches the first section card and comes back when they leave the last, so only one mark is ever running. The margins end up framing the hero and the closing band, which are the parts no card covers. Compare against the default, where both run at once on the argument that speed and position are different questions.`,
    },
  },
} satisfies PrototypeDefinition
