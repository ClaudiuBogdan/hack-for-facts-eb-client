import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-section-nav'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { CaveatsMarker, ElectionsHero, ElectionsSearch, HeroPanel, PROTOTYPE_HREF, sectionIndex, useFormat } from '../shared/parts'
import { hubData } from '../shared/model'
import { ResultsMap } from './map'
import {
  MAP_ELECTIONS,
  SUMMARY,
  closeMayorRaces,
  measureAvailable,
  topWithOther,
  total,
  turnoutShare,
  useUatResults,
  type MapElection,
  type MapLevel,
  type MapMeasure,
  type PartyCount,
  type Turnout,
} from './model'
import { partyName, partyShort, partyStyle } from './parties'

const BAND_GRID = 'grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8'
const names = SUMMARY.parties

function share(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0
}

function usePct() {
  const format = useFormat()
  return (value: number | null, digits = 1) =>
    value === null
      ? '—'
      : new Intl.NumberFormat(format.locale === 'en' ? 'en' : 'ro', { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
}

// ─────────────────────────────────────────────────── source line ──

function resultsNotes(): readonly ReactNode[] {
  return [
    <Trans key="db">
      Rezultatele nu sunt încă servite de API: pagina le citește dintr-un extras al bazei de date electorale Transparenta.eu (BEC, AEP, ROAEP). Etichetele sunt ale sursei și nu
      sunt încă verificate; prezența are statutul „neverificat".
    </Trans>,
    <Trans key="mayors">
      Primăriile pe partide sunt mandatele raportate pe județe (fără București). Pe hartă, o localitate arată partidul candidatului cu cele mai multe voturi la primărie; nu e o
      listă de primari aleși, care nu există încă în date.
    </Trans>,
    <Trans key="bucharest">La localele din 2024, prezența și mandatele pe județe nu includ Bucureștiul, iar voturile pentru primarul general nu sunt în date.</Trans>,
    <Trans key="parl">
      La parlamentarele din 2020, o localitate e locul unde s-a votat, nu o circumscripție. Mandatele nu sunt în date. Străinătatea e numărată separat; acolo se votează și pe liste
      suplimentare, deci votanții pot depăși înscrișii.
    </Trans>,
    <Trans key="pres">
      La prezidențialele și europarlamentarele din 2019, voturile pe candidați și liste sunt în coloane fără nume, nelegate încă de un candidat; pagina arată doar prezența. Ediția
      prezidențială poartă eticheta „tur 2".
    </Trans>,
    <Trans key="colours">Culorile și numele scurte ale partidelor sunt alese de Transparenta.eu; numele întregi sunt cele din sursă.</Trans>,
  ]
}

function ResultsSourceLine({ className }: { readonly className?: string }) {
  const format = useFormat()
  return (
    <p className={cn('flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground', className)}>
      <span>
        <Trans>Sursa: BEC, AEP și ROAEP, din baza de date Transparenta.eu, extras pe {format.day(SUMMARY.readAt)}</Trans>
      </span>
      <CaveatsMarker notes={resultsNotes()} />
    </p>
  )
}

// ─────────────────────────────────────────────────── hero panel ──

interface LatestRow {
  readonly key: string
  readonly year: number
  readonly label: string
  readonly figure: string | null
  readonly detail: string
  readonly href?: string
}

function LatestPanel() {
  const pct = usePct()
  const local = SUMMARY.local2024
  const parl = SUMMARY.parliamentary2020
  const firstMayor = local.mayors.mandates.national[0]
  const firstChamber = parl.chamber.national[0]
  const rows: readonly LatestRow[] = [
    { key: 'pres25', year: 2025, label: t`Prezidențiale (reluate)`, figure: null, detail: t`nu sunt încă în date` },
    { key: 'pres24', year: 2024, label: t`Prezidențiale (anulate)`, figure: null, detail: t`nu sunt încă în date` },
    { key: 'parl24', year: 2024, label: t`Parlamentare`, figure: null, detail: t`doar listele de candidați` },
    { key: 'euro24', year: 2024, label: t`Europarlamentare`, figure: null, detail: t`nu sunt încă în date` },
    {
      key: 'local24',
      year: 2024,
      label: t`Locale`,
      figure: pct(turnoutShare(local.turnout.national)),
      detail: firstMayor ? t`prezență fără București · ${partyShort(firstMayor[0], names)}, cele mai multe primării` : t`prezență fără București`,
      href: '#locale',
    },
    {
      key: 'parl20',
      year: 2020,
      label: t`Parlamentare`,
      figure: pct(turnoutShare(parl.turnout.national)),
      detail: firstChamber ? t`prezență cu străinătatea · ${partyShort(firstChamber[0], names)}, primul la Cameră` : t`prezență cu străinătatea`,
      href: '#parlamentare',
    },
    {
      key: 'pres19',
      year: 2019,
      label: t`Prezidențiale`,
      figure: pct(turnoutShare(SUMMARY.presidential2019.turnout.national)),
      detail: t`prezență cu străinătatea, turul raportat de ediție`,
      href: '#prezenta',
    },
    { key: 'euro19', year: 2019, label: t`Europarlamentare`, figure: pct(turnoutShare(SUMMARY.european2019.turnout.national)), detail: t`prezență`, href: '#prezenta' },
  ]
  return (
    <HeroPanel titleId="alegeri-ultimele" title={<Trans>Ultimele alegeri</Trans>} footer={<Trans>Rezultatele mai noi vin odată cu sursele lor.</Trans>}>
      <ol className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {rows.map((row) => {
          const body = (
            <>
              <MonoLabel className="pt-0.5 tabular-nums text-muted-foreground">{row.year}</MonoLabel>
              <span className="min-w-0">
                <span className="block text-sm text-foreground">{row.label}</span>
                <span className="block text-xs text-muted-foreground">{row.detail}</span>
              </span>
              <span className={cn('whitespace-nowrap text-right text-sm tabular-nums', row.figure ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {row.figure ?? '—'}
              </span>
            </>
          )
          const cls = 'grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-3 px-1 py-2'
          return (
            <li key={row.key}>
              {row.href ? (
                <a href={row.href} className={cn(cls, 'transition-colors hover:bg-muted/40')}>
                  {body}
                </a>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          )
        })}
      </ol>
    </HeroPanel>
  )
}

// ─────────────────────────────────────────────────── figures ──

function bandLink(hash: string) {
  return function BandLink(label: ReactNode, className: string) {
    return (
      <a href={`#${hash}`} className={className}>
        {label}
      </a>
    )
  }
}

function ResultsFigures() {
  const format = useFormat()
  const local = SUMMARY.local2024
  const parl = SUMMARY.parliamentary2020
  const mayorsTotal = total(local.mayors.mandates.national)
  const firstMayor = local.mayors.mandates.national[0]
  const firstChamber = parl.chamber.national[0]
  const chamberVotes = total(parl.chamber.national)
  const facts: readonly HubFact[] = [
    {
      key: 'turnout',
      value: Math.round(1000 * (turnoutShare(local.turnout.national) ?? 0)) / 10,
      digits: 1,
      unit: '%',
      label: <Trans>Prezența la localele din 2024</Trans>,
      note: <Trans>{format.n(local.turnout.national[1])} de votanți, fără București</Trans>,
      link: bandLink('harta'),
    },
    {
      key: 'mayors',
      value: firstMayor?.[1] ?? 0,
      digits: 0,
      label: <Trans>Primării {firstMayor ? partyShort(firstMayor[0], names) : ''}, 2024</Trans>,
      note: <Trans>din {format.n(mayorsTotal)} raportate pe județe</Trans>,
      link: bandLink('locale'),
    },
    {
      key: 'chamber',
      value: Math.round(1000 * share(firstChamber?.[1] ?? 0, chamberVotes)) / 10,
      digits: 1,
      unit: '%',
      label: <Trans>{firstChamber ? partyShort(firstChamber[0], names) : ''} la Cameră, 2020</Trans>,
      note: <Trans>primul partid, din {format.n(chamberVotes)} de voturi valabile</Trans>,
      link: bandLink('parlamentare'),
    },
    {
      key: 'diaspora',
      value: parl.turnout.diaspora[1],
      digits: 0,
      label: <Trans>Votanți în străinătate, 2020</Trans>,
      note: <Trans>la parlamentare, numărați separat</Trans>,
      link: bandLink('parlamentare'),
    },
  ]
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <HubFiguresBand facts={facts} locale={format.locale} />
      </RuledFrame>
    </section>
  )
}

// ─────────────────────────────────────────────────── the map band ──

const ELECTION_LABEL = (key: MapElection) => (key === 'locale-2024' ? t`Locale 2024` : key === 'parlamentare-2020' ? t`Parlamentare 2020` : t`Prezidențiale 2019`)

function useMapChoice(): readonly [{ election: MapElection; level: MapLevel; measure: MapMeasure }, (patch: Record<string, string | undefined>) => void] {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const election = MAP_ELECTIONS.find((key) => key === search['alegere']) ?? 'locale-2024'
  const level: MapLevel = search['nivel'] === 'judet' ? 'judet' : 'uat'
  const wanted: MapMeasure = search['arata'] === 'prezenta' ? 'prezenta' : search['arata'] === 'presedinte' ? 'presedinte' : 'partid'
  // A measure the election lacks at this level falls back to what it has.
  const measure: MapMeasure = measureAvailable(election, level, wanted)
    ? wanted
    : ((['partid', 'prezenta', 'presedinte'] as const).find((m) => measureAvailable(election, level, m)) ?? 'partid')
  const move = (patch: Record<string, string | undefined>) =>
    void navigate({ to: '.', search: (previous: Record<string, unknown>) => ({ ...previous, ...patch }), replace: true, resetScroll: false })
  return [{ election, level, measure }, move] as const
}

function MapBand({ index }: { readonly index: string }) {
  const [{ election, level, measure }, move] = useMapChoice()
  const measures = (['partid', 'prezenta', 'presedinte'] as const).filter((m) => measureAvailable(election, level, m))
  const measureLabel = (m: MapMeasure) =>
    m === 'prezenta' ? t`Prezența` : m === 'presedinte' ? t`Președinte CJ` : election === 'locale-2024' ? (level === 'uat' ? t`Primăria` : t`Primăriile`) : t`Partidul`
  const title =
    measure === 'prezenta'
      ? t`Prezența la vot, ${ELECTION_LABEL(election)}`
      : election === 'locale-2024'
        ? level === 'uat'
          ? t`Partidul cu cele mai multe voturi la primărie, 2024`
          : measure === 'presedinte'
            ? t`Partidul cu cele mai multe voturi pentru președintele CJ, 2024`
            : t`Partidul cu cele mai multe primării, pe județe, 2024`
        : t`Partidul cel mai votat la Camera Deputaților, 2020`
  const missing =
    election === 'prezidentiale-2019'
      ? t`Voturile pe candidați nu sunt încă atribuite: harta arată doar prezența.`
      : election === 'locale-2024' && level === 'uat'
        ? t`Prezența pe localități nu e în date pentru 2024: e pe județe.`
        : null
  return (
    <HomeBand id="harta" labelledBy="alegeri-harta-titlu">
      <HubSectionHead titleId="alegeri-harta-titlu" index={index} title={<Trans>Harta rezultatelor</Trans>} lede={title} />
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <IndicatorToggle
          label={t`Alegerea`}
          options={MAP_ELECTIONS.map((key) => ({ key, label: ELECTION_LABEL(key) }))}
          value={election}
          onChange={(key) => move({ alegere: key === 'locale-2024' ? undefined : key })}
        />
        <IndicatorToggle
          label={t`Nivelul`}
          options={[
            { key: 'uat', label: t`Localități` },
            { key: 'judet', label: t`Județe` },
          ]}
          value={level}
          onChange={(key) => move({ nivel: key === 'uat' ? undefined : key })}
        />
        {measures.length > 1 ? (
          <IndicatorToggle
            label={t`Ce arată harta`}
            options={measures.map((key) => ({ key, label: measureLabel(key) }))}
            value={measure}
            onChange={(key) => move({ arata: key === 'partid' ? undefined : key })}
          />
        ) : null}
      </div>
      {missing ? <p className="mt-3 text-xs text-muted-foreground">{missing}</p> : null}
      <div className={cn(BAND_GRID, 'mt-6')}>
        <ResultsMap election={election} level={level} measure={measure} title={title} className="lg:col-span-8" />
        <CountyList election={election} measure={measure} className="lg:col-span-4" />
      </div>
    </HomeBand>
  )
}

/** Beside the map, the counties in order: the party's lead (or turnout) per county. */
function CountyList({ election, measure, className }: { readonly election: MapElection; readonly measure: MapMeasure; readonly className?: string }) {
  const pct = usePct()
  const format = useFormat()
  const rows: { key: string; county: string; value: number; label: string; swatch: string; meta: string }[] = []
  if (measure === 'prezenta') {
    const source: Readonly<Record<string, Turnout>> =
      election === 'locale-2024'
        ? SUMMARY.local2024.turnout.byCounty
        : election === 'parlamentare-2020'
          ? SUMMARY.parliamentary2020.turnout.byCounty
          : SUMMARY.presidential2019.turnout.byCounty
    for (const [county, pair] of Object.entries(source)) {
      const value = turnoutShare(pair) ?? 0
      rows.push({ key: county, county, value, label: pct(value), swatch: '', meta: t`${format.n(pair[1])} votanți` })
    }
  } else {
    const tallies: Readonly<Record<string, readonly PartyCount[]>> =
      election === 'locale-2024'
        ? measure === 'presedinte'
          ? Object.fromEntries(Object.entries(SUMMARY.local2024.countyPresidents).map(([c, [p, s]]) => [c, [[p, s] as const]]))
          : SUMMARY.local2024.mayors.mandates.byCounty
        : SUMMARY.parliamentary2020.chamber.byCounty
    for (const [county, tally] of Object.entries(tallies)) {
      const first = tally[0]
      if (!first) continue
      const whole = measure === 'presedinte' ? 1000 : total(tally)
      const value = share(first[1], whole)
      const what = election === 'locale-2024' && measure !== 'presedinte' ? t`${String(first[1])} din ${String(whole)} primării` : t`din voturi`
      rows.push({ key: county, county, value, label: pct(value), swatch: partyStyle(first[0]).swatch, meta: `${partyShort(first[0], names)} · ${what}` })
    }
  }
  rows.sort((a, b) => b.value - a.value)
  return (
    <div className={className}>
      <MonoLabel className="block text-muted-foreground">
        {measure === 'prezenta' ? <Trans>Județele, după prezență</Trans> : <Trans>Județele, după ponderea primului partid</Trans>}
      </MonoLabel>
      <ol className="mt-3 max-h-[28rem] divide-y divide-border/70 overflow-y-auto border-y border-border/70">
        {rows.map((row, i) => (
          <li key={row.key} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-2 px-1 py-1.5">
            <MonoLabel className="tabular-nums text-muted-foreground">{String(i + 1).padStart(2, '0')}</MonoLabel>
            <span className="min-w-0">
              <span className="block truncate text-sm text-foreground">{countyName(row.county)}</span>
              <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                {row.swatch ? <span className={cn('size-2 shrink-0 rounded-[1px]', row.swatch)} aria-hidden="true" /> : null}
                {row.meta}
              </span>
            </span>
            <span className="text-right text-sm font-semibold tabular-nums text-foreground">{row.label}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

const COUNTY_NAMES: Readonly<Record<string, string>> = {
  AB: 'Alba',
  AR: 'Arad',
  AG: 'Argeș',
  BC: 'Bacău',
  BH: 'Bihor',
  BN: 'Bistrița-Năsăud',
  BT: 'Botoșani',
  BR: 'Brăila',
  BV: 'Brașov',
  BZ: 'Buzău',
  CS: 'Caraș-Severin',
  CL: 'Călărași',
  CJ: 'Cluj',
  CT: 'Constanța',
  CV: 'Covasna',
  DB: 'Dâmbovița',
  DJ: 'Dolj',
  GL: 'Galați',
  GR: 'Giurgiu',
  GJ: 'Gorj',
  HR: 'Harghita',
  HD: 'Hunedoara',
  IL: 'Ialomița',
  IS: 'Iași',
  IF: 'Ilfov',
  MM: 'Maramureș',
  MH: 'Mehedinți',
  MS: 'Mureș',
  NT: 'Neamț',
  OT: 'Olt',
  PH: 'Prahova',
  SM: 'Satu Mare',
  SJ: 'Sălaj',
  SB: 'Sibiu',
  SV: 'Suceava',
  TR: 'Teleorman',
  TM: 'Timiș',
  TL: 'Tulcea',
  VS: 'Vaslui',
  VL: 'Vâlcea',
  VN: 'Vrancea',
  B: 'București',
}
const countyName = (code: string) => COUNTY_NAMES[code] ?? code

// ─────────────────────────────────────────────── seats and votes ──

/** One stacked bar of a whole (mandates or votes), the parties' colours in order, then the rows that name them. */
function PartyBar({ counts, unit, top = 6 }: { readonly counts: readonly PartyCount[]; readonly unit: string; readonly top?: number }) {
  const pct = usePct()
  const format = useFormat()
  const whole = total(counts)
  const shown = topWithOther(counts, top)
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-[2px] bg-muted" aria-hidden="true">
        {shown.map(([party, n]) => (
          <span key={party} className={cn('h-full', partyStyle(party).swatch)} style={{ width: `${(100 * share(n, whole)).toFixed(2)}%` }} />
        ))}
      </div>
      <ol className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {shown.map(([party, n]) => (
          <li key={party} className="flex items-center gap-2 border-b border-border/60 py-1.5 text-sm" title={party.startsWith('~') ? undefined : partyName(party, names)}>
            <span className={cn('size-2.5 shrink-0 rounded-[1px]', partyStyle(party).swatch)} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-foreground">{partyShort(party, names)}</span>
            <span className="tabular-nums text-foreground">{format.n(n)}</span>
            <span className="w-14 text-right tabular-nums text-muted-foreground">{pct(share(n, whole))}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">
        <Trans>
          {format.n(whole)} {unit} în total
        </Trans>
      </p>
    </div>
  )
}

function LocalBand({ index }: { readonly index: string }) {
  const format = useFormat()
  const local = SUMMARY.local2024
  const first = local.mayors.mandates.national[0]
  const mayors = total(local.mayors.mandates.national)
  // The analytics page's rule (no București sectors, no ties, two candidates or more), not the extract's precomputed count.
  const uat = useUatResults()
  const close = uat.data ? closeMayorRaces(uat.data.local2024Mayors) : null
  const presidents = new Map<string, number>()
  for (const [party] of Object.values(local.countyPresidents)) presidents.set(party, (presidents.get(party) ?? 0) + 1)
  const presidentCounts = [...presidents].sort((a, b) => b[1] - a[1])
  return (
    <HomeBand id="locale" labelledBy="alegeri-locale-titlu">
      <div className={BAND_GRID}>
        <div className="lg:col-span-4">
          <HubSectionHead
            titleId="alegeri-locale-titlu"
            index={index}
            title={<Trans>Cine conduce primăriile și consiliile</Trans>}
            lede={
              first ? (
                <>
                  <Trans>
                    La localele din 2024, {partyShort(first[0], names)} are {format.n(first[1])} din {format.n(mayors)} de primării raportate pe județe.
                  </Trans>{' '}
                  {close !== null ? <Trans>În {format.n(close)} de localități, primii doi candidați la primărie au fost la mai puțin de 5 puncte.</Trans> : null}
                </>
              ) : null
            }
          />
        </div>
        <div className={cn('space-y-10 lg:col-span-8', HUB_BESIDE_TITLE_CLASS)}>
          <section aria-label={t`Primării`}>
            <MonoLabel className="mb-3 block text-primary">
              <Trans>Primării, pe partide</Trans>
            </MonoLabel>
            <PartyBar counts={local.mayors.mandates.national} unit={t`primării`} />
          </section>
          <section aria-label={t`Consilieri locali`}>
            <MonoLabel className="mb-3 block text-primary">
              <Trans>Consilieri locali</Trans>
            </MonoLabel>
            <PartyBar counts={local.councillors.national} unit={t`mandate`} />
          </section>
          <section aria-label={t`Consilieri județeni`}>
            <MonoLabel className="mb-3 block text-primary">
              <Trans>Consilieri județeni</Trans>
            </MonoLabel>
            <PartyBar counts={local.countyCouncillors.national} unit={t`mandate`} />
          </section>
          <section aria-label={t`Președinți de consiliu județean`}>
            <MonoLabel className="mb-3 block text-primary">
              <Trans>Președinte CJ: cele mai multe voturi, pe județe</Trans>
            </MonoLabel>
            <PartyBar counts={presidentCounts} unit={t`județe`} />
          </section>
        </div>
      </div>
    </HomeBand>
  )
}

/** Vote shares as bars, with the 5% threshold drawn on each. */
function ShareBars({ counts, top = 8 }: { readonly counts: readonly PartyCount[]; readonly top?: number }) {
  const pct = usePct()
  const whole = total(counts)
  const shown = topWithOther(counts, top)
  const max = Math.max(...shown.map(([, n]) => share(n, whole)))
  return (
    <ol className="space-y-2">
      {shown.map(([party, n]) => {
        const value = share(n, whole)
        return (
          <li key={party} className="grid grid-cols-[6.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm" title={party.startsWith('~') ? undefined : partyName(party, names)}>
            <span className="truncate text-foreground">{partyShort(party, names)}</span>
            <span className="relative h-3 bg-muted/60">
              <span className={cn('absolute inset-y-0 left-0', partyStyle(party).swatch)} style={{ width: `${(100 * (value / max)).toFixed(2)}%` }} />
              <span className="absolute inset-y-[-3px] w-px bg-foreground/50" style={{ left: `${(100 * (0.05 / max)).toFixed(2)}%` }} aria-hidden="true" />
            </span>
            <span className="text-right tabular-nums text-foreground">{pct(value)}</span>
          </li>
        )
      })}
    </ol>
  )
}

function ParliamentBand({ index }: { readonly index: string }) {
  const pct = usePct()
  const format = useFormat()
  const parl = SUMMARY.parliamentary2020
  const passed = parl.chamber.national.filter(([, n]) => share(n, total(parl.chamber.national)) >= 0.05).length
  const first = parl.chamber.national[0]
  const firstAbroad = parl.chamber.diaspora[0]
  return (
    <HomeBand id="parlamentare" labelledBy="alegeri-parl-titlu">
      <div className={BAND_GRID}>
        <div className="lg:col-span-4">
          <HubSectionHead
            titleId="alegeri-parl-titlu"
            index={index}
            title={<Trans>Parlamentul votat în 2020</Trans>}
            lede={
              first && firstAbroad ? (
                <Trans>
                  {partyShort(first[0], names)} a fost primul la Camera Deputaților, cu {pct(share(first[1], total(parl.chamber.national)))}; {passed} partide au trecut pragul de
                  5%. În străinătate a câștigat cele mai multe voturi {partyShort(firstAbroad[0], names)}. Prezența, cu străinătatea: {pct(turnoutShare(parl.turnout.national))}.
                </Trans>
              ) : null
            }
          />
        </div>
        <div className={cn('grid grid-cols-1 gap-10 sm:grid-cols-2 lg:col-span-8', HUB_BESIDE_TITLE_CLASS)}>
          <section aria-label={t`Camera Deputaților`}>
            <MonoLabel className="mb-3 block text-primary">
              <Trans>Camera Deputaților, voturi</Trans>
            </MonoLabel>
            <ShareBars counts={parl.chamber.national} />
          </section>
          <section aria-label={t`Senat`}>
            <MonoLabel className="mb-3 block text-primary">
              <Trans>Senat, voturi</Trans>
            </MonoLabel>
            <ShareBars counts={parl.senate.national} />
          </section>
          <section aria-label={t`Străinătate`} className="sm:col-span-2">
            <MonoLabel className="mb-3 block text-primary">
              <Trans>Camera Deputaților, voturi din străinătate</Trans>
            </MonoLabel>
            <ShareBars counts={parl.chamber.diaspora} top={6} />
            <p className="mt-3 text-xs text-muted-foreground">
              <Trans>Linia verticală: pragul de 5%. Mandatele nu sunt în date. {format.n(parl.turnout.diaspora[1])} de votanți în străinătate.</Trans>
            </p>
          </section>
        </div>
      </div>
    </HomeBand>
  )
}

function TurnoutBand({ index }: { readonly index: string }) {
  const pct = usePct()
  const rows: readonly { key: string; label: string; turnout: Turnout; note: string }[] = [
    { key: 'local24', label: t`Locale 2024`, turnout: SUMMARY.local2024.turnout.national, note: t`fără București` },
    { key: 'parl20', label: t`Parlamentare 2020`, turnout: SUMMARY.parliamentary2020.turnout.national, note: t`cu străinătatea` },
    { key: 'pres19', label: t`Prezidențiale 2019`, turnout: SUMMARY.presidential2019.turnout.national, note: t`tur 2, cu străinătatea` },
    { key: 'euro19', label: t`Europarlamentare 2019`, turnout: SUMMARY.european2019.turnout.national, note: t`cu străinătatea` },
  ]
  const max = Math.max(...rows.map((row) => turnoutShare(row.turnout) ?? 0))
  const lowest = [...rows].sort((a, b) => (turnoutShare(a.turnout) ?? 0) - (turnoutShare(b.turnout) ?? 0))[0]
  return (
    <HomeBand id="prezenta" labelledBy="alegeri-prezenta-titlu">
      <div className={BAND_GRID}>
        <div className="lg:col-span-4">
          <HubSectionHead
            titleId="alegeri-prezenta-titlu"
            index={index}
            title={<Trans>Cât de mulți votează</Trans>}
            lede={
              lowest ? (
                <Trans>
                  Prezența cea mai mică dintre ultimele alegeri: {lowest.label}, {pct(turnoutShare(lowest.turnout))}.
                </Trans>
              ) : null
            }
          />
        </div>
        <ol className={cn('space-y-3 lg:col-span-8', HUB_BESIDE_TITLE_CLASS)}>
          {rows.map((row) => {
            const value = turnoutShare(row.turnout) ?? 0
            return (
              <li key={row.key} className="grid grid-cols-[9.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-foreground">{row.label}</span>
                  <span className="block text-xs text-muted-foreground">{row.note}</span>
                </span>
                <span className="h-3 bg-muted/60">
                  <span className="block h-3 bg-primary/80" style={{ width: `${(100 * (value / max)).toFixed(2)}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums text-foreground">{pct(value)}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </HomeBand>
  )
}

function MissingBand({ index }: { readonly index: string }) {
  const rows: readonly { key: string; label: string; detail: string }[] = [
    { key: 'pres', label: t`Prezidențiale 2024 (anulate) și 2025`, detail: t`nu sunt încă în date` },
    { key: 'parl24', label: t`Parlamentare 2024`, detail: t`doar listele de candidați, fără voturi` },
    { key: 'euro24', label: t`Europarlamentare 2024`, detail: t`nu sunt încă în date` },
    { key: 'cand19', label: t`Prezidențiale și europarlamentare 2019`, detail: t`voturile pe candidați și liste nu sunt încă atribuite` },
    { key: 'ref19', label: t`Referendumul din 2019`, detail: t`indicatorii sursei nu sunt încă descifrați` },
    { key: 'people', label: t`Aleșii, pe nume`, detail: t`nu sunt încă în date; paginile arată partide, nu persoane` },
  ]
  return (
    <HomeBand id="lipsa" labelledBy="alegeri-lipsa-titlu">
      <div className={BAND_GRID}>
        <div className="lg:col-span-4">
          <HubSectionHead titleId="alegeri-lipsa-titlu" index={index} title={<Trans>Ce nu e încă aici</Trans>} />
          <nav aria-label={t`Mai departe`} className="mt-6 flex flex-col gap-2 text-sm">
            <a href={PROTOTYPE_HREF.analytics()} className="font-medium text-foreground underline-offset-4 hover:underline">
              <Trans>Analize avansate →</Trans>
            </a>
            <a href={`${PROTOTYPE_HREF.hub()}?v=cronologie`} className="font-medium text-foreground underline-offset-4 hover:underline">
              <Trans>Toate alegerile din date →</Trans>
            </a>
          </nav>
        </div>
        <ol className={cn('divide-y divide-border/70 border-y border-border/70 lg:col-span-8', HUB_BESIDE_TITLE_CLASS)}>
          {rows.map((row) => (
            <li key={row.key} className="grid grid-cols-1 gap-x-4 px-1 py-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <span className="text-sm text-foreground">{row.label}</span>
              <span className="text-sm text-muted-foreground">{row.detail}</span>
            </li>
          ))}
        </ol>
      </div>
    </HomeBand>
  )
}

// ─────────────────────────────────────────────────── the page ──

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

/**
 * The elections front door, results first: the latest elections' turnout and
 * parties, a map of Romania by locality or county, then each election's
 * mandates and votes, and what is not in the data yet.
 */
export function ResultsHome() {
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, startArrivalEffects, true)
  useEffect(() => () => stopCounting(), [])
  const data = hubData()
  const local = SUMMARY.local2024
  const firstMayor = local.mayors.mandates.national[0]
  const pct = usePct()
  const sections = [
    { id: 'harta', label: t`Harta` },
    { id: 'locale', label: t`Locale 2024` },
    { id: 'parlamentare', label: t`Parlamentare 2020` },
    { id: 'prezenta', label: t`Prezența` },
    { id: 'lipsa', label: t`Ce lipsește` },
  ] as const
  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />
      <ElectionsHero
        idPrefix="alegeri-principal"
        headline={
          <Trans>
            Cum a votat
            <br />
            România
          </Trans>
        }
        lede={
          firstMayor ? (
            <Trans>
              La localele din 2024 a votat {pct(turnoutShare(local.turnout.national))} dintre alegători, iar {partyShort(firstMayor[0], names)} a luat cele mai multe primării. Vezi
              harta pe localități și județe, partidele și prezența.
            </Trans>
          ) : null
        }
        search={<ElectionsSearch events={data.events} placeholder={t`Caută localitatea ta: Cluj-Napoca, Sectorul 3…`} />}
        shortcuts={[
          { key: 'harta', label: t`Harta`, href: '#harta' },
          { key: 'parl', label: t`Parlamentare 2020`, href: '#parlamentare' },
          { key: 'analize', label: t`Analize avansate`, href: PROTOTYPE_HREF.analytics() },
        ]}
        panel={<LatestPanel />}
        source={<ResultsSourceLine />}
      />
      <HomeSectionNav title={t`Alegeri`} sections={sections} />
      <ResultsFigures />
      <MapBand index={sectionIndex(sections, 'harta')} />
      <LocalBand index={sectionIndex(sections, 'locale')} />
      <ParliamentBand index={sectionIndex(sections, 'parlamentare')} />
      <TurnoutBand index={sectionIndex(sections, 'prezenta')} />
      <MissingBand index={sectionIndex(sections, 'lipsa')} />
    </div>
  )
}
