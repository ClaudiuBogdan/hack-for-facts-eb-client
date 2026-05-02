import { createContext } from 'react'
import type { Currency } from '@/schemas/charts'

export const PnrrCurrencyContext = createContext<Currency>('RON')
