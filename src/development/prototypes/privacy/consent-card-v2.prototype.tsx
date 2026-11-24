import type { PrototypeDefinition } from '@/development/harness/entry'
import { Coin, Current, FaceCalm, FaceSad, Pie, Stamp } from './consent-card-v2.variants'

/**
 * The consent card, round 2 (owner, 24 November 2026): polish the type and the
 * words, rethink the cookie as platform-themed pixel art, better motion. All
 * versions share the polished card; they differ in the cookie. Decisions are
 * mocked: nothing is saved.
 */
export const prototype = {
  title: 'Consent card v2: type, words, cookie',
  spec: 'src/features/privacy/components/consent-card.tsx',
  variants: {
    current: { title: 'Today’s cookie', component: Current, note: 'the shipped cookie in the polished card' },
    pie: { title: 'A · Pie-chart cookie', component: Pie, note: 'a budget pie; accepting pulls a slice out' },
    stamp: { title: 'B · Stamped cookie', component: Stamp, note: 'the decision gets an official stamp' },
    coin: { title: 'C · Coin cookie', component: Coin, note: 'a leu with a milled edge; the decision flips it' },
    'face-sad': { title: 'D · Today’s, with a face: sad on decline', component: FaceSad, note: 'blinks while waiting, beams when bitten, a tear on „only essentials”' },
    'face-calm': { title: 'E · Today’s, with a face: calm on decline', component: FaceCalm, note: 'as D, but content on „only essentials”' },
  },
  // Round 2 (owner: polish today's cookie, a sad face on decline). Round 1: pie, stamp, coin.
  compare: ['face-sad', 'face-calm'],
} satisfies PrototypeDefinition
