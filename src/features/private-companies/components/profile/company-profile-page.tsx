import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { useProcurementSupplierSlice } from '@/features/procurement/hooks/use-procurement-data'
import { HubFiguresBand } from '@/features/statistics/components/hub/hub-figures'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import type { CompanyPaymentGrain, PrivateCompanyProfile, PrivateCompanySearchState } from '@/schemas/private-company'
import { useCompanyRegistryScope } from '../../hooks/use-company-registry-scope'
import { useCompanyLitigationShown } from '../../hooks/use-company-litigation-shown'
import { useDocumentBootstrap } from '../../hooks/use-document-bootstrap'
import { useProfileRegistryScope } from '../../hooks/use-profile-registry-scope'
import { effectiveGrain, paymentGrainsOf, toCompanyProcurementRead } from '../../lib/company-procurement-read'
import { buildCompanyProfileModel } from '../../lib/company-profile-model'
import { registrationDiffText } from '../../lib/company-registry-text'
import { buildPrivateCompanyDocumentTitle, buildPrivateCompanyNeutralTitle } from '../../seo/private-company-seo'
import { CompanyRegistryScopeProvider } from '../registry/company-registry-scope-provider'
import { CompanyActivitiesBand } from './company-activities-band'
import { CompanyBusinessBand } from './company-business-band'
import { companyFigures } from './company-figures'
import { CompanyLitigationBand } from './company-litigation-band'
import { CompanyMoneyBand, type ProcurementState } from './company-money-band'
import { CompanyProfileHead } from './company-profile-head'
import { CompanyProfileError, CompanyProfileRegistryMoved, CompanyProfileSkeleton } from './company-profile-states'
import { CompanyRegistryBand } from './company-registry-band'

/**
 * `/companies/$cui` — one company in the `/companies` hub's rhythm: a compact
 * head that says who it is, its status and identifiers, and beside it its
 * last five years with a statement on one chart; the figures band with the
 * newest values; then one numbered band per question — how the business goes,
 * what it received from the state, what it does, its court cases (only when
 * the justice read answers), the registry record. A bar pins under the head
 * with the name and the bands.
 *
 * Every figure and sentence is computed from the record, so the page holds
 * for any company: a national champion, a road builder in insolvency, a
 * retailer struck off, a two-person firm with a decade of losses, a company
 * that never filed, one whose registry observations disagree. The profile
 * renders on the server in full, and the browser hydrating that document
 * keeps it until its first registry read answers; otherwise it is shown only
 * under the ONRC scope the page pins (`useProfileRegistryScope`) — a profile
 * cached from an earlier visit included. The SEAP names behind the public
 * money arrive after it, each with its own pending state.
 */

type SectionId = 'afacerea' | 'bani-publici' | 'activitati' | 'litigii' | 'registru'

const SECTIONS: readonly { readonly id: SectionId; readonly label: () => string }[] = [
  { id: 'afacerea', label: () => t`Afacerea` },
  { id: 'bani-publici', label: () => t`Bani publici` },
  { id: 'activitati', label: () => t`Activități` },
  { id: 'litigii', label: () => t`Litigii` },
  { id: 'registru', label: () => t`Registru` },
]

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

type CompanyProfilePageProps = {
  /**
   * The newest answer the route holds: the browser's own read, or the server's
   * answer for the document until that read settles. The one this page is
   * hydrated with is the server's own (`useDocumentBootstrap`).
   */
  readonly profile: PrivateCompanyProfile
  /** The route's CUI, normalised: the key every read of this company goes by. */
  readonly cui: string
  readonly search: PrivateCompanySearchState
}

/** One registry pin per profile page: every registry read under it shares the same scope. */
export function CompanyProfilePage(props: CompanyProfilePageProps) {
  return (
    <CompanyRegistryScopeProvider>
      <CompanyProfileBody {...props} />
    </CompanyRegistryScopeProvider>
  )
}

