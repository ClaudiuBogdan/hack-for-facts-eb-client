import { type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useProvenance, type ProvenanceContext } from './provenance-context'
import type { SourcePointer } from '@/schemas/elections'

type Props = {
  /** The figure label this evidence link sits next to. */
  readonly children: ReactNode
  readonly pointers: readonly SourcePointer[]
  readonly context: Omit<ProvenanceContext, 'isAggregate'> & { isAggregate?: boolean }
  readonly className?: string
  /** Optional short tooltip shown on hover before opening. */
  readonly hint?: ReactNode
}

/**
 * A keyboard-focusable chip that opens the SourceProvenanceDrawer with the
 * supplied pointers + context. Placed by features next to every shown number.
 */
export function EvidenceLink({ children, pointers, context, className, hint }: Props) {
  const { openProvenance } = useProvenance()
  const request = {
    pointers,
    context: { ...context, isAggregate: context.isAggregate ?? pointers.length > 1 },
  }

  const trigger = (
    <button
      type="button"
      onClick={() => openProvenance(request)}
      aria-haspopup="dialog"
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <FileText className="h-3 w-3" aria-hidden />
      {children}
    </button>
  )

  if (hint !== undefined) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent>{hint}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return trigger
}

/** Convenience: an inline "sursă" evidence chip with a default label. */
export function SourceEvidenceLink(
  props: Omit<Props, 'children'>,
) {
  return (
    <EvidenceLink {...props}>
      <Trans>sursă</Trans>
    </EvidenceLink>
  )
}
