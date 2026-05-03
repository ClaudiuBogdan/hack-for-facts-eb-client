import { useMemo, type ReactNode } from 'react'
import { useUserCurrency } from '@/lib/hooks/useUserCurrency'
import { PnrrCurrencyContext } from './pnrr-currency-context'
import type { Currency } from '@/schemas/charts'

export function PnrrCurrencyProvider({
  children,
  currency,
  initialCurrency,
}: {
  readonly children: ReactNode
  readonly currency?: Currency
  readonly initialCurrency?: Currency
}) {
  const [userCurrency] = useUserCurrency(initialCurrency)
  const value = useMemo(
    () => currency ?? userCurrency,
    [currency, userCurrency],
  )
  return (
    <PnrrCurrencyContext.Provider value={value}>
      {children}
    </PnrrCurrencyContext.Provider>
  )
}
