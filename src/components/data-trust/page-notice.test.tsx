import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@/test/test-utils'
import { PageNotice } from './page-notice'

vi.mock('@lingui/react/macro', () => ({ Trans: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

let dismissed: readonly string[] = []
vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useRouteContext: ({ select }: { select: (context: { dismissedNotices: readonly string[] }) => unknown }) => select({ dismissedNotices: dismissed }),
  }),
}))

const sendFeedback = vi.fn()
vi.mock('@/hooks/useSendFeedback', () => ({ useSendFeedback: () => sendFeedback }))

const remember = vi.fn()
let browserCookie: readonly string[] = []
vi.mock('./page-notice-cookie', () => ({
  rememberDismissedNotice: (id: string) => remember(id),
  readBrowserDismissedNotices: () => browserCookie,
}))

describe('PageNotice', () => {
  beforeEach(() => {
    dismissed = []
    browserCookie = []
    vi.clearAllMocks()
  })

  it('renders the default notice as a labelled region', () => {
    render(<PageNotice id="public-enterprises" />)
    expect(screen.getByRole('region', { name: 'Lucrăm încă la această pagină' })).toBeInTheDocument()
    expect(screen.getByText(/unele cifre se pot schimba/)).toBeInTheDocument()
  })

  it('takes a page’s own title and text', () => {
    render(
      <PageNotice id="ngos" title="Registrul ONG e în lucru">
        <p>Text propriu.</p>
      </PageNotice>,
    )
    expect(screen.getByRole('heading', { name: 'Registrul ONG e în lucru' })).toBeInTheDocument()
    expect(screen.getByText('Text propriu.')).toBeInTheDocument()
    expect(screen.queryByText(/unele cifre se pot schimba/)).not.toBeInTheDocument()
  })

  it('renders nothing once this page’s notice was dismissed this session', () => {
    dismissed = ['public-enterprises']
    const { container } = render(<PageNotice id="public-enterprises" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('hides a notice the cookie dismissed after the page’s HTML was made (browser cache)', () => {
    browserCookie = ['public-enterprises']
    render(<PageNotice id="public-enterprises" />)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('still shows on a page whose notice was not dismissed', () => {
    dismissed = ['ngos']
    render(<PageNotice id="public-enterprises" />)
    expect(screen.getByRole('region')).toBeInTheDocument()
  })

  it('„Am înțeles” remembers the dismissal and hides the notice at once', () => {
    render(<PageNotice id="public-enterprises" />)
    fireEvent.click(screen.getByRole('button', { name: 'Am înțeles' }))
    expect(remember).toHaveBeenCalledWith('public-enterprises')
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('a dismissal stays with its id when the page swaps to another notice', () => {
    const { rerender } = render(<PageNotice id="first" />)
    fireEvent.click(screen.getByRole('button', { name: 'Am înțeles' }))
    rerender(<PageNotice id="second" />)
    expect(screen.getByRole('region')).toBeInTheDocument()
  })

  it('„Trimite feedback” opens the feedback form and keeps the notice', () => {
    render(<PageNotice id="public-enterprises" />)
    fireEvent.click(screen.getByRole('button', { name: 'Trimite feedback' }))
    expect(sendFeedback).toHaveBeenCalledOnce()
    expect(screen.getByRole('region')).toBeInTheDocument()
  })
})
