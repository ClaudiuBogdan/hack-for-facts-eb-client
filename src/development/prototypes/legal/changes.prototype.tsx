import type { PrototypeDefinition } from '@/development/harness/entry'
import { ChangesPrototype } from './changes.page'

/**
 * `/legislation/changes` redesigned, for the owner's review before it replaces the page (spec
 * docs/superpowers/specs/2026-11-28-legislation-changes-redesign-design.md). Live reads from the dev API.
 */
export const prototype = {
  title: 'Legislație — Modificări (prototip, 28 noiembrie)',
  spec: 'docs/superpowers/specs/2026-11-28-legislation-changes-redesign-design.md',
  variants: {
    blocuri: {
      title: 'Modificări: un bloc pe actul care schimbă',
      component: ChangesPrototype,
      note: 'Owner, 27–28 November 2026: the page is for watching what is changing. Changes to existing acts lead (amended, added to, repealed, suspended, republished, corrected); new laws and approved ordinances have their own tab; the undated changes keep theirs. What comes into force soon sits on top, always shown when there is any. One block per act that makes the change (layout B, chosen from a picture of three), with what that act is about (its automatic summary) and every act it changes, each with its status. Filters in the side panel: the kind of change and a period; „Sursa" is gone. Live API.',
    },
  },
} satisfies PrototypeDefinition
