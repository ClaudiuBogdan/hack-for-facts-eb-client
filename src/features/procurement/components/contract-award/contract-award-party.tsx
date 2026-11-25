import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { caPartyLabel, caWinnerLinkOf, type CaPartyShown } from '../../lib/contract-award-model'

const NAME_LINK = 'font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground'

/**
 * A contract award's party as the API serves it (PROC-KR9T, root 25 November
 * 2026): a winner links as `caWinnerLinkOf` says — a company in the direct
 * purchases' gate to the supplier's page, a registry-named company outside it
 * to its contract-award list; a buyer links to the institution's page only as
 * an authority. Anything else is plain text, with no lookup by code.
 */
export function CaPartyName({
  shown,
  role,
  disclosed = null,
  year,
  className,
}: {
  readonly shown: CaPartyShown & { readonly authority?: boolean }
  readonly role: 'winner' | 'buyer'
  /** A winner's `disclosed`, as served; a buyer has none. */
  readonly disclosed?: boolean | null
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
  const link = role === 'winner' ? caWinnerLinkOf(shown, disclosed) : null
  if (link?.to === 'supplier') {
    return (
      <Link to="/procurement/suppliers/$cui" params={{ cui: link.code }} search={search} className={cn(NAME_LINK, className)}>
        {label}
      </Link>
    )
  }
  if (link?.to === 'winner') {
    return (
      <Link to="/procurement/contract-awards/winners/$cui" params={{ cui: link.code }} search={search} className={cn(NAME_LINK, className)}>
        {label}
      </Link>
    )
  }
  return <span className={className}>{label}</span>
}
