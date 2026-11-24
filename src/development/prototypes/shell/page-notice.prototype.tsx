import type { PrototypeDefinition } from '@/development/harness/entry'
import { AmberBand, Live, BandMuted, BandTagged, BandTint, NoticeBox, NoticeConfirm, PhaseStrip, QuietLine, TypeBalanced, TypeCompact, TypeGov, TypeLead } from './page-notice.variants'

export const prototype = {
  title: 'Page notice: data being verified',
  spec: 'Reusable per-page notice, dismissed per page for the session (GOV.UK phase / notification banner)',
  variants: {
    'phase-strip': { title: 'A · Phase strip', component: PhaseStrip, note: 'GOV.UK phase banner: tag, one line, quiet button' },
    'notice-box': { title: 'B · Notice box', component: NoticeBox, note: 'GOV.UK notification banner: navy title bar' },
    'notice-confirm': { title: 'C · Notice box + confirmation', component: NoticeConfirm, note: 'GOV.UK cookie-banner ending: confirm, then hide' },
    'amber-band': { title: 'D · Amber band', component: AmberBand, note: 'status colour, icon, close cross' },
    'quiet-line': { title: 'E · Quiet line', component: QuietLine, note: 'neutral, dashed rule, text button' },
    'band-muted': { title: 'F · Band, grey', component: BandMuted, note: 'GOV.UK cookie banner: grey band, button + link' },
    'band-tint': { title: 'G · Band, navy tint', component: BandTint, note: 'faint navy band, two buttons' },
    'band-tagged': { title: 'H · Band, grey + tag', component: BandTagged, note: 'grey band with the „În lucru” tag' },
    'type-gov': { title: 'I · GOV.UK scale', component: TypeGov, note: 'large bold title, larger body' },
    'type-balanced': { title: 'J · Balanced', component: TypeBalanced, note: 'title a step up, second sentence quieter' },
    'type-compact': { title: 'K · Compact', component: TypeCompact, note: 'the app’s operational density' },
    'type-lead': { title: 'L · Lead-in', component: TypeLead, note: 'no title, bold opening words' },
    live: { title: 'Built · the real PageNotice', component: Live, note: 'G with the polished copy; session cookie' },
  },
  // Owner chose G (band-tint), built as `live`. A–E round 1, F–H round 2, I–L round 3 (type).
  compare: ['band-tint', 'live'],
} satisfies PrototypeDefinition
