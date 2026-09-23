import { useState } from 'react'
import type { HubCountyLayer } from '../../lib/hub-counties'
import { CompanyCountyMap } from './company-county-map'
import { CompanyCountyRank } from './company-county-rank'

/**
 * The map beside the ranking, sharing the county under the pointer. The
 * shared highlight lives here, not in the page, so pointing at a county
 * re-renders these two and nothing else.
 */
export function HubCountyBand({ layer, legend }: { readonly layer: HubCountyLayer; readonly legend: string }) {
  const [activeCounty, setActiveCounty] = useState<string | undefined>(undefined)
  return (
    <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      {/* The map stays in view beside the full list of 42 where the window is tall enough to hold all of it, legend included. */}
      <div className="lg:top-6 lg:col-span-7 lg:self-start lg:[@media(min-height:42rem)]:sticky" data-reveal>
        {/* A new layer is a new map (a tapped county does not carry over); the revealed wrapper stays. */}
        <CompanyCountyMap key={legend} layer={layer} legend={legend} activeCode={activeCounty} onActiveChange={setActiveCounty} />
      </div>
      <div className="lg:col-span-5 lg:col-start-8" data-reveal>
        <CompanyCountyRank layer={layer} activeCode={activeCounty} onActiveChange={setActiveCounty} />
      </div>
    </div>
  )
}
