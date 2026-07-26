import type { ReactNode } from 'react'
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
  void currency
  void initialCurrency
  return (
    <PnrrCurrencyContext.Provider value="RON">
      {children}
    </PnrrCurrencyContext.Provider>
  )
}
