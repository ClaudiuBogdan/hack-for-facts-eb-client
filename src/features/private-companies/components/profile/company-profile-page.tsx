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
import type { CompanyPaymentGrain, PrivateCompanyProfile, PrivateCompanySearchState } from '@/schemas/private-company'
import { useCompanyLitigationShown } from '../../hooks/use-company-litigation-shown'
import { effectiveGrain, paymentGrainsOf, toCompanyProcurementRead } from '../../lib/company-procurement-read'
import { buildCompanyProfileModel } from '../../lib/company-profile-model'
import { economyShares } from '../../lib/company-profile-text'
import { CompanyActivitiesBand } from './company-activities-band'
import { CompanyBusinessBand } from './company-business-band'
import { CompanyEconomyBand } from './company-economy-band'
import { companyFigures } from './company-figures'
import { CompanyLitigationBand } from './company-litigation-band'
import { CompanyMoneyBand, type ProcurementState } from './company-money-band'
import { CompanyProfileHead } from './company-profile-head'
import { CompanyRegistryBand } from './company-registry-band'

/**
 * `/companies/$cui` — one company in the `/companies` hub's rhythm: a compact
 * head that says who it is, its status and identifiers, and beside it its
 * last five years with a statement on one chart; the figures band with the
 * newest values; then one numbered band per question — how the business goes,
 * what it received from the state, what it does, where it stands in the
 * economy (only when a share reaches 1%), its court cases (only when the
 * justice read answers), the registry record. A bar pins under the head with
 * the name and the bands.
 *
 * Every figure and sentence is computed from the record, so the page holds
 * for any company: a national champion, a road builder in insolvency, a
 * retailer struck off, a two-person firm with a decade of losses, a company
 * that never filed. The profile renders on the server in full; the SEAP names
 * behind the public money arrive after it, each with its own pending state.
 */

type SectionId = 'afacerea' | 'bani-publici' | 'activitati' | 'economie' | 'litigii' | 'registru'

const SECTIONS: readonly { readonly id: SectionId; readonly label: () => string }[] = [
  { id: 'afacerea', label: () => t`Afacerea` },
  { id: 'bani-publici', label: () => t`Bani publici` },
  { id: 'activitati', label: () => t`Activități` },
  { id: 'economie', label: () => t`În economie` },
  { id: 'litigii', label: () => t`Litigii` },
  { id: 'registru', label: () => t`Registru` },
]

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

export function CompanyProfilePage({
  profile,
  cui,
  search,
}: {
  readonly profile: PrivateCompanyProfile
  /** The route's CUI, normalised: the key every read of this company goes by. */
  readonly cui: string
  readonly search: PrivateCompanySearchState
}) {
  const { i18n } = useLingui()
  const navigate = useNavigate({ from: '/companies/$cui' })
  const rootRef = useRef<HTMLDivElement>(null)
  const slice = useProcurementSupplierSlice(cui)
  // The SEAP detail mounts once its read settles; re-scanning then gives it the same arrival as the rest.
  useRevealOnView(rootRef, startArrivalEffects, !slice.isPending)
  // The count-up driver is module state: an unmount mid-flight would leave it ticking.
  useEffect(() => () => stopCounting(), [])

  const model = buildCompanyProfileModel(profile)
  const litigation = useCompanyLitigationShown(cui)

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

  const economy = economyShares(model).length > 0
  const sections = SECTIONS.filter((section) => (section.id !== 'economie' || economy) && (section.id !== 'litigii' || litigation))
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
      {economy ? <CompanyEconomyBand model={model} index={indexOf('economie')} /> : null}
      {litigation ? (
        <CompanyLitigationBand
          cui={cui}
          index={indexOf('litigii')}
          page={search.litPage ?? 1}
          onPage={(page) => choose({ litPage: page === 1 ? undefined : page }, false)}
        />
      ) : null}
      <CompanyRegistryBand model={model} index={indexOf('registru')} procurement={read} last />
    </div>
  )
}
