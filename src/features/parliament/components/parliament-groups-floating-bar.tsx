import { useEffect, useRef, useState, type RefObject } from 'react'
import { useOptionalSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { ParliamentMembersSearch } from '@/schemas/parliament'
import {
  getActiveFilterCount,
  getPanelFilterCount,
} from '../lib/member-search'
import { FindRepTriggerButton } from './find-rep-dialog'
import { MembersActiveFilters } from './members-active-filters'
import { MembersFilterTriggerButton } from './members-filter-sheet'

type Props = {
  readonly anchorRef: RefObject<HTMLElement | null>
  readonly search: ParliamentMembersSearch
  readonly onSearchChange: (search: ParliamentMembersSearch) => void
  readonly onClearAll: () => void
  readonly onOpenFilters: () => void
  readonly onFindRep: () => void
}

/** Compact sticky bar for Grupuri — filters and actions while scrolling. */
export function ParliamentGroupsFloatingBar({
  anchorRef,
  search,
  onSearchChange,
  onClearAll,
  onOpenFilters,
  onFindRep,
}: Props) {
  const [hasMounted, setHasMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const lastScrollYRef = useRef(0)
  const mobileVisibleRef = useRef(false)
  const sidebar = useOptionalSidebar()
  const isViewportMobile = useIsMobile()
  const isMobile = sidebar?.isMobile ?? isViewportMobile
  const sidebarState = sidebar?.state
  const panelFilterCount = getPanelFilterCount(search)
  const hasActiveFilters = getActiveFilterCount(search) > 0

  useEffect(() => {
    setHasMounted(true)
    lastScrollYRef.current = window.scrollY

    const updateVisibility = () => {
      const anchorBottom =
        anchorRef.current?.getBoundingClientRect().bottom ??
        Number.POSITIVE_INFINITY
      const currentScrollY = window.scrollY
      const isScrollingDown = currentScrollY > lastScrollYRef.current + 4
      const isScrollingUp = currentScrollY < lastScrollYRef.current - 4

      if (isMobile) {
        if (isScrollingDown) mobileVisibleRef.current = true
        if (isScrollingUp) mobileVisibleRef.current = false
      }

      lastScrollYRef.current = currentScrollY

      const nextVisible =
        anchorBottom <= 0 && (!isMobile || mobileVisibleRef.current)
      setIsVisible(nextVisible)
    }

    updateVisibility()
    const visibilityInterval = window.setInterval(updateVisibility, 120)
    window.addEventListener('scroll', updateVisibility, { passive: true })
    document.addEventListener('scroll', updateVisibility, {
      passive: true,
      capture: true,
    })
    window.addEventListener('resize', updateVisibility)

    return () => {
      window.clearInterval(visibilityInterval)
      window.removeEventListener('scroll', updateVisibility)
      document.removeEventListener('scroll', updateVisibility, {
        capture: true,
      })
      window.removeEventListener('resize', updateVisibility)
    }
  }, [anchorRef, isMobile])

  if (!hasMounted) {
    return null
  }

  return (
    <div
      aria-hidden={!isVisible}
      inert={!isVisible ? true : undefined}
      className={cn(
        'fixed top-0 z-30 border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)]/90 backdrop-blur-md transition-[transform,opacity] duration-200 ease-out',
        isVisible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0 pointer-events-none',
        isMobile && 'left-0 w-full',
        !isMobile &&
          sidebarState === 'expanded' &&
          'left-[var(--sidebar-width)] right-0 w-auto',
        !isMobile &&
          sidebarState === 'collapsed' &&
          'left-[var(--sidebar-width-icon)] right-0 w-auto',
        !isMobile && !sidebarState && 'left-0 right-0 w-auto',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => {
            document
              .getElementById('membri')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          className="shrink-0 text-sm font-black tracking-tight text-[var(--pnrr-fg)] transition-colors hover:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
        >
          Membri
        </button>

        <div className="flex shrink-0 items-center gap-2 max-sm:[&_button]:px-2">
          <FindRepTriggerButton
            className="h-9 px-3 text-sm max-sm:[&_span]:hidden"
            onClick={onFindRep}
          />
          <MembersFilterTriggerButton
            activeCount={panelFilterCount}
            className="h-9 px-3 text-sm max-sm:[&_span:nth-child(2)]:hidden"
            onClick={onOpenFilters}
          />
        </div>
      </div>

      {hasActiveFilters ? (
        <div className="border-t-2 border-[var(--pnrr-border)]">
          <div className="mx-auto max-w-7xl px-4 py-1.5 sm:px-6 lg:px-8">
            <MembersActiveFilters
              search={search}
              onSearchChange={onSearchChange}
              onClearAll={onClearAll}
              compact
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
