import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { formatNumber } from '@/lib/utils'
import type { PnrrAggregates } from '@/schemas/pnrr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { AlertCircle, ChevronDown } from 'lucide-react'

export function PnrrDataQualityBanner({
  aggregates,
}: {
  readonly aggregates: PnrrAggregates
}) {
  const [open, setOpen] = useState(false)

  const duplicateCount =
    aggregates.rawProjectCount - aggregates.deduplicatedProjectCount

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/10">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                <Trans>
                  Datele conțin {formatNumber(aggregates.missingFinProgressPercent)}% proiecte fără
                  progres financiar și {formatNumber(duplicateCount)} duplicate.
                </Trans>
              </span>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                <Trans>Detalii</Trans>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="mt-3 space-y-2 text-xs text-amber-700 dark:text-amber-300">
              <p>
                <Trans>
                  Progresul financiar lipsește pentru majoritatea proiectelor din anumite componente
                  (ex: C9 — instrumente financiare). Deduplicarea se face pe baza titlului
                  normalizat + CUI + componentă + măsură.
                </Trans>
              </p>
              <p>
                <Trans>
                  Valoarea brută: {formatNumber(aggregates.rawTotalValue)} €. Valoarea după
                  deduplicare: {formatNumber(aggregates.deduplicatedTotalValue)} €.
                </Trans>
              </p>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  )
}
