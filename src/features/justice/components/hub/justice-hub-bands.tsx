import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HomeBand, SHOW_MORE_CLASS } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubCountyBand, type HubCountyBandDefinition } from '@/features/statistics/components/hub/hub-county-band'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { courtShareRows } from '../../lib/hub-rows'
import {
  MAIN_LEVELS,
  courtsOf,
  echrJudgmentsTotal,
  firstWholeYear,
  hubYearBars,
  judecatoriiPerThousand,
  levelCount,
  mattersIn,
  sortedSeries,
  stageMatrix,
  stageTotal,
  type CountyPopulation,
  type MainLevel,
  type MatterScope,
} from '../../lib/hub-model'
import type { JusticeHubSnapshot } from '../../lib/hub-snapshot-types'
import { countText, millionsText, monthText, percentText, rateText } from '../../lib/judicial-format'
import { caseCategoryLabel, courtLevelGenitive, courtLevelLabel, courtLevelPlural, courtName, stageLabel } from '../../lib/judicial-labels'
import { STAGE_KEYS, type StageKey } from '../../lib/judicial-model'
import { JusticeYearsChart } from '../justice-years-chart'
import { ShareRows } from '../justice-rows'

/** A band's head beside its body, from a wide screen. */
const BAND_GRID = 'grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8'

function bandLink(hash: string) {
  return function BandLink(label: ReactNode, className: string) {
    return (
      <a href={`#${hash}`} className={className}>
        {label}
      </a>
    )
  }
}

