import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ShareFilteredView() {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  const copyCurrentUrl = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard) {
      setStatus('error')
      return
    }

    try {
      await navigator.clipboard.writeText(window.location.href)
      setStatus('copied')
      window.setTimeout(() => setStatus('idle'), 2500)
    } catch {
      setStatus('error')
      window.setTimeout(() => setStatus('idle'), 2500)
    }
  }

  const statusLabel =
    status === 'copied'
      ? t`Link copiat`
      : status === 'error'
        ? t`Copiere indisponibilă`
        : ''
  const buttonLabel = t`Copiază link`

  return (
    <>
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={copyCurrentUrl}
    >
      {status === 'copied' ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {buttonLabel}
    </Button>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusLabel}
      </span>
    </>
  )
}
