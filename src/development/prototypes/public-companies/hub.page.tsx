import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { msg, plural, t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Building2 } from 'lucide-react'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { LandingSearch } from '@/features/landing/components/search/landing-search'
import { HomeBand, HomeSectionNav, SHOW_MORE_CLASS } from '@/features/procurement/components/home/home-chrome'
import { HubCountyBand, type HubCountyBandDefinition } from '@/features/statistics/components/hub/hub-county-band'
import { HUB_BESIDE_TITLE_CLASS, HUB_SHORTCUT_LINK_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import {
  CENTRAL_KINDS,
  HUB,
  NO_COUNTY,
  companyHref,
  count,
  countyLayer,
  enterprises,
  entityHref,
  kindLabel,
  lei,
  nameOf,
  sectorRows,
  type AuthorityRow,
  type CountyMeasure,
  type EnterpriseRow,
} from './hub.model'
import { BandNote, CaveatsMarker, RankedRows, SourceLine, type RankedRow } from './hub.parts'
import { useHubState, type HubState } from './hub.state'

/**
 * The public enterprises' front door, in the procurement, INS, NGO and
 * national-budget hubs' language: the lattice head with what the page is as
 * the headline, the search and the shortcuts, a ranked panel beside them; the
 * pinned bar; four figures; one band per question. Three variants, one per
 * question the head leads with: who controls them, how large they are, where
 * they are. A variant's hero question has no band of its own, so no fact
 * appears twice.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

type Variant = 'control' | 'marime' | 'judete'
type BandKey = 'control' | 'judete' | 'domenii' | 'marime' | 'stare' | 'bani'

const BANDS: Readonly<Record<Variant, readonly BandKey[]>> = {
  control: ['control', 'judete', 'domenii', 'marime', 'stare', 'bani'],
  marime: ['control', 'judete', 'domenii', 'stare', 'bani'],
  judete: ['judete', 'control', 'domenii', 'marime', 'stare', 'bani'],
}

const BAND_LABEL = {
  control: msg`Cine le controlează`,
  judete: msg`Pe județe`,
  domenii: msg`Ce fac`,
  marime: msg`Cât de mari`,
  stare: msg`În ce stare`,
  bani: msg`Bani publici`,
} as const

const HERO_ID = 'clasament'
const HERO_ROWS = 5
const HERO_ROWS_OPEN = 10
const BAND_ROWS = 8

export function ControlHub() {
  return <Hub variant="control" />
}

export function SizeHub() {
  return <Hub variant="marime" />
}

export function PlacesHub() {
  return <Hub variant="judete" />
}

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

function Hub({ variant }: { readonly variant: Variant }) {
  const { i18n } = useLingui()
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, startArrivalEffects, true)
  useEffect(() => () => stopCounting(), [])
  const { state, set } = useHubState()
  const bands = BANDS[variant]
  const sections = bands.map((key) => ({ id: key, label: i18n._(BAND_LABEL[key]) }))
  const indexOf = (key: BandKey) => `${String(bands.indexOf(key) + 1).padStart(2, '0')} / ${i18n._(BAND_LABEL[key])}`
  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RevealStyles />
      <SmearFilters />
      <Hero variant={variant} state={state} set={set} />
      <HomeSectionNav title={t`Întreprinderi publice`} sections={sections} />
      <Figures variant={variant} />
      {bands.map((key) => {
        const index = indexOf(key)
        switch (key) {
          case 'control':
            return <ControlBand key={key} index={index} kindsOnly={variant === 'control'} state={state} set={set} />
          case 'judete':
            return <CountiesBand key={key} index={index} list={variant !== 'judete'} measure={state.judete} onMeasure={(judete) => set({ judete })} />
          case 'domenii':
            return <SectorsBand key={key} index={index} measure={state.domenii} onMeasure={(domenii) => set({ domenii })} />
          case 'marime':
            return <SizeBand key={key} index={index} measure={state.marime} onMeasure={(marime) => set({ marime })} />
          case 'stare':
            return <StatusBand key={key} index={index} />
          case 'bani':
            return <MoneyBand key={key} index={index} />
        }
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the head ──

function EnterpriseSearch() {
  const isMobile = useIsMobile()
  return (
    <LandingSearch
      docTypes={['public_enterprise']}
      fixedScope={{ label: t`Întreprinderi`, Icon: Building2 }}
      placeholder={t`Întreprindere publică sau CUI…`}
      autoFocus={!isMobile}
      scrollToTopOnFocus={isMobile}
      hrefOf={(hit) => {
        const cui = /^\/intreprinderi-publice\/(\d+)/.exec(hit.href)?.[1]
        return cui ? companyHref(cui) : null
      }}
    />
  )
}

function headline(variant: Variant): readonly [string, string] {
  switch (variant) {
    case 'control':
      return [t`Firmele statului`, t`și ale primăriilor`]
    case 'marime':
      return [t`Firmele statului,`, t`de la mic la mare`]
    case 'judete':
      return [t`Firmele statului,`, t`județ cu județ`]
  }
}

function lede(variant: Variant): string {
  const members = enterprises(HUB.members.current)
  switch (variant) {
    case 'control':
      return t`${members} publice: cine le controlează, ce fac și cum le merge.`
    case 'marime':
      return t`${members} publice, de la Hidroelectrica la regiile comunelor: cât vând, câți oameni au și cine le controlează.`
    case 'judete':
      return t`${members} publice: unde își au sediul, cine le controlează și ce fac.`
  }
}

function Hero({ variant, state, set }: { readonly variant: Variant; readonly state: HubState; readonly set: (patch: Partial<HubState>) => void }) {
  const [first, second] = headline(variant)
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="public-enterprises-hub" />
      <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <div className="flex items-center justify-between gap-4">
              <MonoLabel className="text-muted-foreground">{t`Întreprinderi publice / România`}</MonoLabel>
              <CaveatsMarker />
            </div>
            <h1 className="mt-5 text-[clamp(2.2rem,8vw+0.6rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
              {first}
              <br />
              {second}
            </h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">{lede(variant)}</p>
            <div className="mt-6 sm:mt-7">
              <EnterpriseSearch />
            </div>
            <nav aria-label={t`Scurtături`} className="mt-4">
              <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">{t`Sau mergi direct la`}</MonoLabel>
              <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                <a href="#control" className={HUB_SHORTCUT_LINK_CLASS}>
                  {t`Autoritățile`}
                </a>
                <a href="#judete" className={HUB_SHORTCUT_LINK_CLASS}>
                  {t`Județele`}
                </a>
                <a href="/companies" className={HUB_SHORTCUT_LINK_CLASS}>
                  {t`Toate firmele`}
                </a>
              </span>
            </nav>
          </div>
          <div className="min-w-0 lg:col-span-5">
            <section id={HERO_ID} className="scroll-mt-16 border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="public-enterprises-hero-title">
              {variant === 'control' ? <HeroAuthorities state={state} set={set} /> : variant === 'marime' ? <HeroLargest state={state} set={set} /> : <HeroCounties state={state} set={set} />}
            </section>
          </div>
          <SourceLine className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6" />
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

function ShowMore({ open, onToggle, all }: { readonly open: boolean; readonly onToggle: () => void; readonly all?: string }) {
  return (
    <button type="button" onClick={onToggle} className={SHOW_MORE_CLASS} aria-expanded={open}>
      {open ? t`Arată mai puține` : (all ?? t`Arată mai multe`)}
    </button>
  )
}

function authorityRows(rows: readonly AuthorityRow[], locale: string, limit: number): readonly RankedRow[] {
  const top = rows[0]?.enterprises ?? 1
  return rows.slice(0, limit).map((row) => ({
    key: row.cui,
    label: nameOf(row.name),
    title: row.name ?? undefined,
    caption: [row.level === 'local' && row.county ? nameOf(row.county) : null, row.inactive > 0 ? plural(row.inactive, { one: '# inactivă', other: '# inactive' }) : null].filter(Boolean).join(' · ') || undefined,
    value: count(row.enterprises, locale),
    fraction: row.enterprises / top,
    href: row.hasBudget ? entityHref(row.cui) : undefined,
  }))
}

const AUTHORITY_GROUP: Readonly<Record<HubState['autoritati'], keyof typeof HUB.control.ranking>> = { stat: 'central', judete: 'county', local: 'local' }

function AuthorityToggle({ value, onChange }: { readonly value: HubState['autoritati']; readonly onChange: (value: HubState['autoritati']) => void }) {
  return (
    <IndicatorToggle
      label={t`Autoritățile`}
      options={[
        { key: 'stat', label: t`Statul` },
        { key: 'judete', label: t`Județele` },
        { key: 'local', label: t`Localități` },
      ]}
      value={value}
      onChange={onChange}
    />
  )
}

/** Who controls the most enterprises, as ANAF's list names them: the state's ministries and agencies, the county councils, the cities and communes. */
function HeroAuthorities({ state, set }: { readonly state: HubState; readonly set: (patch: Partial<HubState>) => void }) {
  const { i18n } = useLingui()
  const [open, setOpen] = useState(false)
  const rows = HUB.control.ranking[AUTHORITY_GROUP[state.autoritati]]
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <MonoLabel id="public-enterprises-hero-title" className="text-primary">
          {t`Cine controlează cele mai multe`}
        </MonoLabel>
        <AuthorityToggle value={state.autoritati} onChange={(autoritati) => set({ autoritati })} />
      </div>
      <RankedRows numbered dense className="mt-4" rows={authorityRows(rows, i18n.locale, open ? HERO_ROWS_OPEN : HERO_ROWS)} />
      <ShowMore open={open} onToggle={() => setOpen(!open)} />
      <p className="mt-3 text-xs text-muted-foreground">{t`Întreprinderile din lista ANAF, după autoritatea care le are în subordine.`}</p>
    </>
  )
}

