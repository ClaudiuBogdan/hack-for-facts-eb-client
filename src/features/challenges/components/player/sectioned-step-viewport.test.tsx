import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { SectionedStepViewport } from './sectioned-step-viewport'

const SimpleSectionComponent = () => <p>Section body content</p>

describe('SectionedStepViewport', () => {
  it('renders the step title and section content', () => {
    render(
      <SectionedStepViewport
        stepTitle="Budget Overview"
        headerTitle="Introduction"
        hasPreviousSection={false}
        hasNextSection={false}
        onGoToPreviousSection={vi.fn()}
        onGoToNextSection={vi.fn()}
        CurrentSectionComponent={SimpleSectionComponent}
        mdxComponents={undefined}
        scrollAreaRef={createRef()}
      />,
    )

    expect(screen.getByText('Budget Overview')).toBeInTheDocument()
    expect(screen.getByText('Introduction')).toBeInTheDocument()
    expect(screen.getByText('Section body content')).toBeInTheDocument()
  })

  it('does not render the header title when null', () => {
    render(
      <SectionedStepViewport
        stepTitle="Budget Overview"
        headerTitle={null}
        hasPreviousSection={false}
        hasNextSection={false}
        onGoToPreviousSection={vi.fn()}
        onGoToNextSection={vi.fn()}
        CurrentSectionComponent={SimpleSectionComponent}
        mdxComponents={undefined}
        scrollAreaRef={createRef()}
      />,
    )

    expect(screen.getByText('Budget Overview')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('renders the previous section navigation button when hasPreviousSection is true', () => {
    render(
      <SectionedStepViewport
        stepTitle="Budget Overview"
        headerTitle="Details"
        hasPreviousSection={true}
        hasNextSection={false}
        onGoToPreviousSection={vi.fn()}
        onGoToNextSection={vi.fn()}
        CurrentSectionComponent={SimpleSectionComponent}
        mdxComponents={undefined}
        scrollAreaRef={createRef()}
      />,
    )

    expect(screen.getByRole('button', { name: /Go to previous section/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Go to next section/i })).not.toBeInTheDocument()
  })

  it('renders the next section navigation button when hasNextSection is true', () => {
    render(
      <SectionedStepViewport
        stepTitle="Budget Overview"
        headerTitle="Intro"
        hasPreviousSection={false}
        hasNextSection={true}
        onGoToPreviousSection={vi.fn()}
        onGoToNextSection={vi.fn()}
        CurrentSectionComponent={SimpleSectionComponent}
        mdxComponents={undefined}
        scrollAreaRef={createRef()}
      />,
    )

    expect(screen.queryByRole('button', { name: /Go to previous section/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to next section/i })).toBeInTheDocument()
  })

  it('calls onGoToPreviousSection when prev button is clicked', () => {
    const onGoToPreviousSection = vi.fn()

    render(
      <SectionedStepViewport
        stepTitle="Budget Overview"
        headerTitle="Details"
        hasPreviousSection={true}
        hasNextSection={false}
        onGoToPreviousSection={onGoToPreviousSection}
        onGoToNextSection={vi.fn()}
        CurrentSectionComponent={SimpleSectionComponent}
        mdxComponents={undefined}
        scrollAreaRef={createRef()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Go to previous section/i }))
    expect(onGoToPreviousSection).toHaveBeenCalledOnce()
  })

  it('calls onGoToNextSection when next button is clicked', () => {
    const onGoToNextSection = vi.fn()

    render(
      <SectionedStepViewport
        stepTitle="Budget Overview"
        headerTitle="Intro"
        hasPreviousSection={false}
        hasNextSection={true}
        onGoToPreviousSection={vi.fn()}
        onGoToNextSection={onGoToNextSection}
        CurrentSectionComponent={SimpleSectionComponent}
        mdxComponents={undefined}
        scrollAreaRef={createRef()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Go to next section/i }))
    expect(onGoToNextSection).toHaveBeenCalledOnce()
  })

  it('renders both navigation buttons when section is in the middle', () => {
    render(
      <SectionedStepViewport
        stepTitle="Budget Overview"
        headerTitle="Details"
        hasPreviousSection={true}
        hasNextSection={true}
        onGoToPreviousSection={vi.fn()}
        onGoToNextSection={vi.fn()}
        CurrentSectionComponent={SimpleSectionComponent}
        mdxComponents={undefined}
        scrollAreaRef={createRef()}
      />,
    )

    expect(screen.getByRole('button', { name: /Go to previous section/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to next section/i })).toBeInTheDocument()
  })

  it('renders the scroll area with the correct testid', () => {
    render(
      <SectionedStepViewport
        stepTitle="Budget Overview"
        headerTitle={null}
        hasPreviousSection={false}
        hasNextSection={false}
        onGoToPreviousSection={vi.fn()}
        onGoToNextSection={vi.fn()}
        CurrentSectionComponent={SimpleSectionComponent}
        mdxComponents={undefined}
        scrollAreaRef={createRef()}
      />,
    )

    expect(screen.getByTestId('sectioned-step-scroll-area')).toBeInTheDocument()
  })

  it('passes mdxComponents through to the section component', () => {
    const ComponentWithCustomHeading = ({ components }: any) => {
      const H1 = components?.h1 ?? 'h1'
      return <H1>Custom heading</H1>
    }
    const customH1 = ({ children }: any) => <h1 data-custom="true">{children}</h1>

    render(
      <SectionedStepViewport
        stepTitle="Budget Overview"
        headerTitle={null}
        hasPreviousSection={false}
        hasNextSection={false}
        onGoToPreviousSection={vi.fn()}
        onGoToNextSection={vi.fn()}
        CurrentSectionComponent={ComponentWithCustomHeading}
        mdxComponents={{ h1: customH1 }}
        scrollAreaRef={createRef()}
      />,
    )

    expect(screen.getByText('Custom heading')).toBeInTheDocument()
  })
})
