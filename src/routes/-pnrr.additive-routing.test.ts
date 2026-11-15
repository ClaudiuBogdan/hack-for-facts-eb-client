import { describe, expect, it } from 'vitest'

import { Route as PnrrRoute } from './pnrr'
import { Route as PnrrLazyRoute } from './pnrr.lazy'
import { Route as PnrrCountiesRoute } from './pnrr_.judete'
import { Route as PnrrCountyRoute } from './pnrr_.judete_.$countySiruta'
import { pnrrOrganizationsSearchSchema } from './pnrr_.organizatii'
import { Route as PnrrProjectsRoute, pnrrProjectsSearchSchema } from './pnrr_.proiecte'

type RouteHook = (input: {
  readonly search?: Record<string, unknown>
  readonly params?: Record<string, string>
}) => unknown

function runBeforeLoad(
  hook: unknown,
  input: Parameters<RouteHook>[0] = {},
): unknown {
  try {
    ;(hook as RouteHook)(input)
    return null
  } catch (thrown) {
    return thrown
  }
}

describe('PNRR dashboard routing', () => {
  it('renders the original dashboard at /pnrr, server-rendered', () => {
    const component = PnrrLazyRoute.options.component as { readonly name?: string }
    expect(component.name).toBe('PnrrRoutePage')
    expect(PnrrRoute.options.ssr).toBe(true)
  })

  it('keeps every dashboard tab on /pnrr: its links are search params, not redirects', () => {
    expect(PnrrRoute.options.beforeLoad).toBeUndefined()
  })

  it('reruns the loader only for what the overview depends on', () => {
    const loaderDeps = PnrrRoute.options.loaderDeps as unknown as (input: {
      readonly search: Record<string, unknown>
    }) => unknown

    expect(
      loaderDeps({ search: { view: 'projects', page: 3, counties: ['Cluj'] } }),
    ).toEqual({ overviewSearch: { counties: ['Cluj'] }, includeOverview: false })
    expect(loaderDeps({ search: {} })).toEqual({
      overviewSearch: {},
      includeOverview: true,
    })
  })

  it('sends the projects and county pages back to their dashboard tabs', () => {
    expect(
      runBeforeLoad(PnrrProjectsRoute.options.beforeLoad, {
        search: { beneficiaryCui: 'RO11054529' },
      }),
    ).toMatchObject({
      options: {
        to: '/pnrr',
        search: { view: 'projects', beneficiaryCui: '11054529' },
        replace: true,
      },
    })
    expect(
      runBeforeLoad(PnrrProjectsRoute.options.beforeLoad, { search: {} }),
    ).toMatchObject({ options: { to: '/pnrr', search: { view: 'projects' } } })
    expect(runBeforeLoad(PnrrCountiesRoute.options.beforeLoad)).toMatchObject({
      options: { to: '/pnrr', search: { view: 'map' }, replace: true },
    })
    expect(
      runBeforeLoad(PnrrCountyRoute.options.beforeLoad, {
        params: { countySiruta: '40' },
      }),
    ).toMatchObject({ options: { to: '/pnrr', search: { view: 'map' } } })
  })

  it('still answers not found for a malformed county', () => {
    const thrown = runBeforeLoad(PnrrCountyRoute.options.beforeLoad, {
      params: { countySiruta: 'not-a-siruta' },
    }) as { readonly options?: unknown; readonly isNotFound?: boolean }

    expect(thrown).not.toBeNull()
    expect(thrown.options).toBeUndefined()
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
