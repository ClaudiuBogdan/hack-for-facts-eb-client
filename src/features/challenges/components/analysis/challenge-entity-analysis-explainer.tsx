import type { GqlReportType } from '@/schemas/reporting'
import { Info } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ChallengeLocale } from '../../types'

type ChallengeEntityAnalysisExplainerProps = {
  readonly locale: ChallengeLocale
  readonly reportType: Extract<GqlReportType, 'PRINCIPAL_AGGREGATED' | 'DETAILED'>
  readonly inflationAdjusted: boolean
  readonly onReportTypeToggle: () => void
}

const EXPLAINER_COPY = {
  ro: {
    showLess: 'Arată mai puțin',
    showMore: 'Citește mai mult',
    showDetailed: 'Arată Doar Cheltuieli Primăriei',
    showAggregated: 'Arată Cheltuieli Primăriei și Instituțiilor Subordonate',
    aggregatedPrimary:
      'Datele din această pagină vin din execuții bugetare agregate la nivel de ordonator principal de credite. Asta înseamnă că totalurile includ atât finanțele primăriei, cât și instituțiile finanțate prin același ordonator principal.',
    detailedPrimary:
      'Datele din această pagină arată doar execuțiile raportate direct de primărie. În acest mod, instituțiile finanțate prin același ordonator principal nu mai sunt incluse în totalurile și graficele principale.',
    aggregatedSecondary:
      'Sumele pot fi mai mari decât aparatul propriu al primăriei: ele reflectă banii administrați împreună cu instituțiile subordonate din aceeași structură de finanțare.',
    detailedSecondary:
      'Dacă revii la varianta agregată, sumele pot fi mai mari decât aparatul propriu al primăriei, pentru că includ și instituțiile subordonate din aceeași structură de finanțare.',
    inflationAdjusted:
      'Sumele sunt ajustate la inflație, iar valorile din anii anteriori sunt recalculate în prețuri 2024.',
    expandedContext:
      'În practică, această vedere este utilă când vrei imaginea completă a banilor administrați de primărie. O vedere detaliată, la nivel de instituție sau linie bugetară, poate arăta alte totaluri pentru că separă primăria de fiecare instituție subordonată și coboară mai mult în structură.',
    inflationContext:
      'Ajustarea la inflație folosește indicele prețurilor de consum (IPC) publicat de INS. Fără această ajustare, sumele din anii anteriori par mai mici decât sunt în realitate, deoarece inflația erodează puterea de cumpărare a banului. De exemplu, 1 milion RON în 2015 avea o putere de cumpărare semnificativ mai mare decât 1 milion RON în 2024. Ajustarea elimină acest efect, astfel încât creșterile sau scăderile pe care le vezi reflectă schimbări reale în cheltuieli sau venituri, nu doar efectul inflației.',
  },
  en: {
    showLess: 'Show less',
    showMore: 'Read more',
    showDetailed: 'Show only city hall spending',
    showAggregated: 'Show city hall and subordinate spending',
    aggregatedPrimary:
      'This page uses aggregate execution data at the main-creditor level. That means the totals include both the city hall and the institutions financed through the same main creditor.',
    detailedPrimary:
      'This page shows only the execution reported directly by the city hall. In this mode, institutions financed through the same main creditor are excluded from the main totals and charts.',
    aggregatedSecondary:
      'Totals can be higher than the city hall apparatus alone because they reflect money managed together with subordinate institutions in the same funding structure.',
    detailedSecondary:
      'If you switch back to the aggregate view, totals can be higher than the city hall apparatus alone because they also include subordinate institutions in the same funding structure.',
    inflationAdjusted:
      'Amounts are inflation-adjusted, and earlier years are recalculated in 2024 prices.',
    expandedContext:
      'In practice, this view is useful when you want the full picture of the money managed by the city hall. A detailed view, at institution or budget-line level, can show different totals because it separates the city hall from each subordinate institution and goes deeper into the structure.',
    inflationContext:
      'Inflation adjustment uses the consumer price index published by the National Institute of Statistics. Without this adjustment, values from earlier years look smaller than they really are because inflation reduces purchasing power. For example, 1 million RON in 2015 had significantly more purchasing power than 1 million RON in 2024. The adjustment removes that effect so the increases or decreases you see reflect real changes in spending or revenue, not inflation alone.',
  },
} as const

export function ChallengeEntityAnalysisExplainer({
  locale,
  reportType,
  inflationAdjusted,
  onReportTypeToggle,
}: ChallengeEntityAnalysisExplainerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const copy = EXPLAINER_COPY[locale]
  const primaryParagraph =
    reportType === 'PRINCIPAL_AGGREGATED'
      ? copy.aggregatedPrimary
      : copy.detailedPrimary
  const secondaryParagraph =
    reportType === 'PRINCIPAL_AGGREGATED'
      ? copy.aggregatedSecondary
      : copy.detailedSecondary
  const reportTypeToggleLabel =
    reportType === 'PRINCIPAL_AGGREGATED'
      ? copy.showDetailed
      : copy.showAggregated

  return (
    <Card className="rounded-[28px] border-border/50 bg-muted/[0.18]">
      <CardContent className="px-4 py-4 sm:px-6 sm:py-5 md:px-7">
        <div className="flex items-start gap-3 sm:gap-4">
          <Info
            className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-[13px] leading-6 text-foreground sm:text-sm sm:leading-7 md:text-[1.05rem]">
              {primaryParagraph}
              {inflationAdjusted
                ? ` ${copy.inflationAdjusted}`
                : null}
            </p>

            {isExpanded ? (
              <div className="space-y-3">
                <p className="text-sm leading-6 text-muted-foreground">
                  {secondaryParagraph}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {copy.expandedContext}
                </p>
                {inflationAdjusted ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {copy.inflationContext}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="link"
                className="h-auto justify-start px-0 text-sm font-semibold"
                onClick={() => setIsExpanded((currentValue) => !currentValue)}
              >
                {isExpanded ? copy.showLess : copy.showMore}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                onClick={onReportTypeToggle}
              >
                {reportTypeToggleLabel}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
