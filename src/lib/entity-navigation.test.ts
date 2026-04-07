import { describe, expect, it } from 'vitest'
import {
  buildEntityDetailsPath,
  buildEntitySelectionPath,
  buildPreferredEntityPath,
  isNonCountyUatEntity,
} from './entity-navigation'

describe('entity-navigation', () => {
  it('detects primarie UAT entities and excludes county councils', () => {
    expect(
      isNonCountyUatEntity({
        cui: '4305857',
        entityType: 'admin_municipality',
        isUat: true,
      }),
    ).toBe(true)

    expect(
      isNonCountyUatEntity({
        cui: '4321122',
        entityType: 'admin_county_council',
        isUat: true,
      }),
    ).toBe(false)

    expect(
      isNonCountyUatEntity({
        cui: '4305857',
        entityType: 'admin_municipality',
        isUat: false,
      }),
    ).toBe(false)
  })

  it('builds the preferred primarie path for non-county UATs', () => {
    expect(
      buildPreferredEntityPath({
        cui: '4305857',
        entityType: 'admin_municipality',
        isUat: true,
      }),
    ).toBe('/primarie/4305857')

    expect(
      buildPreferredEntityPath({
        cui: '4321122',
        entityType: 'admin_county_council',
        isUat: true,
      }),
    ).toBe('/entities/4321122')
  })

  it('allows explicit selection behavior to override the preferred path', () => {
    expect(
      buildEntitySelectionPath(
        {
          cui: '4305857',
          entityType: 'admin_municipality',
          isUat: true,
        },
        'navigate-to-entity',
      ),
    ).toBe('/entities/4305857')

    expect(buildEntityDetailsPath(' 4305857 ')).toBe('/entities/4305857')
  })
})
