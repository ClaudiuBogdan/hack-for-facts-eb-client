import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockServiceDiscovery } from '@/features/ngos/mocks/ngo-mocks'
import type { NgoServicesSearch } from '@/schemas/ngos'
import { NgoServicesPage } from './ngo-services-page'

const navigateMock = vi.fn()

const serviceQueryState = {
  data: undefined as typeof mockServiceDiscovery | undefined,
  isLoading: false,
  isError: false,
}

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  Link: ({
    children,
    to,
    params,
  }: {
    readonly children: ReactNode
    readonly to?: string
    readonly params?: Record<string, string>
  }) => {
    const resolvedTo = to?.replace(/\$(\w+)/g, (_, key: string) => params?.[key] ?? `$${key}`)
    return <a href={resolvedTo ?? '#'}>{children}</a>
  },
}))

vi.mock('../hooks/use-ngos', () => ({
  useNgoServiceDiscovery: () => serviceQueryState,
}))

const defaultSearch: NgoServicesSearch = {
  valid: 'active',
  view: 'lista',
  sort: 'nume',
  page: 1,
  pageSize: 25,
  unit: 'servicii',
}

function renderServices(search: NgoServicesSearch = defaultSearch) {
  return render(
    <NgoServicesPage initialResult={mockServiceDiscovery} search={search} />,
  )
}

describe('NgoServicesPage', () => {
  beforeEach(() => {
    serviceQueryState.data = undefined
    serviceQueryState.isLoading = false
    serviceQueryState.isError = false
    navigateMock.mockReset()
  })

  it('renders stale snapshot warning and the default service list', () => {
    renderServices()

    expect(screen.getByText('Datele pot fi depășite')).toBeInTheDocument()
    expect(
      screen.getByText(/instantaneu oficial/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Descoperire servicii sociale')).toBeInTheDocument()
    expect(screen.getByText('Asociația Diaconia Socială')).toBeInTheDocument()
    expect(screen.getByText('Rezultate servicii')).toBeInTheDocument()
  })

  it('updates URL search via navigate when filters change', async () => {
    renderServices()

    fireEvent.click(screen.getByRole('button', { name: 'Judete' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const viewCall = navigateMock.mock.calls[0]?.[0]
    expect(viewCall.search(defaultSearch)).toMatchObject({
      view: 'harta',
      page: 1,
    })

    navigateMock.mockClear()

    const searchInput = screen.getByLabelText('Cauta in servicii sociale')
    fireEvent.change(searchInput, { target: { value: 'Diaconia' } })
    fireEvent.submit(searchInput.closest('form')!)

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const searchCall = navigateMock.mock.calls[0]?.[0]
    expect(searchCall.search(defaultSearch)).toMatchObject({
      q: 'Diaconia',
      page: 1,
    })
  })

  it('renders accessible county aggregate fallback and deferred real-map caveat', () => {
    renderServices({ ...defaultSearch, view: 'harta' })

    expect(screen.getByText('Acoperire judeteana')).toBeInTheDocument()
    expect(
      screen.getByText(/Vedere agregata accesibila; harta spatiala este amanata/),
    ).toBeInTheDocument()
    expect(screen.getByText('Cluj')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Pondere judeteana').length).toBeGreaterThan(0)
  })

  it('renders empty state when filters match no services', () => {
    renderServices({
      ...defaultSearch,
      q: 'ZZZZNOTFOUND',
    })

    expect(
      screen.getByText('Niciun serviciu nu corespunde filtrelor curente.'),
    ).toBeInTheDocument()
  })
})
