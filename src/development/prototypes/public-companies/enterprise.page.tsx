import { useEffect, useRef, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { CompanyBalanceTrend } from '@/features/private-companies/components/profile/company-balance-trend'
import { companyFigures } from '@/features/private-companies/components/profile/company-figures'
import { CopyCui } from '@/features/private-companies/components/profile/company-profile-head'
import { usePrivateCompanyProfile } from '@/features/private-companies/hooks/use-private-company-profile'
import { buildCompanyProfileModel, type CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import { yearRanges } from '@/features/private-companies/lib/company-profile-format'
import { companySentence, nameLength, statementPublisherLabel, statusText } from '@/features/private-companies/lib/company-profile-text'
import { BandColumns, BandNote, CaveatsMarker } from '@/features/public-enterprises/components/hub/hub-parts'
import { displayName, formatCount } from '@/features/public-enterprises/lib/hub-format'
import { HUB_BESIDE_TITLE_CLASS, HubLoadError, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { SEAP_SPAN, useEnterpriseRead, type EnterpriseRead } from './enterprise.data'
import { controlGroups, controlRows, displayValue, indicatorTables, rowValues, type ControlGroup, type ControlRow, type IndicatorTables } from './enterprise.model'
import {
  CompanyPageLink,
  ControlList,
  IndicatorTableView,
  Kicker,
  MoneyColumns,
  PeerList,
  SamplePicker,
  StatusChips,
  StatusTable,
  useEnterpriseCui,
} from './enterprise.parts'
import { authorityText, controlSentence, pageCaveats, sourceLabel, sourceLine, statusLede } from './enterprise.text'

/**
 * `/public-enterprises/$cui`, on the live API: one public enterprise in the
 * company page's rhythm — a compact head with its name, a sentence, a chip
 * per source's status and the CUI; the pinned bar; four figures; one band per
 * question. Three variants, one per question the head leads with: who
 * controls it, how the business goes, what it reports to AMEPIP. A variant's
 * head question has no band of its own, so no fact appears twice.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

type Variant = 'control' | 'afacerea' | 'fisa'
type BandKey = 'control' | 'aceeasi' | 'stare' | 'afacerea' | 'amepip' | 'bani'

const BANDS: Readonly<Record<Variant, readonly BandKey[]>> = {
  control: ['aceeasi', 'stare', 'afacerea', 'amepip', 'bani'],
  afacerea: ['control', 'stare', 'amepip', 'bani'],
  fisa: ['control', 'stare', 'afacerea', 'amepip', 'bani'],
}

const BAND_LABEL: Readonly<Record<BandKey, () => string>> = {
  control: () => t`Control`,
  aceeasi: () => t`Aceeași autoritate`,
  stare: () => t`Stare`,
  afacerea: () => t`Afacerea`,
  amepip: () => t`AMEPIP`,
  bani: () => t`Bani publici`,
}

/** The heading's scale by the name's length, as the company page sets it. */
const HEADING: Readonly<Record<ReturnType<typeof nameLength>, string>> = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
}

type PageData = {
  readonly cui: string
  readonly read: EnterpriseRead
  readonly model: CompanyProfileModel | null
  readonly rows: readonly ControlRow[]
  readonly groups: readonly ControlGroup[]
  readonly tables: IndicatorTables
  readonly locale: string
}

export function EnterpriseControl() {
  return <EnterprisePage variant="control" />
}

export function EnterpriseBusiness() {
  return <EnterprisePage variant="afacerea" />
}

export function EnterpriseReport() {
  return <EnterprisePage variant="fisa" />
}

function EnterprisePage({ variant }: { readonly variant: Variant }) {
  const { i18n } = useLingui()
  const cui = useEnterpriseCui()
  const read = useEnterpriseRead(cui)
  const company = usePrivateCompanyProfile(cui)
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, (block, delay) => countUpWithin(block, delay))
  useEffect(() => () => stopCounting(), [])

  let body: ReactNode
  if (read.isPending || company.isPending) {
    body = (
      <RuledFrame className="py-16">
        <HubPending rows={10} />
      </RuledFrame>
    )
  } else if (read.isError) {
    body = (
      <RuledFrame className="py-16">
        <HubLoadError onRetry={() => void read.refetch()} />
      </RuledFrame>
    )
  } else if (!read.data.profile) {
    body = (
      <RuledFrame className="py-16">
        <p className="max-w-[56ch] text-base text-muted-foreground">{t`CUI-ul ${cui} nu e în nicio listă a întreprinderilor publice.`}</p>
        <div className="mt-3">
          <CompanyPageLink cui={cui} />
        </div>
      </RuledFrame>
    )
  } else {
    const rows = controlRows(read.data)
    const data: PageData = {
      cui,
      read: read.data,
      model: company.data ? buildCompanyProfileModel(company.data) : null,
      rows,
      groups: controlGroups(rows),
      tables: indicatorTables(read.data.indicators),
      locale: i18n.locale,
    }
    body = <Loaded variant={variant} data={data} />
  }
  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background" data-prototype-marker={PROTOTYPE_MARKER}>
      <RevealStyles />
      <SmearFilters />
      <SamplePicker />
      {body}
    </div>
  )
}

