import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ChallengeStepArticleLayout } from './challenge-step-article-layout'

vi.mock('@tanstack/react-router', () => ({
   
  Link: ({ children, to, resetScroll: _resetScroll, search: _search, ...props }: any) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/features/learning/components/loading/LessonSkeleton', () => ({
  LessonSkeleton: () => <div data-testid="lesson-skeleton">Loading skeleton</div>,
}))

vi.mock('@/features/learning/components/player/lesson-challenges-context', () => ({
  LessonChallengesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const defaultProps = {
  entityCui: '12345678',
  locale: 'ro' as const,
  moduleSlug: 'test-module',
  prev: null,
  next: null,
  findChallengeSlugForAdjacentStep: () => 'test-challenge',
  getTranslatedText: (value: { ro: string; en: string }) => value.ro,
  Component: null,
  mdxComponents: undefined,
  isLoading: false,
  error: null,
}

describe('ChallengeStepArticleLayout', () => {
  it('renders the loading skeleton when isLoading is true', () => {
    render(<ChallengeStepArticleLayout {...defaultProps} isLoading={true} />)

    expect(screen.getByTestId('lesson-skeleton')).toBeInTheDocument()
  })

  it('renders an error message when error is provided', () => {
    render(<ChallengeStepArticleLayout {...defaultProps} error="Failed to load content" />)

    expect(screen.getByText('Failed to load content')).toBeInTheDocument()
  })

  it('renders the MDX component when provided', () => {
    const TestComponent = () => <p>Article body content</p>

    render(<ChallengeStepArticleLayout {...defaultProps} Component={TestComponent} />)

    expect(screen.getByText('Article body content')).toBeInTheDocument()
  })

  it('renders a back to overview link when there is no previous step', () => {
    render(<ChallengeStepArticleLayout {...defaultProps} prev={null} />)

    expect(screen.getByText(/Back to overview/i)).toBeInTheDocument()
  })

  it('renders a previous step link when prev is provided', () => {
    const prev = {
      id: 'step-0',
      slug: 'prev-step',
      title: { ro: 'Pasul anterior', en: 'Previous step' },
      contentDir: 'prev-step',
      durationMinutes: 5,
      completionMode: 'mark_complete' as const,
      prerequisites: [],
    }

    render(<ChallengeStepArticleLayout {...defaultProps} prev={prev} />)

    expect(screen.getByText('Pasul anterior')).toBeInTheDocument()
    const prevLink = screen.getByText('Pasul anterior').closest('a')
    expect(prevLink).toHaveAttribute('preload', 'render')
  })

  it('renders a next step link when next is provided', () => {
    const next = {
      id: 'step-2',
      slug: 'next-step',
      title: { ro: 'Pasul urmator', en: 'Next step' },
      contentDir: 'next-step',
      durationMinutes: 5,
      completionMode: 'mark_complete' as const,
      prerequisites: [],
    }

    render(<ChallengeStepArticleLayout {...defaultProps} next={next} />)

    expect(screen.getByText('Pasul urmator')).toBeInTheDocument()
    const nextLink = screen.getByText('Pasul urmator').closest('a')
    expect(nextLink).toHaveAttribute('preload', 'render')
  })

  it('renders a finish link when there is no next step', () => {
    render(<ChallengeStepArticleLayout {...defaultProps} next={null} />)

    expect(screen.getByText(/Finish/i)).toBeInTheDocument()
  })

  it('renders the header slot when provided', () => {
    render(
      <ChallengeStepArticleLayout
        {...defaultProps}
        header={<div data-testid="custom-header">Header slot</div>}
      />,
    )

    expect(screen.getByTestId('custom-header')).toBeInTheDocument()
  })

  it('renders extraContent after the MDX component', () => {
    const TestComponent = () => <p>MDX body</p>

    render(
      <ChallengeStepArticleLayout
        {...defaultProps}
        Component={TestComponent}
        extraContent={<div data-testid="extra">Extra content</div>}
      />,
    )

    expect(screen.getByText('MDX body')).toBeInTheDocument()
    expect(screen.getByTestId('extra')).toBeInTheDocument()
  })

  it('does not render MDX component or extra content when Component is null', () => {
    render(
      <ChallengeStepArticleLayout
        {...defaultProps}
        Component={null}
        extraContent={<div data-testid="extra">Extra content</div>}
      />,
    )

    expect(screen.queryByTestId('extra')).not.toBeInTheDocument()
  })

  it('renders both previous and next step links', () => {
    const prev = {
      id: 'step-0',
      slug: 'prev-step',
      title: { ro: 'Pasul anterior', en: 'Previous step' },
      contentDir: 'prev-step',
      durationMinutes: 5,
      completionMode: 'mark_complete' as const,
      prerequisites: [],
    }

    const next = {
      id: 'step-2',
      slug: 'next-step',
      title: { ro: 'Pasul urmator', en: 'Next step' },
      contentDir: 'next-step',
      durationMinutes: 5,
      completionMode: 'mark_complete' as const,
      prerequisites: [],
    }

    render(<ChallengeStepArticleLayout {...defaultProps} prev={prev} next={next} />)

    expect(screen.getByText('Pasul anterior')).toBeInTheDocument()
    expect(screen.getByText('Pasul urmator')).toBeInTheDocument()
    expect(screen.queryByText(/Back to overview/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Finish/i)).not.toBeInTheDocument()
  })
})