function CompanyProfileBody({ profile: answer, cui, search }: CompanyProfilePageProps) {
  const { i18n } = useLingui()
  const navigate = useNavigate({ from: '/companies/$cui' })
  const rootRef = useRef<HTMLDivElement>(null)
  const slice = useProcurementSupplierSlice(cui)
  const scope = useCompanyRegistryScope()
  // Only an instance hydrating the server's document holds one: the answer it was rendered with.
  const documentAnswer = useDocumentBootstrap(answer)
  const { verdict, diff } = useProfileRegistryScope(answer, documentAnswer, cui, scope)
  const shown = verdict.status === 'show' ? verdict.profile : null
  // The route's head names the company on the server path only; the tab is named while the company is shown, and
  // says the CUI alone otherwise — a name the page no longer shows (withdrawn, moved, unreadable) leaves the tab too.
  useClientDocumentTitle(shown ? buildPrivateCompanyDocumentTitle(shown) : buildPrivateCompanyNeutralTitle(cui))
  // The SEAP detail mounts once its read settles; re-scanning then gives it the same arrival as the rest.
  useRevealOnView(rootRef, startArrivalEffects, !slice.isPending)
  // The count-up driver is module state: an unmount mid-flight would leave it ticking.
  useEffect(() => () => stopCounting(), [])
  const litigation = useCompanyLitigationShown(cui)

  // Nothing of the company — name, registry, finances — unless the verdict shows it.
  if (verdict.status === 'moved') return <CompanyProfileRegistryMoved onAccept={verdict.accept} />
  if (verdict.status === 'unreadable') return <CompanyProfileError onRetry={verdict.retry} />
  if (shown === null) return <CompanyProfileSkeleton />
  const profile = shown
  const model = buildCompanyProfileModel(profile)
  // A failed comparison read shows no comparison, not the one an earlier read left in the cache.
  const diffText = diff.data && !diff.isError ? registrationDiffText(diff.data) : null

  const choose = (patch: Partial<PrivateCompanySearchState>, replace = true) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace, resetScroll: false })

  const read = slice.data ? toCompanyProcurementRead(slice.data) : null
  const grains = read ? paymentGrainsOf(read) : []
  const procurement: ProcurementState = read
    ? { status: 'ready', read, grains, grain: effectiveGrain(grains, search.plati) }
    : slice.isError
      ? { status: 'failed', retry: () => void slice.refetch() }
      : { status: 'pending' }
  // The company's own first grain stays out of the URL, like any default.
  const onGrain = (grain: CompanyPaymentGrain) => choose({ plati: grain === grains[0] ? undefined : grain })

  const sections = SECTIONS.filter((section) => section.id !== 'litigii' || litigation)
  const indexOf = (id: SectionId) => {
    const position = sections.findIndex((section) => section.id === id)
    return `${String(position + 1).padStart(2, '0')} / ${SECTIONS.find((section) => section.id === id)?.label() ?? ''}`
  }
  const figures = companyFigures(model, { business: 'afacerea', money: 'bani-publici' })

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />

      <CompanyProfileHead model={model} />

      <nav aria-label={t`Secțiunile paginii`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <RuledFrame className="flex items-center gap-6 overflow-x-auto py-0">
          <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground md:block md:max-w-72">{model.displayName}</span>
          <ol className="flex shrink-0 gap-4 sm:gap-5 md:ml-auto">
            {sections.map((section, position) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <MonoLabel className="text-primary" aria-hidden="true">{String(position + 1).padStart(2, '0')}</MonoLabel>
                  {section.label()}
                </a>
              </li>
            ))}
          </ol>
        </RuledFrame>
      </nav>

      {figures.length > 0 ? (
        <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
          <RuledFrame>
            <HubFiguresBand facts={figures} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
          </RuledFrame>
        </section>
      ) : null}

      <CompanyBusinessBand
        model={model}
        index={indexOf('afacerea')}
        measure={search.masura ?? 'toate'}
        onMeasure={(measure) => choose({ masura: measure === 'toate' ? undefined : measure })}
      />
      <CompanyMoneyBand model={model} index={indexOf('bani-publici')} procurement={procurement} onGrain={onGrain} />
      <CompanyActivitiesBand model={model} index={indexOf('activitati')} />
      {litigation ? (
        <CompanyLitigationBand
          cui={cui}
          index={indexOf('litigii')}
          page={search.litPage ?? 1}
          onPage={(page) => choose({ litPage: page === 1 ? undefined : page }, false)}
        />
      ) : null}
      <CompanyRegistryBand model={model} index={indexOf('registru')} procurement={read} diffText={diffText} last />
    </div>
  )
}
