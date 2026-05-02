import { useContext } from 'react'
import { PnrrCurrencyContext } from './pnrr-currency-context'
import type { Currency } from '@/schemas/charts'

export function usePnrrCurrency(): Currency {
  return useContext(PnrrCurrencyContext)
}
