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
 *
 * Round 2 (same day): controls that open more of the page are not blue. The version, the notice of the
 * unofficial form and the warnings sit in a column at the right on a wide screen that stays in view (owner, from a
 * picture of three layouts); narrower, the notice folds to its first sentence and the Portal's note with its date,
 * and a long note of the Portal shows its first lines. `?aparat=intreg` and `?aparat=pliat` keep the other two.
 *
 * Round 3 (same day), the contents: a bordered box with its own title and jump field (owner, from a picture of four
 * containers; `?cadru=simplu`, `?cadru=fond` and `?cadru=coloana` keep the others). The steps per level stay; article
 * numbers sit in cells of one width so they line up within a level; a faint line per level says what holds what.
 * A switch beside the title folds the contents to its first level and keeps open the branch the reader is in (the
 * owner's idea); an outline of more than 40 entries starts folded.
 * The box hangs from the reading bar, which holds its title and switch (owner, from a picture of four heads;
 * `?cap=randuri`, `?cap=rand` and `?cap=interior` keep the others).
 * The side column is the contents box's twin: a box hung from the bar, which says „Versiunea textului"; a version name
 * on two lines, the notice as small print with its guidance and link behind „Detalii", the live warnings worn
 * lighter (owner, from a picture; `?dreapta=vechi`, `?dreapta=simplu` and `?nota=intreaga` keep the rest).
 * The way back to the act's start is a control in the reading bar („La început", an arrow on a phone), shown once
 * the act's head has left the screen (owner: a long text makes it hard to scroll up again).
 *
 * Round 4 (same day), the head and the closing record: the head's facts each under its name, at the right above the
 * side box on a wide screen and in a band under the title on narrower ones (`?antet=linii`, `?antet=banda` keep the
 * others); the record in folding sections with their counts (`?fisa=coloana`, `?fisa=titluri`); the contents box
 * ends with a fixed row that goes to the record.
 * A floating button also goes back to the start (owner: both). The text's elements: a figure that is not served
 * takes one line (`?figura=cadru` keeps the frame); a wide table stays as it was, the owner declined a hint and an
 * open-wide view (`?tabel=indiciu`, `?tabel=deschide` keep them).
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