function Loaded({ variant, data }: { readonly variant: Variant; readonly data: PageData }) {
  const bands = BANDS[variant].filter((band) => band !== 'aceeasi' || data.groups.some((group) => (group.rows[0]?.peers?.others.length ?? 0) > 0))
  const index = (band: BandKey) => `${String(bands.indexOf(band) + 1).padStart(2, '0')} / ${BAND_LABEL[band]()}`
  const name = displayName(data.model?.profile.legalName ?? data.read.profile?.organization?.name ?? data.cui)
  return (
    <>
      <Head data={data} name={name} beside={<Beside variant={variant} data={data} />} />
      <HomeSectionNav title={name} sections={bands.map((band) => ({ id: band, label: BAND_LABEL[band]() }))} />
      <Figures data={data} businessAnchor={bands.includes('afacerea') ? 'afacerea' : 'enterprise-head'} />
      {bands.map((band) => {
        switch (band) {
          case 'control':
            return <ControlBand key={band} data={data} index={index(band)} />
          case 'aceeasi':
            return <PeersBand key={band} data={data} index={index(band)} />
          case 'stare':
            return <StatusBand key={band} data={data} index={index(band)} />
          case 'afacerea':
            return <BusinessBand key={band} data={data} index={index(band)} />
          case 'amepip':
            return <AmepipBand key={band} data={data} index={index(band)} />
          case 'bani':
            return <MoneyBand key={band} data={data} index={index(band)} />
        }
      })}
    </>
  )
}

// ───────────────────────────────────────────────────────────── head ──

