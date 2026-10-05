import type { ReactNode } from 'react'

import { NationalBudgetAdapterContext } from './adapter-context'
import type { NationalBudgetPageAdapter } from './national-budget-page-api'

/** Supplies the page's adapter (the prototype passes the mock or a `?demo=` state of it). */
export function NationalBudgetAdapterProvider({
  adapter,
  children,
}: {
  readonly adapter: NationalBudgetPageAdapter
  readonly children: ReactNode
}) {
  return <NationalBudgetAdapterContext value={adapter}>{children}</NationalBudgetAdapterContext>
}
