import { Trans } from '@lingui/react/macro'
import { CircleAlert, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  readonly onRetry?: () => void
  readonly isRetrying?: boolean
}

/**
 * The profile could not be fetched — distinct from "this company does not
 * exist". Client-side navigation no longer blocks on the loader, so a failed
 * request now surfaces here instead of through the route error boundary; the
 * previous fallback claimed the CUI was not in the registry, which asserts
 * something about the data that a transient API failure does not support.
 */
export function PrivateCompanyErrorPanel({ onRetry, isRetrying = false }: Props) {
  return (
    <div role="alert" className="mx-auto max-w-lg px-4 py-16 text-center">
      <CircleAlert
        className="mx-auto h-6 w-6 text-muted-foreground"
        aria-hidden
      />
      <h1 className="mt-3 text-2xl font-bold">
        <Trans>The company profile could not be loaded</Trans>
      </h1>
      <p className="mt-2 text-muted-foreground">
        <Trans>
          Something went wrong while fetching this profile. This does not mean
          the company is missing from the registry — try again, and if the
          problem persists the data source may be temporarily unavailable.
        </Trans>
      </p>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          className="mt-6 gap-2"
          onClick={onRetry}
          disabled={isRetrying}
        >
          <RotateCw
            className={isRetrying ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
            aria-hidden
          />
          <Trans>Retry</Trans>
        </Button>
      ) : null}
    </div>
  )
}
