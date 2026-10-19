import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { eventTitle, officeLabel, roundLabel, scopeLabel } from '../shared/labels'
import { PROTOTYPE_HREF, Rows, sectionIndex, type Row } from '../shared/parts'
import { yearsSpan } from './model'
import { usePageData, type PageData, type SiblingEdition } from './page'
import {
  Band,
  ContestFigures,
  ContestHead,
  ContestMissing,
  ContestSourceLine,
  EditionWord,
  EMPTY,
  LevelsList,
  LineageTable,
  OfficeWord,
  PlaceRowsTable,
  ResultsEmpty,
  RoundTag,
  type Figure,
} from './parts'

/**
 * Variant „lineage": the row's history is the spine. The head says what
 * the row is; the band that follows lists the same office at the same
 * SIRUTA code in every edition, grouped by election; then the place in this
 * edition, the office's other levels, and where results will go.
 */
export function ScrutinLineage() {
  const data = usePageData()
  if (data.state !== 'ready') return <ContestMissing contestKey={data.read.key} parsed={data.read.parsed} failed={data.state === 'failed'} onRetry={data.read.retry} />
  return <LineageView data={data} />
}

/** The election's editions at the head's right, each with this office's row at this place when the index holds one. */
export function SiblingsAside({ siblings, currentKey, title }: { readonly siblings: readonly SiblingEdition[]; readonly currentKey: string; readonly title: string }) {
  const rows: readonly Row[] = siblings.map((sibling) => {
    const own = sibling.rows?.find((row) => row.key !== currentKey)
    const value = sibling.current ? (
      <MonoLabel className="text-primary">{t`această pagină`}</MonoLabel>
    ) : sibling.rows === null ? (
      <span className="text-muted-foreground">{t`—`}</span>
    ) : sibling.rows.length === 0 ? (
      <span className="text-muted-foreground">{t`fără acest rând`}</span>
    ) : (
      <span className="tabular-nums">{sibling.rows.map((row) => roundLabel(row.round)).join(', ')}</span>
    )
    return {
      key: sibling.edition.key,
      label: <EditionWord edition={sibling.edition} editionKey={sibling.edition.key} />,
      value,
      muted: !sibling.current,
      link: own
        ? (body, className) => (
            <a href={PROTOTYPE_HREF.contest(own.key)} className={className}>
              {body}
            </a>
          )
        : undefined,
    }
  })
  return (
    <div>
      <MonoLabel className="block text-muted-foreground">{title}</MonoLabel>
      <Rows rows={rows} className="mt-4" />
      <p className="mt-3 text-xs text-muted-foreground">
        <Trans>Edițiile aceleiași alegeri se suprapun și nu se adună; un rând lipsă dintr-o ediție nu înseamnă că nu au fost alegeri.</Trans>
      </p>
    </div>
  )
}

