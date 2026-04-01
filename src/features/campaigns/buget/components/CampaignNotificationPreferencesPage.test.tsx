import { describe, expect, it } from 'vitest'
import {
  parseCampaignNotificationsReturnTarget,
} from './CampaignNotificationPreferencesPage'
import { CAMPAIGN_ENTITY_SELECTOR_PATH } from '../constants'
import { campaignNotificationsSearchSchema } from '@/routes/provocare_.notificari'

describe('parseCampaignNotificationsReturnTarget', () => {
  it('parses an app-relative return target into pathname plus search state', () => {
    expect(
      parseCampaignNotificationsReturnTarget(
        '/primarie/12345678/buget/provocari?lang=en&view=section'
      )
    ).toEqual({
      to: '/primarie/12345678/buget/provocari',
      search: {
        lang: 'en',
        view: 'section',
      },
    })
  })

  it('falls back to the campaign selector for invalid return targets', () => {
    expect(parseCampaignNotificationsReturnTarget('https://example.com')).toEqual({
      to: CAMPAIGN_ENTITY_SELECTOR_PATH,
    })

    expect(parseCampaignNotificationsReturnTarget('//example.com')).toEqual({
      to: CAMPAIGN_ENTITY_SELECTOR_PATH,
    })
  })
})

describe('campaignNotificationsSearchSchema', () => {
  it('accepts lang and from search params', () => {
    expect(
      campaignNotificationsSearchSchema.parse({
        from: '/primarie/12345678/buget/provocari?lang=en',
        lang: 'en',
      })
    ).toEqual({
      from: '/primarie/12345678/buget/provocari?lang=en',
      lang: 'en',
    })
  })
})
