/**
 * DEPRECATED module path. The global stenograme surface is no longer a single
 * "speeches page": it is sittings-first, with interventions as the second view.
 * The implementation moved to `parliament-stenograme-page.tsx`; this file is a
 * re-export so any lingering import keeps resolving, and can be deleted once
 * none remain.
 */
export { ParliamentStenogramePage as ParliamentSpeechesPage } from './parliament-stenograme-page'
