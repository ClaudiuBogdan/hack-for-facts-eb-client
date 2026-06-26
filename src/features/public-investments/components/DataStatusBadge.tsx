import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Badge } from '@/components/ui/badge'
import type { DomainDataStatus } from '../lib/types'
import { formatSnapshot } from '../lib/display'

type Props = {
  readonly status: DomainDataStatus
}

export function DataStatusBadge({ status }: Props) {
  const isWarning = status.validationGate === 'warning' || status.inflationBugActive

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={isWarning ? 'warning' : 'success'} className="gap-1">
        {isWarning ? (
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        )}
        {isWarning ? t`Verificări active` : t`Date validate`}
      </Badge>
      <Badge variant="outline" className="gap-1">
        <Clock3 className="h-3 w-3" aria-hidden="true" />
        {formatSnapshot(status)}
      </Badge>
      {status.moneyPrecisionWarningRows > 0 && (
        <Badge variant="outline" className="border-amber-200 text-amber-800">
          {t`${status.moneyPrecisionWarningRows} rânduri cu atenționări`}
        </Badge>
      )}
    </div>
  )
}