function largest(measure: HubState['marime']): readonly EnterpriseRow[] {
  return measure === 'salariati' ? HUB.financials.largest.employees : measure === 'pierdere' ? HUB.financials.largest.loss : HUB.financials.largest.turnover
}

function enterpriseRows(rows: readonly EnterpriseRow[], measure: HubState['marime'], locale: string, limit: number): readonly RankedRow[] {
  const top = Number(rows[0]?.value ?? 1)
  return rows.slice(0, limit).map((row) => ({
    key: row.cui,
    label: nameOf(row.name),
    title: row.name ?? undefined,
    caption: row.authority ? nameOf(row.authority) : undefined,
    value: measure === 'salariati' ? count(Number(row.value), locale) : lei(row.value, locale),
    fraction: Number(row.value) / top,
    href: companyHref(row.cui),
  }))
}

function SizeToggle({ value, onChange }: { readonly value: HubState['marime']; readonly onChange: (value: HubState['marime']) => void }) {
  return (
    <IndicatorToggle
      label={t`Măsura`}
      options={[
        { key: 'cifra', label: t`Cifra de afaceri` },
        { key: 'salariati', label: t`Salariați` },
        { key: 'pierdere', label: t`Pierdere` },
      ]}
      value={value}
      onChange={onChange}
    />
  )
}

