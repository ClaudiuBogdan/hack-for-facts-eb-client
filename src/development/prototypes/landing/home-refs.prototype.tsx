import type { PrototypeDefinition } from '@/development/harness/entry'
import { fieldRectCount } from './home-refs.pixel-art'
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
 *
 * Round six settled how the illustrations arrive — they were the one thing on
 * the page that did not. Opacity, a rise, a scale just short of 1 and a small
 * blur unwinding underneath, over four candidates including a pre-blurred
 * placeholder that lost on appearance. `home-refs.image-reveal.tsx` carries the
 * comparison and `docs/search/` the research the parameters came from.
 *
 * Round seven settled the margin field: a 12px module, drawn on a canvas.
 *
 * Both halves of that were decided by measurement. Cutting the field from the
 * lattice's 24px to 12px — four squares where there was one, the tail running
 * down to 1.5px — is the look, and it was chosen over 24px and over an 8px
 * module that was built and dropped. But the SVG renderer gave every cell an
 * element and its own CSS animation, and at 12px that is 1,943 elements a side:
 * the intro wave fell from 196 frames to 66 across the 2.2 seconds it occupies,
 * and at 8px it managed four.
 *
 * So the field moved to a canvas, and the SVG renderer is gone rather than kept
 * as an option — a second way to draw the same thing is a second thing to keep
 * correct.
 *
 * |                    | SVG 24px | SVG 12px | canvas 12px |
 * |--------------------|---------:|---------:|------------:|
 * | elements per side  |      494 |    1,943 |           1 |
 * | SSR HTML           |   281 KB |   692 KB |      137 KB |
 * | intro frames /2.2s |      196 |       66 |         230 |
 * | frames over 33ms   |        5 |       27 |           1 |
 *
 * The canvas at 12px beats the 24px SVG it replaces while drawing four times
 * the cells, and the draw loop costs about 0.7ms a frame with the main thread
 * better than half idle. The port was verified by diff rather than by eye: the
 * same crop of the field, drawn both ways, differed in one pixel of 239,400, by
 * one level.
 *
 * Round eight settled how the hero's entity panel is projected: **two-point**.
 *
 * The panel is turned toward the search field — a direction that was measured
 * rather than chosen, since the field sits 578px left of the panel's centre and
 * 108px below it. Aiming exactly at it is a yaw of 26.7 degrees with about five
 * of pitch; the shipped angle is 18 and no pitch, which keeps the direction and
 * gives up arriving there, because at the full angle the list stops being
 * something you read.
 *
 * Two-point is what dropping the pitch means: every vertical edge stays
 * vertical and only the horizontals converge. It is the classic architectural
 * view, and on a panel whose entire content is six lines of text it is the one
 * of the three that does not fight the reading. It also happens to be the only
 * one whose near edge lands exactly on the page's right rule, since a pitch and
 * a shear each swing a corner forward past a hinge only the yaw respects.
 *
 * The two it was chosen over were built and measured rather than argued about,
 * and are gone rather than left behind as options nobody will pick. Three-point
 * added a pitch, aiming vertically as well as sideways: more literally correct,
 * and it tilts the rows off level, which on six lines of text costs more than
 * the accuracy buys. A parallel projection with a cosine-corrected shear read
 * as drafted rather than photographed and sheared the text hardest of the
 * three. Both are in the history if the question reopens.
 *
 * The window it is framed in — the title bar, the lights, the corners and the
 * depth — is desktop-only, all of it starting at the same width. The hero is
 * one column on a phone, where a pane angled at a headline directly above it is
 * angled at nothing and three window controls on a device with no windows are a
 * costume rather than a metaphor.
 */

export const prototype = {
  title: 'Landing page rewrite',
  spec: 'docs/user-stories/landing-page.md',
  variants: {
    landing: {
      title: 'Landing page',
      component: LandingRefs,
      note: `Each figure counts up with every digit smeared by its own rate of change, so the leading digit is sharp while the tail streaks. Section headings decrypt, cells and text arrive as you reach them. Search and results as one grey surface: no gap, no seam under the field, and the divider below the header is the single line between the query and the answers. Diacritic-folded match highlight, two-stage Escape, results that are real links. Intro wave across ${fieldRectCount(12)} cells per side, a ripple on a hero click, and one light at a time: a circuit tracing the card you are reading, and the margins reporting the stretches no card covers, each fading as the other takes over. The illustrations arrive with a fade, a 20px rise, a 0.985 scale and a 5px blur that clears before the motion settles, triggered 320px into the viewport — 180px and softer on a phone.`,
    },
  },
} satisfies PrototypeDefinition
