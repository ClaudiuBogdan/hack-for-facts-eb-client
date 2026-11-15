import { Trans } from '@lingui/react/macro'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { PnrrSearchState } from '@/schemas/pnrr'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logger'
import { Download } from 'lucide-react'
import { exportPnrrCsv } from '../../hooks/usePnrrData'

const logger = createLogger('pnrr-export')

export function PnrrExportButton({
  search,
  releaseId,
}: {
  readonly search?: Partial<PnrrSearchState>
  /** The API release on screen; the export is built from the same one. */
  readonly releaseId?: string | null
}) {
  const queryClient = useQueryClient()
  const [isExporting, setIsExporting] = useState(false)

  const downloadCsv = async () => {
    if (!releaseId) return
    setIsExporting(true)
    try {
      const csv = await exportPnrrCsv({ queryClient, search, releaseId })
      // BOM marker ensures Excel on Windows correctly reads UTF-8 diacritics
      const blob = new Blob(['﻿' + csv], {
        type: 'text/csv;charset=utf-8;',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pnrr-projects-${releaseId.replace(/[^a-zA-Z0-9._-]/g, '_')}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      logger.error('PNRR CSV export failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      className="gap-1.5 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 py-2 text-sm font-bold text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
      onClick={downloadCsv}
      disabled={!releaseId || isExporting}
    >
      <Download className="h-4 w-4" />
      <Trans>Export CSV</Trans>
    </Button>
  )
}
