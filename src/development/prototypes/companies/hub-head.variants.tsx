import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CompanyHubHero, CompanyLeadersFrame } from '@/features/private-companies/components/hub/company-hub-hero'
import { LEADERS_MORE_CLASS, companyHubSections } from '@/features/private-companies/components/hub/company-hub-sections'
import { HubLeaders } from '@/features/private-companies/components/hub/hub-leaders'
import { HubSearch } from '@/features/private-companies/components/hub/hub-search'
import { STATUS_ACTIVE } from '@/features/private-companies/lib/company-status-codes'
import { hubCompaniesSearch } from '@/features/private-companies/lib/hub-analysis-links'
import { countyName } from '@/features/private-companies/lib/hub-counties'
import { formatHubMonth, formatHubValue } from '@/features/private-companies/lib/hub-format'
import { COMPANY_HUB_SNAPSHOT } from '@/features/private-companies/lib/hub-snapshot'
import type { HubLeader } from '@/features/private-companies/lib/hub-snapshot-types'
import { HomeSectionNav } from '@/features/procurement/components/home/home-section-nav'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'

/**
 * The companies hub's head with less in it (owner, 25 November 2026: the
 * head's card is too tall and says too much). Each variant is the real head
 * (`CompanyHubHero`: title, description, search, shortcuts) with a
 * different right-hand side, over the pinned bar and the four figures, so the
 * fold shows what each one buys. The figures are the page's own snapshot.
 * The head's sources line, drawn here when the variants were compared, left
 * the page's head later the same day, and these with it.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

const SNAPSHOT = COMPANY_HUB_SNAPSHOT
const YEAR = SNAPSHOT.fiscalYear
type Ranking = 'cifra-de-afaceri' | 'salariati'

const leadersOf = (ranking: Ranking): readonly HubLeader[] => (ranking === 'salariati' ? SNAPSHOT.leaders.employees : SNAPSHOT.leaders.turnover)
const unitOf = (ranking: Ranking) => (ranking === 'salariati' ? ('persons' as const) : ('lei' as const))
const allCompanies = (ranking: Ranking) => hubCompaniesSearch(YEAR, {}, ranking === 'salariati' ? 'EMPLOYEES' : 'TURNOVER')

function RankingToggle({ value, onChange }: { readonly value: Ranking; readonly onChange: (key: Ranking) => void }) {
  return (
    <IndicatorToggle
      label={t`Clasamentul după`}
      options={[
        { key: 'cifra-de-afaceri', label: t`Cifra de afaceri` },
        { key: 'salariati', label: t`Salariați` },
      ]}
      value={value}
      onChange={onChange}
    />
  )
}

function Figure({ leader, ranking }: { readonly leader: HubLeader; readonly ranking: Ranking }) {
  const figure = formatHubValue(leader.value, unitOf(ranking))
  return (
    <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
      {figure.value}
      {ranking === 'salariati' ? null : <span className="ml-1 font-normal text-muted-foreground">{figure.unit}</span>}
    </span>
  )
}

/** The four figures as the page draws them; here they lead nowhere. */
function Figures() {
  const { national } = SNAPSHOT
  const month = formatHubMonth(SNAPSHOT.registryPeriod)
  const plain = (label: ReactNode) => <span>{label}</span>
  const facts: readonly HubFact[] = [
    { key: 'active', value: national.activeFirms, digits: 0, label: <Trans>Firme în funcțiune</Trans>, note: <Trans>În registrul comerțului, {month}</Trans>, link: plain },
    { key: 'new', value: national.newFirms, digits: 0, label: <Trans>Firme noi</Trans>, note: <Trans>Înregistrate la ONRC în {YEAR}</Trans>, link: plain },
    {
      key: 'turnover',
      value: Math.round(national.turnover / 100_000_000) / 10,
      digits: 1,
      unit: t`mld. lei`,
      label: <Trans>Cifra de afaceri</Trans>,
      note: plural(national.statements, { one: `Dintr-un bilanț pe ${YEAR}`, few: `Din # bilanțuri pe ${YEAR}`, other: `Din # de bilanțuri pe ${YEAR}` }),
      link: plain,
    },
    { key: 'employees', value: national.employees, digits: 0, label: <Trans>Salariați</Trans>, note: <Trans>Numărul mediu, din aceleași bilanțuri</Trans>, link: plain },
  ]
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <HubFiguresBand facts={facts} locale="ro" />
      </RuledFrame>
    </section>
  )
}

