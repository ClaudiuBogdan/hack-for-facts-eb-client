import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatRon, moneyValueCurrency } from '../lib/formatting'
import type { MoneyFields } from '@/schemas/procurement'

type Props = {
  readonly value: MoneyFields
  readonly notation?: 'standard' | 'compact'
  readonly className?: string
  readonly showCurrencyBadge?: boolean
}

/**
 * Renders a RON amount, or — for non-RON rows — the currency code with an
 * explicit "valoare RON indisponibilă" (prod does not expose a native amount).
 * Suspect RON values are flagged. Never implies a mixed-currency total.
 */
export function ValueWithCurrency({
  value,
  notation = 'standard',
  className,
  showCurrencyBadge = false,
}: Props) {
  const hasRon = value.isRon && value.valueRon !== null
  const isNonRon = !value.isRon && value.currency !== null

  // Plain "indisponibil" only when there is nothing to show AND nothing flagged.
  if (!hasRon && !isNonRon && !value.valueSuspect) {
    return (
      <span className={cn('text-muted-foreground', className)}>
        <Trans>indisponibil</Trans>
      </span>
    )
  }

  const currency = moneyValueCurrency(value)

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {hasRon ? (
        <span>{formatRon(value.valueRon, notation)}</span>
      ) : isNonRon ? (
        <span className="text-muted-foreground">
          <Trans>valoare RON indisponibilă</Trans>
        </span>
      ) : (
        <span className="text-muted-foreground">
          <Trans>valoare indisponibilă</Trans>
        </span>
      )}
      {isNonRon ? (
        <Badge
          variant="outline"
          className="border-slate-300 bg-slate-100 text-slate-900"
        >
          {currency}
        </Badge>
      ) : null}
      {showCurrencyBadge && hasRon ? (
        <span className="text-xs text-muted-foreground">RON</span>
      ) : null}
      {value.valueSuspect ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="border-rose-300 bg-rose-50 text-rose-900"
              aria-label={t`Valoare atipică`}
            >
              <TriangleAlert className="h-3 w-3" aria-hidden />
              <Trans>atipică</Trans>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <Trans>Valoare atipică — verifică sursa.</Trans>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  )
}
