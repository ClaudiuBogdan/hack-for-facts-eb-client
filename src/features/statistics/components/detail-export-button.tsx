import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logger'
import type { InsObservation } from '@/schemas/ins'
import {
  buildObservationsCsv,
  buildObservationsCsvFilename,
  downloadObservationsCsv,
} from '../lib/observations-csv'

const logger = createLogger('statistics-dataset-detail-export')

type Props = {
  readonly datasetCode: string
  /** Original source rows in the current, completely loaded selection window. */
  readonly observations: readonly InsObservation[]
  readonly sourceDescriptor?: unknown
  readonly disabled: boolean
  readonly complete: boolean
}

/**
 * Archives original source rows in the current time window. A terminal
 * inspection page may contain several identities; it is exportable when complete.
 * Truncated previews never download. No refetch or numeric transformation.
 */
export function DetailExportButton({
  datasetCode,
  observations,
  sourceDescriptor,
  disabled,
  complete,
}: Props) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    setIsExporting(true)
    try {
      const { csv, rowCount } = buildObservationsCsv({
        descriptor: sourceDescriptor,
        observations,
        complete,
      })

      if (rowCount === 0) {
        toast.warning(
          t`Nu există observații de exportat pentru această selecție.`,
        )
        return
      }

      downloadObservationsCsv(csv, buildObservationsCsvFilename(datasetCode))

      toast.success(t`Am exportat ${rowCount} rânduri.`)
    } catch (error) {
      logger.error('CSV export failed', { datasetCode, error })
      toast.error(t`Exportul a eșuat. Încearcă din nou.`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={disabled || isExporting || !complete || !sourceDescriptor}
        onClick={handleExport}
      >
        <Download aria-hidden className="h-3.5 w-3.5" />
        {isExporting ? <Trans>Se exportă…</Trans> : <Trans>Descarcă CSV</Trans>}
      </Button>
      {!complete ? (
        <p className="text-xs text-muted-foreground">
          <Trans>Restrânge selecția pentru a exporta toate observațiile.</Trans>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          <Trans>
            CSV cu texte codificate JSON pentru a păstra exact valorile și
            sursa.
          </Trans>
        </p>
      )}
    </div>
  )
}
