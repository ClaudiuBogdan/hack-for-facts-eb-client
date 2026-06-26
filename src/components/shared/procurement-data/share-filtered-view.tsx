import { useCallback } from 'react'
import { toast } from 'sonner'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  /** The URL to copy. Defaults to the current location when omitted. */
  readonly url?: string
  readonly className?: string
  readonly label?: string
}

/**
 * Copy-current-view affordance for filtered investigative states. Mirrors
 * the README §"Shared components to standardize" `ShareFilteredView`.
 */
export function ShareFilteredView({ url, className, label }: Props) {
  const onClick = useCallback(async () => {
    const target = url ?? (typeof window !== 'undefined' ? window.location.href : '')
    if (!target) return
    try {
      await navigator.clipboard.writeText(target)
      toast.success(t`Linkul către această vizualizare a fost copiat.`)
    } catch {
      toast.error(t`Nu am putut copia linkul. Copiază-l manual din bara adresei.`)
    }
  }, [url])

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={onClick}
      aria-label={label ?? t`Copiază linkul către vizualizarea curentă`}
    >
      <LinkIcon className="h-4 w-4" aria-hidden />
      <span>{label ?? <Trans>Copiază vizualizarea</Trans>}</span>
    </Button>
  )
}
