import { cn } from '@/lib/utils'

/**
 * Frame classes shared by the financial summary and trends components and
 * their skeletons, so a placeholder occupies exactly the box its content
 * will. Component-free on purpose: the skeletons ship in the entity route's
 * eager module.
 */

export type EntityFinancialSummaryDensity = 'default' | 'compact-desktop'

export type EntityFinancialSummaryClassNames = {
  readonly section: string
  readonly card: string
  readonly header: string
  readonly content: string
}

export function getEntityFinancialSummaryClassNames(
  density: EntityFinancialSummaryDensity,
): EntityFinancialSummaryClassNames {
  const isCompactDesktop = density === 'compact-desktop'

  return {
    section: cn(
      'mb-8 grid grid-cols-1 gap-6 md:grid-cols-3',
      isCompactDesktop && 'grid-cols-3 gap-1.5 sm:gap-3 lg:mb-5 lg:gap-4',
    ),
    card: cn(
      'flex flex-col items-center justify-center rounded-[28px] border-border/50 shadow-sm transition-shadow duration-200 hover:shadow-md',
      isCompactDesktop && 'items-stretch justify-start lg:h-full',
    ),
    header: cn(
      'flex flex-row items-start justify-center gap-4 px-6 pt-6 pb-3',
      isCompactDesktop &&
        'relative justify-start gap-0 space-y-0 px-2 pt-2 pb-0 sm:px-3 sm:pt-3 lg:w-full lg:px-5 lg:pt-4',
    ),
    content: cn(
      'flex flex-col items-center justify-center px-6 pb-6',
      isCompactDesktop &&
        'items-stretch justify-between px-2 pt-1 pb-2 sm:px-3 sm:pt-2 sm:pb-3 lg:flex lg:w-full lg:flex-1 lg:flex-col lg:px-5 lg:pt-3 lg:pb-4',
    ),
  }
}

export const ENTITY_FINANCIAL_TRENDS_CARD_CLASS_NAME =
  'rounded-[28px] border-border/50 shadow-sm'

/** Height of the trends chart, in pixels; the skeleton reserves the same. */
export const ENTITY_FINANCIAL_TRENDS_CHART_HEIGHT = 400
