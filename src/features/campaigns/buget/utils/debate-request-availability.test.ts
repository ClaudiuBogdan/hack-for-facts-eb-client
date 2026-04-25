import { describe, expect, it } from 'vitest'
import {
  resolveDebateRequestAvailability,
  type DebateRequestAvailabilityStatus,
} from './debate-request-availability'
import type { CampaignEntityPublicConfigValues } from '../schemas/campaign-entity-public-config'

const GLOBAL_DEADLINE = '2026-04-26'

function config(values: Partial<CampaignEntityPublicConfigValues>): CampaignEntityPublicConfigValues {
  return {
    budgetPublicationDate: null,
    officialBudgetUrl: null,
    public_debate: null,
    ...values,
  }
}

function resolveStatus(params: {
  readonly now: string
  readonly publicConfigValues?: CampaignEntityPublicConfigValues | null
  readonly staticPublicationDate?: string | null
  readonly globalDeadlineDate?: string
}): DebateRequestAvailabilityStatus {
  return resolveDebateRequestAvailability({
    now: new Date(params.now),
    publicConfigValues: params.publicConfigValues ?? null,
    staticPublicationDate: params.staticPublicationDate ?? null,
    globalDeadlineDate: params.globalDeadlineDate ?? GLOBAL_DEADLINE,
  }).status
}

function withRuntimeTimeZone(timeZone: string, testFn: () => void) {
  const previousTimeZone = process.env.TZ
  process.env.TZ = timeZone

  try {
    testFn()
  } finally {
    if (previousTimeZone === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = previousTimeZone
    }
  }
}

describe('resolveDebateRequestAvailability', () => {
  it('keeps April 1 publication open through April 16 and closes on April 17', () => {
    const publicConfigValues = config({ budgetPublicationDate: '2026-04-01' })

    expect(resolveStatus({
      now: '2026-04-16T20:59:00.000Z',
      publicConfigValues,
    })).toBe('open')
    expect(resolveStatus({
      now: '2026-04-16T21:00:00.000Z',
      publicConfigValues,
    })).toBe('closed_deadline_expired')
  })

  it('uses same-day public debate time to keep submissions open before and closed after', () => {
    const publicConfigValues = config({
      public_debate: {
        date: '2026-04-10',
        time: '14:30',
        location: 'City hall',
        announcement_link: 'https://example.com/announcement',
      },
    })

    expect(resolveStatus({
      now: '2026-04-10T11:29:00.000Z',
      publicConfigValues,
    })).toBe('open')
    expect(resolveStatus({
      now: '2026-04-10T11:31:00.000Z',
      publicConfigValues,
    })).toBe('closed_debate_took_place')
  })

  it('evaluates public debate time in the campaign timezone, not the viewer timezone', () => {
    withRuntimeTimeZone('America/New_York', () => {
      const publicConfigValues = config({
        public_debate: {
          date: '2026-04-10',
          time: '14:30',
          location: 'City hall',
          announcement_link: 'https://example.com/announcement',
        },
      })

      expect(resolveStatus({
        now: '2026-04-10T11:29:00.000Z',
        publicConfigValues,
      })).toBe('open')
      expect(resolveStatus({
        now: '2026-04-10T11:31:00.000Z',
        publicConfigValues,
      })).toBe('closed_debate_took_place')
    })
  })

  it('lets a past public debate win over publication deadline status', () => {
    expect(resolveStatus({
      now: '2026-04-10T12:00:00.000Z',
      publicConfigValues: config({
        budgetPublicationDate: '2026-04-01',
        public_debate: {
          date: '2026-04-10',
          time: '14:30',
          location: 'City hall',
          announcement_link: 'https://example.com/announcement',
        },
      }),
    })).toBe('closed_debate_took_place')
  })

  it('uses config publication date before the static override', () => {
    const availability = resolveDebateRequestAvailability({
      now: new Date('2026-04-18T12:00:00.000Z'),
      publicConfigValues: config({ budgetPublicationDate: '2026-04-03' }),
      staticPublicationDate: '2026-04-01',
      globalDeadlineDate: GLOBAL_DEADLINE,
    })

    expect(availability.status).toBe('open')
    expect(availability.publicationDate).toBe('2026-04-03')
    expect(availability.requestDeadlineDate).toBe('2026-04-18')
  })

  it('uses the static override when config publication is missing', () => {
    const availability = resolveDebateRequestAvailability({
      now: new Date('2026-04-17T12:00:00.000Z'),
      publicConfigValues: config({ budgetPublicationDate: null }),
      staticPublicationDate: '2026-04-01',
      globalDeadlineDate: GLOBAL_DEADLINE,
    })

    expect(availability.status).toBe('closed_deadline_expired')
    expect(availability.publicationDate).toBe('2026-04-01')
    expect(availability.requestDeadlineDate).toBe('2026-04-16')
  })

  it('uses the global deadline when publication date is unknown', () => {
    expect(resolveStatus({
      now: '2026-04-26T20:59:00.000Z',
      publicConfigValues: null,
      globalDeadlineDate: '2026-04-26',
    })).toBe('open')
    expect(resolveStatus({
      now: '2026-04-26T21:00:00.000Z',
      publicConfigValues: null,
      globalDeadlineDate: '2026-04-26',
    })).toBe('closed_global_period_expired')
  })

  it('evaluates known publication deadlines in the campaign timezone', () => {
    withRuntimeTimeZone('America/New_York', () => {
      const publicConfigValues = config({ budgetPublicationDate: '2026-04-01' })

      expect(resolveStatus({
        now: '2026-04-16T20:59:00.000Z',
        publicConfigValues,
      })).toBe('open')
      expect(resolveStatus({
        now: '2026-04-16T21:00:00.000Z',
        publicConfigValues,
      })).toBe('closed_deadline_expired')
    })
  })

  it('evaluates the global fallback deadline in the campaign timezone', () => {
    withRuntimeTimeZone('America/New_York', () => {
      expect(resolveStatus({
        now: '2026-04-26T20:59:00.000Z',
        publicConfigValues: null,
        globalDeadlineDate: '2026-04-26',
      })).toBe('open')
      expect(resolveStatus({
        now: '2026-04-26T21:00:00.000Z',
        publicConfigValues: null,
        globalDeadlineDate: '2026-04-26',
      })).toBe('closed_global_period_expired')
    })
  })
})
