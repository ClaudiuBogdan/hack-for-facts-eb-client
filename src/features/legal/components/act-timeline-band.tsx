import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { LegalTimelineEntry } from '@/schemas/legal'
import { formatLegalDate, formatLegalNumber } from '../lib/legal-format'
import { legislationLinkClassName } from '../lib/legislation-theme'
import { ActDisclosure } from './act-disclosure'

type Props = {
  readonly timeline: readonly LegalTimelineEntry[]
}

const PAGE = 12

/**
 * Rung 4 — what has happened to this act, newest first.
 *
 * This is deliberately **a list, not a stage tracker**. Parliament's bill page
 * uses a tracker because a bill's passage is linear and finite (first chamber →
 * second chamber → promulgation). An act's amendment history is neither: the
 * Codul Fiscal has 479 entries with no terminal state, and rendering that as
 * progress would imply a destination that does not exist.
 *
 * `eventSource` is shown because it is a real provenance distinction —
 * `monitorul-oficial` events are gazette-grounded, `portal` events are the
 * Portal's own bookkeeping.
 */
export function ActTimelineBand({ timeline }: Props) {
  const { i18n } = useLingui()
  const [expanded, setExpanded] = useState(false)

  if (timeline.length === 0) return null

  const ordered = [...timeline].sort((a, b) =>
    (b.effectiveDate ?? '').localeCompare(a.effectiveDate ?? ''),
  )
  const visible = expanded ? ordered : ordered.slice(0, PAGE)

  return (
    <ActDisclosure
      id="act-timeline-heading"
      title={t`Ce s-a întâmplat cu acest act`}
      meta={
        <Trans>
          {formatLegalNumber(timeline.length, i18n.locale)} evenimente
        </Trans>
      }
      description={t`Modificări, completări, abrogări și alte evenimente de statut.`}
      footnote={
        <Trans>
          Evenimentele marcate „Monitorul Oficial” sunt susținute de o publicare
          în Monitor; cele marcate „Portal” provin din evidența Portal
          Legislativ. Deciziile Curții Constituționale nu apar aici.
        </Trans>
      }
    >
      <ol id="act-timeline-entries" className="flex flex-col">
        {visible.map((entry, index) => (
          <li
            key={`${entry.label}-${entry.effectiveDate}-${index}`}
            className="flex flex-col gap-1 border-b border-[var(--pnrr-track)] px-5 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-5 sm:px-6"
          >
            <span className="shrink-0 text-sm tabular-nums text-[var(--pnrr-muted)] sm:w-32">
              {entry.effectiveDate
                ? formatLegalDate(entry.effectiveDate, i18n.locale)
                : t`fără dată`}
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium text-[var(--pnrr-fg)]">
              {entry.label}
            </span>
            {entry.eventSource ? (
              <span className="shrink-0 text-xs text-[var(--pnrr-muted)]">
                {entry.eventSource === 'monitorul-oficial'
                  ? t`Monitorul Oficial`
                  : t`Portal`}
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      {ordered.length > PAGE ? (
        <div className="border-t border-[var(--pnrr-track)] px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={legislationLinkClassName}
            aria-expanded={expanded}
            aria-controls="act-timeline-entries"
          >
            {expanded ? (
              <Trans>Arată mai puține</Trans>
            ) : (
              <Trans>
                Arată toate cele{' '}
                {formatLegalNumber(ordered.length, i18n.locale)} evenimente
              </Trans>
            )}
          </button>
        </div>
      ) : null}
    </ActDisclosure>
  )
}
