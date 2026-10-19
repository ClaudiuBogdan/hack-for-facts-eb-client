import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRight } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { eventTitle, officeLabel } from '../shared/labels'
import { ElectionsSourceLine, MockBadge, PROTOTYPE_HREF, sectionIndex, ShareBar } from '../shared/parts'
import { SiblingsAside } from './lineage'
import { READ_AT, rowNature, yearsSpan } from './model'
import { usePageData, type PageData } from './page'
import { Band, ContestFigures, ContestHead, ContestMissing, contestNotes, EMPTY, IdentityFacts, LineageTable, OUT_LINK, RoundTag, RowTable, type Figure } from './parts'

/**
 * Variant „results": the page as it will read once results are served,
 * with every result band marked as a sample shape (`MockBadge`, placeholder
 * names, no figures), beside the live parts: the head, the identity as
 * served and the row's history. It argues the layout, not the data.
 */
export function ScrutinResults() {
  const data = usePageData()
  if (data.state !== 'ready') return <ContestMissing contestKey={data.read.key} parsed={data.read.parsed} failed={data.state === 'failed'} onRetry={data.read.retry} />
  return <ResultsView data={data} />
}

/** Placeholder competitors: a shape, never a figure. Letters, not people; bars by rank, not by any count. Read at render, in the reader's language. */
function sampleCompetitors() {
  return [
    { key: 'a', name: t`Candidat A`, list: t`Partidul A`, bar: 1 },
    { key: 'b', name: t`Candidat B`, list: t`Partidul B`, bar: 0.72 },
    { key: 'c', name: t`Candidat C`, list: t`Alianța C`, bar: 0.4 },
    { key: 'd', name: t`Candidat D`, list: t`Independent`, bar: 0.18 },
  ] as const
}

function sampleLists() {
  return [
    { key: 'a', name: t`Lista A`, bar: 1 },
    { key: 'b', name: t`Lista B`, bar: 0.6 },
    { key: 'c', name: t`Lista C`, bar: 0.35 },
  ] as const
}

const DASH = <span className="text-muted-foreground">—</span>

function SampleCompetitors() {
  return (
    <RowTable
      head={[<Trans key="c">Competitor</Trans>, <Trans key="v">Voturi</Trans>, <Trans key="s">Stare</Trans>, <Trans key="p">Pondere</Trans>]}
      rows={sampleCompetitors().map((row, index) => ({
        key: row.key,
        cells: [
          <span key="c" className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2">
            <MonoLabel className="pt-0.5 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
            <span className="min-w-0">
              <span className="block text-foreground">{row.name}</span>
              <span className="block text-xs text-muted-foreground">{row.list}</span>
              <ShareBar fraction={row.bar} className="max-w-xs bg-muted/60" />
            </span>
          </span>,
          <span key="v" className="tabular-nums">
            {DASH}
          </span>,
          <MonoLabel key="s" className="text-muted-foreground">
            {t`statut: —`}
          </MonoLabel>,
          <span key="p" className="tabular-nums">
            {DASH}
          </span>,
        ],
      }))}
      caption={<Trans>Formă de probă: numele sunt litere, barele sunt ranguri de probă, nu date. Fiecare cifră va veni cu statutul ei din sursă; nimeni nu e „ales”.</Trans>}
    />
  )
}

function SampleTurnout() {
  const rows = [
    { key: 'registered', label: t`Alegători pe liste` },
    { key: 'cast', label: t`Voturi exprimate` },
    { key: 'valid', label: t`Voturi valabile` },
    { key: 'turnout', label: t`Prezența` },
  ]
  return (
    <ol className="divide-y divide-border/70 border-y border-border/70">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-4 px-1 py-2.5">
          <span className="text-sm text-foreground">{row.label}</span>
          <MonoLabel className="text-muted-foreground">{t`calitate: —`}</MonoLabel>
          <span className="text-sm tabular-nums">{DASH}</span>
        </li>
      ))}
    </ol>
  )
}

function SampleSeats() {
  return (
    <ol className="divide-y divide-border/70 border-y border-border/70">
      {sampleLists().map((row) => (
        <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-1 py-2.5">
          <span className="min-w-0">
            <span className="block text-sm text-foreground">{row.name}</span>
            <ShareBar fraction={row.bar} className="max-w-xs bg-muted/60" />
          </span>
          <span className="text-sm tabular-nums">{DASH}</span>
        </li>
      ))}
    </ol>
  )
}

