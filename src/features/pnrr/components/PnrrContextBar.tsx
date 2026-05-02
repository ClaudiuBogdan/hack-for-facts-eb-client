import { Trans } from '@lingui/react/macro'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, Globe } from 'lucide-react'

export function PnrrContextBar() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="outline" className="gap-1 font-normal">
        <Globe className="h-3 w-3" />
        <Trans>România: ~20% absorbție estimată</Trans>
      </Badge>
      <Badge variant="outline" className="gap-1 font-normal">
        <Clock className="h-3 w-3" />
        <Trans>Termen limită: decembrie 2026</Trans>
      </Badge>
      <Badge variant="outline" className="gap-1 font-normal">
        <AlertTriangle className="h-3 w-3" />
        <Trans>Pachet redus de la ~€28.5B la ~€21.6B (2025)</Trans>
      </Badge>
    </div>
  )
}
