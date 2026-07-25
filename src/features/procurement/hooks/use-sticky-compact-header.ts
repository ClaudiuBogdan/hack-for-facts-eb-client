import { useEffect, useRef, useState } from 'react'
import { useOptionalSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'

/**
 * Drives the compact chrome that replaces a page's full header once it scrolls
 * away — the hub's pattern, shared so the institution profile does not carry a
 * second copy of the scroll bookkeeping.
 *
 * On mobile the bar only appears while scrolling DOWN: a permanently pinned bar
 * costs too much of a short viewport, and the reader who is scrolling back up
 * is heading for the real header anyway.
 *
 * `hasMounted` gates rendering because the bar is `position: fixed` and depends
 * on `window` — server-rendered markup must not include it.
 */
export function useStickyCompactHeader({ enabled }: { enabled: boolean }): {
  readonly headerRef: React.RefObject<HTMLElement | null>
  readonly isCompactVisible: boolean
  readonly hasMounted: boolean
  readonly isMobile: boolean
  readonly sidebarState: 'expanded' | 'collapsed' | undefined
} {
  const [hasMounted, setHasMounted] = useState(false)
  const [isCompactVisible, setIsCompactVisible] = useState(false)
  const headerRef = useRef<HTMLElement | null>(null)
  const lastScrollYRef = useRef(0)
  const mobileCompactVisibleRef = useRef(false)
  const sidebar = useOptionalSidebar()
  const isViewportMobile = useIsMobile()
  const sidebarState = sidebar?.state
  const isMobile = sidebar?.isMobile ?? isViewportMobile

  useEffect(() => {
    if (!enabled) return
    setHasMounted(true)
    lastScrollYRef.current = window.scrollY

    const updateCompactVisibility = () => {
      const headerBottom =
        headerRef.current?.getBoundingClientRect().bottom ??
        Number.POSITIVE_INFINITY
      const currentScrollY = window.scrollY
      if (isMobile) {
        if (currentScrollY > lastScrollYRef.current + 4) {
          mobileCompactVisibleRef.current = true
        }
        if (currentScrollY < lastScrollYRef.current - 4) {
          mobileCompactVisibleRef.current = false
        }
      }
      lastScrollYRef.current = currentScrollY
      setIsCompactVisible(
        headerBottom <= 0 && (!isMobile || mobileCompactVisibleRef.current),
      )
    }

    updateCompactVisibility()
    // Scroll events alone miss layout shifts from data landing under the
    // header, so the interval backstops them.
    const visibilityInterval = window.setInterval(updateCompactVisibility, 120)
    window.addEventListener('scroll', updateCompactVisibility, { passive: true })
    document.addEventListener('scroll', updateCompactVisibility, {
      passive: true,
      capture: true,
    })
    window.addEventListener('resize', updateCompactVisibility)
    return () => {
      window.clearInterval(visibilityInterval)
      window.removeEventListener('scroll', updateCompactVisibility)
      document.removeEventListener('scroll', updateCompactVisibility, {
        capture: true,
      })
      window.removeEventListener('resize', updateCompactVisibility)
    }
  }, [enabled, isMobile])

  return { headerRef, isCompactVisible, hasMounted, isMobile, sidebarState }
}

/**
 * Positions a fixed compact bar against the app sidebar so it spans the
 * content column rather than sliding under the rail.
 */
export function stickyCompactBarPositionClassName({
  isMobile,
  sidebarState,
}: {
  readonly isMobile: boolean
  readonly sidebarState: 'expanded' | 'collapsed' | undefined
}): string {
  if (isMobile) return 'left-0 w-full'
  if (sidebarState === 'expanded')
    return 'left-[var(--sidebar-width)] right-0 w-auto'
  if (sidebarState === 'collapsed')
    return 'left-[var(--sidebar-width-icon)] right-0 w-auto'
  return 'left-0 right-0 w-auto'
}
