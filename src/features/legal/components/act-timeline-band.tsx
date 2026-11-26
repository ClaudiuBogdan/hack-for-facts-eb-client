import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import type { LegalTimelineEntry } from '@/schemas/legal'
import { formatLegalDate, formatLegalNumber } from '../lib/legal-format'
import { ActAccordionItem } from './act-accordion'
import { ACT_RECORD_LINE, ACT_RECORD_MORE } from './reader/act-page-grid'

type Props = {
  /** Null when the history is not available for this act (bridged on legal_v2). */
  readonly timeline: readonly LegalTimelineEntry[] | null
  /**
   * False when the server cut the timeline at its bound (I-20); null when it
   * did not say — unknown, so an empty list is never shown as complete.
   */
  readonly complete?: boolean | null
  /**
   * False when the history is not available for this act (legal_v2 bridges
   * it from the previous corpus, which may not hold the act).
   */
  readonly available?: boolean
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
export function ActTimelineBand({ timeline, complete = true, available = true }: Props) {
  const { i18n } = useLingui()
  const [expanded, setExpanded] = useState(false)

  // No history to vouch for: say so, rather than show an empty, complete one.
  if (!available || timeline === null || (timeline.length === 0 && complete === null)) {
    return (
      <ActAccordionItem
        id="act-timeline-heading"
        title={t`Ce s-a întâmplat cu acest act`}
        description={t`Modificări, completări, abrogări și alte evenimente de statut.`}
      >
        <p className="text-muted-foreground">
          <Trans>Istoricul nu este disponibil pentru acest act.</Trans>
        </p>
      </ActAccordionItem>
    )
  }

  if (timeline.length === 0) return null

  const ordered = [...timeline].sort((a, b) =>
    (b.effectiveDate ?? '').localeCompare(a.effectiveDate ?? ''),
  )
  const visible = expanded ? ordered : ordered.slice(0, PAGE)

  return (
    <ActAccordionItem
      id="act-timeline-heading"
      title={t`Ce s-a întâmplat cu acest act`}
      meta={
        <Plural
          value={timeline.length}
          one="# eveniment"
          few="# evenimente"
          other="# de evenimente"
        />
      }
      description={t`Modificări, completări, abrogări și alte evenimente de statut.`}
      footnote={
        <Trans>
          Evenimentele marcate „Monitorul Oficial” sunt susținute de o publicare
          în Monitor; cele marcate „Portal” provin din evidența Portal
          Legislativ. Unele trimiteri ale instanțelor la modificări sau completări
          sunt omise; trimiterile la abrogări și evenimentele de statut
          înregistrate sunt păstrate.
        </Trans>
      }
    >
      {complete === true ? null : complete === null ? (
        <p role="status" className="pb-2 text-muted-foreground">
          <Trans>Nu știm dacă lista este completă.</Trans>
        </p>
      ) : (
        <p role="status" className="pb-2 text-muted-foreground">
          <Trans>
            Lista nu este completă: actul are mai multe evenimente decât s-au putut
            încărca.
          </Trans>
        </p>
      )}
      <ol id="act-timeline-entries" className="divide-y">
        {visible.map((entry, index) => (
          <li
            key={`${entry.label}-${entry.effectiveDate}-${index}`}
            className={ACT_RECORD_LINE}
          >
            <span className="tabular-nums text-muted-foreground">
              {entry.effectiveDate
                ? formatLegalDate(entry.effectiveDate, i18n.locale)
                : t`fără dată`}
            </span>
            <span className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3">
              <span className="min-w-0">{entry.label}</span>
              {entry.eventSource ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {entry.eventSource === 'monitorul-oficial'
                    ? t`Monitorul Oficial`
                    : t`Portal`}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>

      {ordered.length > PAGE ? (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={ACT_RECORD_MORE}
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
    </ActAccordionItem>
  )
}
