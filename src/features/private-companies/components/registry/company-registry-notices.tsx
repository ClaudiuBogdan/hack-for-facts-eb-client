import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type { CompanyRegistryEnvelope } from '@/schemas/private-company-registry'
import type { CompanyRegistryScope } from '../../hooks/use-company-registry-scope'
import { registryStateText } from '../../lib/company-registry-text'

/**
 * The page-level registry notices: the registry moved under the page (its
 * facts are hidden until the reader asks for the new ones), the registry could
 * not be read, or the pinned registry cannot answer (a state, not a zero).
 */

const NOTICE_CLASS = 'border-l-2 py-1 pl-3 text-sm leading-relaxed text-foreground'
const ACTION_CLASS = 'ml-2 inline-flex min-h-9 items-center font-medium underline underline-offset-4 hover:text-primary'

export function CompanyRegistryScopeNotice({ scope, className }: { readonly scope: CompanyRegistryScope; readonly className?: string }) {
  if (scope.status === 'error') {
    return (
      <p role="alert" className={cn(NOTICE_CLASS, 'border-amber-500', className)} data-testid="company-registry-scope-error">
        <Trans>Nu am putut citi starea registrului comerțului; datele de registru nu sunt afișate.</Trans>
        <button type="button" onClick={scope.retry} className={ACTION_CLASS}>
          <Trans>Reîncearcă</Trans>
        </button>
      </p>
    )
  }
  if (scope.status === 'ready' && scope.moved) {
    return (
      <p role="status" className={cn(NOTICE_CLASS, 'border-amber-500', className)} data-testid="company-registry-moved">
        <Trans>
          Registrul comerțului s-a schimbat de când ai deschis pagina (o ediție nouă sau o schimbare de acces). Datele citite înainte nu
          mai sunt afișate.
        </Trans>
        <button type="button" onClick={scope.accept} className={ACTION_CLASS}>
          <Trans>Arată datele actuale</Trans>
        </button>
      </p>
    )
  }
  return null
}

/** The pinned registry cannot answer: said once, as a state. */
export function CompanyRegistryStateNotice({ registry, className }: { readonly registry: CompanyRegistryEnvelope; readonly className?: string }) {
  const text = registryStateText(registry.state)
  if (text === null) return null
  return (
    <p role="status" className={cn(NOTICE_CLASS, 'border-muted-foreground', className)} data-testid="company-registry-state">
      {text}
    </p>
  )
}