function sizeTitle(measure: HubState['marime'], year: number): string {
  if (measure === 'salariati') return t`Cei mai mulți salariați, ${year}`
  if (measure === 'pierdere') return t`Cea mai mare pierdere, ${year}`
  return t`Cea mai mare cifră de afaceri, ${year}`
}

/** The largest enterprises in the last complete year, by what their filed accounts say. */
function HeroLargest({ state, set }: { readonly state: HubState; readonly set: (patch: Partial<HubState>) => void }) {
  const { i18n } = useLingui()
  const [open, setOpen] = useState(false)
  const year = HUB.financials.year
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <MonoLabel id="public-enterprises-hero-title" className="text-primary">
          {sizeTitle(state.marime, year)}
        </MonoLabel>
        <SizeToggle value={state.marime} onChange={(marime) => set({ marime })} />
      </div>
      <RankedRows numbered dense className="mt-4" rows={enterpriseRows(largest(state.marime), state.marime, i18n.locale, open ? HERO_ROWS_OPEN : HERO_ROWS)} />
      <ShowMore open={open} onToggle={() => setOpen(!open)} />
      <p className="mt-3 text-xs text-muted-foreground">{t`Bilanțurile depuse la ANAF pentru ${year}; sub nume, autoritatea din lista ANAF.`}</p>
    </>
  )
}

