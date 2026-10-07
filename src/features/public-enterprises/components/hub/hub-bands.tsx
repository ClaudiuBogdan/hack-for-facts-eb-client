import { useMemo, useState } from 'react'
import { msg, plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { divisionLabel } from '@/features/private-companies/lib/caen-divisions'
import { HomeBand } from '@/features/procurement/components/home/home-chrome'
import { HubCountyBand, type HubCountyBandDefinition } from '@/features/statistics/components/hub/hub-county-band'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import type { PublicEnterprisePopulation, PublicEnterpriseSizeMeasure } from '@/schemas/public-enterprises'
import { displayName, formatCount, formatLei, formatShare } from '../../lib/hub-format'
import { authorityKinds, countyLayer, largestEnterprises, populationTotal, sectorRanking, statusesWithRest, unplacedCount, withoutSector } from '../../lib/hub-model'
import type { PublicEnterpriseHubSnapshot, PublicEnterpriseStatusCount } from '../../lib/hub-snapshot-types'
import {
  authorityKindLabel,
  controlLede,
  nextYearText,
  publishersText,
  countiesLede,
  moneyLede,
  registryStatusLabel,
  s1001StatusLabel,
  sectorsLede,
  sizeLede,
  sourceStatusLabel,
  statusLede,
} from '../../lib/hub-text'
import { BandColumns, BandNote, RankedRows, ShowMore, type RankedRow } from './hub-parts'

/**
 * The hub's bands, one question each, every sentence and figure read off the
 * snapshot: who controls the enterprises, where their seat is, what they do,
 * how large they are, the state each source gives, their link to public money.
 */

const BAND_ROWS = 8
const BAND_ROWS_OPEN = 20

type BandProps = { readonly snapshot: PublicEnterpriseHubSnapshot; readonly index: string }

function PopulationToggle({ value, onChange }: { readonly value: PublicEnterprisePopulation; readonly onChange: (value: PublicEnterprisePopulation) => void }) {
  return (
    <IndicatorToggle
      label={t`Întreprinderile`}
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

/** Who controls them: by the kind of authority, as the authority's own budget record gives it. */
export function ControlBand({ snapshot, index }: BandProps) {
  const { i18n } = useLingui()
  const titleId = 'public-enterprises-control-title'
  const listed = snapshot.control.central + snapshot.control.local
  const kinds = authorityKinds(snapshot)
  const top = kinds[0]?.enterprises ?? 0
  return (
    <HomeBand id="control" labelledBy={titleId}>
      <BandColumns
        titleId={titleId}
        index={index}
        title={
          <Trans>
            Cine le{' '}
            <br />
            controlează
          </Trans>
        }
        lede={controlLede(snapshot, i18n.locale)}
      >
        <RankedRows
          rows={kinds.map((row) => ({
            key: `${row.kind}-${row.level}`,
            label: authorityKindLabel(row.kind, row.level),
            caption: [row.level === 'central' ? t`stat` : t`local`, formatShare(row.enterprises, listed, i18n.locale)].filter(Boolean).join(' · '),
            value: formatCount(row.enterprises, i18n.locale),
            fraction: top > 0 ? row.enterprises / top : null,
          }))}
        />
        <BandNote>
          {t`Din cele ${formatCount(listed, i18n.locale)} din lista ANAF. Tipul autorității e cel din fișa ei din buget, nu din nume.`}
          {snapshot.control.noS1001 > 0
            ? ` ${plural(snapshot.control.noS1001, { one: 'Una nu e în listă.', other: `${formatCount(snapshot.control.noS1001, i18n.locale)} nu sunt în listă.` })}`
            : null}
        </BandNote>
      </BandColumns>
    </HomeBand>
  )
}

/** Where their seat is: the enterprises by county, on the hubs' county band. */
export function CountiesBand({ snapshot, index, population, onPopulation }: BandProps & { readonly population: PublicEnterprisePopulation; readonly onPopulation: (value: PublicEnterprisePopulation) => void }) {
  const { i18n } = useLingui()
  const titleId = 'public-enterprises-counties-title'
  const layer = useMemo(() => countyLayer(snapshot, population), [snapshot, population])
  const unplaced = unplacedCount(snapshot, population)
  const definition = useMemo<HubCountyBandDefinition>(
    () => ({
      legend:
        population === 'locale'
          ? i18n._(msg`Întreprinderi ale autorităților locale, după sediu`)
          : population === 'centrale'
            ? i18n._(msg`Întreprinderi ale statului central, după sediu`)
            : i18n._(msg`Întreprinderi publice, după sediu`),
      unit: i18n._(msg`întreprinderi`),
      countUnit: (value: number) => plural(value, { one: 'întreprindere', few: 'întreprinderi', other: 'de întreprinderi' }),
      digits: 0,
      ramp: 'steps',
      caveat:
        unplaced > 0
          ? plural(unplaced, {
              one: 'După sediul din registrul comerțului; o întreprindere nu are județ acolo.',
              other: `După sediul din registrul comerțului; ${formatCount(unplaced, i18n.locale)} nu au județ acolo.`,
            })
          : i18n._(msg`După sediul din registrul comerțului.`),
      source: null,
    }),
    [population, unplaced, i18n],
  )
  return (
    <HomeBand id="judete" labelledBy={titleId}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <HubSectionHead
            titleId={titleId}
            index={index}
            title={
              <Trans>
                Unde își au{' '}
                <br />
                sediul
              </Trans>
            }
            lede={countiesLede(snapshot, population, i18n.locale)}
          />
        </div>
        <div className="lg:col-span-5 lg:justify-self-end">
          <PopulationToggle value={population} onChange={onPopulation} />
        </div>
      </div>
      <div className="mt-8" data-reveal>
        <HubCountyBand key={layer.code} layer={layer} definition={definition} countyLink={null} />
      </div>
    </HomeBand>
  )
}

/** What they do: the main activity ANAF holds for each, by CAEN division. */
export function SectorsBand({ snapshot, index, population, onPopulation }: BandProps & { readonly population: PublicEnterprisePopulation; readonly onPopulation: (value: PublicEnterprisePopulation) => void }) {
  const { i18n } = useLingui()
  const [open, setOpen] = useState(false)
  const titleId = 'public-enterprises-sectors-title'
  const rows = sectorRanking(snapshot, population)
  const whole = populationTotal(snapshot, population)
  const top = rows[0]?.count ?? 0
  const shown = open ? rows : rows.slice(0, BAND_ROWS)
  return (
    <HomeBand id="domenii" labelledBy={titleId}>
      <BandColumns
        titleId={titleId}
        index={index}
        title={
          <Trans>
            Ce{' '}
            <br />
            fac
          </Trans>
        }
        lede={sectorsLede(snapshot, population, i18n.locale)}
      >
        <div className="mb-5 sm:w-fit">
          <PopulationToggle value={population} onChange={onPopulation} />
        </div>
        <RankedRows
          key={population}
          rows={shown.map((row) => ({
            key: row.division,
            label: divisionLabel(row.division),
            caption: [`CAEN ${row.division}`, formatShare(row.count, whole, i18n.locale)].filter(Boolean).join(' · '),
            value: formatCount(row.count, i18n.locale),
            fraction: top > 0 ? row.count / top : null,
          }))}
        />
        {rows.length > BAND_ROWS ? (
          <ShowMore
            open={open}
            onToggle={() => setOpen(!open)}
            all={plural(rows.length, { one: 'Singurul domeniu', few: `Toate cele ${formatCount(rows.length, i18n.locale)} domenii`, other: `Toate cele ${formatCount(rows.length, i18n.locale)} de domenii` })}
          />
        ) : null}
        <BandNote>{t`Activitatea principală declarată la ANAF, pe diviziuni CAEN; ANAF nu spune revizia codului. Fără cod: ${formatCount(withoutSector(snapshot, population), i18n.locale)}.`}</BandNote>
      </BandColumns>
    </HomeBand>
  )
}

function SizeToggle({ value, onChange }: { readonly value: PublicEnterpriseSizeMeasure; readonly onChange: (value: PublicEnterpriseSizeMeasure) => void }) {
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

/** How large they are: the financial year's turnover, headcount or loss, as each filed it. */
export function SizeBand({ snapshot, index, measure, onMeasure }: BandProps & { readonly measure: PublicEnterpriseSizeMeasure; readonly onMeasure: (value: PublicEnterpriseSizeMeasure) => void }) {
  const { i18n } = useLingui()
  const [open, setOpen] = useState(false)
  const titleId = 'public-enterprises-size-title'
  const year = snapshot.financials.year
  const rows = largestEnterprises(snapshot, measure)
  const top = Number(rows[0]?.value ?? 0)
  const shown = rows.slice(0, open ? BAND_ROWS_OPEN : BAND_ROWS)
  return (
    <HomeBand id="marime" labelledBy={titleId}>
      <BandColumns
        titleId={titleId}
        index={index}
        title={
          <Trans>
            Cât de{' '}
            <br />
            mari sunt
          </Trans>
        }
        lede={sizeLede(snapshot, i18n.locale)}
      >
        <div className="mb-5 sm:w-fit">
          <SizeToggle value={measure} onChange={onMeasure} />
        </div>
        <RankedRows
          numbered
          key={measure}
          rows={shown.map<RankedRow>((row) => ({
            key: row.cui,
            label: displayName(row.name),
            title: row.name ?? undefined,
            // The marker first: a long name is cut at the row's end.
            caption: row.authority ? [row.authorityNameSource !== 's1001' ? t`nume din altă sursă` : null, displayName(row.authority)].filter(Boolean).join(' · ') : undefined,
            value: measure === 'salariati' ? formatCount(Number(row.value), i18n.locale) : formatLei(row.value, i18n.locale),
            fraction: top > 0 ? Number(row.value) / top : null,
            link: { page: 'enterprise', cui: row.cui },
          }))}
        />
        {rows.length > BAND_ROWS ? <ShowMore open={open} onToggle={() => setOpen(!open)} /> : null}
        <BandNote>
          {t`Bilanțurile pe ${year} ${publishersText(snapshot.financials.publishers)}, doar valorile admise de verificarea firmelor.`} {nextYearText(snapshot, i18n.locale)}{' '}
          {t`Sub nume, autoritatea din lista ANAF.`}
        </BandNote>
      </BandColumns>
    </HomeBand>
  )
}

const STATUS_ROWS = 6

/**
 * One source's statuses, in its own words: the most frequent, then the rest in
 * one row, then the members the source holds no row for (`absent`), so every
 * member is counted once.
 */
function StatusGroup({
  title,
  statuses,
  label,
  absent,
}: {
  readonly title: string
  readonly statuses: readonly PublicEnterpriseStatusCount[]
  readonly label: (status: string | null) => string
  readonly absent?: { readonly label: string; readonly value: number }
}) {
  const { i18n } = useLingui()
  const { rows, rest } = statusesWithRest(statuses, STATUS_ROWS)
  const shown = [
    ...rows.map((row) => ({ key: row.status ?? '∅', label: label(row.status), value: row.enterprises })),
    ...(rest > 0 ? [{ key: 'rest', label: t`Alte stări`, value: rest }] : []),
    ...(absent && absent.value > 0 ? [{ key: 'absent', ...absent }] : []),
  ]
  const top = Math.max(0, ...shown.map((row) => row.value))
  return (
    <div>
      <MonoLabel className="block text-muted-foreground">{title}</MonoLabel>
      <RankedRows dense className="mt-2" rows={shown.map((row) => ({ key: row.key, label: row.label, value: formatCount(row.value, i18n.locale), fraction: top > 0 ? row.value / top : null }))} />
    </div>
  )
}

/** The state they are in, as each source says it: never merged into one status. */
export function StatusBand({ snapshot, index }: BandProps) {
  const { i18n } = useLingui()
  const titleId = 'public-enterprises-status-title'
  const year = snapshot.financials.year
  return (
    <HomeBand id="stare" labelledBy={titleId}>
      <BandColumns
        titleId={titleId}
        index={index}
        title={
          <Trans>
            În ce stare{' '}
            <br />
            sunt
          </Trans>
        }
        lede={statusLede(snapshot, i18n.locale)}
      >
        <div className="grid gap-8">
          <StatusGroup title={t`Lista ANAF`} statuses={snapshot.status.s1001} label={s1001StatusLabel} absent={{ label: t`Nu e în listă`, value: snapshot.status.s1001NotListed }} />
          <StatusGroup title={t`Registrul comerțului`} statuses={snapshot.status.onrc} label={registryStatusLabel} absent={{ label: t`Fără fișă de firmă`, value: snapshot.status.onrcMissing }} />
          <StatusGroup
            title={t`Registrul AMEPIP, ${year}`}
            statuses={snapshot.status.amepip}
            label={sourceStatusLabel}
            absent={{ label: t`Fără rând în registru pe ${year}`, value: snapshot.status.amepipMissing }}
          />
        </div>
        <BandNote>
          {t`Fiecare stare cu sursa ei. ANAF declară inactive fiscal ${formatCount(snapshot.status.anafInactive, i18n.locale)} dintre ele, ${formatCount(snapshot.status.crossings.fiscallyInactiveButS1001Active, i18n.locale)} fiind active în lista ANAF.`}
        </BandNote>
      </BandColumns>
    </HomeBand>
  )
}

/** Their link to public money: as buyers and sellers in SEAP. Counts of enterprises, never sums of money. */
export function MoneyBand({ snapshot, index }: BandProps) {
  const { i18n } = useLingui()
  const titleId = 'public-enterprises-money-title'
  const { procurement } = snapshot
  const whole = snapshot.members.current
  const n = (value: number) => formatCount(value, i18n.locale)
  const row = (key: string, label: string, value: number): RankedRow => ({ key, label, caption: formatShare(value, whole, i18n.locale) ?? undefined, value: n(value), fraction: whole > 0 ? value / whole : null })
  return (
    <HomeBand id="bani" labelledBy={titleId}>
      <BandColumns
        titleId={titleId}
        index={index}
        title={t`Banii publici`}
        lede={moneyLede(snapshot, i18n.locale)}
      >
        <RankedRows
          rows={[
            row('buyer-direct', t`Cumpără prin achiziții directe`, procurement.buyerDirect),
            row('buyer-awards', t`Atribuie contracte prin proceduri`, procurement.buyerAwards),
            row('sellers', t`Vând instituțiilor prin achiziții directe`, procurement.sellers),
          ]}
        />
        <BandNote>
          {t`Întreprinderi cu cel puțin o înregistrare în SEAP, ${procurement.from.slice(0, 4)}–${procurement.to.slice(0, 4)}, din ${n(whole)}. Achizițiile sunt atribuiri, nu plăți.`}{' '}
          {procurement.unknown > 0 ? `${t`SEAP nu a răspuns pentru ${n(procurement.unknown)}: cifrele sunt minime.`} ` : null}
          {t`Autoritățile din lista ANAF: ${n(snapshot.control.s1001Authorities)}, dintre care ${n(snapshot.control.s1001AuthoritiesWithBudget)} cu bugetul în platformă, fiecare cu pagina ei.`}
        </BandNote>
      </BandColumns>
    </HomeBand>
  )
}
