import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import type { PrivateCompanySearchResultPage } from '@/schemas/private-company-search'

type CompanyResult = PrivateCompanySearchResultPage['items'][number]

type Props = {
  readonly company: CompanyResult
}

/**
 * One directory row under the page's pinned edition: whose name it is, the
 * edition's status consensus — or, without one, that the observations
 * disagree (with an „în funcțiune" one among them when there is) or that the
 * edition holds no profile for the CUI, which is not a legal fact.
 */
function RegistryState({ company }: Props) {
  if (company.status?.label) return <>{company.status.label}</>
  if (company.registryCuiState === 'not_in_edition') return <Trans>Fără profil în ediția ONRC</Trans>
  if (company.statusBasis === 'multiple_values') {
    return company.hasActiveObservation ? <Trans>Stări diferite, între care „în funcțiune”</Trans> : <Trans>Stări diferite</Trans>
  }
  return null
}

export function PrivateCompanyResultCard({ company }: Props) {
  const state = <RegistryState company={company} />
  return (
    <li>
      <Link
        to="/companies/$cui"
        params={{ cui: company.cui }}
        className="group block border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 py-4 transition-colors hover:bg-[var(--pnrr-hover)] sm:px-5"
        data-testid="company-result-card"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-base font-bold leading-snug text-[var(--pnrr-fg)] group-hover:underline">
              {company.name}
            </p>
            <p className="text-sm text-[var(--pnrr-muted)]">
              <Trans>CUI {company.cui}</Trans>
              {company.legalForm ? ` · ${company.legalForm}` : ''}
              {company.county ? ` · ${company.county}` : ''}
              {company.nameSource === 'core_organization' ? (
                <>
                  {' · '}
                  <Trans>nume din directorul platformei</Trans>
                </>
              ) : null}
            </p>
          </div>
          <p className="shrink-0 text-right text-sm font-semibold text-[var(--pnrr-muted)]" data-testid="company-result-state">
            {state}
          </p>
        </div>
      </Link>
    </li>
  )
}
