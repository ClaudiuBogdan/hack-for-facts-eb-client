import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'

/**
 * The last twelve months could not be told now (SEAP's cutoff unread): the
 * page describes the last complete year instead and says so, under the head —
 * the list still names the period asked for. The page is read again on the
 * next visit.
 */
export function ProfileFallbackNotice({ year }: { readonly year: number }) {
  return (
    <div className="border-b bg-muted/30" role="status">
      <RuledFrame className="py-3">
        <p className="text-sm leading-relaxed text-muted-foreground">{t`Ultimele 12 luni nu s-au putut citi acum; pagina arată ${year}.`}</p>
      </RuledFrame>
    </div>
  )
}
