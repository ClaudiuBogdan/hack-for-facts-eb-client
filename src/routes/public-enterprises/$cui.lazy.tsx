import { createLazyFileRoute, useParams } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import type { PublicEnterpriseRouteLoaderData } from './$cui'
import type { ReadState } from '@/features/public-enterprises/components/enterprise/enterprise-bands'
import { PublicEnterprisePending } from '@/features/public-enterprises/components/enterprise/enterprise-pending'
import { PublicEnterpriseLoadError, PublicEnterpriseNotFound } from '@/features/public-enterprises/components/enterprise/enterprise-states'
import { PublicEnterprisePage } from '@/features/public-enterprises/components/enterprise/public-enterprise-page'
import { useEnterpriseBuyer, useEnterpriseCompany, usePublicEnterprise } from '@/features/public-enterprises/hooks/use-public-enterprise'
import { neutralEnterpriseTitle } from '@/features/public-enterprises/lib/enterprise-head'
import { enterpriseName } from '@/features/public-enterprises/lib/enterprise-seo'
import { parsePublicEnterpriseCuiParam } from '@/features/public-enterprises/lib/enterprise-cui'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'

export const Route = createLazyFileRoute('/public-enterprises/$cui')({
  component: PublicEnterpriseRoutePage,
  notFoundComponent: PublicEnterpriseRouteNotFound,
})

/** The server's `notFound()` — a CUI no list holds, or a path that is not a CUI — in the page's own frame. */
function PublicEnterpriseRouteNotFound() {
  const { cui } = useParams({ strict: false }) as { readonly cui?: string }
  const parsed = cui ? parsePublicEnterpriseCuiParam(cui) : null
  useClientDocumentTitle(parsed ? neutralEnterpriseTitle(parsed) : null)
  return <PublicEnterpriseNotFound cui={parsed} />
}

/** A query's answer as a band reads it: seeded data stands even when a later read failed. */
function stateOf<T>(query: { readonly data: T | undefined; readonly isError: boolean; readonly refetch: () => unknown }): ReadState<T> {
  if (query.data !== undefined) return { status: 'ready', value: query.data }
  return query.isError ? { status: 'failed', retry: () => void query.refetch() } : { status: 'pending' }
}

function PublicEnterpriseRoutePage() {
  const { cui } = Route.useParams()
  const loaderData = Route.useLoaderData() as PublicEnterpriseRouteLoaderData | undefined
  const enterprise = usePublicEnterprise(cui, loaderData?.enterprise)
  const company = useEnterpriseCompany(cui, loaderData?.company)
  const buyer = useEnterpriseBuyer(cui, loaderData?.buyer)
  const read = enterprise.data
  const companyState = stateOf(company)
  // The tab names the enterprise once it is shown; before, and when no list holds it, the CUI alone.
  const named = read?.profile ? enterpriseName(cui, read, companyState.status === 'ready' ? companyState.value : undefined) : null
  const title = read?.profile ? `${named ?? t`Întreprinderea cu CUI ${cui}`} — ${t`Întreprinderi publice`} — Transparenta.eu` : neutralEnterpriseTitle(cui)
  useClientDocumentTitle(title)

  if (!read) return enterprise.isError ? <PublicEnterpriseLoadError onRetry={() => void enterprise.refetch()} /> : <PublicEnterprisePending />
  if (!read.profile) return <PublicEnterpriseNotFound cui={cui} />
  return <PublicEnterprisePage read={read} company={companyState} buyer={stateOf(buyer)} />
}