function Head({ leaders }: { readonly leaders: ReactNode }) {
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']">
      <CompanyHubHero
        search={<HubSearch />}
        inBusiness={hubCompaniesSearch(YEAR, { observedStatus: { in: [STATUS_ACTIVE] } })}
        leaders={leaders}
      />
      <HomeSectionNav title={t`Firmele din România`} sections={companyHubSections()} />
      <Figures />
    </div>
  )
}

// ───────────────────────────────────────────── azi: the page as it is ──

/** Today's card: ten rows, each with its bar, county, activity and change. */
export function HeadAzi() {
  const [ranking, setRanking] = useState<Ranking>('cifra-de-afaceri')
  return <Head leaders={<TodaysCard ranking={ranking} onRanking={setRanking} rows={10} />} />
}

// ───────────────────────────────────────── cinci: today's card, five rows ──

/** The same card cut to five rows: nothing else changes. */
export function HeadCinci() {
  const [ranking, setRanking] = useState<Ranking>('cifra-de-afaceri')
  return <Head leaders={<TodaysCard ranking={ranking} onRanking={setRanking} rows={5} />} />
}

function TodaysCard({ ranking, onRanking, rows }: { readonly ranking: Ranking; readonly onRanking: (key: Ranking) => void; readonly rows: number }) {
  const previousYear = YEAR - 1
  return (
    <CompanyLeadersFrame title={<Trans>Cele mai mari firme, {YEAR}</Trans>} toggle={<RankingToggle value={ranking} onChange={onRanking} />}>
      <HubLeaders key={ranking} className="mt-4" leaders={leadersOf(ranking)} unit={unitOf(ranking)} limit={rows} />
      <Link to="/companies/analytics" search={allCompanies(ranking)} className={LEADERS_MORE_CLASS}>
        <Trans>Toate firmele, în analiza bilanțurilor</Trans> →
      </Link>
      <p className="mt-2 text-xs text-muted-foreground">
        {ranking === 'salariati' ? (
          <Trans>După numărul mediu de salariați din bilanțurile pe {YEAR} și variația față de {previousYear}.</Trans>
        ) : (
          <Trans>După cifra de afaceri din bilanțurile pe {YEAR} și variația față de {previousYear}.</Trans>
        )}
      </p>
    </CompanyLeadersFrame>
  )
}

// ─────────────────────────────────── simplu: five rows, one line each ──

/**
 * Five companies, each a name and its figure: no bar, no county, no activity,
 * no change, no footnote. The switch stays; the heading says the year. What a
 * company does and where it is are one click away, on its own page.
 */
export function HeadSimplu() {
  const [ranking, setRanking] = useState<Ranking>('cifra-de-afaceri')
  return (
    <Head
      leaders={
        <CompanyLeadersFrame title={<Trans>Cele mai mari firme, {YEAR}</Trans>} toggle={<RankingToggle value={ranking} onChange={setRanking} />}>
          <ol className="mt-4 divide-y divide-border/70 border-y border-border/70">
            {leadersOf(ranking)
              .slice(0, 5)
              .map((leader, index) => (
                <li key={leader.cui}>
                  <Link
                    to="/companies/$cui"
                    params={{ cui: leader.cui }}
                    className="grid min-h-11 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 transition-colors hover:bg-muted/40"
                  >
                    <span className="pl-1 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                    <span className="truncate text-sm font-medium text-foreground">{leader.name}</span>
                    <Figure leader={leader} ranking={ranking} />
                  </Link>
                </li>
              ))}
          </ol>
          <Link to="/companies/analytics" search={allCompanies(ranking)} className={LEADERS_MORE_CLASS}>
            <Trans>Toate firmele, în analiza bilanțurilor</Trans> →
          </Link>
        </CompanyLeadersFrame>
      }
    />
  )
}

// ───────────────────────── panou: the landing's institutions panel form ──

/**
 * The landing's panel: a caption strip that names the two columns, five rows
 * of two lines (the name, then where the company is), no rules between rows,
 * and a last row that leads to the rest. No switch: the ranking by employees
 * is the analysis's, a click away. The search field's outline, so the two
 * boxes of the head read as one kind of thing.
 */
