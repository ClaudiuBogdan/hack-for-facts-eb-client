import { Trans } from '@lingui/react/macro'
import { AlertTriangle, BarChart3 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * The four states the results area can be in, kept distinct on purpose.
 *
 * "Pick another territory" and "this combination has no data" look the same to
 * a careless implementation — an empty results area — but they ask the user for
 * completely different actions. So does "the request failed", which must never
 * be rendered as an absence of data.
 */

/** Honest skeleton: the shape of the table and the two charts, nothing invented. */
export function ComparisonSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-48 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}

/**
 * Shown when no dataset is chosen. Distinct from {@link ComparisonNoData}: here
 * the user has not asked a complete question yet, so there is nothing to
 * report. (Below two territories WITH a dataset the page renders the worked
 * example instead, so this state has exactly one shape.)
 */
export function ComparisonGuidedEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <BarChart3 aria-hidden className="h-8 w-8 text-muted-foreground" />

      <h2 className="text-base font-semibold text-foreground">
        <Trans>Alege un indicator pentru a începe</Trans>
      </h2>

      <p className="max-w-md text-sm text-muted-foreground">
        <Trans>
          Caută un indicator INS, apoi adaugă între două și șase localități. Comparația se
          construiește pe măsură ce alegi.
        </Trans>
      </p>
    </div>
  )
}

/**
 * Shown when the query ran and came back empty. The pins are the usual cause,
 * so the copy points at them rather than at the territory picker.
 */
export function ComparisonNoData() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <BarChart3 aria-hidden className="h-8 w-8 text-muted-foreground" />
      <h2 className="text-base font-semibold text-foreground">
        <Trans>Nu există date pentru această combinație</Trans>
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        <Trans>
          Indicatorul nu are valori raportate pentru teritoriile și dimensiunile alese. Încearcă
          altă valoare fixată sau alte localități.
        </Trans>
      </p>
    </div>
  )
}

type ErrorProps = {
  readonly onRetry: () => void
  readonly isRetrying: boolean
}

export function ComparisonErrorState({ onRetry, isRetrying }: ErrorProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle aria-hidden className="h-4 w-4" />
      <AlertTitle>
        <Trans>Nu am putut încărca datele de comparație</Trans>
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          <Trans>
            Cererea către INS Tempo a eșuat. Datele nu lipsesc — nu am reușit să le citim.
          </Trans>
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? <Trans>Se reîncarcă…</Trans> : <Trans>Reîncearcă</Trans>}
        </Button>
      </AlertDescription>
    </Alert>
  )
}

/** Warns that the single read hit its row cap, so the view is incomplete. */
export function ComparisonPartialNotice() {
  return (
    <Alert>
      <AlertTriangle aria-hidden className="h-4 w-4" />
      <AlertTitle>
        <Trans>Rezultate parțiale</Trans>
      </AlertTitle>
      <AlertDescription>
        <Trans>
          Indicatorul a returnat mai multe observații decât putem afișa. Fixează mai multe
          dimensiuni sau alege mai puține teritorii.
        </Trans>
      </AlertDescription>
    </Alert>
  )
}
