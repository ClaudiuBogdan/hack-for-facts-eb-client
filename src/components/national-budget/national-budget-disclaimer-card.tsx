import { Trans } from '@lingui/react/macro'
import { X } from 'lucide-react'
import { i18n } from '@lingui/core'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type NationalBudgetDisclaimerCardProps = {
  readMoreHref?: string
  onClose?: () => void
}

const DISCLAIMER_COPY = {
  en: {
    main: 'Data is informational, not official consolidated publication.',
    discrepancy: 'Discrepancies may exist.',
    sourceData: 'Source data uses only budget execution datasets (execuții bugetare).',
    coverage: 'Data is not consolidated and does not include the full national budget coverage (for example Eximbank and other BGC components).',
    totalNote: 'Total buget is a merged informational treemap of available sections, not an official consolidated total.',
    sourceLabel: 'Source:',
    referenceLabel: 'Reference:',
    referenceName: 'Budget execution information',
  },
  ro: {
    main: 'Datele sunt informative și nu reprezintă publicarea oficială consolidată.',
    discrepancy: 'Pot exista discrepanțe.',
    sourceData: 'Datele sursă folosesc doar seturile de execuție bugetară.',
    coverage: 'Datele nu sunt consolidate și nu acoperă integral bugetul național (de exemplu Eximbank și alte componente BGC).',
    totalNote: 'Total buget este o agregare informativă a secțiunilor disponibile și nu reprezintă totalul oficial consolidat.',
    sourceLabel: 'Sursă:',
    referenceLabel: 'Referință:',
    referenceName: 'Informații execuție bugetară',
  },
} as const

export function NationalBudgetDisclaimerCard({ readMoreHref, onClose }: NationalBudgetDisclaimerCardProps) {
  const locale = (i18n.locale ?? 'en').toLowerCase()
  const copy = locale.startsWith('ro') ? DISCLAIMER_COPY.ro : DISCLAIMER_COPY.en

  return (
    <Card className="border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
      <CardContent className="pt-6 space-y-2 text-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium">{copy.main}</p>
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1 -mr-1 shrink-0"
              onClick={onClose}
              aria-label="Dismiss disclaimer"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <p className="text-muted-foreground">{copy.discrepancy}</p>
        <p className="text-muted-foreground">{copy.sourceData}</p>
        <p className="text-muted-foreground">{copy.coverage}</p>
        <p className="text-muted-foreground">{copy.totalNote}</p>
        <p>
          {copy.sourceLabel}{' '}
          <a
            href="https://mfinante.gov.ro/transparenta-bugetara"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 font-medium"
          >
            Ministerul Finanțelor
          </a>
        </p>
        <p>
          {copy.referenceLabel}{' '}
          <a
            href="https://mfinante.gov.ro/domenii/bugetul-de-stat/informatii-executie-bugetara"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 font-medium"
          >
            {copy.referenceName}
          </a>
        </p>
        {readMoreHref ? (
          <a href={readMoreHref} className="inline-flex items-center text-sm font-semibold underline underline-offset-4">
            <Trans>Read more</Trans>
          </a>
        ) : null}
      </CardContent>
    </Card>
  )
}
