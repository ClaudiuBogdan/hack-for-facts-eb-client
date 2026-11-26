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
 */
export const prototype = {
  title: 'Legislație — pagina unui act (prototip, 26 noiembrie)',
  variants: {
    elemente: {
      title: 'Pagina actului: toate elementele unui text',
      component: ActSpecimenPage,
      note: "A made-up act (labelled as such) with every kind of element and state the text format has: the heading ladder (part, title, chapter, section, paragraph group, annex, appendix), articles with and without a name, paragraphs, letters, points and dashes with hanging markers, a Portal note, the note a consolidated form adds after a changed provision, a provision changed since the base form, struck and repealed text, references that open an act, lead outside or lead nowhere, a quotation, lists, two tables (one with merged cells, one wider than the column), two figures, a drawn layout, signatures. Around it: the new head, the reading bar that stays (place in the act, form shown, serif or sans), the contents with articles as a grid of numbers and a jump field, and after the text the act's record as plain rows. At the end, only in the prototype, the page's other states. No API read.",
    },
    act: {
      title: 'Pagina actului: un act servit (?act=72159)',
      component: ActLivePage,
      note: 'The same page over a served act: the act, its text and its outline through the feature\'s own hooks, the masthead lines lifted into the head as on the live page. A text served in parts loads its first part and the rest on a button. Not in the prototype: opening at a fragment from the address (?nod=), the form from the address (?doc=), jumping to an article in a part not yet loaded, and the record\'s full rules (it shows the layout with what the act serves).',
    },
  },
  compare: ['elemente'],
} satisfies PrototypeDefinition
