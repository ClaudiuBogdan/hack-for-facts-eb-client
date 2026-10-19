import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { PrototypeDefinition } from '@/development/harness/entry'
import { familyPlural } from './shared/labels'
import {
  Band,
  ContestList,
  CountyRows,
  EditionRows,
  EditionSwitch,
  EditionsTable,
  ElectionFigures,
  ElectionHead,
  ElectionMissing,
  FamilyAside,
  FamilyRows,
  hasPlaces,
  indexOf,
  OfficeAside,
  OfficeMatrix,
  PlaceFinder,
  PlaceInElection,
  PROTOTYPE_MARKER,
  SectionNav,
  SourceBand,
  standardFigures,
  useElectionPage,
  usePageSearch,
  type ElectionPage,
  type Section,
} from './alegere/parts'

/**
 * The election page (`?alegere=<eventKey>`, `?editie=<electionKey>`): one
 * platform event in the procurement profiles' shape (design note §12.5,
 * G1–G3, G8). Three spines, each a variant: the sources side by side, the
 * offices × levels matrix, or the contest finder. Every figure is one
 * edition's; nothing is added across editions (§12.3).
 */

/** The bands every variant carries, in each variant's own order. */
function sectionsOf(page: ElectionPage, ids: readonly string[]): readonly Section[] {
  const labels: Readonly<Record<string, string>> = {
    editii: t`Edițiile`,
    functii: t`Funcții și niveluri`,
    scrutine: t`Rândurile de scrutin`,
    judete: t`Pe județe`,
    alegeri: familyPlural(page.event.family),
  }
  return ids.filter((id) => id !== 'judete' || hasPlaces(page)).map((id) => ({ id, label: labels[id] ?? id }))
}

/** The counties band, only when some edition of the event reports on localities or abroad (a national contest has no places to count). */
function CountiesBand({ page, index }: { readonly page: ElectionPage; readonly index: string }) {
  if (!hasPlaces(page)) return null
  return (
    <Band
      id="judete"
      index={index}
      title={<Trans>Pe județe</Trans>}
      lede={<Trans>Localitățile pe care raportează ediția {page.edition.mark}, numărate pe județul din lista INS. Sunt locuri de raportare, nu curse și nu primari.</Trans>}
    >
      <CountyRows page={page} />
    </Band>
  )
}

function Missing() {
  const { search } = usePageSearch()
  return <ElectionMissing eventKey={search.eventKey} />
}

// ─────────────────────────────────────────── 1. sources as the spine ──

function AlegereSurse() {
  const page = useElectionPage()
  if (!page) return <Missing />
  const sections = sectionsOf(page, ['editii', 'functii', 'scrutine', 'judete', 'alegeri'])
  const index = (id: string) => indexOf(sections, id)
  return (
    <div className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <ElectionHead page={page} topRight={<EditionSwitch page={page} className="hidden justify-end sm:flex" sayOne />} aside={<FamilyAside page={page} />} />
      <SectionNav page={page} sections={sections} />
      <ElectionFigures figures={standardFigures(page, { editions: 'editii', rows: 'scrutine', places: 'judete' })} />
      <Band
        id="editii"
        index={index('editii')}
        title={<Trans>Edițiile de date, una lângă alta</Trans>}
        lede={
          page.summaries.length > 1 ? (
            <Trans>Fiecare sursă descrie aceeași alegere în felul ei. Coloanele se citesc separat: nu există un total.</Trans>
          ) : (
            <Trans>O singură sursă descrie această alegere; ce raportează, pe o coloană.</Trans>
          )
        }
        aside={<EditionSwitch page={page} className="sm:hidden" />}
        wide
      >
        <EditionsTable page={page} />
      </Band>
      <Band
        id="functii"
        index={index('functii')}
        title={<Trans>Funcții și niveluri</Trans>}
        lede={
          <Trans>Ce funcții raportează ediția {page.edition.mark} și la ce nivel: localitate, numerotarea sursei, județ, străinătate, țară. O celulă deschide rândurile ei.</Trans>
        }
        aside={<EditionSwitch page={page} />}
        wide
      >
        <OfficeMatrix page={page} mode="one" />
      </Band>
      <Band
        id="scrutine"
        index={index('scrutine')}
        title={<Trans>Rândurile de scrutin</Trans>}
        lede={<Trans>Fiecare rând al ediției {page.edition.mark}, cu locul, funcția, nivelul și turul exact cum le raportează sursa. Un rând deschide scrutinul lui.</Trans>}
        wide
      >
        <ContestList page={page} />
      </Band>
      <CountiesBand page={page} index={index('judete')} />
      <Band
        id="alegeri"
        index={index('alegeri')}
        title={<Trans>{familyPlural(page.event.family)}, pe ani</Trans>}
        lede={<Trans>Aceeași familie de alegeri în date, cu edițiile fiecăreia. O alegere care nu e în date nu înseamnă că nu a avut loc.</Trans>}
      >
        <FamilyRows page={page} />
      </Band>
      <SourceBand page={page} />
    </div>
  )
}

// ──────────────────────────────────────────── 2. the matrix as the spine ──

