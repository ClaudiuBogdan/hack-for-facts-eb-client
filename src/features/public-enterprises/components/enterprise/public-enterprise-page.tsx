import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'

import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CruxMarks } from '@/features/landing/components/hero-chrome'
import { companyFigures } from '@/features/private-companies/components/profile/company-figures'
import { buildCompanyProfileModel, type CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import { HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import type { BuyerProfile } from '@/features/procurement/lib/buyer-model'
import { moneyFact } from '@/features/procurement/components/profile/profile-facts'
import { periodText } from '@/features/procurement/lib/profile-period-text'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import type { PublicEnterpriseRead } from '@/schemas/public-enterprise-profile'
import { controlGroups, controlRows, indicatorTables, isLaneDown } from '../../lib/enterprise-model'
import { enterpriseName } from '../../lib/enterprise-seo'
import { AmepipBand, ControlBand, MoneyBand, StatusBand, type ReadState } from './enterprise-bands'
import { EnterpriseHero } from './enterprise-hero'

/**
 * `/public-enterprises/$cui`: one public enterprise, in the company page's
 * rhythm (promoted from the prototype `public-companies/enterprise`, variant
 * `afacerea`). A compact head with the company page's five-year chart beside
 * it; the pinned bar; four figures; then who controls it, the public money,
 * what it reports to AMEPIP and each source's word on its status.
 *
 * Three reads, each its own state: the enterprise (always here: the route
 * renders nothing else without it), its company record and its last twelve
 * months as a buyer. A part whose read is pending or failed says so in its
 * place; the rest stands.
 */

type BandId = 'control' | 'bani' | 'amepip' | 'stare'

const ALL_BANDS: readonly { readonly id: BandId; readonly label: () => string }[] = [
  { id: 'control', label: () => t`Control` },
  { id: 'bani', label: () => t`Bani publici` },
  { id: 'amepip', label: () => t`AMEPIP` },
  { id: 'stare', label: () => t`Stare` },
]

/** The figures: the company page's own (admitted values only), linking to its business band, then what it bought in twelve months. */
function figuresOf(cui: string, model: CompanyProfileModel | null, buyer: BuyerProfile | null): readonly HubFact[] {
  const toCompany = (label: React.ReactNode, className: string) => (
    <Link to="/companies/$cui" params={{ cui }} hash="afacerea" preload="intent" className={className}>
      {label}
    </Link>
  )
  const company = model ? companyFigures(model, { business: 'afacerea', money: 'bani' }).filter((fact) => fact.key !== 'public').map((fact) => ({ ...fact, link: toCompany })) : []
  const value = buyer?.direct.value ?? null
  const spent: HubFact[] =
    buyer && value !== null && value > 0
      ? [
          {
            key: 'spent',
            ...moneyFact(value),
            label: t`Achiziții directe, ${periodText(buyer.period)}`,
            note: t`fără TVA`,
            link: (label, className) => (
              <a href="#bani" className={className}>
                {label}
              </a>
            ),
          },
        ]
      : []
  return [...company, ...spent].slice(0, 4)
}

export function PublicEnterprisePage({
  read,
  company,
  buyer,
}: {
  readonly read: PublicEnterpriseRead
  readonly company: ReadState<PrivateCompanyProfile | null>
  readonly buyer: ReadState<BuyerProfile>
}) {
  const { i18n } = useLingui()
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, (block, delay) => countUpWithin(block, delay))
  // The count-up driver is module state; an unmount mid-flight would leave it ticking against removed nodes.
  useEffect(() => () => stopCounting(), [])

  const locale = i18n.locale
  const profile = company.status === 'ready' ? company.value : undefined
  const model = profile ? buildCompanyProfileModel(profile) : null
  const companyState: ReadState<CompanyProfileModel | null> = company.status === 'ready' ? { status: 'ready', value: model } : company
  const rows = controlRows(read)
  const groups = controlGroups(rows)
  const tables = read.indicators ? indicatorTables(read.indicators) : null
  const named = enterpriseName(read.cui, read, profile)
  const cui = read.cui
  const name = named ?? t`Întreprinderea cu CUI ${cui}`
  const facts = figuresOf(read.cui, model, buyer.status === 'ready' ? buyer.value : null)
  // With no authority to show, the head's sentence says why, once: the control band and its place in the bar go.
  const bands = ALL_BANDS.filter((band) => band.id !== 'control' || groups.length > 0)
  const index = (id: BandId) => {
    const position = bands.findIndex((band) => band.id === id)
    return `${String(position + 1).padStart(2, '0')} / ${bands[position]!.label()}`
  }
  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />
      <EnterpriseHero cui={read.cui} name={name} named={named !== null} read={read} rows={rows} tables={tables} company={companyState} locale={locale} />
      <HomeSectionNav title={name} sections={bands.map((band) => ({ id: band.id, label: band.label() }))} />
      {facts.length > 0 ? (
        <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
          <RuledFrame>
            <CruxMarks />
            <HubFiguresBand facts={facts} locale={locale === 'en' ? 'en' : 'ro'} />
          </RuledFrame>
        </section>
      ) : null}
      {groups.length > 0 ? <ControlBand index={index('control')} read={read} rows={rows} groups={groups} locale={locale} /> : null}
      <MoneyBand index={index('bani')} cui={read.cui} buyer={buyer} company={companyState} />
      <AmepipBand index={index('amepip')} tables={tables} down={isLaneDown(read.profile, 'amepip')} locale={locale} />
      <StatusBand index={index('stare')} read={read} company={companyState} locale={locale} />
    </div>
  )
}
