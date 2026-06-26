import { render, screen } from '@/test/test-utils'
import {
  mockCompanyLitigationCandidateCompany,
  mockCompanyLitigationGated,
  mockCompanyLitigationNoCases,
} from '@/features/justice/mocks/fixtures'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useCompanyLitigationMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Record<string, string>
    readonly search?: Record<string, unknown>
    readonly [key: string]: unknown
  }) => (
    <a
      href={to}
      data-params={params ? JSON.stringify(params) : undefined}
      data-search={search ? JSON.stringify(search) : undefined}
      {...props}
    >
      {children}
    </a>
  ),
}))

vi.mock('@/features/justice/hooks/use-justice-data', () => ({
  useCompanyLitigation: (input: Record<string, unknown>) =>
    useCompanyLitigationMock(input),
  getJusticeQueryOutcome: (value: unknown) => {
    if (value === undefined) return undefined
    if (value === null) return { kind: 'notFound' }
    if (
      typeof value === 'object' &&
      value !== null &&
      (value as { status?: unknown }).status === 'unavailable'
    ) {
      return { kind: 'unavailable', unavailable: value }
    }
    return { kind: 'populated', data: value }
  },
}))

describe('LitigationSliceSection', () => {
  beforeEach(() => {
    useCompanyLitigationMock.mockReset()
  })

  it('shows gated candidate-link state for CUI 14399840', async () => {
    useCompanyLitigationMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: mockCompanyLitigationGated,
    })

    const { LitigationSliceSection } = await import('./litigation-slice-section')

    render(
      <LitigationSliceSection cui="14399840" page={1} onPageChange={vi.fn()} />,
    )

    expect(useCompanyLitigationMock).toHaveBeenCalledWith({
      cui: '14399840',
      page: 1,
      pageSize: 10,
    })
    expect(screen.getByText(/corelare în verificare/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Litigiile sunt în curs de corelare/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Portal Just nu conține CUI-uri/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/Date demonstrative/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Deschide/i })).not.toBeInTheDocument()
  })

  it('shows live mock candidate cases with confidence and case-detail links', async () => {
    useCompanyLitigationMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: mockCompanyLitigationCandidateCompany,
    })

    const { LitigationSliceSection } = await import('./litigation-slice-section')

    render(
      <LitigationSliceSection cui="9000002" page={1} onPageChange={vi.fn()} />,
    )

    expect(screen.getByText('mock')).toBeInTheDocument()
    expect(screen.getByText(/1 cauze publicabile ca Companie/i)).toBeInTheDocument()
    expect(screen.getByText('S.C. EXEMPLU COMERCIAL SA')).toBeInTheDocument()
    expect(screen.getByText(/B · Încredere medie/i)).toBeInTheDocument()
    expect(screen.getByText(/Neverificat/i)).toBeInTheDocument()

    const caseLink = screen.getByRole('link', { name: /Deschide/i })
    expect(caseLink).toHaveAttribute('href', '/justitie/dosare/$caseId')
    expect(caseLink).toHaveAttribute(
      'data-params',
      JSON.stringify({ caseId: 'portal-just-bucuresti-2024-001' }),
    )
    expect(caseLink).toHaveAttribute(
      'data-search',
      JSON.stringify({ from: 'companies:9000002' }),
    )
  })

  it('shows zero-case coverage without inventing totals', async () => {
    useCompanyLitigationMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: mockCompanyLitigationNoCases,
    })

    const { LitigationSliceSection } = await import('./litigation-slice-section')

    render(
      <LitigationSliceSection cui="9000003" page={1} onPageChange={vi.fn()} />,
    )

    expect(
      screen.getByText(/Nu am găsit cauze în acoperirea curentă/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/fixture-ul mock nu are dosare pentru intervalul acoperit/i),
    ).toBeInTheDocument()
  })
})
