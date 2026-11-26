import type { PrototypeDefinition } from '@/development/harness/entry'
import { ActLivePage, ActSpecimenPage } from './act.variants'

/**
 * `/legislation/acts/:id`, rethought (owner, 26 November 2026: the header, the side panel, the closing section and
 * the page's elements, as a prototype, showing the different kinds of document elements).
 *
 * `elemente` draws a made-up act that holds every kind of element the text format carries, with no read at all.
 * `act` draws a served act (`?act=<id>`) through the feature's own hooks, to see the design on real text.
 * The text's renderer here (`act.blocks.tsx`) is a copy of the feature's with classes and wrappers changed only;
 * `act.blocks.test.tsx` holds it to the same rule (the page's text is the fold of the blocks, character for character).
 *
 * Owner, 26 November 2026, round 1: the text stays in a serif (no switch to the site's sans); the contents keeps the
 * grid of article numbers with its jump field, with „Art." at the top left of each grid. No bar on changed provisions:
 * the change notes say it (`?bara=linie` and `?bara=legenda` show the two treatments not chosen). Next: more changes
 * on the prototype before any promotion.
 */
export const prototype = {
  title: 'Legislație — pagina unui act (prototip, 26 noiembrie)',
  variants: {
    elemente: {
      title: 'Pagina actului: toate elementele unui text',
      component: ActSpecimenPage,
      note: "A made-up act (labelled as such) with every kind of element and state the text format has: the heading ladder (part, title, chapter, section, paragraph group, annex, appendix), articles with and without a name, paragraphs, letters, points and dashes with hanging markers, a Portal note, the note a consolidated form adds after a changed provision, a provision changed since the base form, struck and repealed text, references that open an act, lead outside or lead nowhere, a quotation, lists, two tables (one with merged cells, one wider than the column), two figures, a drawn layout, signatures. Around it: the new head, the reading bar that stays (place in the act, form shown), the contents with articles as a grid of numbers and a jump field, and after the text the act's record as plain rows. At the end, only in the prototype, the page's other states. No API read.",
    },
    act: {
      title: 'Pagina actului: un act servit (?act=72159)',
      component: ActLivePage,
      note: "The same page over a served act: the act, its text and its outline through the feature's own hooks, the opening lines lifted into the head as on the live page. Before the text it says what the live page says (the default form's notices and the act's warnings, the live components unchanged, not yet restyled). A text served in parts reads its next part as you scroll, and a jump from the contents reads up to the part that holds the place. Not in the prototype: opening at a fragment or a form from the address (?nod=, ?doc=), and the record's full rules (it shows the layout with what the act serves). Try ?act=66150 for a very long act.",
    },
  },
  compare: ['elemente'],
} satisfies PrototypeDefinition
