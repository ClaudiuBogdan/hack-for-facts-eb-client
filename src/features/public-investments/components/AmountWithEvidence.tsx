import { AlertTriangle } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { confidenceLabel, formatRon } from '../lib/display'
import type { EvidenceRef, MoneyValue } from '../lib/types'
import { EvidenceButton } from './EvidenceButton'

type Props = {
  readonly value: MoneyValue | null
  readonly evidenceRef?: EvidenceRef | null
  readonly onEvidenceOpen?: (evidenceRef: EvidenceRef) => void
  readonly label?: string
  readonly className?: string
}

export function AmountWithEvidence({
  value,
  evidenceRef,
  onEvidenceOpen,
  label,
  className,
}: Props) {
  const isSuspect = value?.confidence === 'suspect_x1000'
  const isWarning = value?.confidence === 'precision_warning'
  const displayValue = isSuspect ? t`Valoare în verificare` : formatRon(value?.amount)

  return (
    <div className={cn('flex min-w-0 items-center justify-between gap-2', className)}>
      <div className="min-w-0">
        {label && <p className="text-xs text-muted-foreground">{label}</p>}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={cn(
              'truncate text-sm font-semibold',
              isSuspect && 'text-amber-800',
            )}
          >
            {displayValue}
          </span>
          {value && value.confidence !== 'ok' && (
            <Badge
              variant={isSuspect || isWarning ? 'warning' : 'outline'}
              className="gap-1 border-amber-200 text-[11px]"
            >
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {confidenceLabel(value.confidence)}
            </Badge>
          )}
        </div>
      </div>
      {evidenceRef && onEvidenceOpen && (
        <EvidenceButton evidenceRef={evidenceRef} onOpen={onEvidenceOpen} compact />
      )}
    </div>
  )
}
