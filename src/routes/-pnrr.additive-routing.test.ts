import { describe, expect, it } from 'vitest'

import { PnrrLiveOverviewPage } from '@/features/pnrr/components/live/PnrrLivePages'
import { mapLegacyPnrrProjectsSearch, Route as PnrrRoute } from './pnrr'
import { Route as PnrrLazyRoute } from './pnrr.lazy'
import { Route as PnrrCountiesRoute } from './pnrr_.judete'
import { Route as PnrrCountyRoute } from './pnrr_.judete_.$countySiruta'
import { pnrrOrganizationsSearchSchema } from './pnrr_.organizatii'
import { Route as PnrrProjectsRoute, pnrrProjectsSearchSchema } from './pnrr_.proiecte'

type BeforeLoad = (input: { readonly search: Record<string, unknown> }) => unknown

function runBeforeLoad(search: Record<string, unknown>): unknown {
  const beforeLoad = PnrrRoute.options.beforeLoad as unknown as BeforeLoad
  try {
    beforeLoad({ search })
    return null
  } catch (thrown) {
    return thrown
  }
}

describe('PNRR live routing', () => {
  it('renders the release-aware live overview at /pnrr', () => {
    expect(PnrrLazyRoute.options.component).toBe(PnrrLiveOverviewPage)
    expect(PnrrRoute.options.ssr).toBe(true)
  })

  it('sends legacy tab links to their live pages', () => {
    expect(runBeforeLoad({ view: 'projects' })).toMatchObject({
      options: { to: '/pnrr/proiecte', replace: true },
    })
    expect(runBeforeLoad({ view: 'map' })).toMatchObject({
      options: { to: '/pnrr/judete', replace: true },
    })
  })

  it('carries the beneficiary CUI, the one equivalent filter, to the live projects page', () => {
    expect(
      runBeforeLoad({
        view: 'projects',
        beneficiaryCui: 'RO11054529',
        counties: ['Cluj'],
        components: ['C7'],
      }),
    ).toMatchObject({
      options: { to: '/pnrr/proiecte', search: { beneficiaryCui: '11054529' } },
    })
    expect(mapLegacyPnrrProjectsSearch({ beneficiaryCui: 'not-a-cui' })).toEqual({})
    expect(mapLegacyPnrrProjectsSearch({ counties: ['Cluj'], components: ['C7'] })).toEqual({})
    // The carried value satisfies the live page's own search schema.
    expect(
      pnrrProjectsSearchSchema.parse(mapLegacyPnrrProjectsSearch({ beneficiaryCui: 'ro4499621' })),
    ).toEqual({ beneficiaryCui: '4499621' })
  })

  it('keeps the overview and legacy views without a live page on /pnrr', () => {
    expect(runBeforeLoad({})).toBeNull()
    expect(runBeforeLoad({ view: 'overview' })).toBeNull()
    expect(runBeforeLoad({ view: 'beneficiaries' })).toBeNull()
    expect(runBeforeLoad({ view: 'anomalies' })).toBeNull()
  })

  it('no longer bounces the live projects and county pages back to /pnrr', () => {
    expect(PnrrProjectsRoute.options.beforeLoad).toBeUndefined()
    expect(PnrrCountiesRoute.options.beforeLoad).toBeUndefined()
    const countyBeforeLoad = PnrrCountyRoute.options.beforeLoad as unknown as (input: {
      readonly params: { readonly countySiruta: string }
    }) => unknown
    expect(() => countyBeforeLoad({ params: { countySiruta: '40' } })).not.toThrow()
  })

  it('accepts digit-only identifiers produced by the URL parser', () => {
    expect(
      pnrrProjectsSearchSchema.parse({
        beneficiaryCui: 11054529,
        contractNumber: 2,
        countySiruta: 40,
      }),
    ).toMatchObject({
      beneficiaryCui: '11054529',
      contractNumber: '2',
      countySiruta: '40',
    })
    expect(pnrrOrganizationsSearchSchema.parse({ q: 11054529 })).toMatchObject({
      q: '11054529',
    })
  })
})
