import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { caPartyLabel, isLinkedCaParty, type CaPartyShown } from '../../lib/contract-award-model'

const NAME_LINK = 'font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground'

/**
 * A contract award's party as the API serves it (PROC-KR9T, root 25 November
 * 2026): a winner links to the supplier's page only when the API names it as
 * a company, with its code; a buyer links to the institution's page only as
 * an authority. Anything else is plain text, with no lookup by code.
 */
export function CaPartyName({
  shown,
  role,
  year,
  className,
}: {
  readonly shown: CaPartyShown & { readonly authority?: boolean }
  readonly role: 'winner' | 'buyer'
  readonly year?: number
  readonly className?: string
}) {
  const label = caPartyLabel(shown, role)
  const search = year === undefined ? {} : { year }
  if (role === 'buyer' && shown.kind === 'company' && shown.authority && shown.code) {
    return (
      <Link to="/procurement/institutions/$cui" params={{ cui: shown.code }} search={search} className={cn(NAME_LINK, className)}>
        {label}
      </Link>
    )
  }
  if (role === 'winner' && isLinkedCaParty(shown)) {
    return (
      <Link to="/procurement/suppliers/$cui" params={{ cui: shown.code }} search={search} className={cn(NAME_LINK, className)}>
        {label}
      </Link>
    )
  }
  return <span className={className}>{label}</span>
}
