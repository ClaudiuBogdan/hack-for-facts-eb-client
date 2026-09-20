import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSourceDate } from '../lib/format'
import { insTempoDatasetUrl } from '../lib/ins-tempo'

type Props = {
  readonly datasetCode: string
  /** `InsDataset.source_last_update` — the day INS says it refreshed TEMPO. */
  readonly sourceLastUpdate: string | null
  readonly className?: string
}

/**
 * Where the numbers came from, as ONE item in the line under the title.
 *
 * DESIGN.md §Data Trust asks for source, date and the way back to the original
 * beside every claim — not in a drawer two clicks away, and not in a strip
 * under the chart repeating what the title block already said.
 *
 * The source's name IS the link. A standalone „INS Tempo" beside a „Deschide
 * pe INS Tempo" link said the same words twice, and the matrix code the strip
 * used to repeat is the chip immediately to the left of this. The date rides
 * along inside the same span, so the whole provenance statement wraps as one
 * unit rather than splitting „Sursă:" from what it names.
 */
export function DetailSourceLine({
  datasetCode,
  sourceLastUpdate,
  className,
}: Props) {
  const { i18n } = useLingui()

  return (
    <span className={cn('tabular-nums', className)}>
      <Trans>Sursă:</Trans>{' '}
      <a
        href={insTempoDatasetUrl(datasetCode, i18n.locale)}
        target="_blank"
        rel="noreferrer"
        // Visibly the source's name; announced as the action it is. „INS
        // Tempo" read out of context says where the link goes but not that it
        // goes anywhere, and the „Sursă:" that supplies that context sits
        // outside the link.
        aria-label={t`Deschide matricea ${datasetCode} pe INS Tempo (se deschide într-un tab nou)`}
        // `-mx-1 px-1 py-1` is the hit area: a 16px line of text is under WCAG
        // 2.2 AA's 24px minimum target (2.5.8).
        className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-1 font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        INS Tempo
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
      {sourceLastUpdate ? (
        <Trans>, actualizată {formatSourceDate(sourceLastUpdate)}</Trans>
      ) : null}
    </span>
  )
}
