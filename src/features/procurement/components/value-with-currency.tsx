import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatCurrency } from '@/lib/utils'
import { describeMoney, moneyValueCurrency } from '../lib/formatting'
import type { MoneyFields } from '@/schemas/procurement'

type Props = {
  readonly value: MoneyFields
  readonly notation?: 'standard' | 'compact'
  readonly className?: string
  readonly showCurrencyBadge?: boolean
}

/**
 * Renders a value slice honestly from its data-layer resolution
 * (`describeMoney`): a comparable RON amount, a foreign-currency code (with a
 * BNR-derived hint when available), or a state — `atipică` (invalid source),
 * `cadru` (framework ceiling), `divergent` (conflicting sources) — never an
 * invented or mixed-currency total.
 */
export function ValueWithCurrency({
  value,
  notation = 'standard',
  className,
  showCurrencyBadge = false,
}: Props) {
  const display = describeMoney(value)

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {display.kind === 'ron' ? (
        <span>{formatCurrency(display.ron, notation, 'RON')}</span>
      ) : display.kind === 'foreign' && display.comparable !== null ? (
        <span>
          ≈ {formatCurrency(display.comparable, notation, 'RON')}{' '}
          <span className="text-xs text-muted-foreground">(BNR)</span>
        </span>
      ) : display.kind === 'foreign' ? (
        <span className="text-muted-foreground">
          <Trans>valoare RON indisponibilă</Trans>
        </span>
      ) : display.kind === 'framework' ? (
        <span className="text-muted-foreground">
          <Trans>valoare-cadru</Trans>
        </span>
      ) : display.kind === 'conflict' ? (
        <span className="text-muted-foreground">
          <Trans>surse divergente</Trans>
        </span>
      ) : (
        <span className="text-muted-foreground">
          <Trans>indisponibil</Trans>
        </span>
      )}

      {display.kind === 'foreign' ? (
        <Badge
          variant="outline"
          className="border-slate-300 bg-slate-100 text-slate-900"
        >
          {moneyValueCurrency(value)}
        </Badge>
      ) : null}

      {showCurrencyBadge && display.kind === 'ron' ? (
        <span className="text-xs text-muted-foreground">RON</span>
      ) : null}

      {display.kind === 'suspect' ? (
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
            <Trans>Valoare atipică — sursă coruptă sau în afara limitelor.</Trans>
          </TooltipContent>
        </Tooltip>
      ) : null}

      {display.kind === 'framework' ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-900"
              aria-label={t`Valoare-cadru`}
            >
              <Trans>cadru</Trans>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <Trans>
              Valoare-cadru (acord-cadru) — un plafon, nu o cheltuială reală.
            </Trans>
          </TooltipContent>
        </Tooltip>
      ) : null}

      {display.kind === 'conflict' ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-900"
              aria-label={t`Surse divergente`}
            >
              <TriangleAlert className="h-3 w-3" aria-hidden />
              <Trans>divergent</Trans>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <Trans>Surse divergente asupra valorii — verifică sursa.</Trans>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  )
}
