import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { TriangleAlert } from 'lucide-react'
import type { ProcurementAnswerMeta } from '@/schemas/procurement'
import { cn } from '@/lib/utils'
import { humanizeProcurementCaveat } from '../lib/caveat-text'
import {
  procurementNoticeClassName,
  procurementNoticeIconClassName,
} from '../lib/procurement-theme'

/**
 * The page's single coverage-honesty notice. It takes EVERY answer envelope the
 * surface renders, not one per figure: a page that stacked a notice under the
 * headline and another under the analysis showed the same class of limit twice
 * and read as two separate failures.
 *
 * Fully served answers produce nothing at all — all data here is production.
 *
 * Status is carried by the icon and by the bold opening sentence, never by
 * colour alone, so the block needs no badge of its own.
 */
export function ProcurementAnswerabilityNotice({
  metas,
  className,
}: {
  /** Every envelope shown on this surface; caveats are merged and deduped. */
  readonly metas: readonly ProcurementAnswerMeta[]
  readonly className?: string
}) {
  const [expanded, setExpanded] = useState(false)

  const caveats = [...new Set(metas.flatMap((meta) => meta.caveats))]
  const abstained = metas.some((meta) => meta.answerability === 'abstained')

  if (!abstained && caveats.length === 0) return null

  const humanCaveats = caveats.map(humanizeProcurementCaveat)
  const [lead, ...rest] = humanCaveats
  // The machine wording only earns space when it actually differs from what
  // the reader is being shown.
  const technical = caveats.filter(
    (caveat, index) => humanCaveats[index] !== caveat,
  )
  const canExpand = rest.length > 0 || technical.length > 0

  return (
    <aside className={cn(procurementNoticeClassName, className)}>
      <TriangleAlert className={procurementNoticeIconClassName} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="min-w-0">
          <strong className="text-[var(--pnrr-fg)]">
            {abstained ? (
              <Trans>Unele cifre nu sunt disponibile.</Trans>
            ) : (
              <Trans>Aceste cifre sunt parțiale.</Trans>
            )}
          </strong>{' '}
          {lead ?? (
            <Trans>Nicio valoare nu a fost înlocuită.</Trans>
          )}
        </p>

        {expanded && rest.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {rest.map((caveat) => (
              <li key={caveat} className="flex gap-2">
                <span aria-hidden className="select-none">
                  ·
                </span>
                <span className="min-w-0">{caveat}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {expanded && technical.length > 0 ? (
          <p className="mt-2 text-xs leading-5 text-[var(--pnrr-muted)]/80">
            {technical.join(' · ')}
          </p>
        ) : null}

        {canExpand ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-2 text-sm font-bold text-[var(--pnrr-fg)] underline underline-offset-2 transition-colors hover:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            {expanded ? (
              <Trans>Arată mai puțin</Trans>
            ) : (
              <Trans>Arată tot</Trans>
            )}
          </button>
        ) : null}
      </div>
    </aside>
  )
}
