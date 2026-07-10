import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logger'
import type { InsObservationFilterInput } from '@/schemas/ins'
import { fetchObservationsPage } from '../api/dataset-detail-api'
import { CSV_MAX_ROWS } from '../lib/dataset-selection'
import {
  buildObservationsCsv,
  buildObservationsCsvFilename,
  downloadObservationsCsv,
  type CsvClassificationColumn,
} from '../lib/observations-csv'

const logger = createLogger('statistics-dataset-detail-export')

type Props = {
  readonly datasetCode: string
  readonly filter: InsObservationFilterInput
  readonly classificationColumns: readonly CsvClassificationColumn[]
  readonly disabled: boolean
}

/**
 * Exports the current selection, not the current page.
 *
 * The export re-fetches with the same filter at the 10,000-row cap rather than
 * serializing the 50 rows on screen — but it stays behind the same scope guard
 * as the table, so it can never issue the unscoped query the guard exists to
 * prevent. When the server has more rows than the cap, the user is told the
 * file is a prefix instead of quietly receiving a truncated dataset.
 */
export function DetailExportButton({
  datasetCode,
  filter,
  classificationColumns,
  disabled,
}: Props) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const page = await fetchObservationsPage({
        datasetCode,
        filter,
        limit: CSV_MAX_ROWS,
        offset: 0,
      })

      const { csv, rowCount, truncated } = buildObservationsCsv({
        observations: page.nodes,
        classificationColumns,
      })

      if (rowCount === 0) {
        toast.warning(t`Nu există observații de exportat pentru această selecție.`)
        return
      }

      downloadObservationsCsv(csv, buildObservationsCsvFilename(datasetCode))

      const serverTruncated = truncated || page.pageInfo.hasNextPage
      if (serverTruncated) {
        toast.warning(
          t`Export limitat la primele ${CSV_MAX_ROWS} rânduri din ${page.pageInfo.totalCount}. Restrânge selecția pentru un export complet.`,
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
