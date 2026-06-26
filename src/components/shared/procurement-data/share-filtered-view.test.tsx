import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { ShareFilteredView } from './share-filtered-view'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ShareFilteredView', () => {
  const originalHref = window.location.href
  const writeTextMock = vi.fn()

  beforeEach(() => {
    writeTextMock.mockReset()
    window.history.pushState({}, '', '/achizitii/cautare?grain=contracts')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock,
      },
    })
  })

  afterEach(() => {
    window.history.pushState({}, '', originalHref)
  })

  it('copies the target URL and announces success', async () => {
    writeTextMock.mockResolvedValue(undefined)

    render(<ShareFilteredView />)
    fireEvent.click(screen.getByRole('button', { name: 'Copiază linkul către vizualizarea curentă' }))

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(window.location.href)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Link copiat')
  })

  it('announces an error when clipboard write rejects', async () => {
    writeTextMock.mockRejectedValue(new Error('denied'))

    render(<ShareFilteredView />)
    fireEvent.click(screen.getByRole('button', { name: 'Copiază linkul către vizualizarea curentă' }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Copiere indisponibilă')
    })
  })
})
