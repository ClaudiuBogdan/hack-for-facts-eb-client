import { useRef, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin } from '@/features/landing/components/count-up'
import { useProcurementSupplierSlice } from '@/features/procurement/hooks/use-procurement-data'
import { HomeSectionNav } from '@/features/procurement/components/home/home-section-nav'
import { companyFigures } from '@/features/private-companies/components/profile/company-figures'
import { CompanyLitigationBand } from '@/features/private-companies/components/profile/company-litigation-band'
import { CompanyMoneyBand, type ProcurementState } from '@/features/private-companies/components/profile/company-money-band'
import { CompanyProfileError, CompanyProfileRegistryMoved, CompanyProfileSkeleton } from '@/features/private-companies/components/profile/company-profile-states'
import { CompanyRegistryBand } from '@/features/private-companies/components/profile/company-registry-band'
import { CompanyRegistryScopeProvider } from '@/features/private-companies/components/registry/company-registry-scope-provider'
import { useCompanyLitigationShown } from '@/features/private-companies/hooks/use-company-litigation-shown'
import { useCompanyRegistryScope } from '@/features/private-companies/hooks/use-company-registry-scope'
import { useDocumentBootstrap } from '@/features/private-companies/hooks/use-document-bootstrap'
import { usePrivateCompanyProfile } from '@/features/private-companies/hooks/use-private-company-profile'
import { useProfileRegistryScope } from '@/features/private-companies/hooks/use-profile-registry-scope'
import { effectiveGrain, paymentGrainsOf, toCompanyProcurementRead } from '@/features/private-companies/lib/company-procurement-read'
import { buildCompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import { registrationDiffSaysSomething, registrationDiffText } from '@/features/private-companies/lib/company-registry-text'
import { HubFiguresBand } from '@/features/statistics/components/hub/hub-figures'
import type { CompanyPaymentGrain, PrivateCompanyProfile } from '@/schemas/private-company'
import type { PrototypeDefinition } from '@/development/harness/entry'
import { DesignActivitiesBand } from './profile-activities.band'
import { ProtoBusinessBand } from './profile-business.band'
import { ChosenHead } from './profile-head.variants'
import { ProtoYearsBand } from './profile-years.band'
import { PROTOTYPE_MARKER } from './profile.data'

/**
 * The company page with the owner's picks of 25 November 2026, assembled: the
 * head without its chart („Fără grafic"), the pinned bar and the bands with no
 * running numbers, the figures in plain text with the landing's arrow, „Ce face
 * firma" led by the presumed main activity, the statements with less at first.
 * The body is `CompanyProfileBody`'s, copied: the registry verdict, the
 * „company gone" path and the reads are the page's own; only the route's
 * navigation is local state here (`masura`, `plati`). `?cui=` a live company
 * (OMV Petrom by default). The bands not reworked (business, public money,
 * litigation, registry) are today's, mono captions and all.
 */

// The owner's order (25 November 2026): what the company does and its statements right under its chart.
const SECTIONS = [
  { id: 'afacerea', label: () => t`Afacerea` },
  { id: 'activitati', label: () => t`Activități` },
  { id: 'an-cu-an', label: () => t`An cu an` },
  { id: 'bani-publici', label: () => t`Bani publici` },
  { id: 'litigii', label: () => t`Litigii` },
  { id: 'registru', label: () => t`Registru` },
] as const

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

function useCui(): string {
  const search = useSearch({ strict: false }) as { readonly cui?: unknown }
  return typeof search.cui === 'string' || typeof search.cui === 'number' ? String(search.cui) : '1590082'
}

function AssembledPage() {
  const cui = useCui()
  const query = usePrivateCompanyProfile(cui)
  if (!query.data) return <p className="p-6 text-sm text-muted-foreground">{query.isError ? 'Profilul nu s-a încărcat.' : 'Se încarcă…'}</p>
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <CompanyRegistryScopeProvider>
        <Body key={cui} answer={query.data} cui={cui} />
      </CompanyRegistryScopeProvider>
    </div>
  )
}

function Body({ answer, cui }: { readonly answer: PrivateCompanyProfile; readonly cui: string }) {
  const { i18n } = useLingui()
  const [plati, setPlati] = useState<CompanyPaymentGrain | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)
  const slice = useProcurementSupplierSlice(cui)
  const scope = useCompanyRegistryScope()
  const documentAnswer = useDocumentBootstrap(answer)
  const { verdict, diff, reportGone } = useProfileRegistryScope(answer, documentAnswer, cui, scope)
  const shown = verdict.status === 'show' ? verdict.profile : null
  useRevealOnView(rootRef, startArrivalEffects, !slice.isPending)
  const litigation = useCompanyLitigationShown(cui)

  if (verdict.status === 'moved') return <CompanyProfileRegistryMoved onAccept={verdict.accept} />
  if (verdict.status === 'unreadable') return <CompanyProfileError onRetry={verdict.retry} />
  if (shown === null) return <CompanyProfileSkeleton />
  const model = buildCompanyProfileModel(shown)
  const diffText = diff.data && !diff.isError && registrationDiffSaysSomething(diff.data) ? registrationDiffText(diff.data) : null
  const read = slice.data ? toCompanyProcurementRead(slice.data) : null
  const grains = read ? paymentGrainsOf(read) : []
  const procurement: ProcurementState = read
    ? { status: 'ready', read, grains, grain: effectiveGrain(grains, plati) }
    : slice.isError
      ? { status: 'failed', retry: () => void slice.refetch() }
      : { status: 'pending' }
  const onGrain = (grain: CompanyPaymentGrain) => setPlati(grain === grains[0] ? undefined : grain)
  const years = model.qualification.statements.length > 0
  const sections = SECTIONS.filter((section) => (section.id !== 'litigii' || litigation) && (section.id !== 'an-cu-an' || years)).map((section) => ({
    id: section.id,
    label: section.label(),
  }))
  const figures = companyFigures(model, { business: 'afacerea', money: 'bani-publici' })

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']">
      <RevealStyles />
      <SmearFilters />
      <ChosenHead model={model} />
      <HomeSectionNav title={model.displayName} sections={sections} numbered={false} />
      {figures.length > 0 ? (
        <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
          <RuledFrame>
            <HubFiguresBand facts={figures} locale={i18n.locale === 'en' ? 'en' : 'ro'} plain arrow />
          </RuledFrame>
        </section>
      ) : null}
      <ProtoBusinessBand model={model} />
      <DesignActivitiesBand model={model} designedMain onCompanyGone={reportGone} />
      {years ? <ProtoYearsBand model={model} /> : null}
      <CompanyMoneyBand model={model} index="" procurement={procurement} onGrain={onGrain} />
      {litigation ? <CompanyLitigationBand cui={cui} index="" litigation={litigation} /> : null}
      <CompanyRegistryBand model={model} index="" procurement={read} diffText={diffText} courts={litigation !== null} last />
    </div>
  )
}

export const prototype = {
  title: 'Firmă — pagina, cu alegerile de azi',
  spec: 'docs/design/companies/design.md',
  variants: {
    nou: {
      title: 'Pagina nouă',
      component: AssembledPage,
      note: 'Head without chart; no running numbers; plain figures with arrows; „Ce face firma" led by the presumed main activity; statements with less at first. Other bands as today. The real page is /companies/<cui>.',
    },
  },
} satisfies PrototypeDefinition
