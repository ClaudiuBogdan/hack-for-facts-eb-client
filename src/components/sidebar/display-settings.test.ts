import { describe, expect, it } from 'vitest'
import { displaySettingsFor } from './display-settings'

describe('displaySettingsFor', () => {
  it.each([
    '/entities/4270740',
    '/primarie/4270740/buget',
    '/map',
    '/maps/editor',
    '/charts/abc',
    '/entity-analytics',
    '/public-institutions',
    '/budget-explorer',
  ])('offers currency and real prices on %s', (path) => {
    expect(displaySettingsFor(path)).toEqual({ currency: true, inflation: true })
  })

  it('offers only the currency on PNRR', () => {
    expect(displaySettingsFor('/pnrr')).toEqual({ currency: true, inflation: false })
  })

  it.each(['/', '/procurement', '/pnrr/proiecte/x', '/primarie/harta', '/primarie', '/primarie/', '/entities', '/pnrr-x', '/companies/123'])(
    'offers nothing on %s',
    (path) => {
      expect(displaySettingsFor(path)).toEqual({ currency: false, inflation: false })
    },
  )
})
