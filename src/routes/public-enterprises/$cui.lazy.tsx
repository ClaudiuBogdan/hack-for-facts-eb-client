import { isSeedCurrent } from '@/features/procurement/lib/disclosure-seed'
import { createLazyFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import type { PublicEnterpriseRouteLoaderData } from './$cui'
import type { ReadState } from '@/features/public-enterprises/components/enterprise/enterprise-bands'
import { PublicEnterprisePending } from '@/features/public-enterprises/components/enterprise/enterprise-pending'
import { PublicEnterpriseLoadError, PublicEnterpriseNotFound } from '@/features/public-enterprises/components/enterprise/enterprise-states'
import { PublicEnterprisePage } from '@/features/public-enterprises/components/enterprise/public-enterprise-page'
import { useEnterpriseBuyer, useEnterpriseCompany, usePublicEnterprise } from '@/features/public-enterprises/hooks/use-public-enterprise'
import { neutralEnterpriseTitle } from '@/features/public-enterprises/lib/enterprise-head'
import { enterpriseName } from '@/features/public-enterprises/lib/enterprise-seo'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'

export const Route = createLazyFileRoute('/public-enterprises/$cui')({
  component: PublicEnterpriseRoutePage,
})

/** A query's answer as a band reads it: seeded data stands even when a later read failed. */
function stateOf<T>(query: { readonly data: T | undefined; readonly isError: boolean; readonly refetch: () => unknown }): ReadState<T> {
  if (query.data !== undefined) return { status: 'ready', value: query.data }
  return query.isError ? { status: 'failed', retry: () => void query.refetch() } : { status: 'pending' }
}

function PublicEnterpriseRoutePage() {
  const { cui } = Route.useParams()
  const served = Route.useLoaderData() as PublicEnterpriseRouteLoaderData | undefined
  // D6: a seed of another publication than the one the browser read is never used (`disclosure-seed.ts`).
  const loaderData = isSeedCurrent(served) ? served : undefined
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
  // Whether the server read it all: the one signal of a whole render, now that every page is private (CACHE-002), for the specs.
  return (
    <div className="contents" data-server-read={served?.complete ? 'whole' : 'partial'}>
      <PublicEnterprisePage read={read} company={companyState} buyer={stateOf(buyer)} />
    </div>
  )
}
