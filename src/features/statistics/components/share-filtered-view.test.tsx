import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { ShareFilteredView } from './share-filtered-view'

describe('ShareFilteredView', () => {
  const originalHref = window.location.href
  const writeTextMock = vi.fn()

  beforeEach(() => {
    writeTextMock.mockReset()
    window.history.pushState({}, '', '/statistici/teritorii/54975?period=2023')
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

  it('copies the current URL and announces success', async () => {
    writeTextMock.mockResolvedValue(undefined)

    render(<ShareFilteredView />)
    fireEvent.click(screen.getByRole('button', { name: 'Copiază link' }))

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(window.location.href)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Link copiat')
  })

  it('announces an error when clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    })

    render(<ShareFilteredView />)
    fireEvent.click(screen.getByRole('button', { name: 'Copiază link' }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Copiere indisponibilă')
    })
  })

  it('announces an error when clipboard write rejects', async () => {
    writeTextMock.mockRejectedValue(new Error('denied'))

    render(<ShareFilteredView />)
    fireEvent.click(screen.getByRole('button', { name: 'Copiază link' }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Copiere indisponibilă')
    })
  })
})
