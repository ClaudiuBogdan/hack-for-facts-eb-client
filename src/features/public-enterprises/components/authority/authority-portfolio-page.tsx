import { useEffect, useRef, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'

import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CruxMarks } from '@/features/landing/components/hero-chrome'
import { HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import type { PublicEnterprisePortfolioSearch } from '@/schemas/public-enterprises'
import type { AuthorityPortfolio } from '@/schemas/public-enterprise-portfolio'
import { disagreements, downLanes, portfolioFigures, portfolioRows, type PortfolioRow } from '../../lib/authority-portfolio-model'
import { authorityTitle } from '../../lib/authority-portfolio-text'
import { EnterprisesBand, PlacesBand, SourcesBand } from './authority-bands'
import { AuthorityHero } from './authority-hero'

/**
 * `/public-enterprises/authorities/$cui`: one controlling authority's public
 * enterprises (promoted from the prototype `public-companies/portfolio`,
 * variant `tabel`). A compact head with each source's word beside it; the
 * pinned bar; four counts of enterprises; then the enterprises in one table,
 * where the two sources part, and what they do and where. Nothing is summed
 * across enterprises.
 */

type BandId = 'intreprinderi' | 'surse' | 'domenii'

const BAND_LABEL: Readonly<Record<BandId, () => string>> = {
  intreprinderi: () => t`Întreprinderile`,
  surse: () => t`Surse`,
  domenii: () => t`Ce fac`,
}

/** Activities and seats say something from five enterprises on. */
const MIN_FOR_PLACES = 5

/**
 * Four counts of enterprises, never money. Each SEAP count is a floor when
 * SEAP left some of its reads unanswered, and goes when it answered for none;
 * the sales are direct purchases only (supplier contract awards are not read).
 */
function figuresOf(rows: readonly PortfolioRow[], year: number, seapSpan: AuthorityPortfolio['seapSpan']): readonly HubFact[] {
  const figures = portfolioFigures(rows)
  const total = rows.length
  const netReported = figures.netReported
  const span = `${seapSpan.from.slice(0, 4)}–${seapSpan.to.slice(0, 4)}`
  const seapNote = (unknown: number) => (unknown > 0 ? t`cel puțin; ${span}` : span)
  const toTable = (label: ReactNode, className: string) => (
    <a href="#intreprinderi" className={className}>
      {label}
    </a>
  )
  const facts: HubFact[] = [
    { key: 'filed', value: figures.filed, digits: 0, label: t`Cu bilanț pe ${year}`, note: t`din ${total}`, link: toTable },
    ...(netReported > 0 ? [{ key: 'loss', value: figures.loss, digits: 0, label: t`Pe pierdere în ${year}`, note: t`din ${netReported} cu rezultat raportat`, link: toTable }] : []),
    ...(figures.buyers > 0 || figures.buyersUnknown < total ? [{ key: 'buyers', value: figures.buyers, digits: 0, label: t`Cumpără prin SEAP`, note: seapNote(figures.buyersUnknown), link: toTable }] : []),
    ...(figures.directSellers > 0 || figures.directSellersUnknown < total
      ? [{ key: 'sellers', value: figures.directSellers, digits: 0, label: t`Vând prin achiziții directe`, note: seapNote(figures.directSellersUnknown), link: toTable }]
      : []),
  ]
  return facts
}

export function AuthorityPortfolioPage({
  portfolio,
  search,
  onSearch,
}: {
  readonly portfolio: AuthorityPortfolio
  readonly search: Required<PublicEnterprisePortfolioSearch>
  readonly onSearch: (patch: Partial<Required<PublicEnterprisePortfolioSearch>>) => void
}) {
  const { i18n } = useLingui()
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, (block, delay) => countUpWithin(block, delay))
  // The count-up driver is module state; an unmount mid-flight would leave it ticking against removed nodes.
  useEffect(() => () => stopCounting(), [])

  const locale = i18n.locale
  const rows = portfolioRows(portfolio)
  const down = downLanes(portfolio)
  const parts = disagreements(portfolio.authority.cui, rows, down)
  const name = authorityTitle(portfolio.authority)
  const bands = (['intreprinderi', 'surse', 'domenii'] as const).filter((band) => (band === 'surse' ? parts.length > 0 : band === 'domenii' ? rows.length >= MIN_FOR_PLACES : true))
  const index = (band: BandId) => `${String(bands.indexOf(band) + 1).padStart(2, '0')} / ${BAND_LABEL[band]()}`
  const facts = figuresOf(rows, portfolio.financialYear, portfolio.seapSpan)
  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />
      <AuthorityHero portfolio={portfolio} name={name} rows={rows} locale={locale} />
      <HomeSectionNav title={name} sections={bands.map((band) => ({ id: band, label: BAND_LABEL[band]() }))} />
      {facts.length > 0 ? (
        <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
          <RuledFrame>
            <CruxMarks />
            <HubFiguresBand facts={facts} locale={locale === 'en' ? 'en' : 'ro'} />
          </RuledFrame>
        </section>
      ) : null}
      <EnterprisesBand
        index={index('intreprinderi')}
        rows={rows}
        year={portfolio.financialYear}
        authorityCui={portfolio.authority.cui}
        down={down}
        search={search}
        onSearch={onSearch}
        locale={locale}
      />
      {bands.includes('surse') ? <SourcesBand index={index('surse')} parts={parts} locale={locale} /> : null}
      {bands.includes('domenii') ? <PlacesBand index={index('domenii')} rows={rows} locale={locale} /> : null}
    </div>
  )
}
