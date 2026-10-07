import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Info, Search } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { caseCategoryLabel, courtLevelLabel, courtName } from '@/features/justice/lib/judicial-labels'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HomeBand, HomeSectionNav, SHOW_MORE_CLASS } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HUB_SHORTCUT_LINK_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubCountyBand, type HubCountyBandDefinition } from '@/features/statistics/components/hub/hub-county-band'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import { countText, dayText, millionsText, monthText, percentText, rateText } from './hub.format'
import {
  HUB,
  POPULATION_YEAR,
  STAGE_KEYS,
  courtsOf,
  judecatoriiPerThousand,
  levelCount,
  mattersIn,
  seriesOf,
  stageMatrix,
  stageTotal,
  yearBars,
  type Level,
  type MainLevel,
  type MatterScope,
  type StageKey,
} from './hub.model'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

const YEAR = HUB.year
const LIST = 'divide-y divide-border/70 border-y border-border/70'

export interface Section {
  readonly id: string
  readonly label: string
}

export function indexOf(sections: readonly Section[], id: string): string {
  const position = sections.findIndex((section) => section.id === id)
  return `${String(position + 1).padStart(2, '0')} / ${sections[position]?.label ?? ''}`
}

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

/** The page frame every variant shares: reveal styles, the count-up filters, the arrival effects. */
export function HubPage({ children }: { readonly children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, startArrivalEffects, true)
  useEffect(() => () => stopCounting(), [])
  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RevealStyles />
      <SmearFilters />
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the hero ──

export function HubHero({ headline, lede, panel }: { readonly headline: ReactNode; readonly lede: ReactNode; readonly panel: ReactNode }) {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="justice-hub" />
      <RuledFrame marker="hero" className="py-12 sm:py-16 lg:pb-24 lg:pt-20">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <MonoLabel className="text-muted-foreground">
              <Trans>Justiție / Portalul instanțelor</Trans>
            </MonoLabel>
            <h1 className="mt-5 text-[clamp(2.2rem,8vw+0.6rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
              {headline}
            </h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">{lede}</p>
            <CourtSearch className="mt-6 sm:mt-7" />
            <nav aria-label={t`Scurtături`} className="mt-4">
              <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                <Trans>Sau mergi direct la</Trans>
              </MonoLabel>
              <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                <a href="#instante" className={HUB_SHORTCUT_LINK_CLASS}>
                  <Trans>Toate instanțele</Trans>
                </a>
                <a href="#materii" className={HUB_SHORTCUT_LINK_CLASS}>
                  <Trans>Dosarele penale</Trans>
                </a>
                <a href="#decizii" className={HUB_SHORTCUT_LINK_CLASS}>
                  <Trans>Hotărârile CEDO</Trans>
                </a>
              </span>
            </nav>
          </div>
          <div className="min-w-0 lg:col-span-5">{panel}</div>
          <SourceLine className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6" />
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** The one source line, with the page's caveats behind one marker beside it. */
function SourceLine({ className }: { readonly className?: string }) {
  return (
    <p className={cn('flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground', className)}>
      <span>
        <Trans>Sursa:</Trans>{' '}
        <a href="https://portal.just.ro" target="_blank" rel="noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
          portal.just.ro<span aria-hidden="true"> ↗</span>
        </a>{' '}
        <Trans>și arhiva ÎCCJ</Trans>, <Trans>date până la {dayText(HUB.asOf.portalModifiedAt)}</Trans>
      </span>
      <CaveatsMarker />
    </p>
  )
}

function CaveatsMarker() {
  const notes: readonly ReactNode[] = [
    <Trans key="date">
      Anul unui dosar e data din antetul lui pe portal (pentru ÎCCJ, data din arhiva Curții), nu o dată de înregistrare verificată.
    </Trans>,
    <Trans key="capture">
      Portalul a fost preluat după data ultimei modificări a dosarelor, din 2013. Înainte de {YEAR - 2} sunt doar dosarele încă active după aceea, nu
      tot ce au judecat instanțele.
    </Trans>,
    <Trans key="frozen">
      Preluarea s-a oprit: ultima modificare de pe portal e din {dayText(HUB.asOf.portalModifiedAt)}, ultima dată din arhiva ÎCCJ din{' '}
      {dayText(HUB.asOf.iccjArchiveDate)}.
    </Trans>,
    <Trans key="privacy">Numele părților și soluțiile din ședințe nu sunt publicate aici. Persoanele sunt doar numărate.</Trans>,
  ]
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex size-8 items-center justify-center rounded-sm text-status-partial-fg transition-colors hover:bg-status-partial-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t`${notes.length} note despre date`}
      >
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums">
          <Info className="size-4" aria-hidden="true" />
          {notes.length}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] text-sm leading-relaxed">
        <MonoLabel className="block text-muted-foreground">
          <Trans>Ce trebuie știut despre aceste date</Trans>
        </MonoLabel>
        <ul className="mt-3 list-disc space-y-2 pl-4 text-foreground">
          {notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/** A court search over the 247 courts' names: a court is what a reader can name without knowing a case number. */
function CourtSearch({ className }: { readonly className?: string }) {
  const [query, setQuery] = useState('')
  const listId = useId()
  const squash = (text: string) =>
    text
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
  const hits = useMemo(() => {
    const words = squash(query).split(/\s+/).filter(Boolean)
    if (words.length === 0) return []
    return HUB.courts
      .map((court) => ({ ...court, name: courtName(court.code) }))
      .filter((court) => {
        const name = squash(court.name).split(/[\s-]+/)
        return words.every((word) => name.some((part) => part.startsWith(word)))
      })
      .sort((a, b) => b.casesInYear - a.casesInYear)
      .slice(0, 6)
  }, [query])
  return (
    <div className={cn('relative max-w-xl', className)}>
      <label className="flex h-12 items-center gap-3 border bg-card px-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">
          <Trans>Caută o instanță</Trans>
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t`Caută o instanță: Cluj, Sectorul 2, Brașov…`}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
        />
      </label>
      {hits.length > 0 ? (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 divide-y border bg-popover shadow-md">
          {hits.map((court) => (
            <li key={court.code} role="option" aria-selected="false" className="flex items-baseline justify-between gap-4 px-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate text-foreground">{court.name}</span>
                <MonoLabel className="block text-muted-foreground">{courtLevelLabel(court.level as Level)}</MonoLabel>
              </span>
              <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                <Trans>
                  {countText(court.casesInYear)} dosare în {YEAR}
                </Trans>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────── shared rows ──

interface RowItem {
  readonly key: string
  readonly label: ReactNode
  readonly meta?: ReactNode
  readonly value: string
  readonly fraction: number
}

function ShareRows({ rows, numbered = true, className }: { readonly rows: readonly RowItem[]; readonly numbered?: boolean; readonly className?: string }) {
  return (
    <ol className={cn(LIST, className)}>
      {rows.map((row, index) => (
        <li key={row.key} className="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-1 py-2.5">
          <span className={cn('grid min-w-0 gap-x-2', numbered ? 'grid-cols-[1.75rem_minmax(0,1fr)]' : 'grid-cols-1')}>
            {numbered ? <MonoLabel className="pt-0.5 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel> : null}
            <span className="min-w-0">
              <span className="block truncate text-sm text-foreground">{row.label}</span>
              <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                <span className="block h-1 bg-primary/70" style={{ width: `${Math.min(Math.max(row.fraction * 100, 0.8), 100).toFixed(1)}%` }} />
              </span>
              {row.meta ? <MonoLabel className="mt-1 block truncate tabular-nums text-muted-foreground">{row.meta}</MonoLabel> : null}
            </span>
          </span>
          <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">{row.value}</span>
        </li>
      ))}
    </ol>
  )
}

const LEVEL_OPTIONS = (): readonly { readonly key: MainLevel; readonly label: string }[] => [
  { key: 'judecatorie', label: t`Judecătorii` },
  { key: 'tribunal', label: t`Tribunale` },
  { key: 'curte_de_apel', label: t`Curți de apel` },
]

function courtRows(level: Level, limit: number): readonly RowItem[] {
  const rows = courtsOf(level).slice(0, limit)
  const top = Math.max(...rows.map((row) => row.count), 1)
  return rows.map((row) => ({
    key: row.code,
    label: courtName(row.code),
    meta: (
      <Trans>
        {percentText(row.share)} din dosarele nivelului{row.county ? `, ${countyNameRo(row.county) ?? row.county}` : ''}
      </Trans>
    ),
    value: countText(row.count),
    fraction: row.count / top,
  }))
}

// ───────────────────────────────────────────────────── hero panels ──

/** `registru`: the courts with the most cases of the year, by level. */
export function TopCourtsPanel() {
  const [level, setLevel] = useState<MainLevel>('judecatorie')
  const [open, setOpen] = useState(false)
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="justice-hub-courts-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <MonoLabel id="justice-hub-courts-title" className="text-primary">
          <Trans>Cele mai încărcate instanțe, {YEAR}</Trans>
        </MonoLabel>
        <IndicatorToggle label={t`Nivelul instanțelor`} options={LEVEL_OPTIONS()} value={level} onChange={setLevel} />
      </div>
      <ShareRows key={level} className="mt-4" rows={courtRows(level, open ? 10 : 5)} />
      <button type="button" onClick={() => setOpen(!open)} className={SHOW_MORE_CLASS} aria-expanded={open}>
        {open ? <Trans>Arată mai puține</Trans> : <Trans>Arată mai multe</Trans>}
      </button>
      <p className="mt-3 text-xs text-muted-foreground">
        <Trans>După numărul de dosare cu data din {YEAR}.</Trans>
      </p>
    </section>
  )
}

/** `drum`: where the year's cases are, level by level and stage by stage — the way a case climbs. */
export function PathPanel() {
  const matrix = stageMatrix()
  const steps: readonly { readonly level: Level; readonly stages: readonly StageKey[] }[] = [
    { level: 'judecatorie', stages: ['fond'] },
    { level: 'tribunal', stages: ['fond', 'apel', 'contestatie'] },
    { level: 'curte_de_apel', stages: ['fond', 'apel', 'recurs', 'contestatie'] },
    { level: 'inalta_curte', stages: ['fond', 'recurs'] },
  ]
  const top = Math.max(...steps.map((step) => levelCount(step.level)), 1)
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="justice-hub-path-title">
      <MonoLabel id="justice-hub-path-title" className="text-primary">
        <Trans>Drumul unui dosar, {YEAR}</Trans>
      </MonoLabel>
      <ol className="mt-4">
        {steps.map((step, index) => {
          const count = levelCount(step.level)
          return (
            <li key={step.level} className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 pb-4 last:pb-0">
              {index < steps.length - 1 ? <span className="absolute bottom-0 left-[0.6rem] top-6 w-px bg-border" aria-hidden="true" /> : null}
              <MonoLabel className="relative z-10 flex size-5 items-center justify-center border bg-background tabular-nums text-muted-foreground">{index + 1}</MonoLabel>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium text-foreground">{courtLevelLabel(step.level)}</span>
                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">{countText(count)}</span>
                </div>
                <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                  <span className="block h-1 bg-primary/70" style={{ width: `${Math.max((count / top) * 100, 0.8).toFixed(1)}%` }} />
                </span>
                <MonoLabel className="mt-1 block text-muted-foreground">
                  {step.stages
                    .filter((stage) => (matrix[step.level]?.[stage] ?? 0) > 0)
                    .map((stage) => `${stageLabel(stage)} ${countText(matrix[step.level]?.[stage] ?? 0)}`)
                    .join(' · ')}
                </MonoLabel>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        <Trans>Dosarele cu data din {YEAR}, după instanța unde sunt și etapa în care se află.</Trans>
      </p>
    </section>
  )
}

/** `materii`: a hundred of the year's cases, by matter. */
export function HundredPanel() {
  const matters = mattersIn('toate')
  const leading = matters.slice(0, 5)
  const rest = 1 - leading.reduce((sum, matter) => sum + matter.share, 0)
  // Largest remainder: the hundred squares add up to a hundred.
  const cells = hundred([...leading.map((matter) => matter.share), rest])
  const tones = ['bg-primary', 'bg-primary/75', 'bg-primary/55', 'bg-primary/40', 'bg-primary/25', 'bg-muted-foreground/25']
  const labels = [...leading.map((matter) => caseCategoryLabel(matter.key) ?? matter.key), t`Altele`]
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="justice-hub-hundred-title">
      <MonoLabel id="justice-hub-hundred-title" className="text-primary">
        <Trans>Din 100 de dosare din {YEAR}</Trans>
      </MonoLabel>
      <div className="mt-4 grid grid-cols-10 gap-1" role="img" aria-label={labels.map((label, index) => `${label}: ${cells[index]}`).join(', ')}>
        {cells.flatMap((count, index) => Array.from({ length: count }, (_, cell) => <span key={`${index}-${cell}`} className={cn('aspect-square', tones[index])} />))}
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
        {labels.map((label, index) => (
          <li key={label} className="flex items-baseline gap-2">
            <span className={cn('size-2.5 shrink-0 translate-y-px', tones[index])} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="font-semibold tabular-nums">{cells[index]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function hundred(shares: readonly number[]): readonly number[] {
  const raw = shares.map((share) => share * 100)
  const floors = raw.map(Math.floor)
  let left = 100 - floors.reduce((sum, value) => sum + value, 0)
  const order = raw.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest)
  for (const { index } of order) {
    if (left <= 0) break
    floors[index] = (floors[index] ?? 0) + 1
    left -= 1
  }
  return floors
}

// ─────────────────────────────────────────────────────── the figures ──

export function FiguresBand() {
  const { i18n } = useLingui()
  const share = levelCount('judecatorie') / HUB.cases.inYear
  const echr = HUB.decisions.echrJudgments.reduce((sum, entry) => sum + entry.count, 0)
  const echrFrom = HUB.decisions.echrJudgments[0]?.key ?? ''
  const link = (hash: string) =>
    function BandLink(label: ReactNode, className: string) {
      return (
        <a href={`#${hash}`} className={className}>
          {label}
        </a>
      )
    }
  const facts: readonly HubFact[] = [
    {
      key: 'year',
      value: Math.round(HUB.cases.inYear / 10_000) / 100,
      digits: 2,
      unit: t`mil.`,
      label: <Trans>Dosare cu data din {YEAR}</Trans>,
      note: <Trans>{millionsText(HUB.cases.total)} de dosare pe portal, în total</Trans>,
      link: link('timp'),
    },
    {
      key: 'first',
      value: Math.round(share * 100),
      digits: 0,
      unit: '%',
      label: <Trans>La judecătorii</Trans>,
      note: <Trans>{countText(levelCount('judecatorie'))} de dosare în {YEAR}</Trans>,
      link: link('niveluri'),
    },
    {
      key: 'appeal',
      value: stageTotal('apel'),
      digits: 0,
      label: <Trans>Dosare în apel, {YEAR}</Trans>,
      note: <Trans>și {countText(stageTotal('recurs'))} în recurs</Trans>,
      link: link('niveluri'),
    },
    {
      key: 'echr',
      value: echr,
      digits: 0,
      label: <Trans>Hotărâri CEDO în cauze cu România</Trans>,
      note: <Trans>din {echrFrom}, una pentru fiecare hotărâre</Trans>,
      link: link('decizii'),
    },
  ]
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
      </RuledFrame>
    </section>
  )
}

export function SectionNav({ sections }: { readonly sections: readonly Section[] }) {
  return <HomeSectionNav title={t`Justiție`} sections={sections} />
}

// ─────────────────────────────────────────────────────────── the bands ──

const BAND_GRID = 'mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8'

export function CountiesBand({ index }: { readonly index: string }) {
  const layer = judecatoriiPerThousand()
  const definition: HubCountyBandDefinition = {
    legend: t`Dosare la judecătorii la 1.000 de locuitori, ${YEAR}`,
    unit: t`la 1.000 de locuitori`,
    digits: 1,
    caveat: t`Calculat de Transparenta.eu: dosarele cu data din ${YEAR} ale judecătoriilor din județ, la 1.000 de locuitori (populația INS din 1 ianuarie ${POPULATION_YEAR}); media țării, pe aceeași bază. Un dosar se judecă la instanța competentă, nu neapărat unde locuiesc părțile.`,
    source: null,
    open: t`Deschide instanțele județului`,
  }
  const top = layer ? [...layer.values].sort((a, b) => b.value - a.value)[0] : undefined
  return (
    <HomeBand id="judete" labelledBy="justice-hub-counties-title">
      <HubSectionHead
        titleId="justice-hub-counties-title"
        index={index}
        title={<Trans>Cât se judecă în județul tău</Trans>}
        lede={
          layer && top && layer.national !== null ? (
            <Trans>
              La judecătoriile țării s-au deschis {rateText(layer.national)} dosare la 1.000 de locuitori în {YEAR}; cele mai multe în {top.name} (
              {rateText(top.value)}).
            </Trans>
          ) : null
        }
      />
      {layer ? (
        <HubCountyBand layer={layer} definition={definition} countyLink={null} />
      ) : (
        <p className="mt-8 max-w-[56ch] border-y py-4 text-sm text-muted-foreground">
          <Trans>Populația județelor pentru {YEAR} nu e încă în datele paginii; harta revine odată cu ea.</Trans>
        </p>
      )}
    </HomeBand>
  )
}

export function MattersBand({ index }: { readonly index: string }) {
  const [scope, setScope] = useState<MatterScope>('toate')
  const matters = mattersIn(scope)
  const [first, second] = matters
  const top = first?.count ?? 1
  return (
    <HomeBand id="materii" labelledBy="justice-hub-matters-title">
      <div className={BAND_GRID.replace('mt-10 ', '')}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-hub-matters-title"
            index={index}
            title={<Trans>Ce se judecă</Trans>}
            lede={
              first && second ? (
                <Trans>
                  Din dosarele cu data din {YEAR}, {percentText(first.share)} sunt {(caseCategoryLabel(first.key) ?? first.key).toLowerCase()} și{' '}
                  {percentText(second.share)} {(caseCategoryLabel(second.key) ?? second.key).toLowerCase()}.
                </Trans>
              ) : null
            }
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <IndicatorToggle
            label={t`Instanțele`}
            options={[{ key: 'toate' as MatterScope, label: t`Toate` }, ...LEVEL_OPTIONS()]}
            value={scope}
            onChange={setScope}
          />
          <ShareRows
            key={scope}
            className="mt-4"
            numbered={false}
            rows={matters
              .filter((matter) => matter.count > 0)
              .map((matter) => ({
                key: matter.key,
                label: caseCategoryLabel(matter.key) ?? matter.key,
                meta: percentText(matter.share),
                value: countText(matter.count),
                fraction: matter.count / top,
              }))}
          />
        </div>
      </div>
    </HomeBand>
  )
}

function stageLabel(stage: StageKey | 'other'): string {
  switch (stage) {
    case 'fond':
      return t`Fond`
    case 'apel':
      return t`Apel`
    case 'recurs':
      return t`Recurs`
    case 'contestatie':
      return t`Contestație`
    case 'extraordinare':
      return t`Revizuiri și contestații în anulare`
    case 'other':
      return t`Alte etape`
  }
}

export function LevelsBand({ index }: { readonly index: string }) {
  const matrix = stageMatrix()
  const levels: readonly Level[] = ['judecatorie', 'tribunal', 'curte_de_apel', 'inalta_curte']
  const military = levelCount('tribunal_militar') + levelCount('curte_militara_apel')
  const fondAtFirst = (matrix.judecatorie?.fond ?? 0) / HUB.cases.inYear
  const columns: readonly (StageKey | 'other')[] = [...STAGE_KEYS, 'other']
  const max = Math.max(...levels.flatMap((level) => columns.map((column) => matrix[level]?.[column] ?? 0)), 1)
  return (
    <HomeBand id="niveluri" labelledBy="justice-hub-levels-title">
      <HubSectionHead
        titleId="justice-hub-levels-title"
        index={index}
        title={<Trans>Pe ce treaptă sunt dosarele</Trans>}
        lede={
          <Trans>
            {percentText(fondAtFirst)} dintre dosarele din {YEAR} sunt judecate în fond la judecătorii. Apelurile ajung mai ales la tribunale, recursurile la
            curțile de apel și la Înalta Curte.
          </Trans>
        }
      />
      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <caption className="sr-only">
            <Trans>Dosarele cu data din {YEAR}, după nivelul instanței și etapă</Trans>
          </caption>
          <thead>
            <tr className="border-b border-border/70">
              <th scope="col" className="py-2 pr-4 text-left font-normal">
                <MonoLabel className="text-muted-foreground">
                  <Trans>Instanța</Trans>
                </MonoLabel>
              </th>
              {columns.map((column) => (
                <th key={column} scope="col" className="px-2 py-2 text-right font-normal">
                  <MonoLabel className="text-muted-foreground">{stageLabel(column)}</MonoLabel>
                </th>
              ))}
              <th scope="col" className="py-2 pl-4 text-right font-normal">
                <MonoLabel className="text-muted-foreground">
                  <Trans>Total</Trans>
                </MonoLabel>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {levels.map((level) => (
              <tr key={level}>
                <th scope="row" className="py-2.5 pr-4 text-left font-medium text-foreground">
                  {courtLevelLabel(level)}
                </th>
                {columns.map((column) => {
                  const value = matrix[level]?.[column] ?? 0
                  return (
                    <td key={column} className="px-2 py-2.5 text-right align-top tabular-nums">
                      {value === 0 ? (
                        <span className="text-muted-foreground/60">—</span>
                      ) : (
                        <>
                          <span className="text-foreground">{countText(value)}</span>
                          <span className="ml-auto mt-1 block h-1 bg-muted" aria-hidden="true">
                            <span className="ml-auto block h-1 bg-primary/70" style={{ width: `${Math.max((value / max) * 100, 2).toFixed(1)}%` }} />
                          </span>
                        </>
                      )}
                    </td>
                  )
                })}
                <td className="py-2.5 pl-4 text-right align-top font-semibold tabular-nums text-foreground">{countText(levelCount(level))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-[68ch] text-xs leading-relaxed text-muted-foreground">
        <Trans>
          Etapa e cea de acum a dosarului, nu tot drumul lui. Instanțele militare au {countText(military)} de dosare în {YEAR}, numărate în total.
        </Trans>
      </p>
    </HomeBand>
  )
}

export function CourtsBand({ index }: { readonly index: string }) {
  const [level, setLevel] = useState<MainLevel>('tribunal')
  const [open, setOpen] = useState(false)
  const courts = courtsOf(level)
  const [first] = courts
  const busiestFive = courts.slice(0, 5).reduce((sum, court) => sum + court.share, 0)
  return (
    <HomeBand id="instante" labelledBy="justice-hub-courts-band-title">
      <div className={BAND_GRID.replace('mt-10 ', '')}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-hub-courts-band-title"
            index={index}
            title={<Trans>Instanțele</Trans>}
            lede={
              first ? (
                <Trans>
                  {courts.length} de instanțe de acest nivel. {courtName(first.code)} are {percentText(first.share)} din dosarele lor din {YEAR}, iar primele cinci{' '}
                  {percentText(busiestFive)}.
                </Trans>
              ) : null
            }
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <IndicatorToggle label={t`Nivelul instanțelor`} options={LEVEL_OPTIONS()} value={level} onChange={(value) => (setLevel(value), setOpen(false))} />
          <ShareRows key={level} className="mt-4" rows={courtRows(level, open ? courts.length : 10)} />
          {courts.length > 10 ? (
            <button type="button" onClick={() => setOpen(!open)} className={SHOW_MORE_CLASS} aria-expanded={open}>
              {open ? <Trans>Arată mai puține</Trans> : <Trans>Toate cele {courts.length}</Trans>}
            </button>
          ) : null}
        </div>
      </div>
    </HomeBand>
  )
}

export function YearsBand({ index }: { readonly index: string }) {
  const bars = yearBars()
  const top = Math.max(...bars.map((bar) => bar.count), 1)
  const firstDense = HUB.year - 2
  return (
    <HomeBand id="timp" labelledBy="justice-hub-years-title">
      <div className={BAND_GRID.replace('mt-10 ', '')}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-hub-years-title"
            index={index}
            title={<Trans>Dosarele, an de an</Trans>}
            lede={
              <Trans>
                Portalul a fost preluat complet de la {firstDense}. Anii dinainte au doar dosarele încă active mai târziu, iar ultimul an se oprește în{' '}
                {monthText(HUB.asOf.portalModifiedAt.slice(0, 7), 'long')}.
              </Trans>
            }
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            <Trans>Dosare după anul din portal</Trans>
          </MonoLabel>
          <ol className="mt-4 flex h-56 items-end gap-2 border-b border-border/70 sm:gap-3">
            {bars.map((bar) => (
              <li key={bar.year} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <span className="mb-1 block text-center text-[0.6875rem] tabular-nums text-muted-foreground">{millionsText(bar.count)}</span>
                <span
                  className={cn('block w-full', bar.partial ? 'border border-dashed border-primary/50 bg-primary/10' : bar.running ? 'bg-primary/45' : 'bg-primary/75')}
                  style={{ height: `${Math.max((bar.count / top) * 100, 1).toFixed(1)}%` }}
                  title={countText(bar.count)}
                />
              </li>
            ))}
          </ol>
          <ol className="mt-1.5 flex gap-2 sm:gap-3" aria-hidden="true">
            {bars.map((bar) => (
              <li key={bar.year} className="min-w-0 flex-1 text-center">
                <MonoLabel className="tabular-nums text-muted-foreground">{bar.year}</MonoLabel>
              </li>
            ))}
          </ol>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 border border-dashed border-primary/50 bg-primary/10" aria-hidden="true" />
              <Trans>preluare parțială</Trans>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 bg-primary/45" aria-hidden="true" />
              <Trans>an în curs, până în {monthText(HUB.asOf.portalModifiedAt.slice(0, 7), 'long')}</Trans>
            </li>
          </ul>
        </div>
      </div>
    </HomeBand>
  )
}

function SeriesBars({
  title,
  series,
  label,
  caveat,
}: {
  readonly title: ReactNode
  readonly series: readonly { readonly key: string; readonly count: number }[]
  readonly label: (key: string) => string
  readonly caveat: ReactNode
}) {
  const top = Math.max(...series.map((entry) => entry.count), 1)
  const total = series.reduce((sum, entry) => sum + entry.count, 0)
  const first = series[0]
  const last = series[series.length - 1]
  return (
    <div className="min-w-0" data-reveal>
      <div className="flex items-baseline justify-between gap-4 border-b border-border/70 pb-2">
        <MonoLabel className="text-primary">{title}</MonoLabel>
        <span className="text-sm font-semibold tabular-nums text-foreground">{countText(total)}</span>
      </div>
      <ol className="mt-3 flex h-28 items-end gap-0.5">
        {series.map((entry) => (
          <li
            key={entry.key}
            className="min-w-0 flex-1 bg-primary/70"
            style={{ height: `${Math.max((entry.count / top) * 100, 2).toFixed(1)}%` }}
            title={`${label(entry.key)}: ${countText(entry.count)}`}
          />
        ))}
      </ol>
      <div className="mt-1 flex justify-between">
        <MonoLabel className="tabular-nums text-muted-foreground">{first ? label(first.key) : ''}</MonoLabel>
        <MonoLabel className="tabular-nums text-muted-foreground">{last ? label(last.key) : ''}</MonoLabel>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{caveat}</p>
    </div>
  )
}

export function DecisionsBand({ index }: { readonly index: string }) {
  const echr = seriesOf(HUB.decisions.echrJudgments)
  const ccr = seriesOf(HUB.decisions.ccrByYear).filter((entry) => Number(entry.key) >= 2013)
  const cnsc = seriesOf(HUB.decisions.cnscByMonth)
  return (
    <HomeBand id="decizii" labelledBy="justice-hub-decisions-title">
      <HubSectionHead
        titleId="justice-hub-decisions-title"
        index={index}
        title={<Trans>Alte instanțe și autorități</Trans>}
        lede={
          <Trans>
            Hotărârile Curții Europene a Drepturilor Omului împotriva României, deciziile Curții Constituționale și ale Consiliului Național de Soluționare a
            Contestațiilor la achiziții.
          </Trans>
        }
      />
      <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
        <SeriesBars
          title={<Trans>Hotărâri CEDO, pe ani</Trans>}
          series={echr}
          label={(key) => key}
          caveat={<Trans>Doar hotărârile, una pe hotărâre (nu și versiunea în franceză); fără decizii de admisibilitate și comunicări.</Trans>}
        />
        <SeriesBars
          title={<Trans>Decizii CCR preluate, pe ani</Trans>}
          series={ccr}
          label={(key) => key}
          caveat={<Trans>Doar deciziile preluate până acum, nu toate deciziile Curții; fără dată, doar anul.</Trans>}
        />
        <SeriesBars
          title={<Trans>Decizii CNSC preluate, pe luni</Trans>}
          series={cnsc}
          label={(key) => monthText(key)}
          caveat={
            <Trans>
              Doar o parte din decizii, din {cnsc[0] ? monthText(cnsc[0].key, 'long') : ''}; firmele și instituțiile din ele sunt legate de CUI-uri nevalidate
              încă.
            </Trans>
          }
        />
      </div>
    </HomeBand>
  )
}
