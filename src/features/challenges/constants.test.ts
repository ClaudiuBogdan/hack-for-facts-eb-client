import { describe, expect, it } from 'vitest'
import {
  buildCampaignBudgetPath,
  buildCampaignCalendarPath,
} from '@/features/campaigns/buget/constants'
import {
  buildCampaignPrimariePath,
  buildCampaignProvocariModulePath,
  buildCampaignProvocariPath,
  buildCampaignProvocariStepPath,
  CHALLENGE_SELECTED_ENTITY_MAP_PATH,
  CHALLENGE_SELECTED_ENTITY_PICKER_PATH,
  resolveCampaignEntityCuiFromPathname,
} from './constants'

describe('challenge route builders', () => {
  it('builds entity-scoped campaign routes', () => {
    expect(
      buildCampaignBudgetPath('12345678'),
    ).toBe('/primarie/12345678/buget')
    expect(
      buildCampaignCalendarPath('12345678'),
    ).toBe('/primarie/12345678/buget/calendar')
    expect(
      buildCampaignProvocariPath('12345678'),
    ).toBe('/primarie/12345678/buget/provocari')
    expect(
      buildCampaignProvocariModulePath('12345678', 'modulul-meu'),
    ).toBe('/primarie/12345678/buget/provocari/modulul-meu')
    expect(
      buildCampaignProvocariStepPath(
        '12345678',
        'modulul-meu',
        'provocarea-mea',
        'pasul-meu',
      ),
    ).toBe(
      '/primarie/12345678/buget/provocari/modulul-meu/provocarea-mea/pasul-meu',
    )
    expect(
      buildCampaignPrimariePath('12345678'),
    ).toBe('/primarie/12345678')
    expect(CHALLENGE_SELECTED_ENTITY_PICKER_PATH).toBe('/primarie')
    expect(CHALLENGE_SELECTED_ENTITY_MAP_PATH).toBe('/primarie/harta')
  })
})

describe('resolveCampaignEntityCuiFromPathname', () => {
  it('extracts the selected entity from entity-scoped routes', () => {
    expect(
      resolveCampaignEntityCuiFromPathname(
        '/primarie/4305857/buget/provocari/modulul-meu',
      ),
    ).toBe('4305857')
    expect(
      resolveCampaignEntityCuiFromPathname('/primarie/4305857'),
    ).toBe('4305857')
  })

  it('ignores routes without an entity segment', () => {
    expect(
      resolveCampaignEntityCuiFromPathname('/primarie'),
    ).toBeUndefined()
    expect(
      resolveCampaignEntityCuiFromPathname('/primarie/harta'),
    ).toBeUndefined()
    expect(
      resolveCampaignEntityCuiFromPathname('/bugete-locale-2026'),
    ).toBeUndefined()
  })
})
