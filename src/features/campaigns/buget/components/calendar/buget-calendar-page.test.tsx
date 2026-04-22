import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { BugetCalendarPage } from './buget-calendar-page'

const useCampaignCalendarOverrideMock = vi.fn()
const useCampaignTimelineMock = vi.fn()
const getCampaignTextMock = vi.fn((value: { en?: string; ro: string }, locale: 'en' | 'ro') => {
  return locale === 'en' ? (value.en ?? value.ro) : value.ro
})

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('../../hooks/use-campaign-calendar-override', () => ({
  useCampaignCalendarOverride: (...args: unknown[]) => useCampaignCalendarOverrideMock(...args),
}))

vi.mock('../../hooks/use-campaign-timeline', () => ({
  useCampaignTimeline: (...args: unknown[]) => useCampaignTimelineMock(...args),
}))

vi.mock('../../hooks/use-campaign-content', () => ({
  getCampaignText: (...args: Parameters<typeof getCampaignTextMock>) => getCampaignTextMock(...args),
}))

vi.mock('@/features/challenges/constants', () => ({
  buildCampaignProvocariPath: () => '/provocari',
}))

describe('BugetCalendarPage', () => {
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
          id: 'publicare-buget-de-stat',
          title: { ro: 'T0', en: 'T0' },
          description: { ro: 'Descriere T0', en: 'Description T0' },
          computedDate: '2026-01-05',
          isClosed: true,
          isEstimated: false,
          isActionable: false,
        },
        {
          id: 'publicare-proiect-buget-local',
          title: { ro: 'Publicare', en: 'Publication' },
          description: { ro: 'Descriere', en: 'Description' },
          computedDate: '2026-01-20',
          isClosed: false,
          isEstimated: true,
          isActionable: true,
        },
      ],
    })
  })

  it('personalizes the calendar with a pending submitted publication date', () => {
    render(
      <BugetCalendarPage locale="en" entityCui="4305857" />,
    )

    expect(useCampaignCalendarOverrideMock).toHaveBeenCalledWith('4305857')
    expect(useCampaignTimelineMock).toHaveBeenCalledWith({
      'publicare-proiect-buget-local': '2026-01-20',
    })
    expect(
      screen.getByText(
        'The calendar below is personalized based on available data for the selected city hall. Dates marked "confirmed" are known directly for that milestone, while steps marked with "estimated" are calculated based on the maximum legal deadlines.',
      ),
    ).toBeInTheDocument()
  })

  it('renders explicit confirmed and estimated badges for milestones', () => {
    render(
      <BugetCalendarPage locale="ro" entityCui="4305857" />,
    )

    expect(screen.getByText('confirmat')).toBeInTheDocument()
    expect(screen.getByText('estimat')).toBeInTheDocument()
  })
})
