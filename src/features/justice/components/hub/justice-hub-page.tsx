import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { JUSTICE_HUB_DEFAULTS, parseJusticeHubSearch, type JusticeHubSearch } from '@/schemas/judicial'
import { COUNTY_POPULATION } from '../../lib/county-population'
import { JUSTICE_HUB_SNAPSHOT } from '../../lib/hub-snapshot'
import type { JusticeHubSnapshot } from '../../lib/hub-snapshot-types'
import { countText, millionsText } from '../../lib/judicial-format'
import {
  JusticeCountiesBand,
  JusticeCourtsBand,
  JusticeDecisionsBand,
  JusticeHubFigures,
  JusticeLevelsBand,
  JusticeMattersBand,
  JusticeYearsBand,
} from './justice-hub-bands'
import { JusticeHubHero, JusticeTopCourtsPanel } from './justice-hub-hero'

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

export type JusticeHubChoices = Required<JusticeHubSearch>

/**
 * `/justice` — the court portal's front door, in the procurement, INS and
 * companies hubs' language (design.md §13–14; the `registru` prototype): the
 * busiest courts of the year beside the headline, the four figures, then one
 * band per question — where, what, at which step, which courts, since when,
 * and the other courts and authorities. The figures are the snapshot the
 * judicial API served when the portal's capture stopped.
 */
export function JusticeHubPage({ search }: { readonly search: JusticeHubSearch }) {
  const navigate = useNavigate({ from: '/justice/' })
  // Parsed again: the root route passes raw keys through, so an unknown value would otherwise survive. A key the
  // address holds unset (a choice returned to its default) or invalid parses to undefined: its default applies.
  const parsed = parseJusticeHubSearch(search)
  const choices: JusticeHubChoices = {
    instante: parsed.instante ?? JUSTICE_HUB_DEFAULTS.instante,
    materii: parsed.materii ?? JUSTICE_HUB_DEFAULTS.materii,
    nivel: parsed.nivel ?? JUSTICE_HUB_DEFAULTS.nivel,
  }
  const choose = <K extends keyof JusticeHubChoices>(key: K, value: JusticeHubChoices[K]) =>
    void navigate({
      search: (previous) => ({ ...previous, [key]: value === JUSTICE_HUB_DEFAULTS[key] ? undefined : value }),
      replace: true,
      resetScroll: false,
    })
  return <JusticeHub snapshot={JUSTICE_HUB_SNAPSHOT} choices={choices} onChoose={choose} />
}

/** The front door itself, its choices given: the route binds them to the URL, a prototype to its own state. */
export function JusticeHub({
  snapshot,
  choices,
  onChoose,
}: {
  readonly snapshot: JusticeHubSnapshot
  readonly choices: JusticeHubChoices
  readonly onChoose: <K extends keyof JusticeHubChoices>(key: K, value: JusticeHubChoices[K]) => void
}) {
  // Most of this page's links open a court: have its code before the tap.
  useWarmRouteCode('/justice/courts/$code')
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, startArrivalEffects, true)
  // The count-up driver is module state: an unmount mid-flight would leave it ticking.
  useEffect(() => () => stopCounting(), [])

  const sections = [
    { id: 'judete', label: t`Pe județe` },
    { id: 'materii', label: t`Ce se judecă` },
    { id: 'trepte', label: t`Pe trepte` },
    { id: 'instante', label: t`Instanțele` },
    { id: 'timp', label: t`În timp` },
    { id: 'decizii', label: t`Alte instanțe` },
  ] as const
  const indexOf = (id: (typeof sections)[number]['id']) => {
    const position = sections.findIndex((section) => section.id === id)
    return `${String(position + 1).padStart(2, '0')} / ${sections[position]?.label ?? ''}`
  }
  const courtsWithCases = snapshot.courts.filter((court) => court.cases > 0).length

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />
      <JusticeHubHero
        snapshot={snapshot}
        headline={
          <Trans>
            Ce judecă
            <br />
            instanțele
          </Trans>
        }
        lede={
          <Trans>
            {millionsText(snapshot.cases.total)} de dosare de pe portalul instanțelor și din arhiva Înaltei Curți, la {countText(courtsWithCases)} de instanțe: ce se
            judecă, unde și pe ce treaptă. Persoanele nu sunt numite.
          </Trans>
        }
        panel={<JusticeTopCourtsPanel snapshot={snapshot} level={choices.instante} onLevel={(level) => onChoose('instante', level)} />}
      />
      <HomeSectionNav title={t`Justiție`} sections={sections} />
      <JusticeHubFigures snapshot={snapshot} />
      <JusticeCountiesBand snapshot={snapshot} population={COUNTY_POPULATION} index={indexOf('judete')} />
      <JusticeMattersBand snapshot={snapshot} index={indexOf('materii')} scope={choices.materii} onScope={(scope) => onChoose('materii', scope)} />
      <JusticeLevelsBand snapshot={snapshot} index={indexOf('trepte')} />
      <JusticeCourtsBand snapshot={snapshot} index={indexOf('instante')} level={choices.nivel} onLevel={(level) => onChoose('nivel', level)} />
      <JusticeYearsBand snapshot={snapshot} index={indexOf('timp')} />
      <JusticeDecisionsBand snapshot={snapshot} index={indexOf('decizii')} />
    </div>
  )
}
