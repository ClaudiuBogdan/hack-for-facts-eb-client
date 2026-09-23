import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatHubPeriod } from '../lib/hub-format'

const LATEST = 'latest'
/** The select's id; the specs reach the control by it. */
export const TERRITORY_PERIOD_CONTROL_ID = 'statistics-hub-period'

type Props = {
  /** The years the territory has any figure for, most recent first. */
  readonly years: readonly number[]
  /** The period the address pins, or null for the latest. */
  readonly active: string | null
  /** Whether some tile can answer `active`; false draws the notice. */
  readonly available: boolean
  readonly onChange: (period: string | null) => void
}

/**
 * The period the page reads at: years, most recent first, and „Ultima
 * perioadă". Years only — a list of every published token mixed three
 * cadences into 236 options, and picking a month applied a filter almost
 * no row could answer. A sub-annual series answers a year with its latest
 * cell of that year, and says which.
 *
 * An address may still carry a finer period from an older link; it is
 * applied as it is and named as the rows name periods („mai 2026"), never
 * as the raw token.
 */
export function TerritoryPeriodControl({ years, active, available, onChange }: Props) {
  if (years.length === 0 && !active) return null
  const activeLabel = active ? formatHubPeriod(active) : null
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={TERRITORY_PERIOD_CONTROL_ID} className="text-sm font-medium">
          <Trans>Perioadă</Trans>
        </label>
        <Select value={active ?? LATEST} onValueChange={(value) => onChange(value === LATEST ? null : value)}>
          <SelectTrigger id={TERRITORY_PERIOD_CONTROL_ID} className="w-44" aria-label={t`Filtru perioadă`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LATEST}>{t`Ultima perioadă`}</SelectItem>
            {/* A finer period from the address stays selectable, so the
                trigger can show it and the reader can move off it. */}
            {active && !years.some((year) => String(year) === active) ? (
              <SelectItem value={active}>{activeLabel}</SelectItem>
            ) : null}
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {active ? (
          <>
            <Badge variant="outline">
              <Trans>Filtrat</Trans>: {activeLabel}
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange(null)}>
              <Trans>Șterge filtrul</Trans>
            </Button>
          </>
        ) : null}
      </div>
      {active && !available ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>
            <Trans>Perioada {activeLabel} nu este disponibilă în rezultatele încărcate</Trans>
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              <Trans>
                Filtrul rămâne în adresă. Istoricul poate fi incomplet sau selecția din sursă poate necesita
                clarificare.
              </Trans>
            </p>
            <Button variant="outline" size="sm" onClick={() => onChange(null)}>
              <Trans>Șterge filtrul de perioadă</Trans>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
