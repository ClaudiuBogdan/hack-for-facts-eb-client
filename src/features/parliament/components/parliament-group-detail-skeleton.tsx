import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  GROUP_BREADCRUMB_BG,
  GROUP_SURFACE,
  groupCardClassName,
  groupPageContainerClassName,
  groupSectionTitleClassName,
} from '../lib/group-theme'

/**
 * Loading state for the group dossier.
 *
 * Mirrors the real page rather than showing one grey box, so the layout does
 * not jump when the data lands. Everything the router already knows — the
 * breadcrumb trail, the section headings, the roster grid shape — is rendered
 * for real; only the group's own facts are greyed.
 *
 * The hero band is NEUTRAL, not chamber-coloured: the chamber is exactly one of
 * the facts we are still waiting for, and painting it green or crimson would
 * announce an answer before we have one.
 */
export function ParliamentGroupDetailSkeleton() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: GROUP_SURFACE }}>
      <nav
        className="py-3 text-sm text-white"
        style={{ backgroundColor: GROUP_BREADCRUMB_BG }}
        aria-label="Breadcrumb"
      >
        <div className={groupPageContainerClassName}>
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link
                to="/parlament"
                search={{ tab: 'prezentare' }}
                className="hover:underline"
              >
                Parlament
              </Link>
            </li>
            <li aria-hidden className="opacity-70">
              ›
            </li>
            <li>
              <Link to="/parlament/grupuri" className="hover:underline">
                Grupuri
              </Link>
            </li>
            <li aria-hidden className="opacity-70">
              ›
            </li>
            <li aria-current="page">
              <span className="sr-only">Se încarcă</span>
              <span
                aria-hidden
                className="inline-block h-4 w-24 animate-pulse bg-white/30 align-middle"
              />
            </li>
          </ol>
        </div>
      </nav>

      <section className="py-8" style={{ backgroundColor: '#505a5f' }}>
        <div className={groupPageContainerClassName}>
          <div className="h-8 w-56 animate-pulse bg-white/30 sm:h-9 sm:w-72" />
          <div className="mt-4 h-4 w-64 animate-pulse bg-white/20" />
          <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index}>
                <div className="h-8 w-16 animate-pulse bg-white/30" />
                <div className="mt-2 h-4 w-28 animate-pulse bg-white/20" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className={cn(groupPageContainerClassName, 'space-y-10 py-8')}>
        <section className="space-y-4">
          <h2 className={groupSectionTitleClassName}>Cum a votat grupul</h2>
          <div className={cn(groupCardClassName, 'p-5 sm:p-6')}>
            <div className="h-4 w-48 animate-pulse bg-[#dee0e2]" />
            <div className="mt-4 h-4 w-full animate-pulse bg-[#dee0e2]" />
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="h-10 animate-pulse bg-[#dee0e2]" />
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className={groupSectionTitleClassName}>Componență</h2>
          <div className={cn(groupCardClassName, 'p-4 sm:p-5')}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="h-11 flex-1 animate-pulse bg-[#dee0e2]" />
              <div className="h-11 animate-pulse bg-[#dee0e2] sm:w-64" />
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }, (_, index) => (
              <li
                key={index}
                className={cn(groupCardClassName, 'h-[5.5rem] animate-pulse')}
              />
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
