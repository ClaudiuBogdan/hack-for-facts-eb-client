import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { BookText, BriefcaseBusiness, ChartColumn, Landmark, Scale, Table2, type LucideIcon } from 'lucide-react'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { useProcurementSupplierSlice } from '@/features/procurement/hooks/use-procurement-data'
import { HubFiguresBand } from '@/features/statistics/components/hub/hub-figures'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import type { CompanyPaymentGrain, PrivateCompanyProfile, PrivateCompanySearchState } from '@/schemas/private-company'
import { cn } from '@/lib/utils'
import { useActiveSection } from '../../hooks/use-active-section'
import { useCompanyRegistryScope } from '../../hooks/use-company-registry-scope'
import { useCompanyLitigationShown } from '../../hooks/use-company-litigation-shown'
import { useDocumentBootstrap } from '../../hooks/use-document-bootstrap'
import { useProfileRegistryScope } from '../../hooks/use-profile-registry-scope'
import { effectiveGrain, paymentGrainsOf, toCompanyProcurementRead } from '../../lib/company-procurement-read'
import { buildCompanyProfileModel, withAnafWithdrawnSeen } from '../../lib/company-profile-model'
import { registrationDiffSaysSomething, registrationDiffText } from '../../lib/company-registry-text'
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
import { CompanyYearsBand } from './company-years-band'

/**
 * `/companies/$cui` — one company in the `/companies` hub's rhythm: a compact
 * head that says who it is, its status and identifiers; the figures band with
 * the newest values, in plain text; then one band per question, unnumbered
 * (owner, 25 November 2026) — how the business goes,
 * what it received from the state, what it does, its court cases (only when
 * published name-to-CUI links count one), every statement year by year, the
 * registry record. A bar pins under the head
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

type SectionId = 'afacerea' | 'bani-publici' | 'activitati' | 'litigii' | 'an-cu-an' | 'registru'

// The owner's order (25 November 2026): what the company does and its statements right under its chart. Each with
// an icon in the bar, as on the national budget page (owner, 25 November 2026).
const SECTIONS: readonly { readonly id: SectionId; readonly label: () => string; readonly icon: LucideIcon }[] = [
  { id: 'afacerea', label: () => t`Afacerea`, icon: ChartColumn },
  { id: 'activitati', label: () => t`Activități`, icon: BriefcaseBusiness },
  { id: 'an-cu-an', label: () => t`An cu an`, icon: Table2 },
  { id: 'bani-publici', label: () => t`Bani publici`, icon: Landmark },
  { id: 'litigii', label: () => t`Litigii`, icon: Scale },
  { id: 'registru', label: () => t`Registru`, icon: BookText },
]

/**
 * The pinned bar, as on the national budget page (owner, 25 November 2026):
 * the company's name, then its bands, each with an icon, the one being read
 * underlined. Only the list scrolls sideways on a phone. Mounted with the
 * bands, so the sections it watches are there when it starts.
 */
function SectionBar({ name, sections }: { readonly name: string; readonly sections: typeof SECTIONS }) {
  const active = useActiveSection(sections.map((section) => section.id))
  return (
    <nav aria-label={t`Secțiunile paginii`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 py-0">
        <span className="hidden min-w-0 truncate text-sm font-semibold tracking-tight text-foreground md:block md:max-w-72">{name}</span>
        <ol className="-mx-2.5 flex min-w-0 overflow-x-auto md:ml-auto md:mr-0">
          {sections.map((section) => {
            const current = active === section.id
            return (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  aria-current={current ? 'location' : undefined}
                  className={cn(
                    'relative inline-flex h-12 items-center gap-2 px-2.5 text-sm transition-colors hover:text-foreground',
                    'after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-primary after:opacity-0 after:transition-opacity',
                    current ? 'text-foreground after:opacity-100' : 'text-muted-foreground',
                  )}
                >
                  <section.icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                  {section.label()}
                </a>
              </li>
            )
          })}
        </ol>
      </RuledFrame>
    </nav>
  )
}

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
  const { verdict, diff, reportGone } = useProfileRegistryScope(answer, documentAnswer, cui, scope)
  const shown = verdict.status === 'show' ? verdict.profile : null
  // The route's head names the company on the server path only; the tab is named while the company is shown, and
  // says the CUI alone otherwise — a name the page no longer shows (withdrawn, moved, unreadable) leaves the tab too.
  useClientDocumentTitle(shown ? buildPrivateCompanyDocumentTitle(shown) : buildPrivateCompanyNeutralTitle(cui))
  // The SEAP detail mounts once its read settles; re-scanning then gives it the same arrival as the rest.
  useRevealOnView(rootRef, startArrivalEffects, !slice.isPending)
  // The count-up driver is module state: an unmount mid-flight would leave it ticking.
  useEffect(() => () => stopCounting(), [])
  const litigation = useCompanyLitigationShown(cui)
  // ANAF's source reported withdrawn by the activities band's history: the head drops the presumed activity at once too.
  const [anafWithdrawnUnder, setAnafWithdrawnUnder] = useState<string | null>(null)

  // Nothing of the company — name, registry, finances — unless the verdict shows it.
  if (verdict.status === 'moved') return <CompanyProfileRegistryMoved onAccept={verdict.accept} />
  if (verdict.status === 'unreadable') return <CompanyProfileError onRetry={verdict.retry} />
  if (shown === null) return <CompanyProfileSkeleton />
  const profile = shown
  const model = withAnafWithdrawnSeen(buildCompanyProfileModel(profile), anafWithdrawnUnder)
  // A failed comparison read shows no comparison, not the one an earlier read left in the cache.
  // Only a comparison that says something about the company: not „unchanged", not „no earlier edition".
  const diffText = diff.data && !diff.isError && registrationDiffSaysSomething(diff.data) ? registrationDiffText(diff.data) : null

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

  const years = model.qualification.statements.length > 0
  const sections = SECTIONS.filter((section) => (section.id !== 'litigii' || litigation) && (section.id !== 'an-cu-an' || years))
  const figures = companyFigures(model, { business: 'afacerea', money: 'bani-publici' })

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />

      <CompanyProfileHead model={model} />

      <SectionBar name={model.displayName} sections={sections} />

      {figures.length > 0 ? (
        <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
          <RuledFrame>
            <HubFiguresBand facts={figures} locale={i18n.locale === 'en' ? 'en' : 'ro'} plain arrow />
          </RuledFrame>
        </section>
      ) : null}

      <CompanyBusinessBand model={model} />
      <CompanyActivitiesBand model={model} onCompanyGone={reportGone} onAnafWithdrawn={setAnafWithdrawnUnder} />
      {years ? <CompanyYearsBand model={model} /> : null}
      {/* The money band numbers its head by `index`, which the page no longer sets: an empty caption draws none. */}
      <CompanyMoneyBand model={model} index="" procurement={procurement} onGrain={onGrain} />
      {litigation ? <CompanyLitigationBand cui={cui} litigation={litigation} /> : null}
      <CompanyRegistryBand model={model} procurement={read} diffText={diffText} courts={litigation !== null} last />
    </div>
  )
}
