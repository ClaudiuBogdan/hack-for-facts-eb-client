import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import type { PrivateCompanySearchResultPage } from '@/schemas/private-company-search'

type CompanyResult = PrivateCompanySearchResultPage['items'][number]

type Props = {
  readonly company: CompanyResult
}

export function PrivateCompanyResultCard({ company }: Props) {
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
            </p>
          </div>
          {company.status?.label ? (
            <p className="shrink-0 text-right text-sm font-semibold text-[var(--pnrr-muted)]">
              {company.status.label}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  )
}
