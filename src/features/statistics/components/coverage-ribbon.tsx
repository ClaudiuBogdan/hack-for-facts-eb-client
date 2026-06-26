import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { Database, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatisticsCoverageSummary } from '@/schemas/statistics'
import { buildCoverageRibbonText } from '../lib/coverage'

type CoverageRibbonProps = {
  readonly coverage: StatisticsCoverageSummary
  readonly latestDataPeriod?: string | null
  readonly partialNote?: ReactNode
  readonly className?: string
}

export function CoverageRibbon({
  coverage,
  latestDataPeriod,
  partialNote,
  className,
}: CoverageRibbonProps) {
  const note =
    partialNote ??
    (coverage.partial ? (
      <Trans>Acoperirea nu este complet confirmată de catalogul live.</Trans>
    ) : null)

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Database className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium text-foreground">
            <Trans>INS Tempo</Trans> · {buildCoverageRibbonText(coverage)}
          </p>
          {latestDataPeriod ? (
            <p className="mt-0.5 text-xs">
              <Trans>Date până în</Trans> {latestDataPeriod}
            </p>
          ) : null}
        </div>
      </div>
      {note ? (
        <p className="flex items-center gap-1.5 text-xs">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          {note}
        </p>
      ) : null}
    </div>
  )
}
