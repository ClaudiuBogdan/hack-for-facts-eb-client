import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import {
  PUBLIC_ENTERPRISE_HUB_DEFAULTS,
  resolvePublicEnterpriseHubSearch,
  type PublicEnterpriseAuthorityGroup,
  type PublicEnterpriseHubSearch,
} from '@/schemas/public-enterprises'
import { hasPortfolio } from '../../lib/authority-portfolio-links'
import { displayName, formatCount, formatDate, s1001ListDate } from '../../lib/hub-format'
import { authorityRanking, s1001Count, sourceOf } from '../../lib/hub-model'
import { HUB_BAND_IDS, HUB_HEAD_ROWS, HUB_HEAD_ROWS_OPEN, HUB_RANKING_ID, hubSections, type HubBandId } from '../../lib/hub-sections'
import type { PublicEnterpriseHubSnapshot } from '../../lib/hub-snapshot-types'
import { hubCaveats, hubLede, inactiveCount, statementsSource } from '../../lib/hub-text'
import { ControlBand, CountiesBand, MoneyBand, SectorsBand, SizeBand, StatusBand } from './hub-bands'
import { HubHero } from './hub-hero'
import { CaveatsMarker, RankedRows, ShowMore } from './hub-parts'
import { EnterpriseSearch } from './hub-search'

/**
 * `/public-enterprises`: the public enterprises' front door, in the
 * procurement, INS and NGO hubs' language (promoted from the prototype
 * `public-companies/hub`, variant `control`). The head ranks the authorities
 * with the most enterprises; the pinned bar; four figures; one band per
 * question. Every figure is the snapshot's, generated from the API (it
 * serves no aggregate yet); every choice is written in the address.
 */
export function PublicEnterpriseHubPage({ snapshot, search }: { readonly snapshot: PublicEnterpriseHubSnapshot; readonly search: PublicEnterpriseHubSearch }) {
  const { i18n } = useLingui()
  const navigate = useNavigate({ from: '/public-enterprises/' })
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, (block, delay) => countUpWithin(block, delay))
  // The count-up driver is module state; an unmount mid-flight would leave it ticking against removed nodes.
  useEffect(() => () => stopCounting(), [])

  const state = resolvePublicEnterpriseHubSearch(search)
  const set = (patch: Partial<typeof state>) =>
    void navigate({
      search: (previous) => {
        const next: Record<string, unknown> = { ...previous }
        for (const [key, value] of Object.entries(patch)) next[key] = value === PUBLIC_ENTERPRISE_HUB_DEFAULTS[key as keyof typeof PUBLIC_ENTERPRISE_HUB_DEFAULTS] ? undefined : value
        return next
      },
      replace: true,
      resetScroll: false,
    })

  const sections = hubSections()
  const indexOf = (id: HubBandId) => `${String(HUB_BAND_IDS.indexOf(id) + 1).padStart(2, '0')} / ${sections.find((section) => section.id === id)?.label ?? ''}`
  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />
      <HubHero
        lede={hubLede(snapshot, i18n.locale)}
        search={<EnterpriseSearch />}
        caveats={<CaveatsMarker notes={hubCaveats(snapshot, i18n.locale)} />}
        rankingTitleId="public-enterprises-ranking-title"
        ranking={<HeadRanking snapshot={snapshot} group={state.autoritati} onGroup={(autoritati) => set({ autoritati })} />}
        source={<SourceLine snapshot={snapshot} />}
      />
      <HomeSectionNav title={t`Întreprinderi publice`} sections={sections} />
      <Figures snapshot={snapshot} />
      <ControlBand snapshot={snapshot} index={indexOf('control')} />
      <CountiesBand snapshot={snapshot} index={indexOf('judete')} population={state.judete} onPopulation={(judete) => set({ judete })} />
      <SectorsBand snapshot={snapshot} index={indexOf('domenii')} population={state.domenii} onPopulation={(domenii) => set({ domenii })} />
      <SizeBand snapshot={snapshot} index={indexOf('marime')} measure={state.marime} onMeasure={(marime) => set({ marime })} />
      <StatusBand snapshot={snapshot} index={indexOf('stare')} />
      <MoneyBand snapshot={snapshot} index={indexOf('bani')} />
    </div>
  )
}

