import { type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import catalog from '../shared/catalog.fixture.json'
import {
  BAND_GRID,
  CatalogFigures,
  ElectionsHero,
  ElectionsSearch,
  ElectionsSourceLine,
  HeroPanel,
  MockBadge,
  Rows,
  ShareBar,
  sectionIndex,
  useFormat,
  type Row,
} from '../shared/parts'
import { DATA, SAMPLE_COMPETITORS, SAMPLE_COMPETITOR_TOTAL, SAMPLE_SEATS, SAMPLE_SEATS_TOTAL, SAMPLE_SUMMARY, SAMPLE_TURNOUT, type EvidenceStatus } from './model'
import { Dash, EventsBand, HubShell, Lede, Th, hubNotes, shortcuts } from './parts'

/**
 * `rezultate` — the front door shaped for the day results arrive: the live
 * catalog beside bands that show where votes, turnout (with its quality
 * status) and list seats will stand. Those bands carry sample data, said so
 * in each head (`MockBadge`), with placeholder names only — never a real
 * person, party or place beside an invented figure. The shapes follow the
 * scrapper's planned contract: a summary apart from a paged competitor list
 * (E17.b), every count with its evidence status (E17.d), seats as list
 * allocations, never people (§12.3 rule 8).
 */

function resultsNotes(): readonly ReactNode[] {
  return [
    <Trans key="sample">
      Benzile „Voturile", „Prezența" și „Mandatele pe liste" arată forma pe care o vor avea rezultatele, cu date de probă: nume de tipul „Partidul A" și cifre inventate, marcate ca
      atare. Nicio cifră de acolo nu descrie o alegere reală.
    </Trans>,
    <Trans key="seats">
      Mandatele vor fi mandate pe liste, calculate după legea alegerii și verificate față de sursă; o persoană nu va fi numită „aleasă" din poziția pe listă.
    </Trans>,
  ]
}

function statusWord(status: EvidenceStatus): string {
  switch (status) {
    case 'unchecked':
      return t`neverificat`
    case 'dq_suspect':
      return t`de verificat`
    case 'validated':
      return t`validat`
  }
}

function readinessWord(state: string): string {
  switch (state) {
    case 'VERIFIED':
      return t`verificat`
    case 'HELD':
      return t`reținut, de verificat`
    case 'UNAVAILABLE':
      return t`nepublicat`
    default:
      return t`necunoscut`
  }
}

/** Beside the headline: what the API says about its own readiness, the same on every edition. */
function ReadinessPanel() {
  const readiness = catalog.readiness.edition
  const rows: readonly Row[] = [
    { key: 'results', label: t`Voturi și prezență`, value: readinessWord(readiness.results), muted: readiness.results !== 'VERIFIED' },
    { key: 'mandates', label: t`Mandate pe liste`, value: readinessWord(readiness.mandates), muted: readiness.mandates !== 'VERIFIED' },
    { key: 'identity', label: t`Identitatea edițiilor (an, tip)`, value: readinessWord(readiness.identity), muted: readiness.identity !== 'VERIFIED' },
    { key: 'selection', label: t`Alegerea sursei pentru fiecare alegere`, value: readinessWord(readiness.sourceSelection), muted: readiness.sourceSelection !== 'VERIFIED' },
    { key: 'opening', label: t`Deschiderea fișierului-sursă`, value: readinessWord(readiness.sourceOpening), muted: readiness.sourceOpening !== 'VERIFIED' },
  ]
  return (
    <HeroPanel
      titleId="elections-hub-readiness-title"
      title={<Trans>Starea datelor, spusă de API</Trans>}
      footer={<Trans>Aceeași pe toate cele {DATA.editions.length} de ediții de date; benzile marcate „date de probă" arată unde vor sta rezultatele.</Trans>}
    >
      <Rows className="mt-4" rows={rows} />
    </HeroPanel>
  )
}

const SAMPLE_FRAME = 'border border-dashed border-foreground/30 p-4 sm:p-5'

/** The sample's caption: the badge is in the band's head, once; placeholder names say the rest. */
function SampleHead({ children }: { readonly children: ReactNode }) {
  return <MonoLabel className="block text-primary">{children}</MonoLabel>
}

function Status({ status }: { readonly status: EvidenceStatus }) {
  return <span className={cn('whitespace-nowrap text-xs', status === 'dq_suspect' ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>{statusWord(status)}</span>
}

function VotesBand({ index }: { readonly index: string }) {
  const format = useFormat()
  const valid = SAMPLE_SUMMARY.valid.value
  const top = SAMPLE_COMPETITORS[0]?.votes ?? 1
  const summary = [
    { key: 'registered', label: t`Înscriși`, count: SAMPLE_SUMMARY.registered },
    { key: 'present', label: t`Prezenți`, count: SAMPLE_SUMMARY.present },
    { key: 'valid', label: t`Voturi valabile`, count: SAMPLE_SUMMARY.valid },
    { key: 'invalid', label: t`Voturi nule`, count: SAMPLE_SUMMARY.invalid },
  ]
  return (
    <HomeBand id="voturi" labelledBy="elections-hub-votes-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="elections-hub-votes-title"
            index={index}
            title={<Trans>Voturile</Trans>}
            lede={
              <Trans>
                Când vor fi publicate: totalurile scrutinului, separat de lista concurenților, care vine pe pagini; fiecare cifră cu starea ei de verificare și cota cu numitorul
                spus.
              </Trans>
            }
            aside={<MockBadge />}
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <div className={SAMPLE_FRAME}>
            <SampleHead>
              <Trans>
                Primar · Localitatea A · turul 1 · {SAMPLE_SUMMARY.reportedUnits} din {SAMPLE_SUMMARY.expectedUnits} secții
              </Trans>
            </SampleHead>
            <dl className="mt-4 grid grid-cols-2 gap-px border bg-border/70 sm:grid-cols-4">
              {summary.map((item) => (
                <div key={item.key} className="bg-background px-3 py-2.5">
                  <dt>
                    <MonoLabel className="text-muted-foreground">{item.label}</MonoLabel>
                  </dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{format.n(item.count.value)}</dd>
                  <dd>
                    <Status status={item.count.status} />
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <MonoLabel className="text-muted-foreground">
                <Trans>Concurenți · cota din voturile valabile</Trans>
              </MonoLabel>
              <span className="text-xs tabular-nums text-muted-foreground">
                <Trans>
                  primii {SAMPLE_COMPETITORS.length} din {SAMPLE_COMPETITOR_TOTAL}
                </Trans>
              </span>
            </div>
            <Rows
              className="mt-2"
              numbered
              rows={SAMPLE_COMPETITORS.map((competitor): Row => ({
                key: competitor.key,
                label: t`Partidul ${competitor.key}`,
                meta: `${((competitor.votes / valid) * 100).toFixed(1).replace('.', ',')} % · ${statusWord('unchecked')}`,
                value: format.n(competitor.votes),
                fraction: competitor.votes / top,
              }))}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              <Trans>Pagina 1 din 3. Totalurile nu se schimbă cu pagina; un concurent din față e cel cu cele mai multe voturi, nu un câștigător declarat.</Trans>
            </p>
          </div>
        </div>
      </div>
    </HomeBand>
  )
}

function TurnoutBand({ index }: { readonly index: string }) {
  const format = useFormat()
  const suspect = SAMPLE_TURNOUT.filter((row) => row.status === 'dq_suspect').length
  return (
    <HomeBand id="prezenta" labelledBy="elections-hub-turnout-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="elections-hub-turnout-title"
            index={index}
            title={<Trans>Prezența</Trans>}
            lede={
              <Trans>
                Prezența vine cu starea ei: „neverificat" când totalul publicat nu a fost confruntat, „de verificat" când verificarea a găsit o nepotrivire. O prezență fără stare
                nu se afișează.
              </Trans>
            }
            aside={<MockBadge />}
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <div className={SAMPLE_FRAME}>
            <SampleHead>
              <Trans>Alegerea A · turul 1 · pe unități de raportare</Trans>
            </SampleHead>
            <table className="mt-4 w-full border-collapse text-sm">
              <caption className="sr-only">{t`Prezența pe unități, date de probă`}</caption>
              <thead>
                <tr className="border-b border-border/70">
                  <Th>
                    <Trans>Unitatea</Trans>
                  </Th>
                  <Th align="right" className="hidden px-2 sm:table-cell">
                    <Trans>Înscriși</Trans>
                  </Th>
                  <Th align="right" className="hidden px-2 sm:table-cell">
                    <Trans>Prezenți</Trans>
                  </Th>
                  <Th align="right" className="px-2">
                    <Trans>Prezența</Trans>
                  </Th>
                  <Th align="right">
                    <Trans>Starea</Trans>
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {SAMPLE_TURNOUT.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className="py-2.5 pr-2 text-left font-medium text-foreground">
                      {t`Localitatea ${row.key}`}
                    </th>
                    <td className="hidden px-2 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">{format.n(row.registered)}</td>
                    <td className="hidden px-2 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">{format.n(row.present)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-foreground">
                      {((row.present / row.registered) * 100).toFixed(1).replace('.', ',')} %
                      <ShareBar fraction={row.present / row.registered} className="ml-auto w-16" />
                    </td>
                    <td className="py-2.5 text-right">
                      <Status status={row.status} />
                    </td>
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="py-2.5 pr-2 text-left font-medium text-muted-foreground">
                    {t`Pe toată alegerea`}
                  </th>
                  <td className="hidden px-2 py-2.5 text-right sm:table-cell">
                    <Dash label={t`nu se adună unități cu stări diferite`} />
                  </td>
                  <td className="hidden px-2 py-2.5 text-right sm:table-cell">
                    <Dash label={t`nu se adună unități cu stări diferite`} />
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <Dash label={t`nu se adună unități cu stări diferite`} />
                  </td>
                  <td className="py-2.5 text-right text-xs text-muted-foreground">{t`necalificat`}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              <Trans>
                {suspect} din {SAMPLE_TURNOUT.length} unități de verificat; un total pe toată alegerea apare doar când toate unitățile lui sunt calificate, altfel o liniuță.
              </Trans>
            </p>
          </div>
        </div>
      </div>
    </HomeBand>
  )
}

function SeatsBand({ index }: { readonly index: string }) {
  const format = useFormat()
  const top = SAMPLE_SEATS[0]?.seats ?? 1
  return (
    <HomeBand id="mandate" labelledBy="elections-hub-seats-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="elections-hub-seats-title"
            index={index}
            title={<Trans>Mandatele pe liste</Trans>}
            lede={
              <Trans>
                Mandate pe liste, nu persoane: câte îi revin fiecărei liste după legea alegerii, cu metoda numită și cu starea verificării față de sursă. Cine le ocupă e un alt
                fapt, din altă sursă.
              </Trans>
            }
            aside={<MockBadge />}
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <div className={SAMPLE_FRAME}>
            <SampleHead>
              <Trans>Consiliul local · Localitatea A · {SAMPLE_SEATS_TOTAL} mandate</Trans>
            </SampleHead>
            <Rows
              className="mt-4"
              rows={SAMPLE_SEATS.map((list): Row => ({
                key: list.key,
                label: t`Lista ${list.key}`,
                meta: `${format.n(list.votes)} ${t`voturi`} · ${statusWord('validated')}`,
                value: list.seats === 1 ? t`1 mandat` : t`${list.seats} mandate`,
                fraction: list.seats / top,
              }))}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              <Trans>
                Metoda: legea alegerii (de exemplu Legea 67/2004, art. 96), calcul Transparenta.eu, confruntat cu mandatele publicate de sursă; starea e „validat", „de verificat"
                sau „tragere la sorți", pe fiecare scrutin.
              </Trans>
            </p>
          </div>
        </div>
      </div>
    </HomeBand>
  )
}

export function HubRezultate() {
  const sections = [
    { id: 'alegeri', label: t`Pe alegeri` },
    { id: 'voturi', label: t`Voturile` },
    { id: 'prezenta', label: t`Prezența` },
    { id: 'mandate', label: t`Mandatele` },
  ]
  return (
    <HubShell>
      <ElectionsHero
        idPrefix="elections-hub-rezultate"
        headline={
          <Trans>
            Voturile, prezența
            <br />
            și mandatele
          </Trans>
        }
        lede={<Lede after={<Trans>Pagina le are locul pregătit, marcat ca probă până atunci.</Trans>} />}
        search={<ElectionsSearch events={DATA.events} />}
        shortcuts={shortcuts([{ key: 'votes', label: <Trans>Unde vor sta voturile</Trans>, href: '#voturi' }])}
        panel={<ReadinessPanel />}
        source={<ElectionsSourceLine readAt={DATA.readAt} notes={hubNotes(resultsNotes())} />}
      />
      <HomeSectionNav title={t`Alegeri`} sections={sections} />
      <CatalogFigures data={DATA} links={{ events: 'alegeri', editions: 'alegeri', rows: 'alegeri', places: 'alegeri' }} />
      <EventsBand id="alegeri" index={sectionIndex(sections, 'alegeri')} titleId="elections-hub-events-title" />
      <VotesBand index={sectionIndex(sections, 'voturi')} />
      <TurnoutBand index={sectionIndex(sections, 'prezenta')} />
      <SeatsBand index={sectionIndex(sections, 'mandate')} />
    </HubShell>
  )
}
