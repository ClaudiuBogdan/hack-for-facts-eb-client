import type { PrototypeDefinition } from '@/development/harness/entry'
import { CookieIllustrationStudy } from './cookies.cookie-art'
import { ConsentModalStage } from './cookies.modal'
import { CookieSettingsPage } from './cookies.page'

/** Cookie artwork, consent card, and settings page on the landing's skin.
 * The artwork study uses local state. Card and page retain real consent storage.
 */
export const prototype = {
  title: 'Cookie consent — card and settings page',
  spec: 'docs/design/prototyping.md',
  variants: {
    illustration: {
      title: 'Illustration — shape and motion',
      component: CookieIllustrationStudy,
      note: 'Pixel-art biscuit with ordered dithering, a stepped bite, and pixel crumbs. Try all three states without changing consent.',
    },
    modal: {
      title: 'Card — asks, then answers the click',
      component: ConsentModalStage,
      note: 'Fixed corner card, non-modal. Two equal buttons, a disclosure for the fine choice, and an illustrated cookie that gets bitten or loses its chips.',
    },
    page: {
      title: 'Page — /cookies on the landing skin',
      component: CookieSettingsPage,
      note: 'Ruled frame, and one full-width row per choice with the switch on the right and the whole text block as its label. The inventory table is gone — it restated the cookie policy’s own list of keys and lifetimes, and two copies of that list is one more than can be kept true.',
    },
  },
  compare: ['modal', 'page'],
} satisfies PrototypeDefinition
