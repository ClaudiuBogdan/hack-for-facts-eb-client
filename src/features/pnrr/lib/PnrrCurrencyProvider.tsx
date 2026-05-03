import { useMemo, type ReactNode } from 'react'
import { useUserCurrency } from '@/lib/hooks/useUserCurrency'
import { PnrrCurrencyContext } from './pnrr-currency-context'
import type { Currency } from '@/schemas/charts'

export function PnrrCurrencyProvider({
  children,
  initialCurrency,
}: {
  readonly children: ReactNode
  readonly initialCurrency?: Currency
}) {
  const [currency] = useUserCurrency(initialCurrency)
  const value = useMemo(() => currency, [currency])
  return (
    <PnrrCurrencyContext.Provider value={value}>
      {children}
    </PnrrCurrencyContext.Provider>
  )
}
