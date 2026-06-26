import { describe, expect, it } from 'vitest'
import {
  buildEntityDetailsPath,
  buildEntitySelectionPath,
  buildPublicEnterprisePath,
  buildPreferredEntityPath,
  isNonCountyUatEntity,
} from './entity-navigation'

describe('entity-navigation', () => {
  it('detects non-county UAT entities and excludes county councils', () => {
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

  it('builds preferred entity paths and routes public enterprises to their surface', () => {
    expect(
      buildPreferredEntityPath({
        cui: '4305857',
        entityType: 'admin_municipality',
        isUat: true,
      }),
    ).toBe('/entities/4305857')

    expect(
      buildPreferredEntityPath({
        cui: '4321122',
        entityType: 'admin_county_council',
        isUat: true,
      }),
    ).toBe('/entities/4321122')

    expect(
      buildPreferredEntityPath({
        cui: ' 10020943 ',
        entityType: 'public_enterprise',
        isUat: false,
      }),
    ).toBe('/intreprinderi-publice/10020943')
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
    expect(buildPublicEnterprisePath(' 10020943 ')).toBe(
      '/intreprinderi-publice/10020943',
    )
  })
})