export function HeadPanou() {
  const leaders = leadersOf('cifra-de-afaceri').slice(0, 5)
  return (
    <Head
      leaders={
        <section className="overflow-hidden rounded-lg border border-input bg-card" aria-labelledby="hub-head-panel-title">
          <div className="flex items-baseline justify-between gap-4 border-b bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
            <h2 id="hub-head-panel-title" className="font-medium text-foreground">
              <Trans>Cele mai mari firme</Trans>
            </h2>
            <span>
              <Trans>Cifra de afaceri, {YEAR}</Trans>
            </span>
          </div>
          <ol className="py-1.5">
            {leaders.map((leader) => (
              <li key={leader.cui}>
                <Link
                  to="/companies/$cui"
                  params={{ cui: leader.cui }}
                  className="group flex min-h-14 items-center justify-between gap-4 px-4 py-2 transition-colors hover:bg-muted/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground group-hover:underline group-hover:underline-offset-4">{leader.name}</span>
                    <span className="block truncate text-xs leading-5 text-muted-foreground">{leader.county ? countyName(leader.county) : '—'}</span>
                  </span>
                  <Figure leader={leader} ranking="cifra-de-afaceri" />
                </Link>
              </li>
            ))}
          </ol>
          <Link
            to="/companies/analytics"
            search={allCompanies('cifra-de-afaceri')}
            className="group flex min-h-11 items-center justify-between gap-4 border-t bg-muted/40 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
          >
            <Trans>Toate firmele</Trans>
            <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </section>
      }
    />
  )
}

// ──────────────────────────── cifre: the four figures instead of a list ──

/**
 * No ranking in the head: beside the search, the four figures the band under
 * the head shows today, two by two, so the first screen says how large the
 * thing is and the band below is free to go. The ranking would become a band
 * of its own further down.
 */
export function HeadCifre() {
  const { national } = SNAPSHOT
  const month = formatHubMonth(SNAPSHOT.registryPeriod)
  const cells: readonly { readonly key: string; readonly value: string; readonly unit?: string; readonly label: ReactNode; readonly note: ReactNode }[] = [
    { key: 'active', value: formatHubValue(national.activeFirms, 'firms').value, label: <Trans>Firme în funcțiune</Trans>, note: <Trans>Registrul comerțului, {month}</Trans> },
    { key: 'new', value: formatHubValue(national.newFirms, 'firms').value, label: <Trans>Firme noi</Trans>, note: <Trans>Înregistrate la ONRC în {YEAR}</Trans> },
    {
      key: 'turnover',
      value: formatHubValue(Math.round(national.turnover / 100_000_000) / 10, 'firms', { digits: 1 }).value,
      unit: t`mld. lei`,
      label: <Trans>Cifra de afaceri</Trans>,
      note: <Trans>Din bilanțurile pe {YEAR}</Trans>,
    },
    { key: 'employees', value: formatHubValue(national.employees, 'persons').value, label: <Trans>Salariați</Trans>, note: <Trans>Numărul mediu, din bilanțuri</Trans> },
  ]
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']">
      <CompanyHubHero
        search={<HubSearch />}
        inBusiness={hubCompaniesSearch(YEAR, { observedStatus: { in: [STATUS_ACTIVE] } })}
        leaders={
          <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-input bg-card">
            {cells.map((cell, index) => (
              <div key={cell.key} className={cn('flex flex-col px-4 py-4 sm:px-5 sm:py-5', index % 2 === 1 && 'border-l', index >= 2 && 'border-t')}>
                <dt className="order-2 mt-1.5">
                  <span className="block text-sm font-medium text-foreground">{cell.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{cell.note}</span>
                </dt>
                <dd className="order-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
                  {cell.value}
                  {cell.unit ? <span className="ml-1.5 text-sm font-medium tracking-normal text-muted-foreground">{cell.unit}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        }
      />
      <HomeSectionNav title={t`Firmele din România`} sections={companyHubSections()} />
    </div>
  )
}

// ─────────────────────────────────────────── fara: nothing beside it ──

/** Title, description, search, shortcuts — and the four figures straight under the head. The ranking becomes a band of its own. */
export function HeadFara() {
  return <Head leaders={null} />
}
