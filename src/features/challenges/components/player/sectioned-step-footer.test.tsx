import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { SectionedStepFooter } from './sectioned-step-footer'
import type { SectionFooterState } from './challenge-step-player.shared'

const baseFooterState: SectionFooterState = {
  tone: 'neutral',
  message: null,
  primaryLabel: 'Next',
  primaryAction: 'advance',
  primaryDisabled: false,
  showSkip: true,
}

describe('SectionedStepFooter', () => {
  it('renders footer with skip and primary buttons', () => {
    render(
      <SectionedStepFooter
        footerState={baseFooterState}
        onSkip={vi.fn()}
        onPrimaryAction={vi.fn()}
      />,
    )

    expect(screen.getByTestId('sectioned-step-footer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Skip/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled()
  })

  it('hides skip button when showSkip is false', () => {
    render(
      <SectionedStepFooter
        footerState={{ ...baseFooterState, showSkip: false }}
        onSkip={vi.fn()}
        onPrimaryAction={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /Skip/i })).not.toBeInTheDocument()
  })

  it('disables the primary button when primaryDisabled is true', () => {
    render(
      <SectionedStepFooter
        footerState={{ ...baseFooterState, primaryDisabled: true }}
        onSkip={vi.fn()}
        onPrimaryAction={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled()
  })

  it('renders the skip button with an amber border and shadow when the primary action is disabled', () => {
    render(
      <SectionedStepFooter
        footerState={{ ...baseFooterState, primaryDisabled: true }}
        onSkip={vi.fn()}
        onPrimaryAction={vi.fn()}
      />,
    )

    const skip = screen.getByTestId('sectioned-footer-skip')
    expect(skip).toHaveClass('border-amber-400/70')
    expect(skip).toHaveClass('shadow-[0_0_14px_rgba(245,158,11,0.40)]')
  })

  it('renders the primary button as an outline when disabled for a check action', () => {
    render(
      <SectionedStepFooter
        footerState={{
          ...baseFooterState,
          primaryLabel: 'Choose an answer',
          primaryAction: 'check',
          primaryDisabled: true,
        }}
        onSkip={vi.fn()}
        onPrimaryAction={vi.fn()}
      />,
    )

    const primary = screen.getByRole('button', { name: /Choose an answer/i })
    expect(primary).toBeDisabled()
    expect(primary).toHaveClass('border-border/80')
    expect(primary).toHaveClass('shadow-none')
  })

  it('shows a success message with the correct tone', () => {
    render(
      <SectionedStepFooter
        footerState={{
          ...baseFooterState,
          tone: 'success',
          message: 'Correct!',
        }}
        onSkip={vi.fn()}
        onPrimaryAction={vi.fn()}
      />,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Correct!')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByTestId('sectioned-footer-note-separator')).toBeInTheDocument()
  })

  it('shows an error message with the correct tone', () => {
    render(
      <SectionedStepFooter
        footerState={{
          ...baseFooterState,
          tone: 'error',
          message: 'Incorrect answer',
        }}
        onSkip={vi.fn()}
        onPrimaryAction={vi.fn()}
      />,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Incorrect answer')
  })

  it('does not render the message area or separator when message is null', () => {
    render(
      <SectionedStepFooter
        footerState={baseFooterState}
        onSkip={vi.fn()}
        onPrimaryAction={vi.fn()}
      />,
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sectioned-footer-note-separator')).not.toBeInTheDocument()
  })

  it('calls onPrimaryAction when the primary button is clicked', () => {
    const onPrimaryAction = vi.fn()

    render(
      <SectionedStepFooter
        footerState={baseFooterState}
        onSkip={vi.fn()}
        onPrimaryAction={onPrimaryAction}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Next/i }))
    expect(onPrimaryAction).toHaveBeenCalledOnce()
  })

  it('calls onSkip when the skip button is clicked', () => {
    const onSkip = vi.fn()

    render(
      <SectionedStepFooter
        footerState={baseFooterState}
        onSkip={onSkip}
        onPrimaryAction={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Skip/i }))
    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('adds pt-2 class to footer actions when a message is present', () => {
    render(
      <SectionedStepFooter
        footerState={{ ...baseFooterState, message: 'Some feedback' }}
        onSkip={vi.fn()}
        onPrimaryAction={vi.fn()}
      />,
    )

    expect(screen.getByTestId('sectioned-footer-actions')).toHaveClass('pt-2')
  })

  it('renders the check action label', () => {
    render(
      <SectionedStepFooter
        footerState={{
          ...baseFooterState,
          primaryLabel: 'Choose an answer',
          primaryAction: 'check',
          primaryDisabled: true,
        }}
        onSkip={vi.fn()}
        onPrimaryAction={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /Choose an answer/i })).toBeDisabled()
  })

  it('renders the retry action label', () => {
    render(
      <SectionedStepFooter
        footerState={{
          ...baseFooterState,
          primaryLabel: 'Try again',
          primaryAction: 'retry',
          tone: 'error',
          message: 'Wrong!',
        }}
        onSkip={vi.fn()}
        onPrimaryAction={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /Try again/i })).toBeEnabled()
  })
})
