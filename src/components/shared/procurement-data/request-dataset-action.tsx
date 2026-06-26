import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type Props = {
  readonly dataset?: string
  readonly className?: string
  readonly label?: string
}

/**
 * Call to request missing or blocked public data (used on CNSC/DA-detail/TED
 * "indisponibil" states, README §"Shared components to standardize").
 *
 * This is a non-destructive affordance: it surfaces intent and links to a
 * contact path. No mutation is performed.
 */
export function RequestDatasetAction({ dataset, className, label }: Props) {
  const tooltip = dataset
    ? t`Solicită datele lipsă pentru ${dataset}`
    : t`Solicită datele lipsă sau blocate`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className}
          aria-label={tooltip}
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
          <span>{label ?? <Trans>Raportează o problemă de date</Trans>}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <Trans>
          Această acțiune deschide un canal pentru a semnala date lipsă sau
          blocate către echipa de date.
        </Trans>
      </TooltipContent>
    </Tooltip>
  )
}
