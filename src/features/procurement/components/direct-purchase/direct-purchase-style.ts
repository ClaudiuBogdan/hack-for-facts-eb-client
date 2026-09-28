import { CircleCheck, CircleHelp, CircleX, Clock, FileText } from 'lucide-react'
import type { DpOutcome } from '../../lib/direct-purchase-model'

/**
 * The direct purchase page's two visual rules, shared by its parts: tinted is
 * context (the band, a note under one line), plain is the record; and a
 * status's mark and colour — done in green, stopped in amber, reported or
 * unknown plain.
 */

/** The tint that marks context, from the band down to a note under one line. */
export const CONTEXT_TINT = 'bg-muted'

const DONE_TONE = 'text-emerald-800 dark:text-emerald-300'
const STOPPED_TONE = 'text-amber-800 dark:text-amber-300'

export function statusLook(outcome: DpOutcome): { readonly Icon: typeof CircleCheck; readonly tone: string } {
  switch (outcome.kind) {
    case 'accepted':
      return { Icon: CircleCheck, tone: DONE_TONE }
    case 'reported':
      return { Icon: FileText, tone: 'text-muted-foreground' }
    case 'unknown':
      return { Icon: CircleHelp, tone: 'text-muted-foreground' }
    case 'firm-late':
    case 'institution-late':
      return { Icon: Clock, tone: STOPPED_TONE }
    default:
      return { Icon: CircleX, tone: STOPPED_TONE }
  }
}
