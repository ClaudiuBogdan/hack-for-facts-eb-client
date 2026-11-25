import { yValueFormatter } from '@/components/charts/components/chart-renderer/utils'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/schemas/charts'
import { amountParts, type AmountParts } from './public-institutions-format'

/** The page's two parts, for the pinned bar's jumps and the old page's `view=line-items` links. */
export const RANKING_ID = 'clasament'
export const BREAKDOWN_ID = 'structura'
/** The head's „Filtre” button: the sheet gives the focus back to it when it closes. */
export const FILTERS_BUTTON_ID = 'public-institutions-filters'

export function jumpTo(id: string) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

/** An amount in the page's currency, or in a unit that is not money („% din PIB”), split for display. */
export function partsOf(value: number, { currency, locale, unit }: { readonly currency: Currency; readonly locale: string; readonly unit?: string }): AmountParts {
  if (unit && unit.startsWith('%')) return { digits: yValueFormatter(value, unit, 'compact'), scale: null, exact: yValueFormatter(value, unit, 'standard') }
  return amountParts(value, { currency, locale, format: formatCurrency })
}