function ResultsView({ data }: { readonly data: Extract<PageData, { state: 'ready' }> }) {
  const { identity, lineage, siblings, pending } = data
  const nature = identity.office === null ? null : rowNature(identity.office, identity.scopeType)
  const seatsApply = identity.office !== null && !['mayor', 'president', 'general_mayor', 'bucharest_general_mayor', 'referendum', 'county_president'].includes(identity.office)
  const sections = [
    { id: 'rezultat', label: t`Rezultatul` },
    { id: 'prezenta', label: t`Prezența` },
    ...(seatsApply ? [{ id: 'mandate', label: t`Mandate pe liste` }] : []),
    { id: 'rand', label: t`Rândul` },
    { id: 'istoric', label: t`Istoric` },
  ]
  const index = (id: string) => sectionIndex(sections, id)
  const span = lineage ? yearsSpan(lineage) : null
  const officeText = identity.office === null ? t`funcția` : (officeLabel(identity.office) ?? identity.office)

  const figures: readonly Figure[] = [
    { key: 'votes', value: null, label: <Trans>Voturi valabile</Trans>, note: <Trans>nepublicate încă</Trans>, href: '#rezultat' },
    { key: 'turnout', value: null, label: <Trans>Prezența la vot</Trans>, note: <Trans>nepublicată; va veni cu starea ei de calitate</Trans>, href: '#prezenta' },
    { key: 'competitors', value: null, label: <Trans>Competitori</Trans>, note: <Trans>nepublicați; candidați și liste, nu „aleși”</Trans>, href: '#rezultat' },
    {
      key: 'editions',
      value: lineage === undefined || lineage === null ? null : lineage.reduce((sum, entry) => sum + entry.editions.length, 0),
      pending: lineage === undefined,
      label: <Trans>Ediții cu acest rând</Trans>,
      note:
        lineage === null ? (
          <Trans>locul e al sursei; nu se leagă</Trans>
        ) : lineage && span ? (
          <Trans>
            în {lineage.length} grupări de alegeri, {span.first}–{span.last}
          </Trans>
        ) : (
          <Trans>după codul SIRUTA</Trans>
        ),
      href: '#istoric',
    },
  ]

  const sampleHead = <MockBadge />

  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <ContestHead
        identity={identity}
        pending={pending}
        topRight={<RoundTag identity={identity} />}
        aside={<SiblingsAside siblings={siblings} currentKey={identity.key} title={t`Edițiile de date ale acestei alegeri`} />}
      >
        {nature === 'reporting-location' || nature === 'roll-up' || nature === 'source-shape' ? (
          <p className="mt-4 max-w-[60ch] text-xs text-muted-foreground">
            {nature === 'reporting-location' ? (
              <Trans>Rândul e un loc de raportare al unei funcții mai largi; rezultatele lui vor fi cele raportate aici, nu cursa locului.</Trans>
            ) : nature === 'roll-up' ? (
              <Trans>Rândul e un centralizator al sursei; rezultatele lui nu vor fi suma rândurilor de sub el.</Trans>
            ) : (
              <Trans>Eticheta e forma unui tabel din sursă; ce va conține se va ști când sursa va fi deschisă.</Trans>
            )}
          </p>
        ) : null}
      </ContestHead>
      <HomeSectionNav title={t`Rând de scrutin`} sections={sections} />
      <ContestFigures figures={figures} />

      <Band
        id="rezultat"
        index={index('rezultat')}
        title={<Trans>Rezultatul</Trans>}
        lede={<Trans>Voturile valabile pe competitor, așa cum le va raporta sursa, fiecare cu statutul ei. Până atunci: forma, nu datele.</Trans>}
        aside={sampleHead}
        wide
      >
        <SampleCompetitors />
      </Band>

      <Band
        id="prezenta"
        index={index('prezenta')}
        title={<Trans>Prezența</Trans>}
        lede={<Trans>Alegătorii, voturile exprimate și cele valabile, cu starea de calitate a fiecărei cifre (verificată, neverificată, suspectă).</Trans>}
        aside={sampleHead}
      >
        <SampleTurnout />
      </Band>

      {seatsApply ? (
        <Band
          id="mandate"
          index={index('mandate')}
          title={<Trans>Mandate pe liste</Trans>}
          lede={<Trans>Alocarea mandatelor pe liste, după legea ediției; liste, nu persoane. Nimeni nu e „ales” pe această pagină.</Trans>}
          aside={sampleHead}
        >
          <SampleSeats />
        </Band>
      ) : null}

      <Band
        id="rand"
        index={index('rand')}
        title={<Trans>Rândul, așa cum e servit</Trans>}
        lede={<Trans>Fiecare câmp exact cum l-a raportat sursa; niciunul nu e încă verificat.</Trans>}
        aside={
          identity.event ? (
            <a href={PROTOTYPE_HREF.election(identity.event.key, identity.parsed.editionKey)} className={OUT_LINK}>
              <Trans>Ediția, în {eventTitle(identity.event).toLowerCase()}</Trans>
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          ) : undefined
        }
        wide
      >
        <IdentityFacts identity={identity} />
      </Band>

      <Band
        id="istoric"
        index={index('istoric')}
        title={<Trans>Istoric</Trans>}
        lede={
          data.joinable ? (
            <Trans>„{officeText}” la același loc, în fiecare ediție de date, grupat pe alegeri.</Trans>
          ) : (
            <Trans>Cheia locului e a sursei: rândul nu se leagă de alte ediții.</Trans>
          )
        }
        wide
      >
        {lineage === undefined ? (
          <HubPending rows={4} />
        ) : lineage === null ? (
          <p className={EMPTY}>
            <Trans>Pentru acest tip de loc nu există o cheie comună între ediții; pagina nu potrivește după nume.</Trans>
          </p>
        ) : (
          <LineageTable lineage={lineage} currentKey={identity.key} office={identity.office} />
        )}
      </Band>

      <RuledFrame className={cn('py-8')}>
        <ElectionsSourceLine
          readAt={READ_AT}
          notes={[
            ...contestNotes(identity),
            <Trans key="sample">Benzile marcate „date de probă” arată doar forma: litere în loc de nume, linii în loc de cifre. Nimic din ele nu e un rezultat.</Trans>,
          ]}
        />
      </RuledFrame>
    </div>
  )
}
