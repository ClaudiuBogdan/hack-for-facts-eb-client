import { Link, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { BarChart3, Search } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { parseLayoutSearch } from '@/schemas/public-investments'
import {
  HowToReadData,
  PublicInvestmentsEvidenceProvider,
  SourceProvenanceDrawer,
} from '@/features/public-investments/components'
import type { EvidenceRef } from '@/features/public-investments/lib/types'

export const Route = createFileRoute('/investitii-publice')({
  validateSearch: parseLayoutSearch,
  component: PublicInvestmentsLayout,
})

function PublicInvestmentsLayout() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/investitii-publice' })

  const openEvidence = (evidenceRef: EvidenceRef) => {
    void navigate({
      search: (previous) => ({
        ...previous,
        dovada: evidenceRef.sourceRowKey,
      }),
      replace: false,
    })
  }

  const closeEvidence = () => {
    void navigate({
      search: (previous) => ({
        ...previous,
        dovada: undefined,
      }),
      replace: true,
    })
  }

  return (
    <PublicInvestmentsEvidenceProvider value={{ openEvidence }}>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <Link
              to="/investitii-publice"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
              <span>
                <Trans>Investiții publice</Trans>
              </span>
            </Link>
            <nav className="flex flex-wrap gap-2 text-sm">
              <NavLink to="/investitii-publice">
                <Trans>Privire generală</Trans>
              </NavLink>
              <NavLink to="/investitii-publice/cautare">
                <Search className="h-4 w-4" aria-hidden="true" />
                <Trans>Căutare</Trans>
              </NavLink>
              <NavLink
                to="/investitii-publice/judete/$countyCode"
                params={{ countyCode: 'CJ' }}
              >
                <Trans>Județ exemplu</Trans>
              </NavLink>
              <HowToReadData />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Outlet />
        </main>
        <SourceProvenanceDrawer
          sourceRowKey={search.dovada ?? null}
          onClose={closeEvidence}
        />
      </div>
    </PublicInvestmentsEvidenceProvider>
  )
}

function NavLink({
  to,
  params,
  children,
}: {
  readonly to:
    | '/investitii-publice'
    | '/investitii-publice/cautare'
    | '/investitii-publice/judete/$countyCode'
  readonly params?: { readonly countyCode: string }
  readonly children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      params={params}
      activeProps={{
        className: 'bg-secondary text-secondary-foreground',
      }}
      className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
    >
      {children}
    </Link>
  )
}