function CountyToggle({ value, onChange, label }: { readonly value: CountyMeasure; readonly onChange: (value: CountyMeasure) => void; readonly label: string }) {
  return (
    <IndicatorToggle
      label={label}
      options={[
        { key: 'toate', label: t`Toate` },
        { key: 'locale', label: t`Locale` },
        { key: 'centrale', label: t`Ale statului` },
      ]}
      value={value}
      onChange={onChange}
    />
  )
}

/** The counties with the most enterprises, by the seat the trade registry gives. */
function HeroCounties({ state, set }: { readonly state: HubState; readonly set: (patch: Partial<HubState>) => void }) {
  const { i18n } = useLingui()
  const [open, setOpen] = useState(false)
  const values = [...countyLayer(state.judete).values].sort((a, b) => b.value - a.value)
  const top = values[0]?.value ?? 1
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <MonoLabel id="public-enterprises-hero-title" className="text-primary">
          {t`Unde sunt cele mai multe`}
        </MonoLabel>
        <CountyToggle label={t`Întreprinderile`} value={state.judete} onChange={(judete) => set({ judete })} />
      </div>
      <RankedRows
        numbered
        dense
        className="mt-4"
        rows={values.slice(0, open ? HERO_ROWS_OPEN : HERO_ROWS).map((county) => ({ key: county.code, label: county.name, value: count(county.value, i18n.locale), fraction: county.value / top }))}
      />
      <ShowMore open={open} onToggle={() => setOpen(!open)} />
      <p className="mt-3 text-xs text-muted-foreground">{t`După sediul din registrul comerțului.`}</p>
    </>
  )
}

// ───────────────────────────────────────────────────────── the figures ──

function toHash(hash: string): HubFact['link'] {
  return function HashLink(label: ReactNode, className: string) {
    return (
      <a href={`#${hash}`} className={className}>
        {label}
      </a>
    )
  }
}

function Figures({ variant }: { readonly variant: Variant }) {
  const { i18n } = useLingui()
  const n = (value: number) => count(value, i18n.locale)
  const active = HUB.status.s1001.find((row) => row.status === 'ACTIV')?.enterprises ?? 0
  const inactive = HUB.status.s1001.find((row) => row.status === 'INACTIV')?.enterprises ?? 0
  const year = HUB.financials.year
  const facts: HubFact[] = [
    { key: 'members', value: HUB.members.current, digits: 0, label: t`Întreprinderi publice`, note: t`în lista ANAF sau în registrul AMEPIP`, link: toHash(variant === 'control' ? HERO_ID : 'control') },
    { key: 'local', value: HUB.control.local, digits: 0, label: t`Ale autorităților locale`, note: t`${n(HUB.control.central)} ale statului central`, link: toHash('control') },
    { key: 'active', value: active, digits: 0, label: t`Active în lista ANAF`, note: t`${n(inactive)} inactive`, link: toHash('stare') },
    { key: 'loss', value: HUB.financials.loss, digits: 0, label: t`Cu pierdere în ${year}`, note: t`din ${n(HUB.financials.filed)} cu bilanț pe ${year}`, link: toHash(variant === 'marime' ? HERO_ID : 'marime') },
  ]
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
      </RuledFrame>
    </section>
  )
}

