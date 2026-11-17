import { describe, expect, it } from 'vitest'
import { mapAttribution, mapLocale } from './budget-map-style'

describe('the budget map credits', () => {
  it('credit MapLibre and the boundaries with their source and licence, links opening apart', () => {
    const html = mapAttribution({ boundaries: 'Limite UAT: ANCPI, prin' })
    expect(html).toContain('>MapLibre</a>')
    expect(html).toContain('Limite UAT: ANCPI, prin <a href="https://geo-spatial.org/vechi/download/romania-seturi-vectoriale"')
    expect(html).toContain('>OGL-ROU 1.0</a>')
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(3)
    expect(html.match(/white-space:nowrap/g)).toHaveLength(3)
  })

  it('escape the words it is given', () => {
    expect(mapAttribution({ boundaries: '<b>&' })).toContain('&lt;b&gt;&amp;')
  })

  it('name the credits button in the page language', () => {
    const locale = mapLocale({ windows: 'w', mac: 'm', mobile: 'p', title: 't', attributionToggle: 'Arată sursele hărții', boundaries: 'b' })
    expect(locale['AttributionControl.ToggleAttribution']).toBe('Arată sursele hărții')
  })
})
