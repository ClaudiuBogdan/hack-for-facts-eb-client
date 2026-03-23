import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { BugetCalendarPage } from './buget-calendar-page'

const useCustomInteractionMock = vi.fn()
const useCampaignTimelineMock = vi.fn()
const getCampaignTextMock = vi.fn((value: { en?: string; ro: string }, locale: 'en' | 'ro') => {
  return locale === 'en' ? (value.en ?? value.ro) : value.ro
})
const getCampaignUatOverrideForCuiMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('@/features/learning/hooks/interactions/use-custom-interaction', () => ({
  useCustomInteraction: (...args: unknown[]) => useCustomInteractionMock(...args),
}))

vi.mock('../../hooks/use-campaign-timeline', () => ({
  useCampaignTimeline: (...args: unknown[]) => useCampaignTimelineMock(...args),
}))

vi.mock('../../hooks/use-campaign-content', () => ({
  getCampaignText: (...args: Parameters<typeof getCampaignTextMock>) => getCampaignTextMock(...args),
  getCampaignUatOverrideForCui: (...args: Parameters<typeof getCampaignUatOverrideForCuiMock>) =>
    getCampaignUatOverrideForCuiMock(...args),
}))

vi.mock('@/features/challenges/constants', () => ({
  buildCampaignProvocariPath: () => '/provocari',
}))

describe('BugetCalendarPage', () => {
  beforeEach(() => {
    useCustomInteractionMock.mockReset()
    useCampaignTimelineMock.mockReset()
    getCampaignTextMock.mockClear()
    getCampaignUatOverrideForCuiMock.mockReset()

    useCustomInteractionMock.mockReturnValue({
      savedValue: {
        publicationDate: '2026-01-20',
      },
    })
    getCampaignUatOverrideForCuiMock.mockReturnValue(undefined)
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
      ],
    })
  })

  it('personalizes the calendar with a pending submitted publication date', () => {
    render(
      <BugetCalendarPage locale="en" entityCui="4305857" />,
    )

    expect(useCampaignTimelineMock).toHaveBeenCalledWith({
      'publicare-proiect-buget-local': '2026-01-20',
    })
    expect(
      screen.getByText(
        'The calendar below is personalized based on available data for the selected city hall. Steps marked with "estimated" are calculated based on maximum legal deadlines.',
      ),
    ).toBeInTheDocument()
  })
})
