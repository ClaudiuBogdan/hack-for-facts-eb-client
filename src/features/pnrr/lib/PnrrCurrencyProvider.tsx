import { useMemo, type ReactNode } from 'react'
import { useUserCurrency } from '@/lib/hooks/useUserCurrency'
import { PnrrCurrencyContext } from './pnrr-currency-context'

export function PnrrCurrencyProvider({ children }: { readonly children: ReactNode }) {
  const [currency] = useUserCurrency()
  const value = useMemo(() => currency, [currency])
  return (
    <PnrrCurrencyContext.Provider value={value}>
      {children}
    </PnrrCurrencyContext.Provider>
  )
}
