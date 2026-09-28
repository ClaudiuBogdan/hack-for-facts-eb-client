import { t } from '@lingui/core/macro'
import type { HubFact } from '@/features/statistics/components/hub/hub-figures'

/** Money on the scale of its magnitude, as the front door's figures: „36,4 mil. lei", „5,9 mld. lei", „799.410 lei". */
export function moneyFact(value: number): Pick<HubFact, 'value' | 'digits' | 'unit'> {
  if (Math.abs(value) >= 1e9) return { value: Math.round(value / 1e8) / 10, digits: 1, unit: t`mld. lei` }
  if (Math.abs(value) >= 1e6) return { value: Math.round(value / 1e5) / 10, digits: 1, unit: t`mil. lei` }
  return { value: Math.round(value), digits: 0, unit: 'lei' }
}
