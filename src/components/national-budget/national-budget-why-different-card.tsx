import { AlertTriangle } from 'lucide-react'
import { Trans } from '@lingui/react/macro'

import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function NationalBudgetWhyDifferentCard() {
  return (
    <Card className="border-l-4 border-l-primary/30">
      <CardHeader className="pb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" aria-hidden="true" />
          <Trans>Why numbers can differ</Trans>
        </h2>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
          <li>
            <Trans>
              Internal transfers can be double-counted when money moves between public institutions.
            </Trans>
          </li>
          <li>
            <Trans>
              Accounting reclassifications can move values between categories (for example transfers vs EU-funded project lines).
            </Trans>
          </li>
          <li>
            <Trans>
              EU/FEN flows can appear in operational financial accounts and be reallocated in official year-end consolidation.
            </Trans>
          </li>
        </ul>
      </CardContent>
    </Card>
  )
}
