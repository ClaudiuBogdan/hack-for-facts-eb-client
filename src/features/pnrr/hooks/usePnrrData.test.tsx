import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PnrrRawDataReadyContext } from '../lib/pnrr-raw-data-context'
import { getPnrrWorkerProject } from '../workers/pnrr-worker-client'
import { usePnrrProjectDetail } from './usePnrrData'

vi.mock('../workers/pnrr-worker-client', () => ({
  getPnrrWorkerProject: vi.fn(async (projectId: string) => ({
    project: { id: projectId },
  })),
}))

describe('usePnrrProjectDetail', () => {
  it('waits for the raw dataset behind a server overview, then reads the project', async () => {
    vi.stubGlobal('Worker', class {})
    let ready = false
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <PnrrRawDataReadyContext value={ready}>{children}</PnrrRawDataReadyContext>
    )
    const { result, rerender } = renderHook(
      () => usePnrrProjectDetail('engagement:7'),
      { wrapper },
    )

    expect(result.current.isLoading).toBe(true)
    expect(getPnrrWorkerProject).not.toHaveBeenCalled()

    ready = true
    rerender()

    await waitFor(() => {
      expect(result.current.data.project?.id).toBe('engagement:7')
    })
    expect(getPnrrWorkerProject).toHaveBeenCalledWith('engagement:7')
  })
})