function LineageView({ data }: { readonly data: Extract<PageData, { state: 'ready' }> }) {
  const { identity, lineage, rowsHere, rollups, siblings, countyRows, pending } = data
  const sections = [
    { id: 'istoric', label: t`Istoric` },
    { id: 'loc', label: t`La același loc` },
    { id: 'niveluri', label: t`Alte niveluri` },
    { id: 'rezultate', label: t`Rezultate` },
  ]
  const index = (id: string) => sectionIndex(sections, id)
  const span = lineage ? yearsSpan(lineage) : null
  const officeText = identity.office === null ? t`funcția` : (officeLabel(identity.office) ?? identity.office)
  const officesHere = rowsHere ? new Set(rowsHere.map((row) => row.office)).size : null
  const officeRows = rollups.reduce((sum, level) => sum + level.rows, 0)

  const figures: readonly Figure[] = [
    {
      key: 'editions',
      value: lineage === undefined ? null : lineage === null ? null : lineage.reduce((sum, entry) => sum + entry.editions.length, 0),
      pending: lineage === undefined,
      label: <Trans>Ediții cu acest rând</Trans>,
      note:
        lineage === null ? (
          <Trans>locul e al sursei; nu se leagă între ediții</Trans>
        ) : lineage && span ? (
          <Trans>
            în {lineage.length} grupări de alegeri, din {span.first} până în {span.last}
          </Trans>
        ) : (
          <Trans>după codul SIRUTA</Trans>
        ),
      href: '#istoric',
    },
    {
      key: 'offices',
      value: officesHere,
      pending: rowsHere === undefined,
      label: <Trans>Funcții raportate aici, în ediție</Trans>,
      note: rowsHere === null ? <Trans>indexul leagă doar coduri SIRUTA</Trans> : <Trans>la acest loc de raportare</Trans>,
      href: '#loc',
    },
    {
      key: 'levels',
      value: rollups.length === 0 ? null : officeRows,
      label: <Trans>Rânduri ale funcției în ediție</Trans>,
      note: rollups.length === 0 ? <Trans>ediția nu e în fixtură</Trans> : <Trans>pe {rollups.length} niveluri raportate; nu curse</Trans>,
      href: '#niveluri',
    },
    { key: 'results', value: null, label: <Trans>Voturi, prezență, candidați</Trans>, note: <Trans>nepublicate încă</Trans>, href: '#rezultate' },
  ]

  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <ContestHead
        identity={identity}
        pending={pending}
        topRight={<RoundTag identity={identity} />}
        aside={<SiblingsAside siblings={siblings} currentKey={identity.key} title={t`Edițiile de date ale acestei alegeri`} />}
      />
      <HomeSectionNav title={t`Rând de scrutin`} sections={sections} />
      <ContestFigures figures={figures} />

      <Band
        id="istoric"
        index={index('istoric')}
        title={<Trans>Istoric</Trans>}
        lede={
          identity.scopeType === 'siruta' ? (
            <Trans>„{officeText}” la același cod SIRUTA, în fiecare ediție de date, grupat pe alegeri; cea mai nouă prima.</Trans>
          ) : identity.scopeType === 'national' ? (
            <Trans>„{officeText}” pe toată țara, în fiecare ediție de date care are un astfel de rând.</Trans>
          ) : (
            <Trans>Rândul nu se poate urmări în alte ediții: cheia locului e a sursei ({scopeLabel(identity.scopeType).toLowerCase()}).</Trans>
          )
        }
        wide
      >
        {lineage === undefined ? (
          <HubPending rows={5} />
        ) : lineage === null ? (
          <p className={EMPTY}>
            <Trans>Pentru acest tip de loc nu există o cheie comună între ediții; pagina nu potrivește după nume.</Trans>
          </p>
        ) : lineage.length === 0 ? (
          <p className={EMPTY}>
            <Trans>Indexul nu are acest rând în nicio ediție.</Trans>
          </p>
        ) : (
          <LineageTable lineage={lineage} currentKey={identity.key} office={identity.office} />
        )}
      </Band>

      <Band
        id="loc"
        index={index('loc')}
        title={<Trans>La același loc, în această ediție</Trans>}
        lede={
          identity.event ? (
            <Trans>
              Tot ce a raportat sursa la acest loc în {eventTitle(identity.event).toLowerCase()}, ediția „{identity.parsed.editionKey}”: fiecare rând, cu ce este.
            </Trans>
          ) : (
            <Trans>Tot ce a raportat sursa la acest loc în ediția „{identity.parsed.editionKey}”.</Trans>
          )
        }
        wide
      >
        {rowsHere === undefined ? (
          <HubPending rows={3} />
        ) : rowsHere === null ? (
          <p className={EMPTY}>
            <Trans>API-ul nu filtrează rândurile după loc, iar indexul leagă doar coduri SIRUTA. Rândurile ediției se deschid din pagina ei.</Trans>
          </p>
        ) : (
          <PlaceRowsTable rows={rowsHere} currentKey={identity.key} />
        )}
      </Band>

      <Band
        id="niveluri"
        index={index('niveluri')}
        title={<Trans>Aceeași funcție, la alte niveluri</Trans>}
        lede={
          <Trans>
            Rândurile cu funcția „<OfficeWord office={identity.office} />” din aceeași ediție, după tipul locului raportat. Un rând pe județ sau pe țară poate fi cursa funcției la
            acel nivel sau un centralizator al sursei; nu e suma rândurilor de sub el.
          </Trans>
        }
      >
        {rollups.length === 0 ? (
          <p className={EMPTY}>
            <Trans>Ediția nu e în fixtura catalogului.</Trans>
          </p>
        ) : (
          <LevelsList rollups={rollups} identity={identity} countyRows={countyRows} />
        )}
      </Band>

      <Band id="rezultate" index={index('rezultate')} title={<Trans>Rezultate</Trans>} lede={<Trans>Ce va apărea aici când API-ul le va servi, cu statutul fiecărei cifre.</Trans>}>
        <ResultsEmpty />
      </Band>

      <RuledFrame className="py-8">
        <ContestSourceLine identity={identity} />
      </RuledFrame>
    </div>
  )
}
