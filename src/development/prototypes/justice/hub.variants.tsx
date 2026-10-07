import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  JusticeCountiesBand,
  JusticeCourtsBand,
  JusticeDecisionsBand,
  JusticeHubFigures,
  JusticeLevelsBand,
  JusticeMattersBand,
  JusticeYearsBand,
} from '@/features/justice/components/hub/justice-hub-bands'
import { JusticeHubHero } from '@/features/justice/components/hub/justice-hub-hero'
import { JusticeHub, type JusticeHubChoices } from '@/features/justice/components/hub/justice-hub-page'
import { COMPANY_HUB_SNAPSHOT } from '@/features/private-companies/lib/hub-snapshot'
import { HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { JUSTICE_HUB_SNAPSHOT } from '@/features/justice/lib/hub-snapshot'
import { countText, millionsText } from '@/features/justice/lib/judicial-format'
import { JUSTICE_HUB_DEFAULTS } from '@/schemas/judicial'
import { HundredPanel, PathPanel, PROTOTYPE_MARKER } from './hub.parts'

/**
 * The front door's three variants over the live components and snapshot.
 * `registru` (the owner's pick, 2026-10-07) is the live page itself, its
 * choices held here instead of the URL; `drum` and `materii` keep their own
 * hero panels and band order as the design record.
 */

const snapshot = JUSTICE_HUB_SNAPSHOT
const POPULATION = {
  year: COMPANY_HUB_SNAPSHOT.fiscalYear,
  national: COMPANY_HUB_SNAPSHOT.national.population,
  byCounty: new Map(COMPANY_HUB_SNAPSHOT.counties.map((county) => [county.code, county.population])),
}

function useChoices() {
  const [choices, setChoices] = useState<JusticeHubChoices>({ ...JUSTICE_HUB_DEFAULTS })
  const choose = <K extends keyof JusticeHubChoices>(key: K, value: JusticeHubChoices[K]) => setChoices((previous) => ({ ...previous, [key]: value }))
  return { choices, choose }
}

export function HubRegistru() {
  const { choices, choose } = useChoices()
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <JusticeHub snapshot={snapshot} choices={choices} onChoose={choose} />
    </div>
  )
}

type BandId = 'judete' | 'materii' | 'trepte' | 'instante' | 'timp' | 'decizii'

function bandLabel(id: BandId): string {
  switch (id) {
    case 'judete':
      return t`Pe județe`
    case 'materii':
      return t`Ce se judecă`
    case 'trepte':
      return t`Pe trepte`
    case 'instante':
      return t`Instanțele`
    case 'timp':
      return t`În timp`
    case 'decizii':
      return t`Alte instanțe`
  }
}

/** The bands in a variant's order, numbered as they come. */
function Bands({ order }: { readonly order: readonly BandId[] }) {
  const { choices, choose } = useChoices()
  const index = (id: BandId) => `${String(order.indexOf(id) + 1).padStart(2, '0')} / ${bandLabel(id)}`
  const band: Record<BandId, ReactNode> = {
    judete: <JusticeCountiesBand snapshot={snapshot} population={POPULATION} index={index('judete')} />,
    materii: <JusticeMattersBand snapshot={snapshot} index={index('materii')} scope={choices.materii} onScope={(scope) => choose('materii', scope)} />,
    trepte: <JusticeLevelsBand snapshot={snapshot} index={index('trepte')} />,
    instante: <JusticeCourtsBand snapshot={snapshot} index={index('instante')} level={choices.nivel} onLevel={(level) => choose('nivel', level)} />,
    timp: <JusticeYearsBand snapshot={snapshot} index={index('timp')} />,
    decizii: <JusticeDecisionsBand snapshot={snapshot} index={index('decizii')} />,
  }
  return (
    <>
      <HomeSectionNav title={t`Justiție`} sections={order.map((id) => ({ id, label: bandLabel(id) }))} />
      <JusticeHubFigures snapshot={snapshot} />
      {order.map((id) => (
        <div key={id}>{band[id]}</div>
      ))}
    </>
  )
}

function Lede() {
  const courts = snapshot.courts.filter((court) => court.cases > 0).length
  return (
    <Trans>
      {millionsText(snapshot.cases.total)} de dosare publicate pe portalul instanțelor, la {countText(courts)} de instanțe: ce se judecă, unde și pe ce treaptă.
      Persoanele nu sunt numite.
    </Trans>
  )
}

export function HubDrum() {
  return (
    <div className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <JusticeHubHero
        snapshot={snapshot}
        headline={
          <Trans>
            Dosarele
            <br />
            instanțelor
          </Trans>
        }
        lede={<Lede />}
        panel={<PathPanel snapshot={snapshot} />}
      />
      <Bands order={['materii', 'trepte', 'instante', 'judete', 'timp', 'decizii']} />
    </div>
  )
}

export function HubMaterii() {
  return (
    <div className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <JusticeHubHero
        snapshot={snapshot}
        headline={
          <Trans>
            Instanțele,
            <br />
            dosar cu dosar
          </Trans>
        }
        lede={<Lede />}
        panel={<HundredPanel snapshot={snapshot} />}
      />
      <Bands order={['materii', 'judete', 'trepte', 'instante', 'timp', 'decizii']} />
    </div>
  )
}
