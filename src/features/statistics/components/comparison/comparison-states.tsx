import type { ReactNode } from 'react'
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

/** Honest skeleton: the shape of the ranking and the chart, nothing invented. */
export function ComparisonSkeleton() {
  return (
    <div className="space-y-5 rounded-lg border border-border/70 bg-card p-4 md:p-5" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-56 w-full sm:h-72" />
    </div>
  )
}

/**
 * A question the page cannot answer yet: no indicator, or no territory. It
 * says what is missing and offers the common answers one tap away — never an
 * empty chart shell.
 */
export function ComparisonGuide({ title, children }: { readonly title: ReactNode; readonly children: ReactNode }) {
  return (
    <section className="rounded-lg border border-dashed border-border px-5 py-8 sm:px-8">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

/** The one-tap answers a guide offers. */
export function ComparisonGuideChoices({
  choices,
  onChoose,
}: {
  readonly choices: readonly { readonly key: string; readonly label: string }[]
  readonly onChoose: (key: string) => void
}) {
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {choices.map((choice) => (
        <li key={choice.key}>
          <button
            type="button"
            onClick={() => onChoose(choice.key)}
            className="inline-flex min-h-9 items-center rounded-md border border-border/70 bg-background px-3 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {choice.label}
          </button>
        </li>
      ))}
    </ul>
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
          Indicatorul nu are valori raportate pentru teritoriile și dimensiunile
          alese. Încearcă altă valoare fixată sau alte localități.
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
            Nu am putut citi și verifica observațiile INS. Reîncearcă
            încărcarea.
          </Trans>
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <Trans>Se reîncarcă…</Trans>
          ) : (
            <Trans>Reîncearcă</Trans>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  )
}

