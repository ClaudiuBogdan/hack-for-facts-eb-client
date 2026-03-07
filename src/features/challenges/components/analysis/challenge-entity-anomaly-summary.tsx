import { t } from '@lingui/core/macro'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExecutionLineItem } from '@/lib/api/entities'
import type { NormalizationOptions } from '@/lib/normalization'
import { formatNormalizedValue } from '@/lib/utils'
import type { ChallengeLocale } from '../../types'

type ChallengeEntityAnomalySummaryProps = {
  readonly locale: ChallengeLocale
  readonly lineItems: readonly ExecutionLineItem[]
  readonly normalizationOptions: NormalizationOptions
}

const ANOMALY_COPY = {
  ro: {
    title: 'Semnale de Alarmă',
    reviewPrompt:
      'Revizuiește liniile bugetare semnalate pentru perioada curentă.',
    noSignals: 'Nu există semnale de alarmă pentru perioada curentă.',
    hideDetails: 'Ascunde Detaliile',
    showDetails: 'Arată Detaliile',
    empty: 'Nu s-au găsit linii bugetare marcate cu anomalii.',
    budgetLine: 'Linie bugetară',
    anomalies: {
      YTD_ANOMALY: {
        label: t`YTD anomaly`,
        description:
          'Valorile scad între raportări și pot indica o corecție sau o reclasificare.',
        badgeVariant: 'destructive' as const,
      },
      MISSING_LINE_ITEM: {
        label: t`Missing`,
        description:
          'Linia bugetară nu mai apare în raportarea curentă și poate indica o mutare între clasificări.',
        badgeVariant: 'secondary' as const,
      },
    },
  },
  en: {
    title: 'Warning signals',
    reviewPrompt: 'Review the budget lines flagged for the current period.',
    noSignals: 'There are no warning signals for the current period.',
    hideDetails: 'Hide details',
    showDetails: 'Show details',
    empty: 'No budget lines flagged with anomalies were found.',
    budgetLine: 'Budget line',
    anomalies: {
      YTD_ANOMALY: {
        label: t`YTD anomaly`,
        description:
          'Values decrease between reports and may indicate a correction or reclassification.',
        badgeVariant: 'destructive' as const,
      },
      MISSING_LINE_ITEM: {
        label: t`Missing`,
        description:
          'The budget line no longer appears in the current report and may indicate a move between classifications.',
        badgeVariant: 'secondary' as const,
      },
    },
  },
} as const

function buildLineItemName(
  lineItem: ExecutionLineItem,
  locale: ChallengeLocale,
): string {
  const parts = [
    lineItem.functionalClassification?.functional_name,
    lineItem.economicClassification?.economic_name,
  ].filter(Boolean)

  return parts.join(' / ') || ANOMALY_COPY[locale].budgetLine
}

function buildLineItemCodes(lineItem: ExecutionLineItem): string | null {
  const parts = [
    lineItem.functionalClassification?.functional_code,
    lineItem.economicClassification?.economic_code,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : null
}

export function ChallengeEntityAnomalySummary({
  locale,
  lineItems,
  normalizationOptions,
}: ChallengeEntityAnomalySummaryProps) {
  const copy = ANOMALY_COPY[locale]
  const anomalyItems = useMemo(
    () => lineItems.filter((lineItem) => Boolean(lineItem.anomaly)),
    [lineItems],
  )
  const [isOpen, setIsOpen] = useState(false)

  const counts = useMemo(
    () =>
      anomalyItems.reduce(
        (accumulator, lineItem) => {
          if (!lineItem.anomaly) return accumulator
          accumulator[lineItem.anomaly] += 1
          return accumulator
        },
        {
          YTD_ANOMALY: 0,
          MISSING_LINE_ITEM: 0,
        },
      ),
    [anomalyItems],
  )

  return (
    <Card className="rounded-[28px] border-border/50">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-black tracking-tight">
              {copy.title}
            </CardTitle>
            <Badge variant={anomalyItems.length > 0 ? 'destructive' : 'secondary'}>
              {anomalyItems.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {anomalyItems.length > 0
              ? copy.reviewPrompt
              : copy.noSignals}
          </p>
          {anomalyItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {counts.YTD_ANOMALY > 0 ? (
                <Badge variant="outline">
                  {copy.anomalies.YTD_ANOMALY.label}: {counts.YTD_ANOMALY}
                </Badge>
              ) : null}
              {counts.MISSING_LINE_ITEM > 0 ? (
                <Badge variant="outline">
                  {copy.anomalies.MISSING_LINE_ITEM.label}: {counts.MISSING_LINE_ITEM}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>

        {anomalyItems.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={() => setIsOpen((currentValue) => !currentValue)}
          >
            {isOpen ? (
              <>
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
                {copy.hideDetails}
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                {copy.showDetails}
              </>
            )}
          </Button>
        ) : null}
      </CardHeader>

      <CardContent>
        {anomalyItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
            {copy.empty}
          </div>
        ) : isOpen ? (
          <ul className="space-y-3" aria-live="polite">
            {anomalyItems.map((lineItem) => {
              if (!lineItem.anomaly) return null

              const anomalyCopy = copy.anomalies[lineItem.anomaly]
              const lineItemCodes = buildLineItemCodes(lineItem)

              return (
                <li
                  key={lineItem.line_item_id}
                  className="rounded-2xl border border-border/60 bg-background px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={anomalyCopy.badgeVariant}>
                          <AlertTriangle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          {anomalyCopy.label}
                        </Badge>
                      </div>
                      <p className="font-semibold text-foreground">
                        {buildLineItemName(lineItem, locale)}
                      </p>
                      {lineItemCodes ? (
                        <p className="text-xs text-muted-foreground">{lineItemCodes}</p>
                      ) : null}
                      <p className="text-sm text-muted-foreground">
                        {anomalyCopy.description}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                      {formatNormalizedValue(
                        lineItem.amount,
                        normalizationOptions,
                        'compact',
                      )}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}
