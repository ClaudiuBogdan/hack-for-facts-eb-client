import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { SectionedStepHeader } from './sectioned-step-header'
import type { SectionNavigationTarget } from './challenge-step-player.shared'
import type { ChallengeStepSection } from '../../utils/sectioned-step-markdown'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, resetScroll: _resetScroll, search: _search, ...props }: any) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
}))

const makeSections = (count: number): ChallengeStepSection[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `section-${i}`,
    title: `Section ${i + 1}`,
    bodySource: `Body ${i}`,
    interactive: null,
    Component: () => <p>Content {i}</p>,
  })) as unknown as ChallengeStepSection[]

const stepBackTarget: SectionNavigationTarget = {
  kind: 'step',
  href: '/prev-step',
  label: 'Previous step',
}

const sectionBackTarget: SectionNavigationTarget = {
  kind: 'section',
  sectionId: 'section-0',
  label: 'Back section',
}

describe('SectionedStepHeader', () => {
  it('renders step title counter in section view', () => {
    const sections = makeSections(3)

    render(
      <SectionedStepHeader
        backTarget={stepBackTarget}
        currentViewMode="section"
        currentSectionIndex={1}
        onProgressSectionSelect={vi.fn()}
        sections={sections}
        stepTitle="Test Step"
      />,
    )

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders progress segments for each section', () => {
    const sections = makeSections(3)

    render(
      <SectionedStepHeader
        backTarget={stepBackTarget}
        currentViewMode="section"
        currentSectionIndex={0}
        onProgressSectionSelect={vi.fn()}
        sections={sections}
        stepTitle="Test Step"
      />,
    )

    expect(screen.getByTestId('section-progress-section-0')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByTestId('section-progress-section-1')).not.toHaveAttribute('aria-current')
    expect(screen.getByTestId('section-progress-section-2')).not.toHaveAttribute('aria-current')
  })

  it('fires onProgressSectionSelect when a progress segment is clicked', () => {
    const sections = makeSections(2)
    const onProgressSectionSelect = vi.fn()

    render(
      <SectionedStepHeader
        backTarget={stepBackTarget}
        currentViewMode="section"
        currentSectionIndex={0}
        onProgressSectionSelect={onProgressSectionSelect}
        sections={sections}
        stepTitle="Test Step"
      />,
    )

    fireEvent.click(screen.getByTestId('section-progress-section-1'))
    expect(onProgressSectionSelect).toHaveBeenCalledWith('section-1')
  })

  it('shows the toggle to article view button in section mode', () => {
    const sections = makeSections(2)

    render(
      <SectionedStepHeader
        backTarget={stepBackTarget}
        currentViewMode="section"
        currentSectionIndex={0}
        onProgressSectionSelect={vi.fn()}
        onViewModeChange={vi.fn()}
        sections={sections}
        stepTitle="Test Step"
      />,
    )

    expect(screen.getByRole('button', { name: /Switch to article view/i })).toBeInTheDocument()
  })

  it('fires onViewModeChange when the view toggle is clicked', () => {
    const sections = makeSections(2)
    const onViewModeChange = vi.fn()

    render(
      <SectionedStepHeader
        backTarget={stepBackTarget}
        currentViewMode="section"
        currentSectionIndex={0}
        onProgressSectionSelect={vi.fn()}
        onViewModeChange={onViewModeChange}
        sections={sections}
        stepTitle="Test Step"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Switch to article view/i }))
    expect(onViewModeChange).toHaveBeenCalledWith('article', undefined)
  })

  it('shows the Section View toggle in article mode with no progress bar', () => {
    const sections = makeSections(2)

    render(
      <SectionedStepHeader
        backTarget={stepBackTarget}
        currentViewMode="article"
        currentSectionIndex={0}
        onProgressSectionSelect={vi.fn()}
        onViewModeChange={vi.fn()}
        sections={sections}
        stepTitle="Test Step"
      />,
    )

    expect(screen.getByRole('button', { name: /Switch to section view/i })).toBeInTheDocument()
    expect(screen.queryByTestId('section-progress-section-0')).not.toBeInTheDocument()
  })

  it('renders a link back target for step kind', () => {
    const sections = makeSections(1)

    render(
      <SectionedStepHeader
        backTarget={stepBackTarget}
        currentViewMode="section"
        currentSectionIndex={0}
        onProgressSectionSelect={vi.fn()}
        sections={sections}
        stepTitle="Test Step"
      />,
    )

    const link = screen.getByText('Previous step').closest('a')
    expect(link).toHaveAttribute('href', '/prev-step')
  })

  it('renders a button back target for section kind', () => {
    const sections = makeSections(2)
    const onProgressSectionSelect = vi.fn()

    render(
      <SectionedStepHeader
        backTarget={sectionBackTarget}
        currentViewMode="section"
        currentSectionIndex={1}
        onProgressSectionSelect={onProgressSectionSelect}
        sections={sections}
        stepTitle="Test Step"
      />,
    )

    const backButton = screen.getByText('Back section')
    expect(backButton.closest('a')).toBeNull()

    fireEvent.click(backButton)
    expect(onProgressSectionSelect).toHaveBeenCalledWith('section-0')
  })

  it('uses the interactive question as the section label when title is empty', () => {
    const sections: ChallengeStepSection[] = [
      {
        id: 'quiz-section',
        title: '',
        bodySource: '<Quiz />',
        interactive: {
          kind: 'quiz',
          id: 'q1',
          question: 'What color is the sky?',
          options: [],
          explanation: 'Blue.',
        },
        Component: () => <p>quiz</p>,
      },
    ] as unknown as ChallengeStepSection[]

    render(
      <SectionedStepHeader
        backTarget={stepBackTarget}
        currentViewMode="section"
        currentSectionIndex={0}
        onProgressSectionSelect={vi.fn()}
        sections={sections}
        stepTitle="Test Step"
      />,
    )

    expect(screen.getByTestId('section-progress-quiz-section')).toHaveAttribute(
      'aria-label',
      'Section 1: What color is the sky?',
    )
  })
})
