import { useId, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isTypedCaseNumber } from '../../lib/justice-paths'

/**
 * Opens a case of this court by its number. Only a case number leaves the
 * page — into the case's address — so a name typed here by mistake goes
 * nowhere: it is not a number, and the field says so.
 */
export function JusticeCaseLookup({ code, className }: { readonly code: string; readonly className?: string }) {
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)
  const navigate = useNavigate()
  const inputId = useId()
  const hintId = useId()
  return (
    <form
      role="search"
      className={cn('max-w-xl', className)}
      onSubmit={(event) => {
        event.preventDefault()
        const number = value.trim()
        if (!isTypedCaseNumber(number)) {
          setInvalid(true)
          return
        }
        void navigate({ to: '/justice/cases/$code/$', params: { code, _splat: number } })
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        <Trans>Numărul dosarului</Trans>
      </label>
      <div className="flex gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center gap-3 border bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            id={inputId}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setInvalid(false)
            }}
            placeholder={t`Numărul dosarului, de exemplu 1234/117/2024`}
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid}
            aria-describedby={hintId}
            className="min-w-0 flex-1 bg-transparent text-base tabular-nums outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Button type="submit" variant="outline" className="h-11">
          <Trans>Deschide</Trans>
        </Button>
      </div>
      <p id={hintId} className={cn('mt-2 text-xs', invalid ? 'text-destructive' : 'text-muted-foreground')} role={invalid ? 'alert' : undefined}>
        {invalid ? (
          <Trans>Nu e un număr de dosar: cifre și bare, ca 1234/117/2024. Numele părților nu se caută.</Trans>
        ) : (
          <Trans>Un dosar al acestei instanțe, după numărul lui de pe portal.</Trans>
        )}
      </p>
    </form>
  )
}
