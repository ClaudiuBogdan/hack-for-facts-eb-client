import { Trans } from '@lingui/react/macro'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, Globe } from 'lucide-react'

export function PnrrContextBar() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="outline" className="gap-1 font-normal">
        <Globe className="h-3 w-3" />
        <Trans>Romania: ~20% estimated absorption</Trans>
      </Badge>
      <Badge variant="outline" className="gap-1 font-normal">
        <Clock className="h-3 w-3" />
        <Trans>Deadline: December 2026</Trans>
      </Badge>
      <Badge variant="outline" className="gap-1 font-normal">
        <AlertTriangle className="h-3 w-3" />
        <Trans>Package reduced from ~€28.5B to ~€21.6B (2025)</Trans>
      </Badge>
    </div>
  )
}
