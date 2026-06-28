import { t } from '@lingui/core/macro'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DataStatusBadge,
  EvidenceLink,
  FreshnessBadge,
} from '@/components/shared/procurement-data'
import { ProcurementStatusBadge } from './procurement-status-badge'
import { ValueWithCurrency } from './value-with-currency'
import { grainSingularLabel } from '../lib/grain-labels'
import type {
  DataStatus,
  MoneyFields,
  ProcurementStatus,
} from '@/schemas/procurement'

type Props = {
  readonly grain: 'procedure' | 'contract' | 'direct_acquisition'
  readonly identifiers: ReadonlyArray<{ readonly label: string; readonly value: string | null }>
  readonly status: ProcurementStatus
  readonly valueLabel: string
  readonly value: MoneyFields
  readonly secondaryValue?: { readonly label: string; readonly value: MoneyFields } | null
  readonly sourceSystem: string
  readonly sourceUrl: string | null
  readonly publishedAt: string | null
  readonly retrievedAt: string | null
  readonly dataStatus: DataStatus
  readonly className?: string
}

/**
 * Detail-page header: record type label + IDs, status (incl. `unknown`),
 * ValueWithCurrency (RON + native), FreshnessBadge, source-system Badge,
 * primary EvidenceLink to e-licitatie.ro.
 */
export function ProcurementRecordHeader({
  grain,
  identifiers,
  status,
  valueLabel,
  value,
  secondaryValue,
  sourceSystem,
  sourceUrl,
  publishedAt,
  retrievedAt,
  dataStatus,
  className,
}: Props) {
  return (
    <header className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-900">
          {grainSingularLabel(`${grain}s` as 'procedures' | 'contracts' | 'direct_acquisitions')}
        </Badge>
        <ProcurementStatusBadge status={status} />
        <DataStatusBadge status={dataStatus} />
        <FreshnessBadge kind="publicat" date={publishedAt ?? retrievedAt} />
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {identifiers.map((id) => (
          <div key={id.label} className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{id.label}</dt>
            <dd className="font-medium">{id.value ?? t`indisponibil`}</dd>
          </div>
        ))}
      </dl>

      <Separator className="my-4" />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {valueLabel}
          </p>
          <ValueWithCurrency value={value} showCurrencyBadge />
          {secondaryValue ? (
            <p className="text-xs text-muted-foreground">
              {secondaryValue.label}: <ValueWithCurrency value={secondaryValue.value} />
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-900">
            {sourceSystem}
          </Badge>
          {sourceUrl ? <EvidenceLink href={sourceUrl} kind="source" /> : null}
        </div>
      </div>
    </header>
  )
}
