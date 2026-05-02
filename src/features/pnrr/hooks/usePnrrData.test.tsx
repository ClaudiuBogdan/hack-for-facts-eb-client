import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePnrrData } from './usePnrrData'

const originalFetch = globalThis.fetch

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  globalThis.fetch = originalFetch
})

describe('usePnrrData', () => {
  it('loads PNRR projects through the API proxy', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          'Titlu Proiect': 'Test Project',
          'Nume Beneficiar': 'Test Beneficiar',
          CUI: '12345678',
          Județ: 'București',
          'Sursă Finanțare': 'grant',
          'Valoare (EUR)': 100_000,
          'Progres Tehnic': '50%',
          'Progres Financiar': '40%',
          'Cod Componentă': 'C4',
          'Cod Măsură': 'I3',
          Localitate: 'București',
          CRI: 'MTI',
        },
      ],
    } as Response)
    globalThis.fetch = fetchMock

    const { result } = renderHook(() => usePnrrData(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fetchMock).toHaveBeenCalledWith('/api/pnrr-projects')
    expect(result.current.data?.projects).toHaveLength(1)
    expect(result.current.data?.projects[0]?.title).toBe('Test Project')
  })
})