/** Who controls the most enterprises, as ANAF's list names them: the state's ministries and agencies, the county councils, the localities. */
function HeadRanking({ snapshot, group, onGroup }: { readonly snapshot: PublicEnterpriseHubSnapshot; readonly group: PublicEnterpriseAuthorityGroup; readonly onGroup: (group: PublicEnterpriseAuthorityGroup) => void }) {
  const { i18n } = useLingui()
  const [open, setOpen] = useState(false)
  const rows = authorityRanking(snapshot, group)
  const top = rows[0]?.enterprises ?? 0
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <MonoLabel id="public-enterprises-ranking-title" className="text-primary">
          {t`Cine controlează cele mai multe`}
        </MonoLabel>
        <IndicatorToggle
          label={t`Autoritățile`}
          options={[
            { key: 'stat', label: t`Statul` },
            { key: 'judete', label: t`Județele` },
            { key: 'local', label: t`Locale` },
          ]}
          value={group}
          onChange={onGroup}
        />
      </div>
      <RankedRows
        numbered
        dense
        key={group}
        className="mt-4"
        rows={rows.slice(0, open ? HUB_HEAD_ROWS_OPEN : HUB_HEAD_ROWS).map((row) => ({
          key: row.cui,
          label: displayName(row.name),
          title: row.name ?? undefined,
          caption:
            [
              row.nameSource !== null && row.nameSource !== 's1001' ? t`nume din altă sursă` : null,
              row.level === 'local' && row.county ? displayName(row.county) : null,
              row.inactive > 0 ? inactiveCount(row.inactive, i18n.locale) : null,
            ]
              .filter(Boolean)
              .join(' · ') || undefined,
          value: formatCount(row.enterprises, i18n.locale),
          fraction: top > 0 ? row.enterprises / top : null,
          // The hub's snapshot and the portfolios come from one generator run; the index still decides, so no row leads to a 404.
          link: hasPortfolio(row.cui) ? { page: 'authority' as const, cui: row.cui } : undefined,
        }))}
      />
      {rows.length > HUB_HEAD_ROWS ? <ShowMore open={open} onToggle={() => setOpen(!open)} /> : null}
      <p className="mt-3 text-xs text-muted-foreground">{t`Întreprinderile din lista ANAF, după autoritatea care le are în subordine; „inactive" sunt cele marcate așa în listă.`}</p>
    </>
  )
}

const SOURCE_LINK = 'font-medium text-foreground underline-offset-4 hover:underline'

/** The page's sources, once, each with its own date, and the day the figures were read. */
function SourceLine({ snapshot }: { readonly snapshot: PublicEnterpriseHubSnapshot }) {
  const { i18n } = useLingui()
  const s1001 = sourceOf(snapshot, 's1001')
  const amepip = sourceOf(snapshot, 'amepip')
  const listDate = formatDate(s1001ListDate(s1001?.sourceUrl ?? null), i18n.locale)
  const amepipDate = formatDate(amepip?.sourceLastModifiedAt ?? amepip?.observedAt ?? null, i18n.locale)
  const read = formatDate(snapshot.generatedAt, i18n.locale)
  return (
    <p className="text-sm text-muted-foreground">
      {t`Surse:`}{' '}
      <ExternalSource href={s1001?.sourceUrl ?? 'https://www.anaf.ro'}>{t`lista ANAF a întreprinderilor publice`}</ExternalSource>
      {listDate ? `, ${listDate}` : ''}
      {' · '}
      <ExternalSource href={amepip?.sourceUrl ?? 'https://amepip.gov.ro'}>{t`registrul AMEPIP`}</ExternalSource>
      {amepipDate ? `, ${amepipDate}` : ''}
      {' · '}
      {t`registrul comerțului și ${statementsSource(snapshot.financials.publishers)}`}
      {read ? ` · ${t`citite pe ${read}`}` : ''}
    </p>
  )
}

function ExternalSource({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={SOURCE_LINK}>
      {children}
      <span aria-hidden="true"> ↗</span>
    </a>
  )
}

function toBand(hash: string): HubFact['link'] {
  return function BandLink(label: ReactNode, className: string) {
    return (
      <a href={`#${hash}`} className={className}>
        {label}
      </a>
    )
  }
}

/** Four figures: the members, the local authorities' share, the active ones in ANAF's list, the loss-makers of the financial year. */
function Figures({ snapshot }: { readonly snapshot: PublicEnterpriseHubSnapshot }) {
  const { i18n } = useLingui()
  const n = (value: number) => formatCount(value, i18n.locale)
  const year = snapshot.financials.year
  const facts: HubFact[] = [
    { key: 'members', value: snapshot.members.current, digits: 0, label: t`Întreprinderi publice`, note: t`în lista ANAF sau în registrul AMEPIP`, link: toBand(HUB_RANKING_ID) },
    { key: 'local', value: snapshot.control.local, digits: 0, label: t`Ale autorităților locale`, note: t`${n(snapshot.control.central)} ale statului central`, link: toBand('control') },
    { key: 'active', value: s1001Count(snapshot, 'ACTIV'), digits: 0, label: t`Active în lista ANAF`, note: inactiveCount(s1001Count(snapshot, 'INACTIV'), i18n.locale), link: toBand('stare') },
    { key: 'loss', value: snapshot.financials.loss, digits: 0, label: t`Cu pierdere în ${year}`, note: t`din ${n(snapshot.financials.netReported)} cu rezultatul net admis`, link: toBand('marime') },
  ]
  return (
    <section className={cn('border-b bg-muted/20')} aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
      </RuledFrame>
    </section>
  )
}
