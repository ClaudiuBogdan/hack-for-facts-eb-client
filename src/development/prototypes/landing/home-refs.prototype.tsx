import type { PrototypeDefinition } from '@/development/harness/entry'
import { FIELD_RECT_COUNT } from './home-refs.pixel-art'
import { LandingRefs } from './home-refs.refined'

/**
 * Landing page — the chosen direction, consolidated.
 *
 * Round one (`landing/home`) settled the information architecture: a grouped
 * table of contents over every surface. Round two settled the skin, the
 * background and the illustrations. Round three settled the motion, which is
 * why this file no longer offers alternatives — the three behaviours below were
 * variants competing against each other, and they turned out not to compete.
 * They occupy different moments, so the page now carries all three.
 *
 * - An **intro wave** crosses the margin field shortly after load.
 * - **Clicking the hero** sends a ripple out from that point, across both
 *   fields, weakening with distance. Clicks inside the content column are
 *   ignored: the field lives in the margins, and a click on the search or a
 *   shortcut meant something else.
 * - A **scroll light** rides the two frame rules as a playhead, flaring at each
 *   band boundary and turning the corner along the bottom border to meet in the
 *   middle at the end of the page.
 *
 * All three obey the same constraints — `opacity` and `transform` only,
 * one-shot or scroll-coupled so nothing loops or stays resident, no
 * `will-change` across the ~990 field cells but yes on the two light heads that
 * always move, and reduced motion honoured before a listener is attached. The
 * reasoning is in `home-refs.field-animation.tsx`, `home-refs.field-motion.ts`
 * and `home-refs.scroll-light.tsx`.
 */
export const prototype = {
  title: 'Landing page rewrite',
  spec: 'docs/user-stories/landing-page.md',
  variants: {
    landing: {
      title: 'Landing page',
      component: LandingRefs,
      note: `Intro wave across ${FIELD_RECT_COUNT} cells per side, ripple on a hero click, and a scroll light on the frame rules that closes on the centre of the bottom border.`,
    },
  },
} satisfies PrototypeDefinition
