import type { GqlReportType } from '@/schemas/reporting'
import { Info } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ChallengeLocale } from '../../types'

type ChallengeCommitmentsExplainerProps = {
  readonly locale: ChallengeLocale
  readonly reportType: Extract<GqlReportType, 'PRINCIPAL_AGGREGATED' | 'DETAILED'>
  readonly inflationAdjusted: boolean
  readonly isPerCapita: boolean
}

const EXPLAINER_COPY = {
  ro: {
    showLess: 'Arată mai puțin',
    showMore: 'Citește mai mult',
    aggregatedPrimary:
      'Această pagină arată angajamentele bugetare agregate la nivel de ordonator principal. Totalurile includ atât primăria, cât și instituțiile finanțate prin același ordonator principal.',
    detailedPrimary:
      'Această pagină arată doar angajamentele bugetare raportate direct de primărie. Instituțiile finanțate prin același ordonator principal nu sunt incluse.',
    perCapita:
      'Valorile sunt afișate per capita, împărțite la numărul de locuitori.',
    inflationAdjusted:
      'Sumele sunt ajustate la inflație, iar valorile din anii anteriori sunt recalculate în prețuri 2024.',
    expandedWhat:
      'Creditele bugetare reprezintă limita maximă aprobată pentru cheltuieli într-un an. Angajamentele legale sunt contracte sau comenzi semnate (promisiuni de plată). Plățile sunt sumele efectiv transferate din trezorerie.',
    expandedWhy:
      'Diferența dintre angajamente și plăți arată datoriile curente sau lucrările în derulare care nu au fost încă plătite. Diferența dintre credite și angajamente arată cât buget neutilizat rămâne.',
    expandedMultiYear:
      'Creditele bugetare sunt anuale (limitează plățile pe anul selectat), dar angajamentele legale sunt adesea contracte multianuale, deci pot fi mai mari decât bugetul anual. Pentru a evalua nivelul de contractare, comparați angajamentele cu autorizarea de angajament.',
  },
  en: {
    showLess: 'Show less',
    showMore: 'Read more',
    aggregatedPrimary:
      'This page shows budget commitments aggregated at the main-creditor level. Totals include both the city hall and institutions financed through the same main creditor.',
    detailedPrimary:
      'This page shows only the budget commitments reported directly by the city hall. Institutions financed through the same main creditor are excluded.',
    perCapita:
      'Values are displayed per capita, divided by the number of inhabitants.',
    inflationAdjusted:
      'Amounts are inflation-adjusted, and earlier years are recalculated in 2024 prices.',
    expandedWhat:
      'Budget credits represent the maximum approved spending limit for a year. Legal commitments are signed contracts or orders — promises to pay. Payments are the amounts actually transferred from the treasury.',
    expandedWhy:
      'The gap between commitments and payments shows current debts or work in progress that has not yet been paid. The gap between budget credits and commitments shows how much unused budget remains.',
    expandedMultiYear:
      'Budget credits are annual (they limit what can be paid in the selected year), but legal commitments are often multi-year contract values, so they can be higher than the annual budget. To assess contracting levels, compare commitments to commitment authority.',
  },
} as const

export function ChallengeCommitmentsExplainer({
  locale,
  reportType,
  inflationAdjusted,
  isPerCapita,
}: ChallengeCommitmentsExplainerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const copy = EXPLAINER_COPY[locale]
  const primaryParagraph =
    reportType === 'PRINCIPAL_AGGREGATED'
      ? copy.aggregatedPrimary
      : copy.detailedPrimary

  const filterSuffix = [
    isPerCapita ? copy.perCapita : null,
    inflationAdjusted ? copy.inflationAdjusted : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Card className="rounded-[28px] border-border/50">
      <CardContent className="px-4 py-4 sm:px-6 sm:py-5 md:px-7">
        <div className="flex items-start gap-3 sm:gap-4">
          <Info
            className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-[13px] leading-6 text-foreground sm:text-sm sm:leading-7 md:text-[1.05rem]">
              {primaryParagraph}
              {filterSuffix ? ` ${filterSuffix}` : null}
            </p>

            {isExpanded ? (
              <div className="space-y-3">
                <p className="text-sm leading-6 text-muted-foreground">
                  {copy.expandedWhat}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {copy.expandedWhy}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {copy.expandedMultiYear}
                </p>
              </div>
            ) : null}

            <div className="flex items-center pt-1">
              <Button
                type="button"
                variant="link"
                className="h-auto justify-start px-0 text-sm font-semibold"
                onClick={() => setIsExpanded((currentValue) => !currentValue)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? copy.showLess : copy.showMore}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
