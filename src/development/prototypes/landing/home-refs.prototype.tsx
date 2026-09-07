import type { PrototypeDefinition } from '@/development/harness/entry'
import { FIELD_RECT_COUNT } from './home-refs.pixel-art'
import {
  LandingRefs,
  LandingRefsBaseUi,
  LandingRefsCmdk,
  LandingRefsDownshift,
} from './home-refs.refined'

/**
 * Landing page — the page is settled; the search underneath it is not.
 *
 * Round one (`landing/home`) settled the information architecture: a grouped
 * table of contents over every surface. Round two settled the skin, the
 * background and the illustrations. Round three settled the motion — the intro
 * wave, the click ripple and the scroll light turned out to occupy different
 * moments rather than compete, so the page carries all three.
 *
 * Round four is the hero search, and these four variants are the open question.
 * Each renders the *same page* with a different combobox implementation
 * underneath the field. They share the data layer (`useSearchResults`: one
 * debounce, one query key, the same seven states, the same stand-in labelling)
 * and the same row, marks, header and announcements, so the only axis varying
 * is the interaction — what Escape means, when Enter is allowed to act, how the
 * highlight travels and scrolls, and where the popup goes when there is no room
 * below the field.
 *
 * Compare them on the real page rather than in a rig: the hero, the fact strip
 * directly below it and the panel beside it are exactly the constraints that
 * make position and scroll hard. `?layout=side` puts two side by side.
 *
 * The findings are written up in `docs/design/landing-search-comparison.md`.
 */
export const prototype = {
  title: 'Landing page rewrite',
  spec: 'docs/user-stories/landing-page.md',
  variants: {
    landing: {
      title: 'A · Hand-rolled + Radix',
      component: LandingRefs,
      note: `The combobox written out, with Radix Popover as the layer only. Full control, and the ARIA is ours to get right — including the two-stage Escape that had to be taken back off Radix. ${FIELD_RECT_COUNT} field cells per side.`,
    },
    'landing-cmdk': {
      title: 'B · cmdk',
      component: LandingRefsCmdk,
      note: 'Already a dependency and already shadcn-canonical. Needs shouldFilter={false} to stop it re-ranking the server, and its items cannot be links — so no preload on intent and no Cmd-click to a new tab.',
    },
    'landing-downshift': {
      title: 'C · downshift',
      component: LandingRefsDownshift,
      note: 'The WAI-ARIA reference implementation. Two-stage Escape and scroll-into-view are defaults rather than things to write. Owns no pixels, so it still needs Popover for position.',
    },
    'landing-baseui': {
      title: 'D · Base UI',
      component: LandingRefsBaseUi,
      note: 'From the Radix team, built for this widget. filter={null} for server order, a reason on every change so Escape is one comparison, and the popup exposes the room it measured. One library instead of two.',
    },
  },
} satisfies PrototypeDefinition
