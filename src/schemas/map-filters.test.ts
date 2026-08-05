import { describe, expect, it } from 'vitest'

import { MapStateSchema, defaultMapFilters } from './map-filters'

/**
 * `/map` parses its search params with a bare `.parse` in `beforeLoad`, and
 * `useMapFilter` does the same on the client. Anything this schema throws on
 * therefore becomes a 500 on the route rather than a recoverable filter state,
 * so the contract under test is *totality*: a junk param degrades to the
 * default, it never escapes as a ZodError.
 */
describe('MapStateSchema', () => {
  it('fills in the defaults for an empty URL', () => {
    const parsed = MapStateSchema.parse({})

    expect(parsed.activeView).toBe('map')
    expect(parsed.mapViewType).toBe('UAT')
    expect(parsed.mapCenter).toBeUndefined()
    expect(parsed.mapZoom).toBeUndefined()
  })

  it('keeps valid values', () => {
    const parsed = MapStateSchema.parse({
      activeView: 'table',
      mapViewType: 'County',
      mapZoom: 7.5,
      mapCenter: [45.9, 24.9],
    })

    expect(parsed.activeView).toBe('table')
    expect(parsed.mapViewType).toBe('County')
    expect(parsed.mapZoom).toBe(7.5)
    expect(parsed.mapCenter).toEqual([45.9, 24.9])
  })

  // Each of these produced `HTTP 500` on `/map` before the schema was made
  // total — `.default()` only covers a *missing* value, not an invalid one.
  it.each([
    ['mapZoom', { mapZoom: 'abc' }],
    ['mapCenter', { mapCenter: 'xyz' }],
    ['activeView', { activeView: 'bogus' }],
    ['mapViewType', { mapViewType: 'Nope' }],
    ['filters', { filters: 'garbage' }],
  ])('never throws on an invalid %s', (_name, search) => {
    expect(() => MapStateSchema.parse(search)).not.toThrow()
  })

  it('falls back to the default view rather than dropping the whole state', () => {
    const parsed = MapStateSchema.parse({
      activeView: 'bogus',
      mapViewType: 'County',
    })

    expect(parsed.activeView).toBe('map')
    // One bad param must not discard the neighbouring good ones.
    expect(parsed.mapViewType).toBe('County')
  })

  it('falls back to the default filters when the filter blob is unusable', () => {
    const parsed = MapStateSchema.parse({ filters: 'garbage' })

    expect(parsed.filters).toEqual(defaultMapFilters)
  })

  it('drops an unparseable zoom instead of forwarding NaN to the map', () => {
    const parsed = MapStateSchema.parse({ mapZoom: 'abc', activeView: 'table' })

    expect(parsed.mapZoom).toBeUndefined()
    expect(parsed.activeView).toBe('table')
  })
})
