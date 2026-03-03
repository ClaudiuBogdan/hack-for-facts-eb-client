import { Trans } from '@lingui/react/macro'
import { X } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type NationalBudgetDisclaimerCardProps = {
  readMoreHref?: string
  onClose?: () => void
}

export function NationalBudgetDisclaimerCard({ readMoreHref, onClose }: NationalBudgetDisclaimerCardProps) {
  return (
    <Card className="border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
      <CardContent className="pt-6 space-y-2 text-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium">
            <Trans>Data is informational, not official consolidated publication.</Trans>
          </p>
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
        <p className="text-muted-foreground">
          <Trans>Discrepancies may exist.</Trans>
        </p>
        <p className="text-muted-foreground">
          <Trans>Source data uses only budget execution datasets (execuții bugetare).</Trans>
        </p>
        <p className="text-muted-foreground">
          <Trans>
            Data is not consolidated and does not include the full national budget coverage (for example Eximbank and other BGC components).
          </Trans>
        </p>
        <p className="text-muted-foreground">
          <Trans>Total buget is a merged informational treemap of available sections, not an official consolidated total.</Trans>
        </p>
        <p>
          <Trans>Source: </Trans>
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
          <Trans>Reference: </Trans>
          <a
            href="https://mfinante.gov.ro/domenii/bugetul-de-stat/informatii-executie-bugetara"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 font-medium"
          >
            Informații execuție bugetară
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
