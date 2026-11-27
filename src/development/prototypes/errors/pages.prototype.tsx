import type { PrototypeDefinition } from '@/development/harness/entry'
import { CookieVariant, DigitsVariant, PageCatVariant, PageGooglyVariant, PromotedVariant, SheetVariant } from './pages.variants'

/**
 * The not-found and error pages, redesigned (owner, 25 November 2026): the
 * landing's skin, playful like the consent cookie, no technical details on the
 * error page, reload and home kept. Each variant shows three pages; switch
 * with the bar on top (`?page=error`, `?page=update`). Reload really reloads.
 */
export const prototype = {
  title: 'Not-found and error pages',
  spec: 'src/components/errors/GlobalErrorPage.tsx',
  variants: {
    cookie: { title: 'A · The cookie, beside the words', component: CookieVariant, note: 'searches with a lens; a piece breaks off; fresh out of the oven' },
    sheet: { title: 'B · A sheet from the file', component: SheetVariant, note: 'a blank sheet looks for itself; torn in two; a new edition' },
    digits: { title: 'C · The cookie, centred; 4·cookie·4', component: DigitsVariant, note: 'the cookie is the zero in 404' },
    'page-googly': { title: 'D · The page, googly eyes', component: PageGooglyVariant, note: 'pupils follow the pointer; rosy cheeks; arms and feet' },
    'page-cat': { title: 'E · The page, cat face', component: PageCatVariant, note: 'tall eyes that follow the pointer; an ω mouth' },
    promoted: { title: 'Shipped · the real pages', component: PromotedVariant, note: 'NotFoundPage and ErrorPageView from src/components/errors (owner picked E)' },
  },
  // Round 2 (owner: the page character, a face of its own, not the cookie's). Round 1: cookie, sheet, digits.
  compare: ['page-googly', 'page-cat'],
} satisfies PrototypeDefinition
