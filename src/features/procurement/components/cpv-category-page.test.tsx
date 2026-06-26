import { render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProcurementCpvCategory } from '../hooks/use-procurement-data'
import { procurementMockFixtures } from '../mocks/fixtures'
import { CpvCategoryPage } from './cpv-category-page'

vi.mock('../hooks/use-procurement-data', () => ({
  useProcurementCpvCategory: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => {
  const { buildProcurementRouterMock } = await import('../test/mock-router')
  const { vi: vitest } = await import('vitest')
  return buildProcurementRouterMock(vitest.fn())
})

describe('CpvCategoryPage', () => {
  beforeEach(() => {
    vi.mocked(useProcurementCpvCategory).mockReset()
  })

  it('renders CPV category success state with partial spend guardrails', () => {
    vi.mocked(useProcurementCpvCategory).mockReturnValue({
      data: procurementMockFixtures.cpvPage('45'),
      isLoading: false,
      error: null,
    } as ReturnType<typeof useProcurementCpvCategory>)

    render(<CpvCategoryPage code="45" />)

    expect(screen.getAllByLabelText(/Status: Mock/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Acoperire parțială/i)).toBeInTheDocument()
    expect(screen.getByText(/Lucrări de construcții/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pe valoare/i })).toBeDisabled()
    expect(screen.getAllByLabelText(/Status: Parțial/i).length).toBeGreaterThan(0)
  })

  it('shows a loading skeleton while CPV data is fetching', () => {
    vi.mocked(useProcurementCpvCategory).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useProcurementCpvCategory>)

    render(<CpvCategoryPage code="45" />)

    expect(screen.getByText(/Se încarcă categoria CPV/i)).toBeInTheDocument()
  })

  it('shows an error empty state when CPV data fails to load', () => {
    vi.mocked(useProcurementCpvCategory).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('cpv failed'),
    } as ReturnType<typeof useProcurementCpvCategory>)

    render(<CpvCategoryPage code="99" />)

    expect(
      screen.getByText(/Categoria CPV 99 nu a putut fi încărcată/i),
    ).toBeInTheDocument()
  })

  it('defaults to count-ranked spend-over-time when amount coverage is below threshold', () => {
    vi.mocked(useProcurementCpvCategory).mockReturnValue({
      data: procurementMockFixtures.cpvPage('45'),
      isLoading: false,
      error: null,
    } as ReturnType<typeof useProcurementCpvCategory>)

    render(<CpvCategoryPage code="45" />)

    const countButton = screen.getByRole('button', { name: /Pe număr/i })
    const valueButton = screen.getByRole('button', { name: /Pe valoare/i })

    expect(countButton).toHaveAttribute('aria-pressed', 'true')
    expect(valueButton).toBeDisabled()
    expect(valueButton).toHaveAttribute('aria-pressed', 'false')
  })
})
