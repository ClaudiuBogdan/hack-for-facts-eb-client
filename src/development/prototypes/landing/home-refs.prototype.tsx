import type { PrototypeDefinition } from '@/development/harness/entry'
import { LandingRefsRefined } from './home-refs.refined'

/**
 * Landing page — the chosen direction.
 *
 * Round one (`landing/home`) decided information architecture: a grouped table
 * of contents over every surface, rather than the shipped four cards or an
 * intent-led hero. This prototype carries that IA into a design derived from
 * ui8.ai/forge, vercel.com/ai-sdk and opentrain.ai.
 *
 * Two earlier variants were removed once this one was chosen. `grid` was the
 * same architecture without the polish; `forge` was the research brief taken
 * literally — a near-black canvas with an orange accent — and it did its job by
 * showing the cost: the shell does not change with the page, so the sidebar,
 * footer, search input and campaign card all stayed light around a black body,
 * and `DESIGN.md` quarantines page-level skins to PNRR and Parliament.
 *
 * Worth keeping in mind while iterating, because it constrains what belongs
 * here: of the three references the brief was written from, only Forge is dark.
 * Vercel's AI SDK page and OpenTrain are both light, and OpenTrain draws its
 * lattice on white. What transferred is structure — the lattice, cells sharing
 * borders, asymmetric section headers, display type, monospace numbering — not
 * the skin.
 */
export const prototype = {
  title: 'Landing page rewrite',
  spec: 'docs/user-stories/landing-page.md',
  variants: {
    refined: {
      title: 'Refined',
      component: LandingRefsRefined,
      note: 'Grouped index, two-layer masked lattice, frame rules, locally-restyled search, real entities as hero product UI, accent hover on cells.',
    },
  },
  compare: ['refined'],
} satisfies PrototypeDefinition
