import { Trans, useLingui } from '@lingui/react/macro'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSourceDate } from '../lib/format'
import { insTempoDatasetUrl } from '../lib/ins-tempo'
import { statisticsTheme } from '../lib/statistics-theme'

type Props = {
  readonly datasetCode: string
  /** `InsDataset.source_last_update` — the day INS says it refreshed TEMPO. */
  readonly sourceLastUpdate: string | null
  readonly className?: string
}

/**
 * Where the numbers above came from, at the foot of the band that shows them.
 *
 * DESIGN.md §Data Trust asks for source, date and the way back to the original
 * beside every claim — not in a drawer two clicks away. So this is a line, not
 * a dialog: the source, the matrix code a reader would paste into TEMPO, the
 * publication date, and the link that opens the matrix itself.
 */
export function DetailSourceLine({
  datasetCode,
  sourceLastUpdate,
  className,
}: Props) {
  const { i18n } = useLingui()

  return (
    <p className={cn(statisticsTheme.metaLine, className)}>
      <span>
        <Trans>Sursă: INS Tempo</Trans>
      </span>
      <span>
        <Trans>matricea</Trans>{' '}
        <span className="font-mono tabular-nums">{datasetCode}</span>
      </span>
      {sourceLastUpdate ? (
        <span className="tabular-nums">
          <Trans>actualizată {formatSourceDate(sourceLastUpdate)}</Trans>
        </span>
      ) : null}
      <a
        href={insTempoDatasetUrl(datasetCode, i18n.locale)}
        target="_blank"
        rel="noreferrer"
        // `-mx-1 px-1 py-1` is the hit area: a 16px line of text is under WCAG
        // 2.2 AA's 24px minimum target (2.5.8), the same reason the definition
        // toggle carries padding.
        className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-1 font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Trans>Deschide pe INS Tempo</Trans>
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only">
          <Trans>(se deschide într-un tab nou)</Trans>
        </span>
      </a>
    </p>
  )
}