/** The four figures a reader comes for; each opens the band that breaks it down. */
export function JusticeHubFigures({ snapshot }: { readonly snapshot: JusticeHubSnapshot }) {
  const { i18n } = useLingui()
  const { year } = snapshot
  const first = levelCount(snapshot, 'judecatorie')
  const echr = echrJudgmentsTotal(snapshot)
  const echrFrom = sortedSeries(snapshot.decisions.echrJudgments)[0]?.key ?? ''
  const facts: readonly HubFact[] = [
    {
      key: 'year',
      value: Math.round(snapshot.cases.inYear / 10_000) / 100,
      digits: 2,
      unit: t`mil.`,
      label: <Trans>Dosare cu data din {year}</Trans>,
      note: <Trans>{millionsText(snapshot.cases.total)} de dosare în total, cu arhiva ÎCCJ</Trans>,
      link: bandLink('timp'),
    },
    {
      key: 'first',
      value: snapshot.cases.inYear === 0 ? 0 : Math.round((first / snapshot.cases.inYear) * 100),
      digits: 0,
      unit: '%',
      label: <Trans>La judecătorii</Trans>,
      note: <Trans>{countText(first)} de dosare în {year}</Trans>,
      link: bandLink('trepte'),
    },
    {
      key: 'appeal',
      value: stageTotal(snapshot, 'apel'),
      digits: 0,
      label: <Trans>Dosare în apel, {year}</Trans>,
      note: <Trans>și {countText(stageTotal(snapshot, 'recurs'))} în recurs</Trans>,
      link: bandLink('trepte'),
    },
    {
      key: 'echr',
      value: echr,
      digits: 0,
      label: <Trans>Hotărâri CEDO în cauze cu România</Trans>,
      note: <Trans>din {echrFrom}, una pentru fiecare hotărâre</Trans>,
      link: bandLink('decizii'),
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

export function JusticeCountiesBand({ snapshot, population, index }: { readonly snapshot: JusticeHubSnapshot; readonly population: CountyPopulation; readonly index: string }) {
  const { year } = snapshot
  const layer = judecatoriiPerThousand(snapshot, population)
  const definition: HubCountyBandDefinition = {
    legend: t`Dosare la judecătorii la 1.000 de locuitori, ${year}`,
    unit: t`la 1.000 de locuitori`,
    digits: 1,
    caveat: t`Calculat de Transparenta.eu: dosarele cu data din ${year} ale judecătoriilor din județ, la 1.000 de locuitori (populația INS din 1 ianuarie ${population.year}); media țării, pe aceeași bază. Un dosar se judecă la instanța competentă, nu neapărat unde locuiesc părțile.`,
    source: null,
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
              La judecătoriile țării sunt {rateText(layer.national)} dosare cu data din {year} la 1.000 de locuitori; cele mai multe în {top.name} (
              {rateText(top.value)}).
            </Trans>
          ) : null
        }
      />
      {layer ? (
        <HubCountyBand layer={layer} definition={definition} countyLink={null} />
      ) : (
        <p className="mt-8 max-w-[56ch] border-y py-4 text-sm text-muted-foreground">
          <Trans>Populația județelor pentru {year} nu e încă în datele paginii, iar o rată pe locuitor cere populația aceluiași an. Harta revine odată cu ea.</Trans>
        </p>
      )}
    </HomeBand>
  )
}

export function JusticeMattersBand({
  snapshot,
  index,
  scope,
  onScope,
}: {
  readonly snapshot: JusticeHubSnapshot
  readonly index: string
  readonly scope: MatterScope
  readonly onScope: (scope: MatterScope) => void
}) {
  const matters = mattersIn(snapshot, scope)
  const [first, second] = matters
  const top = first?.count ?? 1
  const name = (key: string) => caseCategoryLabel(key) ?? key
  return (
    <HomeBand id="materii" labelledBy="justice-hub-matters-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-hub-matters-title"
            index={index}
            title={<Trans>Ce se judecă</Trans>}
            lede={
              first && second ? (
                <Trans>
                  Dintre dosarele cu data din {snapshot.year}, {percentText(first.share)} sunt la materia „{name(first.key)}”, iar {percentText(second.share)} la „
                  {name(second.key)}”.
                </Trans>
              ) : null
            }
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <IndicatorToggle
            label={t`Instanțele`}
            options={[{ key: 'toate' as MatterScope, label: t`Toate` }, ...MAIN_LEVELS.map((key) => ({ key: key as MatterScope, label: courtLevelPlural(key) }))]}
            value={scope}
            onChange={onScope}
          />
          <ShareRows
            key={scope}
            className="mt-4"
            numbered={false}
            rows={matters.map((matter) => ({
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

export function JusticeLevelsBand({ snapshot, index }: { readonly snapshot: JusticeHubSnapshot; readonly index: string }) {
  const matrix = stageMatrix(snapshot)
  const levels = ['judecatorie', 'tribunal', 'curte_de_apel', 'inalta_curte'] as const
  const military = levelCount(snapshot, 'tribunal_militar') + levelCount(snapshot, 'curte_militara_apel')
  const fondAtFirst = snapshot.cases.inYear === 0 ? 0 : (matrix.judecatorie?.fond ?? 0) / snapshot.cases.inYear
  const columns: readonly (StageKey | 'other')[] = [...STAGE_KEYS, 'other']
  const max = Math.max(...levels.flatMap((level) => columns.map((column) => matrix[level]?.[column] ?? 0)), 1)
  return (
    <HomeBand id="trepte" labelledBy="justice-hub-levels-title">
      <HubSectionHead
        titleId="justice-hub-levels-title"
        index={index}
        title={<Trans>Pe ce treaptă sunt dosarele</Trans>}
        lede={
          <Trans>
            {percentText(fondAtFirst)} dintre dosarele din {snapshot.year} sunt judecate în fond la judecătorii. Apelurile ajung mai ales la tribunale,
            recursurile la curțile de apel și la Înalta Curte.
          </Trans>
        }
      />
      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <caption className="sr-only">
            <Trans>Dosarele cu data din {snapshot.year}, după nivelul instanței și etapă</Trans>
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
                        <span className="text-muted-foreground/60" aria-label={t`niciun dosar`}>
                          —
                        </span>
                      ) : (
                        <>
                          <span className="text-foreground">{countText(value)}</span>
                          <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                            <span className="ml-auto block h-1 bg-primary/70" style={{ width: `${Math.max((value / max) * 100, 2).toFixed(1)}%` }} />
                          </span>
                        </>
                      )}
                    </td>
                  )
                })}
                <td className="py-2.5 pl-4 text-right align-top font-semibold tabular-nums text-foreground">{countText(levelCount(snapshot, level))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-[68ch] text-xs leading-relaxed text-muted-foreground">
        <Trans>
          Etapa e cea de acum a dosarului, nu tot drumul lui. Instanțele militare au {countText(military)} de dosare în {snapshot.year}, numărate în total.
        </Trans>
      </p>
    </HomeBand>
  )
}

export function JusticeCourtsBand({
  snapshot,
  index,
  level,
  onLevel,
}: {
  readonly snapshot: JusticeHubSnapshot
  readonly index: string
  readonly level: MainLevel
  readonly onLevel: (level: MainLevel) => void
}) {
  const [open, setOpen] = useState(false)
  const courts = courtsOf(snapshot, level)
  const [first] = courts
  const busiestFive = courts.slice(0, 5).reduce((sum, court) => sum + court.share, 0)
  return (
    <HomeBand id="instante" labelledBy="justice-hub-courts-band-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-hub-courts-band-title"
            index={index}
            title={<Trans>Instanțele</Trans>}
            lede={
              first ? (
                <Trans>
                  {courtName(first.code)} are {percentText(first.share)} din dosarele {courtLevelGenitive(level)} din {snapshot.year}, iar primele cinci,{' '}
                  {percentText(busiestFive)}.
                </Trans>
              ) : null
            }
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <IndicatorToggle
            label={t`Nivelul instanțelor`}
            options={MAIN_LEVELS.map((key) => ({ key, label: courtLevelPlural(key) }))}
            value={level}
            onChange={(value) => {
              setOpen(false)
              onLevel(value)
            }}
          />
          <ShareRows key={level} className="mt-4" rows={courtShareRows(snapshot, level, open ? courts.length : 10)} />
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

export function JusticeYearsBand({ snapshot, index }: { readonly snapshot: JusticeHubSnapshot; readonly index: string }) {
  const lastMonth = snapshot.asOf.portalModifiedAt.slice(0, 7)
  return (
    <HomeBand id="timp" labelledBy="justice-hub-years-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-hub-years-title"
            index={index}
            title={<Trans>Dosarele, an de an</Trans>}
            lede={
              <Trans>
                Portalul a fost preluat întreg din {firstWholeYear(snapshot)}. Anii dinainte au doar dosarele încă active mai târziu, iar ultimul an se oprește în{' '}
                {monthText(lastMonth, 'long')}.
              </Trans>
            }
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            <Trans>Dosare după anul din portal</Trans>
          </MonoLabel>
          <JusticeYearsChart className="mt-4" bars={hubYearBars(snapshot)} lastMonth={lastMonth} />
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
    <figure className="min-w-0" data-reveal>
      <div className="flex items-baseline justify-between gap-4 border-b border-border/70 pb-2">
        <MonoLabel className="text-primary">{title}</MonoLabel>
        <span className="text-sm font-semibold tabular-nums text-foreground">{countText(total)}</span>
      </div>
      <ol className="mt-3 flex h-28 items-end gap-0.5">
        {series.map((entry) => (
          <li key={entry.key} className="min-w-0 flex-1 bg-primary/70" style={{ height: `${Math.max((entry.count / top) * 100, 2).toFixed(1)}%` }}>
            <span className="sr-only">
              {label(entry.key)}: {countText(entry.count)}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-1 flex justify-between" aria-hidden="true">
        <MonoLabel className="tabular-nums text-muted-foreground">{first ? label(first.key) : ''}</MonoLabel>
        <MonoLabel className="tabular-nums text-muted-foreground">{last ? label(last.key) : ''}</MonoLabel>
      </div>
      <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">{caveat}</figcaption>
    </figure>
  )
}

export function JusticeDecisionsBand({ snapshot, index }: { readonly snapshot: JusticeHubSnapshot; readonly index: string }) {
  const echr = sortedSeries(snapshot.decisions.echrJudgments)
  // CCR's captured decisions are dense from 2013; one earlier row is a stray, not a year of decisions.
  const ccr = sortedSeries(snapshot.decisions.ccrByYear).filter((entry) => Number(entry.key) >= 2013)
  const cnsc = sortedSeries(snapshot.decisions.cnscByMonth)
  const cnscFrom = cnsc[0]
  return (
    <HomeBand id="decizii" labelledBy="justice-hub-decisions-title">
      <HubSectionHead
        titleId="justice-hub-decisions-title"
        index={index}
        title={<Trans>Alte instanțe și autorități</Trans>}
        lede={
          <Trans>
            Hotărârile Curții Europene a Drepturilor Omului în cauze cu România, deciziile Curții Constituționale și ale Consiliului Național de Soluționare a
            Contestațiilor din achiziții.
          </Trans>
        }
      />
      <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
        <SeriesBars
          title={<Trans>Hotărâri CEDO, pe ani</Trans>}
          series={echr}
          label={(key) => key}
          caveat={<Trans>Doar hotărârile, câte una (nu și traducerea), fără deciziile de admisibilitate și comunicări.</Trans>}
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
            cnscFrom ? (
              <Trans>
                Doar o parte din decizii, din {monthText(cnscFrom.key, 'long')}; firmele și instituțiile din ele sunt legate de CUI-uri încă nevalidate.
              </Trans>
            ) : null
          }
        />
      </div>
    </HomeBand>
  )
}
