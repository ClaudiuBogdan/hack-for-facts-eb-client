import { describe, expect, it } from 'vitest'

import { Route as PnrrRoute } from './pnrr'
import { Route as PnrrLazyRoute } from './pnrr.lazy'
import { pnrrOrganizationsSearchSchema } from './pnrr_.organizatii'
import { pnrrProjectsSearchSchema } from './pnrr_.proiecte'

describe('PNRR additive routing', () => {
  it('keeps the existing dashboard route free of automatic redirects', () => {
    expect(PnrrRoute.options.beforeLoad).toBeUndefined()
  })

  it('keeps the established dashboard as the /pnrr component', () => {
    expect(PnrrLazyRoute.options.component).toBeTypeOf('function')
    expect(PnrrLazyRoute.options.component?.name).toBe('PnrrRoutePage')
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
