import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationModal } from './useNotificationModal'

const navigateMock = vi.fn()

let searchState: { readonly notificationModal?: 'open'; readonly other?: string } = {}

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: navigateMock,
    get state() {
      return {
        location: {
          search: searchState,
        },
      }
    },
  }),
}))

describe('useNotificationModal', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    searchState = {
      other: 'kept',
    }
  })

  it('reads the open state from the current search and removes it when closing', () => {
    searchState = {
      notificationModal: 'open',
      other: 'kept',
    }

    const { result } = renderHook(() => useNotificationModal())

    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.closeModal()
    })

    expect(navigateMock).toHaveBeenCalledTimes(1)

    const navigateArgs = navigateMock.mock.calls[0]?.[0] as {
      readonly search: (previous: Record<string, unknown>) => Record<string, unknown>
    }

    expect(
      navigateArgs.search({
        notificationModal: 'open',
        other: 'kept',
      }),
    ).toEqual({
      other: 'kept',
    })
  })

  it('adds the notification modal flag when opening', () => {
    const { result } = renderHook(() => useNotificationModal())

    expect(result.current.isOpen).toBe(false)

    act(() => {
      result.current.openModal()
    })

    expect(navigateMock).toHaveBeenCalledTimes(1)

    const navigateArgs = navigateMock.mock.calls[0]?.[0] as {
      readonly search: (previous: Record<string, unknown>) => Record<string, unknown>
    }

    expect(
      navigateArgs.search({
        other: 'kept',
      }),
    ).toEqual({
      other: 'kept',
      notificationModal: 'open',
    })
  })
})
