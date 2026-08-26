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
  type CsvClassificationColumn,
} from '../lib/observations-csv'

const logger = createLogger('statistics-dataset-detail-export')

type Props = {
  readonly datasetCode: string
  /** The RESOLVED series rows — exactly what the chart plots, never a dump. */
  readonly observations: readonly InsObservation[]
  readonly classificationColumns: readonly CsvClassificationColumn[]
  readonly disabled: boolean
  /** True when the SERVER cut the series (rows < totalCount) — the export
   *  then carries only the newest end and must say so. */
  readonly serverTruncated?: boolean
}

/**
 * Exports the resolved series from memory: the same rows, same scope, same
 * window as the chart above it. No refetch — the export can never disagree
 * with what is on screen.
 */
export function DetailExportButton({
  datasetCode,
  observations,
  classificationColumns,
  disabled,
  serverTruncated = false,
}: Props) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    setIsExporting(true)
    try {
      const { csv, rowCount, truncated } = buildObservationsCsv({
        observations,
        classificationColumns,
      })

      if (rowCount === 0) {
        toast.warning(t`Nu există observații de exportat pentru această selecție.`)
        return
      }

      downloadObservationsCsv(csv, buildObservationsCsvFilename(datasetCode))

      if (truncated || serverTruncated) {
        toast.warning(
          t`Export incomplet: fișierul conține ${rowCount} rânduri, dar seria de la server are mai multe (capătul vechi este tăiat).`,
        )
      } else {
        toast.success(t`Am exportat ${rowCount} rânduri.`)
      }
    } catch (error) {
      logger.error('CSV export failed', { datasetCode, error })
      toast.error(t`Exportul a eșuat. Încearcă din nou.`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={disabled || isExporting}
      onClick={handleExport}
    >
      <Download aria-hidden className="h-3.5 w-3.5" />
      {isExporting ? <Trans>Se exportă…</Trans> : <Trans>Descarcă CSV</Trans>}
    </Button>
  )
}