function AlegereFunctii() {
  const page = useElectionPage()
  if (!page) return <Missing />
  const sections = sectionsOf(page, ['functii', 'scrutine', 'judete', 'editii', 'alegeri'])
  const index = (id: string) => indexOf(sections, id)
  return (
    <div className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <ElectionHead
        page={page}
        aside={
          <div>
            <MonoLabel className="block text-muted-foreground">
              <Trans>Edițiile de date, ținute separat</Trans>
            </MonoLabel>
            <EditionRows page={page} className="mt-4" />
          </div>
        }
      />
      <SectionNav page={page} sections={sections} />
      <ElectionFigures figures={standardFigures(page, { editions: 'editii', rows: 'scrutine', places: 'judete' })} />
      <Band
        id="functii"
        index={index('functii')}
        title={<Trans>Ce funcții și la ce nivel</Trans>}
        lede={
          page.summaries.length > 1 ? (
            <Trans>Fiecare funcție raportată, pe nivelurile la care o raportează fiecare ediție (litera ediției înaintea cifrei). O celulă deschide rândurile ei.</Trans>
          ) : (
            <Trans>Fiecare funcție raportată, pe nivelurile la care o raportează sursa. O celulă deschide rândurile ei.</Trans>
          )
        }
        wide
      >
        <OfficeMatrix page={page} mode="all" />
      </Band>
      <Band
        id="scrutine"
        index={index('scrutine')}
        title={<Trans>Rândurile de scrutin</Trans>}
        lede={<Trans>Fiecare rând al ediției {page.edition.mark}, cu locul, funcția, nivelul și turul exact cum le raportează sursa. Un rând deschide scrutinul lui.</Trans>}
        aside={<EditionSwitch page={page} />}
        wide
      >
        <ContestList page={page} />
      </Band>
      <CountiesBand page={page} index={index('judete')} />
      <Band
        id="editii"
        index={index('editii')}
        title={<Trans>Edițiile de date</Trans>}
        lede={<Trans>Sursele care descriu alegerea, una sub alta, cu ce raportează fiecare. Nu se adună.</Trans>}
        wide
      >
        <EditionsTable page={page} />
      </Band>
      <Band
        id="alegeri"
        index={index('alegeri')}
        title={<Trans>{familyPlural(page.event.family)}, pe ani</Trans>}
        lede={<Trans>Aceeași familie de alegeri în date, cu edițiile fiecăreia. O alegere care nu e în date nu înseamnă că nu a avut loc.</Trans>}
      >
        <FamilyRows page={page} />
      </Band>
      <SourceBand page={page} />
    </div>
  )
}

// ──────────────────────────────────────────── 3. the finder as the spine ──

function AlegereScrutine() {
  const page = useElectionPage()
  if (!page) return <Missing />
  const sections = sectionsOf(page, ['scrutine', 'judete', 'editii', 'functii', 'alegeri'])
  const index = (id: string) => indexOf(sections, id)
  const place = page.search.place
  return (
    <div className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <ElectionHead page={page} topRight={<EditionSwitch page={page} className="hidden justify-end sm:flex" sayOne />} aside={<OfficeAside page={page} />}>
        <div className="mt-6">
          <PlaceFinder page={page} />
          {place ? (
            <div className="mt-4">
              <PlaceInElection page={page} siruta={place} />
            </div>
          ) : null}
        </div>
      </ElectionHead>
      <SectionNav page={page} sections={sections} />
      <ElectionFigures figures={standardFigures(page, { editions: 'editii', rows: 'scrutine', places: 'judete' })} />
      <Band
        id="scrutine"
        index={index('scrutine')}
        title={<Trans>Rândurile de scrutin</Trans>}
        lede={
          <Trans>
            Fiecare rând al ediției {page.edition.mark}, cu locul, funcția, nivelul și turul exact cum le raportează sursa. Un rând deschide scrutinul lui; pinul, locul de
            raportare.
          </Trans>
        }
        aside={<EditionSwitch page={page} className="sm:hidden" />}
        wide
      >
        <ContestList page={page} />
      </Band>
      <CountiesBand page={page} index={index('judete')} />
      <Band
        id="editii"
        index={index('editii')}
        title={<Trans>Edițiile de date</Trans>}
        lede={<Trans>Sursele care descriu alegerea, una lângă alta, cu ce raportează fiecare. Nu se adună.</Trans>}
        wide
      >
        <EditionsTable page={page} />
      </Band>
      <Band
        id="functii"
        index={index('functii')}
        title={<Trans>Funcții și niveluri</Trans>}
        lede={<Trans>Ce funcții raportează ediția {page.edition.mark} și la ce nivel. O celulă deschide rândurile ei.</Trans>}
        wide
      >
        <OfficeMatrix page={page} mode="one" />
      </Band>
      <Band
        id="alegeri"
        index={index('alegeri')}
        title={<Trans>{familyPlural(page.event.family)}, pe ani</Trans>}
        lede={<Trans>Aceeași familie de alegeri în date, cu edițiile fiecăreia. O alegere care nu e în date nu înseamnă că nu a avut loc.</Trans>}
      >
        <FamilyRows page={page} />
      </Band>
      <SourceBand page={page} />
    </div>
  )
}

export const prototype = {
  title: 'Alegeri — o alegere (alegere)',
  spec: 'docs/design/elections/design.md',
  variants: {
    surse: { title: 'Sursele, una lângă alta', component: AlegereSurse, note: 'editions as columns first; the matrix, the list and the counties follow the chosen edition' },
    functii: { title: 'Funcții × niveluri', component: AlegereFunctii, note: 'one matrix across all editions leads; a cell opens the filtered list; editions are the footnotes' },
    scrutine: { title: 'Căutarea rândurilor', component: AlegereScrutine, note: 'the place finder in the head and the paged list lead; the catalog shape comes after' },
  },
  compare: ['surse', 'functii', 'scrutine'],
} satisfies PrototypeDefinition
