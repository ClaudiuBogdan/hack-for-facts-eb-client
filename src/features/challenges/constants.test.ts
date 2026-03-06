import { describe, expect, it } from 'vitest'
import {
  buildCampaignPrimariePath,
  buildCampaignProvocariModulePath,
  buildCampaignProvocariPath,
  buildCampaignProvocariStepPath,
  resolveCampaignEntityCuiFromPathname,
} from './constants'

describe('challenge route builders', () => {
  it('builds entity-scoped campaign routes', () => {
    expect(
      buildCampaignProvocariPath('12345678'),
    ).toBe('/buget-primarie/12345678/provocari')
    expect(
      buildCampaignProvocariModulePath('12345678', 'modulul-meu'),
    ).toBe('/buget-primarie/12345678/provocari/modulul-meu')
    expect(
      buildCampaignProvocariStepPath(
        '12345678',
        'modulul-meu',
        'provocarea-mea',
        'pasul-meu',
      ),
    ).toBe(
      '/buget-primarie/12345678/provocari/modulul-meu/provocarea-mea/pasul-meu',
    )
    expect(
      buildCampaignPrimariePath('12345678'),
    ).toBe('/buget-primarie/12345678/primarie')
  })
})

describe('resolveCampaignEntityCuiFromPathname', () => {
  it('extracts the selected entity from entity-scoped routes', () => {
    expect(
      resolveCampaignEntityCuiFromPathname(
        '/buget-primarie/4305857/provocari/modulul-meu',
      ),
    ).toBe('4305857')
    expect(
      resolveCampaignEntityCuiFromPathname('/buget-primarie/4305857/primarie'),
    ).toBe('4305857')
  })

  it('ignores static campaign routes', () => {
    expect(
      resolveCampaignEntityCuiFromPathname('/buget-primarie/cauta'),
    ).toBeUndefined()
    expect(
      resolveCampaignEntityCuiFromPathname('/buget-primarie/forum'),
    ).toBeUndefined()
  })
})
