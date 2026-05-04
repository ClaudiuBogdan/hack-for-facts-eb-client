import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { PnrrProject } from '@/schemas/pnrr'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

function escapeCsv(value: string): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function PnrrExportButton({
  projects,
  lastUpdated,
}: {
  readonly projects: readonly PnrrProject[]
  readonly lastUpdated?: string
}) {
  const downloadCsv = () => {
    const headers = [
      t`Title`,
      t`Beneficiary`,
      'CUI',
      t`County`,
      t`Locality`,
      t`Component`,
      t`Measure`,
      'CRI',
      t`Sursa finanțării`,
      t`Value (EUR)`,
      t`Progres tehnic raportat`,
      t`Progres financiar raportat`,
      t`Semnale de risc`,
      t`Anomalii de date`,
    ]

    const rows = projects.map((p) => [
      p.title,
      p.beneficiary,
      p.cui ?? '',
      p.county,
      p.locality,
      p.componentCode,
      p.measureFullCode,
      p.cri,
      p.fundingSource,
      p.valueEur,
      p.techProgress === 'in-implementation'
        ? t`IN IMPLEMENTATION`
        : (p.techProgress ?? ''),
      p.finProgress === 'in-implementation'
        ? t`IN IMPLEMENTATION`
        : (p.finProgress ?? ''),
      p.anomalies.join(', '),
      p.dataQualitySignals.join(', '),
    ])

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((v) => escapeCsv(String(v))).join(',')),
    ].join('\n')

    // BOM marker ensures Excel on Windows correctly reads UTF-8 diacritics
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pnrr-projects-${lastUpdated ?? new Date().toISOString().slice(0, 10)}.csv`
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
