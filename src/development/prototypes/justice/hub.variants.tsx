import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { countText, millionsText } from './hub.format'
import { HUB } from './hub.model'
import {
  CountiesBand,
  CourtsBand,
  DecisionsBand,
  FiguresBand,
  HubHero,
  HubPage,
  HundredPanel,
  LevelsBand,
  MattersBand,
  PathPanel,
  SectionNav,
  TopCourtsPanel,
  YearsBand,
  indexOf,
  type Section,
} from './hub.parts'

/**
 * Three front doors for the court portal's data, in the procurement, INS and
 * companies hubs' language, on the live API's figures (`hub.data.json`). They
 * share every band and differ in what stands beside the headline and in the
 * order the questions come.
 */

const COURTS_WITH_CASES = HUB.courts.filter((court) => court.cases > 0).length

function Lede() {
  return (
    <Trans>
      {millionsText(HUB.cases.total)} de dosare publicate pe portalul instanțelor, la {countText(COURTS_WITH_CASES)} de instanțe: ce se judecă, unde și pe ce
      treaptă. Persoanele nu sunt numite.
    </Trans>
  )
}

const BANDS = {
  judete: CountiesBand,
  materii: MattersBand,
  niveluri: LevelsBand,
  instante: CourtsBand,
  timp: YearsBand,
  decizii: DecisionsBand,
} as const

type BandId = keyof typeof BANDS

function sectionLabel(id: BandId): string {
  switch (id) {
    case 'judete':
      return t`Pe județe`
    case 'materii':
      return t`Ce se judecă`
    case 'niveluri':
      return t`Pe trepte`
    case 'instante':
      return t`Instanțele`
    case 'timp':
      return t`În timp`
    case 'decizii':
      return t`Alte instanțe`
  }
}

function Bands({ order }: { readonly order: readonly BandId[] }) {
  const sections: readonly Section[] = order.map((id) => ({ id, label: sectionLabel(id) }))
  return (
    <>
      <SectionNav sections={sections} />
      <FiguresBand />
      {order.map((id) => {
        const Band = BANDS[id]
        return <Band key={id} index={indexOf(sections, id)} />
      })}
    </>
  )
}

/** `registru`: the procurement front door's shape — the busiest courts beside the headline, the map first. */
export function HubRegistru() {
  return (
    <HubPage>
      <HubHero
        headline={
          <Trans>
            Ce judecă
            <br />
            instanțele
          </Trans>
        }
        lede={<Lede />}
        panel={<TopCourtsPanel />}
      />
      <Bands order={['judete', 'materii', 'niveluri', 'instante', 'timp', 'decizii']} />
    </HubPage>
  )
}

/** `drum`: a case's way up the courts beside the headline; what is judged first, then where. */
export function HubDrum() {
  return (
    <HubPage>
      <HubHero
        headline={
          <Trans>
            Dosarele
            <br />
            instanțelor
          </Trans>
        }
        lede={<Lede />}
        panel={<PathPanel />}
      />
      <Bands order={['materii', 'niveluri', 'instante', 'judete', 'timp', 'decizii']} />
    </HubPage>
  )
}

/** `materii`: a hundred of the year's cases by matter beside the headline — the most graphical door. */
export function HubMaterii() {
  return (
    <HubPage>
      <HubHero
        headline={
          <Trans>
            Instanțele,
            <br />
            dosar cu dosar
          </Trans>
        }
        lede={<Lede />}
        panel={<HundredPanel />}
      />
      <Bands order={['materii', 'judete', 'niveluri', 'instante', 'timp', 'decizii']} />
    </HubPage>
  )
}
