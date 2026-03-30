import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import {
  ChallengeModuleCard,
  formatRemainingTime,
  formatTotalTime,
} from './ChallengeModuleCard'
import type { ChallengeModuleCardStats } from './ChallengeModuleCard'
import type { ChallengeModuleDefinition } from '../../types'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('../../utils/modules', () => ({
  getTranslatedText: (value: { ro: string; en?: string }) => value.ro,
}))

vi.mock('../../constants', () => ({
  buildCampaignProvocariModulePath: (cui: string, slug: string) =>
    `/primarie/${cui}/buget/provocari/${slug}`,
}))

const moduleDefinition: ChallengeModuleDefinition = {
  id: 'mod-1',
  slug: 'test-module',
  order: 1,
  difficulty: 'beginner',
  title: { ro: 'Modul Test', en: 'Test Module' },
  description: { ro: 'Descriere modul', en: 'Module description' },
  challenges: [],
}

const baseStats: ChallengeModuleCardStats = {
  completedCount: 0,
  totalCount: 5,
  percentage: 0,
  remainingMinutes: 30,
  totalMinutes: 30,
}

describe('ChallengeModuleCard', () => {
  it('renders module title and description', () => {
    render(
      <ChallengeModuleCard
        entityCui="12345678"
        module={moduleDefinition}
        stats={baseStats}
        locale="ro"
        variant="active"
        nextStepUrl="/start"
      />,
    )

    expect(screen.getByText('Modul Test')).toBeInTheDocument()
    expect(screen.getByText('Descriere modul')).toBeInTheDocument()
  })

  it('shows progress bar with correct ARIA attributes for active variant', () => {
    const stats = { ...baseStats, percentage: 40 }

    render(
      <ChallengeModuleCard
        entityCui="12345678"
        module={moduleDefinition}
        stats={stats}
        locale="ro"
        variant="active"
        nextStepUrl="/step"
      />,
    )

    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '40')
    expect(progressbar).toHaveAttribute('aria-valuemin', '0')
    expect(progressbar).toHaveAttribute('aria-valuemax', '100')
  })

  it('does not show progress bar for other variant', () => {
    render(
      <ChallengeModuleCard
        entityCui="12345678"
        module={moduleDefinition}
        stats={{ ...baseStats, percentage: 50 }}
        locale="ro"
        variant="other"
        nextStepUrl="/step"
      />,
    )

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows Completed button when percentage is 100', () => {
    const stats = { ...baseStats, percentage: 100, completedCount: 5 }

    render(
      <ChallengeModuleCard
        entityCui="12345678"
        module={moduleDefinition}
        stats={stats}
        locale="ro"
        variant="active"
      />,
    )

    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('links View Details to the module details page', () => {
    render(
      <ChallengeModuleCard
        entityCui="12345678"
        module={moduleDefinition}
        stats={baseStats}
        locale="ro"
        variant="active"
        nextStepUrl="/step"
      />,
    )

    const detailsLink = screen.getByRole('link', { name: /View Details/i })
    expect(detailsLink).toHaveAttribute(
      'href',
      '/primarie/12345678/buget/provocari/test-module',
    )
  })

  it('renders Start label when there is no progress', () => {
    render(
      <ChallengeModuleCard
        entityCui="12345678"
        module={moduleDefinition}
        stats={baseStats}
        locale="ro"
        variant="active"
        nextStepUrl="/start"
      />,
    )

    expect(screen.getByRole('link', { name: /Start/i })).toBeInTheDocument()
  })

  it('renders Continue label when there is progress', () => {
    const stats = { ...baseStats, percentage: 30, completedCount: 2 }

    render(
      <ChallengeModuleCard
        entityCui="12345678"
        module={moduleDefinition}
        stats={stats}
        locale="ro"
        variant="active"
        nextStepUrl="/continue"
      />,
    )

    expect(screen.getByRole('link', { name: /Continue/i })).toBeInTheDocument()
  })
})

describe('formatRemainingTime', () => {
  it('returns Done for zero or negative minutes', () => {
    expect(formatRemainingTime(0)).toBe('Done')
    expect(formatRemainingTime(-5)).toBe('Done')
  })

  it('returns minutes only when under an hour', () => {
    expect(formatRemainingTime(45)).toBe('45m remaining')
  })

  it('returns hours only when minutes are exact', () => {
    expect(formatRemainingTime(120)).toBe('2h remaining')
  })

  it('returns hours and minutes for mixed values', () => {
    expect(formatRemainingTime(90)).toBe('1h 30m remaining')
  })
})

describe('formatTotalTime', () => {
  it('returns Done for zero or negative minutes', () => {
    expect(formatTotalTime(0)).toBe('Done')
    expect(formatTotalTime(-1)).toBe('Done')
  })

  it('returns minutes only when under an hour', () => {
    expect(formatTotalTime(30)).toBe('30m')
  })

  it('returns hours only when minutes are exact', () => {
    expect(formatTotalTime(60)).toBe('1h')
  })

  it('returns hours and minutes for mixed values', () => {
    expect(formatTotalTime(95)).toBe('1h 35m')
  })
})
