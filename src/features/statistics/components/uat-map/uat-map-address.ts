import { useState } from 'react'
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import type { UatMapSeriesId } from '../../lib/uat-map-snapshot'

/**
 * The localities' map in the address, as the counties' indicator is:
 * `?harta=` its series, `?judet=` the county it shows — a view a link can
 * land on, and that Back returns to.
 */

interface View {
  readonly series: UatMapSeriesId
  /** The county code as the address writes it: the map checks it against its own. */
  readonly county: string | undefined
}

export interface MapView extends View {
  readonly showSeries: (series: UatMapSeriesId) => void
  readonly showCounty: (county: string | undefined) => void
}

const same = (a: View, b: View) => a.series === b.series && a.county === b.county

/**
 * The map's view is the address's. A choice shows at once and reaches the
 * address after the next paint: a navigation renders every router link on
 * the page again — ~40 ms on a mid-range phone — which the switch itself
 * must not wait for. Until then the choice stands in for the address. A
 * write that finds the router already on its way off `/ins` — a locality
 * opened meanwhile — is dropped, or it would call the reader back.
 */
export function useMapView(): MapView {
  const router = useRouter()
  const navigate = useNavigate()
  const address: View = {
    series: useSearch({ from: '/ins/', select: (search) => search.harta }) ?? 'populatie',
    county: useSearch({ from: '/ins/', select: (search) => search.judet }),
  }
  const [chosen, setChosen] = useState<View | null>(null)
  // The address has caught up with the choice: it is the view again.
  if (chosen && same(chosen, address)) setChosen(null)
  const view = chosen ?? address

  const show = (next: View) => {
    setChosen(next)
    // After this frame's paint: the task after the next frame.
    requestAnimationFrame(() =>
      setTimeout(() => {
        if (!/^\/ins\/?$/.test(router.latestLocation.pathname)) return
        void navigate({
          to: '/ins',
          search: (previous) => ({ ...previous, harta: next.series === 'populatie' ? undefined : next.series, judet: next.county }),
          replace: true,
          resetScroll: false,
        })
      }),
    )
  }

  return {
    ...view,
    showSeries: (series) => show({ ...view, series }),
    showCounty: (county) => show({ ...view, county }),
  }
}
