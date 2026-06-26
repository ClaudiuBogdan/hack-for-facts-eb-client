import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatMoneyValue, isMoneyMissing, moneyValueCurrency } from '../lib/formatting'
import type { MoneyValue } from '@/schemas/procurement'

type Props = {
  readonly value: MoneyValue
  readonly notation?: 'standard' | 'compact'
  readonly className?: string
  readonly showCurrencyBadge?: boolean
}

/**
 * Renders RON or native value+currency, handles null / negative / outlier
 * flagging. Never implies a mixed-currency total — the caller shows a
 * separate "X înregistrări în altă monedă" note for those.
 */
export function ValueWithCurrency({
  value,
  notation = 'standard',
  className,
  showCurrencyBadge = false,
}: Props) {
  if (isMoneyMissing(value)) {
    return (
      <span className={cn('text-muted-foreground', className)}>
        <Trans>indisponibil</Trans>
      </span>
    )
  }

  const currency = moneyValueCurrency(value)
  const isNativeOnly = value.ron === null && value.nativeValue !== null
  const formatted = formatMoneyValue(value, notation)

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span>{formatted}</span>
      {isNativeOnly && currency !== 'RON' ? (
        <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-900">
          {currency}
        </Badge>
      ) : null}
      {showCurrencyBadge && currency === 'RON' ? (
        <span className="text-xs text-muted-foreground">RON</span>
      ) : null}
      {value.isOutlier ? (
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
