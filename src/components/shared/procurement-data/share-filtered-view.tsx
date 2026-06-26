import { useCallback } from 'react'
import { useState } from 'react'
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
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  const onClick = useCallback(async () => {
    const target = url ?? (typeof window !== 'undefined' ? window.location.href : '')
    if (!target) return
    try {
      await navigator.clipboard.writeText(target)
      setStatus('copied')
      toast.success(t`Linkul către această vizualizare a fost copiat.`)
    } catch {
      setStatus('error')
      toast.error(t`Nu am putut copia linkul. Copiază-l manual din bara adresei.`)
    }
    window.setTimeout(() => setStatus('idle'), 2500)
  }, [url])

  const statusLabel =
    status === 'copied'
      ? t`Link copiat`
      : status === 'error'
        ? t`Copiere indisponibilă`
        : ''

  return (
    <>
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
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusLabel}
      </span>
    </>
  )
}
