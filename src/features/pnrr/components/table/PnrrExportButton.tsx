import { Trans } from '@lingui/react/macro'
import type { PnrrSearchState } from '@/schemas/pnrr'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { exportPnrrCsvFromWorker } from '../../hooks/usePnrrData'

export function PnrrExportButton({
  search,
  fileSetId,
}: {
  readonly search?: Partial<PnrrSearchState>
  readonly fileSetId?: string
}) {
  const downloadCsv = async () => {
    const csv = await exportPnrrCsvFromWorker(search)
    // BOM marker ensures Excel on Windows correctly reads UTF-8 diacritics
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pnrr-projects-${fileSetId ?? 'export'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      variant="outline"
      className="gap-1.5 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 py-2 text-sm font-bold text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
      onClick={downloadCsv}
    >
      <Download className="h-4 w-4" />
      <Trans>Export CSV</Trans>
    </Button>
  )
}
