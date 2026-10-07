import { BALANCE_BAND } from './principal.balance'
import { BUDGETS_BAND } from './principal.budgets'
import { DOMAINS_BAND } from './principal.domains'
import { LAW_BAND } from './principal.law'
import { MINISTRIES_BAND } from './principal.ministries'
import { NOW_BAND } from './principal.now'
import { REVENUE_BAND } from './principal.revenue'
import type { BandDefinition } from './principal.shell'
import { SPENDING_BAND } from './principal.spending'

/**
 * The bands in a reader's order: what the money is spent on, on which
 * domains, by whom; where it comes from; what is borrowed; how the year in
 * progress goes; the budgets it passes through; what the law approved.
 */
export const BANDS: readonly BandDefinition[] = [SPENDING_BAND, DOMAINS_BAND, MINISTRIES_BAND, REVENUE_BAND, BALANCE_BAND, NOW_BAND, BUDGETS_BAND, LAW_BAND]
