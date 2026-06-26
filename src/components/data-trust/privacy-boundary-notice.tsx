import { Trans } from '@lingui/react/macro'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  readonly children?: React.ReactNode
  readonly className?: string
}

export function PrivacyBoundaryNotice({ children, className }: Props) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground',
        className,
      )}
    >
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        {children ?? (
          <Trans>
            Numele candidatilor sunt afisate ca etichete publicate de sursa, nu
            ca identitati de persoane rezolvate.
          </Trans>
        )}
      </p>
    </div>
  )
}
