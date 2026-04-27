import { useCallback } from 'react'
import { useRouter } from '@tanstack/react-router'

export function useNotificationModal() {
  const router = useRouter()

  const isOpen =
    (router.state.location.search as Record<string, unknown>).notificationModal === 'open'
  const setOpen = useCallback(
    (newOpen: boolean) => {
      void router.navigate({
        search: (prev: Record<string, unknown>) => {
          const nextSearch = {
            ...(prev as Record<string, unknown>),
          } as Record<string, unknown>

          if (newOpen) {
            nextSearch.notificationModal = 'open'
            return nextSearch
          }

          delete nextSearch.notificationModal
          return nextSearch
        },
        replace: true,
        resetScroll: false,
      } as Record<string, unknown>)
    },
    [router]
  )

  const openModal = useCallback(() => setOpen(true), [setOpen])
  const closeModal = useCallback(() => setOpen(false), [setOpen])

  return { isOpen, setOpen, openModal, closeModal }
}
