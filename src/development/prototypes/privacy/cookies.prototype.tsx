import type { PrototypeDefinition } from '@/development/harness/entry'
import { CookieIllustrationStudy } from './cookies.cookie-art'

/**
 * The consent card and the settings page shipped (`src/features/privacy/`);
 * what remains is the art study, which drives the promoted illustration
 * through its three states without touching the visitor's consent.
 */
export const prototype = {
  title: 'Cookie illustration — art study',
  spec: 'docs/design/landing/design.md',
  variants: {
    illustration: {
      title: 'Illustration — shape and motion',
      component: CookieIllustrationStudy,
      note: 'Pixel-art biscuit with ordered dithering, a stepped bite, and pixel crumbs. Try all three states without changing consent.',
    },
  },
} satisfies PrototypeDefinition
