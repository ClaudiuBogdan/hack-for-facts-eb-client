import { Trans } from '@lingui/react/macro'

export function PrivateCompanyNotFoundPanel() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">
        <Trans>Company not found</Trans>
      </h1>
      <p className="mt-2 text-muted-foreground">
        <Trans>
          We could not find a private company profile for this CUI. Check the
          identifier or try a mock sample such as 14399840.
        </Trans>
      </p>
    </div>
  )
}