// ──────────────────────────────────────────────────────────── the bands ──

function BandGrid({ titleId, index, title, lede, children }: { readonly titleId: string; readonly index: string; readonly title: ReactNode; readonly lede: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <HubSectionHead titleId={titleId} index={index} title={title} lede={lede} />
      </div>
      <div className={cn('min-w-0 lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
        {children}
      </div>
    </div>
  )
}

const percent = (part: number, whole: number, locale: string) => new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ro-RO', { style: 'percent', maximumFractionDigits: 0 }).format(whole > 0 ? part / whole : 0)

/** Who controls them: by the kind of authority (the authority's own budget record), or the authorities themselves. */
function ControlBand({ index, kindsOnly, state, set }: { readonly index: string; readonly kindsOnly: boolean; readonly state: HubState; readonly set: (patch: Partial<HubState>) => void }) {
  const { i18n } = useLingui()
  const n = (value: number) => count(value, i18n.locale)
  const titleId = 'public-enterprises-control-title'
  const listed = HUB.control.central + HUB.control.local
  const topCentral = HUB.control.ranking.central[0]
  const view = kindsOnly ? 'tipuri' : state.control
  const kinds = [...HUB.control.kinds].sort((a, b) => b.enterprises - a.enterprises)
  const topKind = kinds[0]?.enterprises ?? 1
  const groups = useMemo(() => (view === 'autoritati' ? authorityRows(HUB.control.ranking[AUTHORITY_GROUP[state.autoritati]], i18n.locale, BAND_ROWS) : []), [view, state.autoritati, i18n.locale])
  return (
    <HomeBand id="control" labelledBy={titleId}>
      <BandGrid
        titleId={titleId}
        index={index}
        title={
          <>
            {t`Cine le`}
            <br />
            {t`controlează`}
          </>
        }
        lede={
          <>
            {t`Consiliile locale și județene au în subordine ${enterprises(HUB.control.local)}, ministerele și agențiile ${n(HUB.control.central)}.`}{' '}
            {topCentral ? t`${nameOf(topCentral.name)} are cele mai multe: ${n(topCentral.enterprises)}.` : null}
          </>
        }
      >
        {kindsOnly ? null : (
          <div className="mb-5 flex flex-wrap gap-3">
            <IndicatorToggle
              label={t`Vezi`}
              options={[
                { key: 'tipuri', label: t`Pe tipuri` },
                { key: 'autoritati', label: t`Autoritățile` },
              ]}
              value={state.control}
              onChange={(control) => set({ control })}
            />
            {view === 'autoritati' ? <AuthorityToggle value={state.autoritati} onChange={(autoritati) => set({ autoritati })} /> : null}
          </div>
        )}
        {view === 'tipuri' ? (
          <RankedRows
            rows={kinds.map((row) => ({
              key: row.kind,
              label: kindLabel(row.kind, row.enterprises),
              caption: `${CENTRAL_KINDS.includes(row.kind) ? t`stat` : row.kind === 'unresolved' ? t`central sau local` : t`local`} · ${percent(row.enterprises, listed, i18n.locale)}`,
              value: n(row.enterprises),
              fraction: row.enterprises / topKind,
            }))}
          />
        ) : (
          <RankedRows numbered rows={groups} />
        )}
        <BandNote>
          {t`Din cele ${n(listed)} din lista ANAF. Tipul autorității e cel din fișa ei din buget, nu din nume.`}{' '}
          {HUB.control.noS1001 > 0 ? t`${n(HUB.control.noS1001)} membri nu sunt în listă.` : null}
        </BandNote>
      </BandGrid>
    </HomeBand>
  )
}

/** Where they are: the enterprises by the county of their seat, on the hubs' county band. */
function CountiesBand({ index, list, measure, onMeasure }: { readonly index: string; readonly list: boolean; readonly measure: CountyMeasure; readonly onMeasure: (measure: CountyMeasure) => void }) {
  const { i18n } = useLingui()
  const n = (value: number) => count(value, i18n.locale)
  const titleId = 'public-enterprises-counties-title'
  const layer = useMemo(() => countyLayer(measure), [measure])
  const ranked = [...layer.values].sort((a, b) => b.value - a.value)
  const [first, second, third] = ranked
  const definition = useMemo<HubCountyBandDefinition>(
    () => ({
      legend: measure === 'locale' ? i18n._(msg`Întreprinderi ale autorităților locale, după sediu`) : measure === 'centrale' ? i18n._(msg`Întreprinderi ale statului central, după sediu`) : i18n._(msg`Întreprinderi publice, după sediu`),
      unit: i18n._(msg`întreprinderi`),
      countUnit: (value: number) => plural(value, { one: 'întreprindere', few: 'întreprinderi', other: 'de întreprinderi' }),
      digits: 0,
      ramp: 'steps',
      caveat: NO_COUNTY > 0 ? plural(NO_COUNTY, { one: 'O întreprindere nu are județ în registrul comerțului.', few: '# întreprinderi nu au județ în registrul comerțului.', other: '# de întreprinderi nu au județ în registrul comerțului.' }) : i18n._(msg`După sediul din registrul comerțului.`),
      source: null,
    }),
    [measure, i18n],
  )
  return (
    <HomeBand id="judete" labelledBy={titleId}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <HubSectionHead
            titleId={titleId}
            index={index}
            title={
              <>
                {t`Unde își au`}
                <br />
                {t`sediul`}
              </>
            }
            lede={first && second && third ? t`Cele mai multe sunt în ${first.name}: ${n(first.value)}. Urmează ${second.name} (${n(second.value)}) și ${third.name} (${n(third.value)}).` : null}
          />
        </div>
        <div className="lg:col-span-5 lg:justify-self-end">
          <CountyToggle label={t`Întreprinderile`} value={measure} onChange={onMeasure} />
        </div>
      </div>
      <div className="mt-8" data-reveal>
        <HubCountyBand key={layer.code} layer={layer} definition={definition} countyLink={null} list={list} />
      </div>
    </HomeBand>
  )
}

/** What they do: the main activity they declared to ANAF, by CAEN division. */
function SectorsBand({ index, measure, onMeasure }: { readonly index: string; readonly measure: CountyMeasure; readonly onMeasure: (measure: CountyMeasure) => void }) {
  const { i18n } = useLingui()
  const n = (value: number) => count(value, i18n.locale)
  const [open, setOpen] = useState(false)
  const titleId = 'public-enterprises-sectors-title'
  const pick = (row: { total: number; local: number; central: number }) => (measure === 'locale' ? row.local : measure === 'centrale' ? row.central : row.total)
  const rows = sectorRows()
    .filter((row) => row.division !== null && pick(row) > 0)
    .sort((a, b) => pick(b) - pick(a))
  const whole = HUB.members.current
  const top = rows[0] ? pick(rows[0]) : 1
  const [first, second, third] = sectorRows().filter((row) => row.division !== null)
  const unknown = sectorRows().find((row) => row.division === null)?.total ?? 0
  return (
    <HomeBand id="domenii" labelledBy={titleId}>
      <BandGrid
        titleId={titleId}
        index={index}
        title={
          <>
            {t`Ce`}
            <br />
            {t`fac`}
          </>
        }
        lede={
          first && second && third
            ? t`${first.label}: ${n(first.total)}, ${percent(first.total, whole, i18n.locale)} din ele. Urmează ${second.label.toLocaleLowerCase('ro-RO')} (${n(second.total)}) și ${third.label.toLocaleLowerCase('ro-RO')} (${n(third.total)}).`
            : null
        }
      >
        <div className="mb-5 sm:w-fit">
          <CountyToggle label={t`Întreprinderile`} value={measure} onChange={onMeasure} />
        </div>
        <RankedRows
          rows={(open ? rows : rows.slice(0, BAND_ROWS)).map((row) => ({
            key: row.division ?? 'none',
            label: row.label,
            caption: `CAEN ${row.division} · ${percent(pick(row), whole, i18n.locale)}`,
            value: n(pick(row)),
            fraction: pick(row) / top,
          }))}
        />
        {rows.length > BAND_ROWS ? <ShowMore open={open} onToggle={() => setOpen(!open)} all={t`Toate cele ${n(rows.length)} de domenii`} /> : null}
        <BandNote>{t`Activitatea principală declarată la ANAF, pe diviziuni CAEN; ANAF nu spune revizia codului. ${n(unknown)} nu au cod.`}</BandNote>
      </BandGrid>
    </HomeBand>
  )
}

/** How large they are: the last complete year's turnover, headcount and loss, by their filed accounts. */
function SizeBand({ index, measure, onMeasure }: { readonly index: string; readonly measure: HubState['marime']; readonly onMeasure: (measure: HubState['marime']) => void }) {
  const { i18n } = useLingui()
  const n = (value: number) => count(value, i18n.locale)
  const [open, setOpen] = useState(false)
  const titleId = 'public-enterprises-size-title'
  const year = HUB.financials.year
  const leader = HUB.financials.largest.turnover[0]
  return (
    <HomeBand id="marime" labelledBy={titleId}>
      <BandGrid
        titleId={titleId}
        index={index}
        title={
          <>
            {t`Cât de`}
            <br />
            {t`mari sunt`}
          </>
        }
        lede={
          <>
            {leader ? t`${nameOf(leader.name)} a avut cea mai mare cifră de afaceri în ${year}: ${lei(leader.value, i18n.locale)}.` : null}{' '}
            {t`${n(HUB.financials.loss)} din cele ${n(HUB.financials.filed)} cu bilanț pe ${year} au încheiat anul cu pierdere.`}
          </>
        }
      >
        <div className="mb-5 sm:w-fit">
          <SizeToggle value={measure} onChange={onMeasure} />
        </div>
        <RankedRows numbered rows={enterpriseRows(largest(measure), measure, i18n.locale, open ? 20 : BAND_ROWS)} />
        <ShowMore open={open} onToggle={() => setOpen(!open)} />
        <BandNote>{t`Bilanțurile depuse la ANAF pentru ${year}; ${year + 1} nu e încă complet. Sub nume, autoritatea din lista ANAF.`}</BandNote>
      </BandGrid>
    </HomeBand>
  )
}

const s1001Label = (status: string | null) => (status === 'ACTIV' ? t`Activă` : status === 'INACTIV' ? t`Inactivă` : t`Nu e în listă`)
const statusLabel = (status: string | null) => {
  if (status === null) return t`Fără stare în sursă`
  if (/^\d+$/.test(status)) return t`Cod ${status}, fără nume`
  return status.charAt(0).toLocaleUpperCase('ro-RO') + status.slice(1)
}

function StatusGroup({ title, rows, locale }: { readonly title: string; readonly rows: readonly { readonly label: string; readonly value: number }[]; readonly locale: string }) {
  const top = Math.max(...rows.map((row) => row.value), 1)
  return (
    <div>
      <MonoLabel className="block text-muted-foreground">{title}</MonoLabel>
      <RankedRows dense className="mt-2" rows={rows.map((row) => ({ key: row.label, label: row.label, value: count(row.value, locale), fraction: row.value / top }))} />
    </div>
  )
}

/** The state they are in, as each source says it; never merged into one status. */
function StatusBand({ index }: { readonly index: string }) {
  const { i18n } = useLingui()
  const n = (value: number) => count(value, i18n.locale)
  const titleId = 'public-enterprises-status-title'
  const active = HUB.status.s1001.find((row) => row.status === 'ACTIV')?.enterprises ?? 0
  const inactive = HUB.status.s1001.find((row) => row.status === 'INACTIV')?.enterprises ?? 0
  const year = HUB.financials.year
  return (
    <HomeBand id="stare" labelledBy={titleId}>
      <BandGrid
        titleId={titleId}
        index={index}
        title={
          <>
            {t`În ce stare`}
            <br />
            {t`sunt`}
          </>
        }
        lede={t`În lista ANAF, ${n(active)} sunt active și ${n(inactive)} inactive. Celelalte registre nu spun mereu la fel: ${n(HUB.status.crossings.radiatedButS1001Active)} radiate din registrul comerțului sunt active în listă.`}
      >
        <div className="grid gap-8">
          <StatusGroup title={t`Lista ANAF`} locale={i18n.locale} rows={HUB.status.s1001.map((row) => ({ label: s1001Label(row.status), value: row.enterprises }))} />
          <StatusGroup title={t`Registrul comerțului`} locale={i18n.locale} rows={HUB.status.onrc.map((row) => ({ label: statusLabel(row.status), value: row.enterprises }))} />
          <StatusGroup
            title={t`AMEPIP, ${year}`}
            locale={i18n.locale}
            rows={HUB.status.amepip.slice(0, 6).map((row) => ({ label: statusLabel(row.status), value: row.enterprises }))}
          />
        </div>
        <BandNote>{t`Fiecare stare cu sursa ei. ANAF declară inactive fiscal ${n(HUB.status.anafInactive)} dintre ele, ${n(HUB.status.crossings.fiscallyInactiveButS1001Active)} fiind active în lista ANAF.`}</BandNote>
      </BandGrid>
    </HomeBand>
  )
}

/** Their link to public money: as buyers and sellers in SEAP, and their authorities' budgets. Counts, never sums. */
function MoneyBand({ index }: { readonly index: string }) {
  const { i18n } = useLingui()
  const n = (value: number) => count(value, i18n.locale)
  const titleId = 'public-enterprises-money-title'
  const procurement = HUB.procurement
  const from = procurement.from.slice(0, 4)
  const to = procurement.to.slice(0, 4)
  const whole = HUB.members.current
  const rows: readonly RankedRow[] = [
    { key: 'buyer-direct', label: t`Cumpără prin achiziții directe`, caption: percent(procurement.buyerDirect, whole, i18n.locale), value: n(procurement.buyerDirect), fraction: procurement.buyerDirect / whole },
    { key: 'buyer-awards', label: t`Atribuie contracte prin licitație`, caption: percent(procurement.buyerAwards, whole, i18n.locale), value: n(procurement.buyerAwards), fraction: procurement.buyerAwards / whole },
    { key: 'sellers', label: t`Vând instituțiilor prin achiziții directe`, caption: percent(procurement.sellers, whole, i18n.locale), value: n(procurement.sellers), fraction: procurement.sellers / whole },
  ]
  return (
    <HomeBand id="bani" labelledBy={titleId}>
      <BandGrid
        titleId={titleId}
        index={index}
        title={
          <>
            {t`Banii`}
            <br />
            {t`publici`}
          </>
        }
        lede={t`${n(procurement.buyers)} cumpără prin SEAP și ${n(procurement.sellers)} vând instituțiilor. Pe pagina fiecărei firme, cât și de la cine.`}
      >
        <RankedRows rows={rows} />
        <BandNote>
          {t`Întreprinderi cu cel puțin o înregistrare în SEAP, ${from}–${to}, din ${n(whole)}. Achizițiile sunt atribuiri, nu plăți.`}{' '}
          {t`Din cele ${n(HUB.control.s1001Authorities)} de autorități din lista ANAF, ${n(HUB.control.s1001AuthoritiesWithBudget)} au bugetul în platformă, cu pagina lor.`}
        </BandNote>
      </BandGrid>
    </HomeBand>
  )
}
