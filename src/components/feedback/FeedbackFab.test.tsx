import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { FeedbackFab } from './FeedbackFab'

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
  msg: (strings: TemplateStringsArray) => strings[0],
}))
vi.mock('@lingui/react/macro', () => ({ Trans: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

const sendFeedback = vi.fn()
vi.mock('@/hooks/useSendFeedback', () => ({ useSendFeedback: () => sendFeedback }))

const supportMenu = vi.fn()
vi.mock('@/components/footer/support-menu', () => ({
  SupportMenu: (props: { trigger: React.ReactNode; includeFeedback?: boolean }) => {
    supportMenu(props)
    return <>{props.trigger}</>
  },
}))

describe('FeedbackFab', () => {
  it('opens the feedback form in one click', () => {
    render(<FeedbackFab />)
    fireEvent.click(screen.getByRole('button', { name: 'Feedback' }))
    expect(sendFeedback).toHaveBeenCalledOnce()
  })

  it('puts the rest of the help behind the arrow, without repeating feedback', () => {
    render(<FeedbackFab />)
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument()
    expect(supportMenu).toHaveBeenCalledWith(expect.objectContaining({ includeFeedback: false }))
  })
})
