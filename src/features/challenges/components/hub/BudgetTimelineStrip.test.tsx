import { render } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BudgetTimelineStrip } from './BudgetTimelineStrip'

const useCampaignCalendarOverrideMock = vi.fn()
const useCampaignTimelineMock = vi.fn()
const getCampaignTextMock = vi.fn((value: { en?: string; ro: string }, locale: 'en' | 'ro') => {
  return locale === 'en' ? (value.en ?? value.ro) : value.ro
})

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('@/features/campaigns/buget/hooks/use-campaign-calendar-override', () => ({
  useCampaignCalendarOverride: (...args: unknown[]) => useCampaignCalendarOverrideMock(...args),
}))

vi.mock('@/features/campaigns/buget/hooks/use-campaign-timeline', () => ({
  useCampaignTimeline: (...args: unknown[]) => useCampaignTimelineMock(...args),
}))

vi.mock('@/features/campaigns/buget/hooks/use-campaign-content', () => ({
  getCampaignText: (...args: Parameters<typeof getCampaignTextMock>) => getCampaignTextMock(...args),
}))

vi.mock('../../constants', () => ({
  CHALLENGE_SELECTED_ENTITY_PICKER_PATH: '/picker',
}))

vi.mock('@/features/campaigns/buget/constants', () => ({
  buildCampaignCalendarPath: () => '/calendar',
}))

describe('BudgetTimelineStrip', () => {
  beforeEach(() => {
    useCampaignCalendarOverrideMock.mockReset()
    useCampaignTimelineMock.mockReset()
    getCampaignTextMock.mockClear()

    useCampaignCalendarOverrideMock.mockReturnValue({
      'publicare-proiect-buget-local': '2026-01-20',
    })
    useCampaignTimelineMock.mockReturnValue({
      entries: [
        {
          id: 'publicare-proiect-buget-local',
          title: { ro: 'Publicare', en: 'Publication' },
          description: { ro: 'Descriere', en: 'Description' },
          computedDate: '2026-01-20',
          isClosed: false,
          isEstimated: false,
          isActionable: true,
        },
        {
          id: 'vot-aprobare-buget-local',
          title: { ro: 'Aprobare', en: 'Approval' },
          description: { ro: 'Descriere', en: 'Description' },
          computedDate: '2026-02-20',
          isClosed: false,
          isEstimated: true,
          isActionable: true,
        },
      ],
    })
  })

  it('personalizes the hub strip with a pending submitted publication date', () => {
    render(
      <BudgetTimelineStrip locale="en" entityCui="4305857" />,
    )

    expect(useCampaignCalendarOverrideMock).toHaveBeenCalledWith('4305857')
    expect(useCampaignTimelineMock).toHaveBeenCalledWith({
      'publicare-proiect-buget-local': '2026-01-20',
    })
  })
})
