import type { PrototypeDefinition } from '@/development/harness/entry'
import { COOKIE_RECT_COUNT } from './cookies.cookie-art'
import { ConsentModalStage } from './cookies.modal'
import { CookieSettingsPage } from './cookies.page'

/**
 * Cookie consent — the card and the page, on the landing's skin.
 *
 * Two surfaces, one decision, and they are prototyped together because they
 * are one contract: the card asks, the page answers in full, and both draw
 * the same cookie in the same state so the reader is never told two things.
 *
 * What is being decided:
 *
 * - **The card's shape.** Corner card on a wide screen, full-width strip at
 *   the bottom of a phone; non-modal; refuse and accept the same size on the
 *   same row; the fine-grained choice as a disclosure *inside* the card rather
 *   than a link away from the page.
 * - **The picture.** A pixel-art cookie, under 200 rects, drawn
 *   on the landing's square module, in the system's one accent. It answers
 *   the click: bitten for everything, plain for essentials only. Placeholder
 *   in the sense that real art may replace it — not in the sense of being
 *   unfinished.
 * - **The copy.** Romanian source, short, and honest about the one thing a
 *   consent card usually hides: that closing it decides nothing, and that the
 *   defaults are the private ones.
 * - **The page.** The shipped `/cookies` re-cut as a landing band: a ruled
 *   frame, numbered sections, a lattice of three choices, and an inventory of
 *   every key the app writes with its state right now.
 *
 * Both variants write real consent to `localStorage`. The strip above the
 * card variant clears it.
 */
export const prototype = {
  title: 'Cookie consent — card and settings page',
  spec: 'docs/design/prototyping.md',
  variants: {
    modal: {
      title: 'Card — asks, then answers the click',
      component: ConsentModalStage,
      note: `Fixed corner card, non-modal. Two equal buttons, a disclosure for the fine choice, and a ${COOKIE_RECT_COUNT}-rect cookie that gets bitten or loses its chips.`,
    },
    page: {
      title: 'Page — /cookies on the landing skin',
      component: CookieSettingsPage,
      note: 'Ruled frame, numbered bands, three choices as lattice cells, and the inventory of keys with their current state.',
    },
  },
  compare: ['modal', 'page'],
} satisfies PrototypeDefinition
