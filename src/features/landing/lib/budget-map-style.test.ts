import { describe, expect, it } from 'vitest'
import { percentileScale } from './budget-map-measures'
import { countyLabelPoints, fillColorExpression, mapAttribution, mapLayers, mapLocale, setMapLevel, uatLabelPoints, type LabelPoints } from './budget-map-style'

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

const RAMP = ['#1', '#2', '#3', '#4', '#5']
const LABELS: LabelPoints = {
  uats: { id: ['54975', '155243'], lon: [23.6, 21.2], lat: [46.8, 45.8], room: [3, 2] },
  counties: { id: ['CJ', 'TM'], lon: [23.5, 21.3], lat: [46.8, 45.7], room: [9, 8] },
}
const THEME = { foreground: 'rgb(0,0,0)', muted: 'rgb(90,90,90)', background: 'rgb(255,255,255)' }

describe('the budget map colours', () => {
  it('match the SIRUTA code on the primării unless another property is named', () => {
    const values = [10, 20, 30, 40]
    const scale = percentileScale(values, RAMP, Math.round)
    const uat = fillColorExpression(['a', 'b', 'c', 'd'], values, scale) as unknown as unknown[]
    expect(uat[0]).toBe('match')
    expect(uat[1]).toEqual(['to-string', ['get', 'natcode']])
    const county = fillColorExpression(['AB', 'AG', 'AR', 'B'], values, scale, 'mnemonic') as unknown as unknown[]
    expect(county[1]).toEqual(['to-string', ['get', 'mnemonic']])
    // The same classes either way: only the property read from the shape differs.
    expect(county.slice(2).filter((item) => typeof item === 'string')).toEqual(uat.slice(2).filter((item) => typeof item === 'string'))
  })
})

describe('the budget map levels', () => {
  it('start on the primării: the county level\'s layers are hidden, the rest are not', () => {
    const hidden = mapLayers(THEME)
      .filter((layer) => layer.layout && 'visibility' in layer.layout && layer.layout.visibility === 'none')
      .map((layer) => layer.id)
    expect(hidden).toEqual(['county-fill', 'county-active', 'county-value-labels'])
  })

  it('show one level\'s layers and hide the other\'s; the county borders stay on both', () => {
    const visibility = new Map<string, string>()
    const map = {
      getLayer: (id: string) => (mapLayers(THEME).some((layer) => layer.id === id) ? ({} as never) : undefined),
      setLayoutProperty: (id: string, _property: string, value: string) => {
        visibility.set(id, value)
        return map as never
      },
    }
    setMapLevel(map as never, 'county')
    expect(Object.fromEntries(visibility)).toEqual({
      'uat-fill': 'none',
      'uat-line': 'none',
      'uat-active': 'none',
      'county-labels': 'none',
      'uat-labels': 'none',
      'county-fill': 'visible',
      'county-active': 'visible',
      'county-value-labels': 'visible',
    })
    expect(visibility.has('county-line')).toBe(false)
    setMapLevel(map as never, 'uat')
    expect(visibility.get('uat-fill')).toBe('visible')
    expect(visibility.get('county-fill')).toBe('none')
  })

  it('give a county\'s label its figure only where one is asked for', () => {
    const plain = countyLabelPoints(LABELS, (code) => (code === 'CJ' ? 'Cluj' : 'Timiș'))
    expect(plain.features.map((feature) => feature.properties)).toEqual([
      { room: 9, name: 'CLUJ', code: 'CJ', value: '' },
      { room: 8, name: 'TIMIȘ', code: 'TM', value: '' },
    ])
    const valued = countyLabelPoints(LABELS, (code) => code, (code) => (code === 'CJ' ? '9.632 lei/loc.' : null))
    expect(valued.features.map((feature) => feature.properties.value)).toEqual(['9.632 lei/loc.', ''])
    expect(uatLabelPoints(LABELS, () => 'Cluj-Napoca', () => null).features[0]!.properties).toEqual({ room: 3, name: 'Cluj-Napoca', value: '' })
  })
})
