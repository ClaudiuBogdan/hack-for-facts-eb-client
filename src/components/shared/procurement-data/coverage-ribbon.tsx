import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { AlertCircle, ChevronDown, Info, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils'
import { DataStatusBadge } from './data-status-badge'
import { FreshnessBadge } from './freshness-badge'
import type { DataStatus } from '@/schemas/procurement'

/** Coverage metrics the gate reports per grain (local display vocabulary). */
type CoverageMetric =
  | 'authority_cui'
  | 'supplier_cui'
  | 'amount'
  | 'cpv'
  | 'flow_date'

type CoverageEntry = {
  readonly metric: CoverageMetric
  readonly rate: number
  readonly threshold: number
  readonly meetsThreshold: boolean
}

type Props = {
  readonly status: DataStatus
  readonly coverage: readonly CoverageEntry[]
  readonly dataAsOf: string | null
  readonly cadence: string | null
  /** Pre-resolved labels of filters that are unavailable in v1. */
  readonly blocked?: readonly string[]
  readonly collapsible?: boolean
  readonly className?: string
}

const METRIC_LABEL: Record<CoverageMetric, string> = {
  authority_cui: t`CUI autoritate`,
  supplier_cui: t`CUI furnizor`,
  amount: t`Valoare`,
  cpv: t`CPV`,
  flow_date: t`Dată flux`,
}

/**
 * Compact page-level source/freshness/known-gap summary. Mirrors the
 * `PnrrDataQualityBanner` collapsible pattern: a summary strip that expands
 * into per-metric coverage bars (`metric: rate / threshold ✓/✗`) and the
 * blocked-filter list. Neutral amber/slate styling, never red/danger.
 */
export function CoverageRibbon({
  status,
  coverage,
  dataAsOf,
  cadence,
  blocked = [],
  collapsible = true,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const missingCoverage = coverage.filter((c) => !c.meetsThreshold)

  const summary = (
    <div className="flex flex-wrap items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
      <span>
        {missingCoverage.length > 0 ? (
          <Trans>
            Acoperire parțială pentru {formatNumber(missingCoverage.length)}{' '}
            metrici. Răspunsurile pe valoare sunt retrogradate la clasament pe
            număr.
          </Trans>
        ) : (
          <Trans>Acoperire completă pentru toate metricile.</Trans>
        )}
      </span>
      <DataStatusBadge status={status} />
      <FreshnessBadge
        kind="pana_la"
        date={dataAsOf}
        cadence={cadence}
        stale={status === 'stale' || cadence?.includes('suspendat') === true}
      />
    </div>
  )

  if (!collapsible) {
    return (
      <div
        className={cn(
          'rounded-lg border border-amber-200 bg-amber-50/30 p-3 dark:border-amber-900 dark:bg-amber-950/10',
          className,
        )}
      >
        {summary}
        <CoverageDetails coverage={coverage} blocked={blocked} />
      </div>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'rounded-lg border border-amber-200 bg-amber-50/30 p-3 dark:border-amber-900 dark:bg-amber-950/10',
          className,
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          {summary}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <Trans>Detalii</Trans>
              <ChevronDown
                className={cn(
                  'h-3 w-3 transition-transform',
                  open && 'rotate-180',
                )}
                aria-hidden
              />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <CoverageDetails coverage={coverage} blocked={blocked} />
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function CoverageDetails({
  coverage,
  blocked,
}: {
  readonly coverage: readonly CoverageEntry[]
  readonly blocked: readonly string[]
}) {
  return (
    <div className="mt-3 space-y-3 text-xs text-amber-700 dark:text-amber-300">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {coverage.map((c) => {
          const pct = Math.round(c.rate * 100)
          return (
            <div key={c.metric} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span>{METRIC_LABEL[c.metric]}</span>
                <span className="flex items-center gap-1">
                  <span>
                    {formatNumber(pct)}% /{' '}
                    {formatNumber(Math.round(c.threshold * 100))}%
                  </span>
                  {c.meetsThreshold ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-300 bg-emerald-50 text-emerald-900"
                    >
                      <Info className="h-3 w-3" aria-hidden />
                      <Trans>OK</Trans>
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-50 text-amber-900"
                    >
                      <AlertCircle className="h-3 w-3" aria-hidden />
                      <Trans>sub prag</Trans>
                    </Badge>
                  )}
                </span>
              </div>
              <Progress
                value={pct}
                indicatorClassName={
                  c.meetsThreshold ? 'bg-emerald-500' : 'bg-amber-500'
                }
                aria-label={`${METRIC_LABEL[c.metric]}: ${pct}%`}
              />
            </div>
          )
        })}
      </div>

      {blocked.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-1">
            <p className="font-semibold">
              <Trans>Filtre indisponibile în v1:</Trans>
            </p>
            <ul className="list-disc space-y-1 pl-4">
              {blocked.map((label) => (
                <li key={label} className="flex items-center gap-1">
                  <Lock className="h-3 w-3" aria-hidden />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  )
}