function Head({ data, name, beside }: { readonly data: PageData; readonly name: string; readonly beside: ReactNode }) {
  const { read, model, rows, tables, locale } = data
  const sentence = [model ? companySentence(model) : null, controlSentence(read, rows)].filter(Boolean).join(' ')
  const statements = model?.statementSources.map((source) => statementPublisherLabel(source.publisher)).join(t` și `) ?? null
  return (
    <section id="enterprise-head" className="relative scroll-mt-14 border-b" aria-labelledby="enterprise-title">
      <TwoLayerLattice idPrefix="public-enterprise" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <div className="flex min-h-11 items-center justify-between gap-4 sm:min-h-0">
              <Kicker county={model?.place.county ?? null} />
              <CaveatsMarker notes={pageCaveats(read, rows, tables)} />
            </div>
            <h1 id="enterprise-title" className={cn('mt-4 font-extrabold leading-[0.95] tracking-tighter text-foreground', HEADING[nameLength(name)])}>
              {name}
            </h1>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">{sentence}</p>
            <div className="mt-5">
              <StatusChips read={read} model={model} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
              <CopyCui cui={data.cui} />
              {model ? <CompanyPageLink cui={data.cui} /> : null}
            </div>
            <MonoLabel className="mt-6 block max-w-[70ch] normal-case leading-relaxed tracking-normal text-muted-foreground/80">
              {sourceLine(read, locale, statements)}
            </MonoLabel>
          </div>
          <div className="min-w-0 lg:col-span-5 lg:border-l lg:pl-8">{beside}</div>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** What the head shows beside the name: the variant's question. */
function Beside({ variant, data }: { readonly variant: Variant; readonly data: PageData }) {
  if (variant === 'afacerea') {
    const { model } = data
    const trend = model !== null && model.latest !== null && [...model.recent.turnover, ...model.recent.netResult, ...model.recent.employees].some((value) => value !== null)
    return trend ? <CompanyBalanceTrend model={model} /> : <BesideEmpty>{model ? t`Nicio situație financiară cu cifre admise.` : t`Fără fișă de firmă: nicio situație financiară.`}</BesideEmpty>
  }
  if (variant === 'fisa') return <ReportCard data={data} />
  return (
    <div>
      <MonoLabel className="block text-primary">{t`Cine o controlează`}</MonoLabel>
      <div className="mt-4">
        <ControlList groups={data.groups} read={data.read} locale={data.locale} compact />
      </div>
    </div>
  )
}

function BesideEmpty({ children }: { readonly children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

/** The newest year AMEPIP has a form for: a few of its answers, as written. Else its newest ratios. */
const CARD_KPIS = ['W_TE', 'GC_MEET', 'GC_IND', 'GC_GEI', 'GC_BEN', 'FIN-DP'] as const
const CARD_RATIOS = ['FIN-ROE', 'FIN-MNP', 'FIN-RLC', 'FIN-LEV'] as const

function ReportCard({ data }: { readonly data: PageData }) {
  const { form, calculated } = data.tables
  const table = form ?? calculated
  if (!table) return <BesideEmpty>{t`AMEPIP nu are indicatori pentru această întreprindere.`}</BesideEmpty>
  const year = table.years[table.years.length - 1]!
  const codes: readonly string[] = form ? CARD_KPIS : CARD_RATIOS
  const rows = codes.map((code) => table.rows.find((row) => row.code === code)).filter((row) => row !== undefined)
  return (
    <div>
      <MonoLabel className="block text-primary">{form ? t`Formularul AMEPIP, ${year}` : t`Indicatorii AMEPIP, ${year}`}</MonoLabel>
      <dl className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {rows.map((row) => {
          const value = rowValues(row, [year])[0] ?? null
          return (
            <div key={row.code} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 px-1 py-2.5">
              <dt className="text-sm text-foreground">{row.name}</dt>
              <dd className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">
                {value === null ? <span className="font-normal text-muted-foreground">—</span> : displayValue(row, value, data.locale)}
                {value !== null && row.unit ? <span className="ml-1 text-xs font-normal text-muted-foreground">{row.unit}</span> : null}
              </dd>
            </div>
          )
        })}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">{t`Valori cum le scrie AMEPIP; toate, în secțiunea AMEPIP.`}</p>
    </div>
  )
}

// ────────────────────────────────────────────────────────── figures ──

/** The company page's own figures (admitted values only), then what it buys through SEAP. */
function Figures({ data, businessAnchor }: { readonly data: PageData; readonly businessAnchor: string }) {
  const { model, read, locale } = data
  const company = model ? companyFigures(model, { business: businessAnchor, money: 'bani' }).filter((fact) => fact.key !== 'public') : []
  const facts: HubFact[] = [...company]
  // A zero is said in the public-money band; a figure here is something it did.
  if (read.seap.buyerDirect !== null && read.seap.buyerDirect > 0) {
    facts.push({
      key: 'buyer',
      value: read.seap.buyerDirect,
      digits: 0,
      label: t`Achiziții directe făcute, ${SEAP_SPAN.from}–${SEAP_SPAN.to}`,
      note: read.seap.buyerAwards !== null ? t`și ${formatCount(read.seap.buyerAwards, locale)} contracte atribuite prin proceduri` : null,
      link: (label, className) => (
        <a href="#bani" className={className}>
          {label}
        </a>
      ),
    })
  }
  if (facts.length === 0) return null
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <CruxMarks />
        <HubFiguresBand facts={facts.slice(0, 4)} locale={locale === 'en' ? 'en' : 'ro'} />
      </RuledFrame>
    </section>
  )
}

// ──────────────────────────────────────────────────────────── bands ──

function ControlBand({ data, index }: { readonly data: PageData; readonly index: string }) {
  const { rows, groups, read, locale } = data
  return (
    <HomeBand id="control" labelledBy="enterprise-control-title">
      <BandColumns titleId="enterprise-control-title" index={index} title={t`Cine o controlează`} lede={controlSentence(read, rows)}>
        {groups.length === 0 ? (
          <ControlList groups={groups} read={read} locale={locale} />
        ) : (
          <ul className="space-y-8">
            {groups.map((group) => (
              <li key={group.key}>
                <ControlList groups={[group]} read={read} locale={locale} />
                <PeerList row={group.rows[0]!} />
              </li>
            ))}
          </ul>
        )}
      </BandColumns>
    </HomeBand>
  )
}

/** The control variant's head names the authorities; this band lists what else each has in the lists. */
function PeersBand({ data, index }: { readonly data: PageData; readonly index: string }) {
  const groups = data.groups.filter((group) => (group.rows[0]?.peers?.others.length ?? 0) > 0)
  return (
    <HomeBand id="aceeasi" labelledBy="enterprise-peers-title">
      <BandColumns titleId="enterprise-peers-title" index={index} title={t`Aceeași autoritate`} lede={t`Celelalte întreprinderi pe care listele le dau aceleiași autorități.`}>
        <ul className="space-y-7">
          {groups.map((group) => (
            <li key={group.key}>
              <MonoLabel className="block text-muted-foreground">{group.rows.map((row) => sourceLabel(row.source)).join(' · ')}</MonoLabel>
              <p className="mt-1.5 text-base font-medium text-foreground">{authorityText(group.rows[0]!).name}</p>
              <PeerList row={group.rows[0]!} limit={24} />
            </li>
          ))}
        </ul>
      </BandColumns>
    </HomeBand>
  )
}

function StatusBand({ data, index }: { readonly data: PageData; readonly index: string }) {
  const { read, model, locale } = data
  return (
    <HomeBand id="stare" labelledBy="enterprise-status-title">
      <BandColumns titleId="enterprise-status-title" index={index} title={t`Ce spune fiecare sursă`} lede={statusLede(read, model ? statusText(model) : null)}>
        <StatusTable read={read} model={model} locale={locale} />
      </BandColumns>
    </HomeBand>
  )
}

function BusinessBand({ data, index }: { readonly data: PageData; readonly index: string }) {
  const { model, cui } = data
  const trend = model !== null && model.latest !== null && [...model.recent.turnover, ...model.recent.netResult, ...model.recent.employees].some((value) => value !== null)
  return (
    <HomeBand id="afacerea" labelledBy="enterprise-business-title">
      <BandColumns
        titleId="enterprise-business-title"
        index={index}
        title={t`Cum merge afacerea`}
        lede={model ? t`Ultimii cinci ani cu bilanț, cu cifrele admise pe pagina firmei; toate bilanțurile sunt acolo.` : t`Nu are fișă de firmă: nicio situație financiară.`}
      >
        {trend ? <CompanyBalanceTrend model={model} /> : <BesideEmpty>{t`Nicio situație financiară cu cifre admise.`}</BesideEmpty>}
        {model ? (
          <div className="mt-2">
            <CompanyPageLink cui={cui} />
          </div>
        ) : null}
      </BandColumns>
    </HomeBand>
  )
}

function AmepipBand({ data, index }: { readonly data: PageData; readonly index: string }) {
  const { tables, locale } = data
  const { calculated, form } = tables
  const lede = !calculated && !form ? t`AMEPIP nu are indicatori pentru această întreprindere.` : t`Indicatorii pe care AMEPIP îi publică pentru ea, cum sunt scriși: cei calculați din bilanț, apoi formularul raportat de întreprindere.`
  return (
    <HomeBand id="amepip" labelledBy="enterprise-amepip-title">
      <HubSectionHead titleId="enterprise-amepip-title" index={index} title={t`Ce raportează la AMEPIP`} lede={lede} />
      {calculated ? (
        <div className="mt-10" data-reveal>
          <MonoLabel className="block text-muted-foreground">{t`Indicatori calculați`}</MonoLabel>
          <div className="mt-3">
            <IndicatorTableView table={calculated} caption={t`Indicatorii calculați de AMEPIP, pe ani`} locale={locale} />
          </div>
        </div>
      ) : null}
      {form ? (
        <div className="mt-12" data-reveal>
          <MonoLabel className="block text-muted-foreground">{t`Formularul`}</MonoLabel>
          <div className="mt-1">
            <IndicatorTableView table={form} caption={t`Formularul AMEPIP, pe ani`} locale={locale} grouped />
          </div>
        </div>
      ) : null}
      {calculated ? <BandNote>{t`Ratele calculate sunt fracții în sursă, deși AMEPIP le notează „%”: sunt arătate ca procente, după ce le-am verificat pe bilanțuri.`}</BandNote> : null}
      {calculated || form ? <BandNote>{t`Un „%” în galben e cum îl scrie AMEPIP: nu se știe dacă valoarea e o fracție (0,5) sau un procent (50), deci nu e convertită.`}</BandNote> : null}
      {tables.withheldFormYears.length > 0 ? (
        <BandNote>{t`Pentru ${yearRanges(tables.withheldFormYears)}, AMEPIP nu are formular; cele trei valori pe care le are totuși (dividende, investiții, cercetare) nu sunt arătate.`}</BandNote>
      ) : null}
    </HomeBand>
  )
}

function MoneyBand({ data, index }: { readonly data: PageData; readonly index: string }) {
  const { read, cui, locale } = data
  return (
    <HomeBand id="bani" labelledBy="enterprise-money-title">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <HubSectionHead
            titleId="enterprise-money-title"
            index={index}
            title={t`Banii publici`}
            lede={t`Întreprinderea cumpără prin SEAP ca orice instituție și vinde instituțiilor ca orice firmă. Aici sunt numărate; sumele, pe paginile lor.`}
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <MoneyColumns cui={cui} seap={read.seap} locale={locale} />
        </div>
      </div>
    </HomeBand>
  )
}
