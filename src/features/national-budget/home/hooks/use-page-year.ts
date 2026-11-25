import { createContext, use, useEffect, useState, type RefObject } from 'react'

import type { YearView } from '../lib/home-data'

/**
 * The page's one year, from the address (`an`), for every section: the year
 * the figures are read for follows the year picked once that year's data is
 * in, so a year change never falls back to skeletons. Provided by
 * `PageYearProvider` (components/person-shell.tsx).
 */
export type PageYear = {
  /** The year the figures are read for; it follows `picked` once that year's data is in. */
  readonly view: YearView
  /** The year as picked, at once: what the year menus show. */
  readonly picked: YearView
  /** A year was picked and its figures are still being read. */
  readonly pending: boolean
  readonly views: readonly YearView[]
  readonly setYear: (year: number) => void
}

export const PageYearContext = createContext<PageYear | null>(null)

export function usePageYear(): PageYear {
  const value = use(PageYearContext)
  if (!value) throw new Error('usePageYear outside PageYearProvider')
  return value
}

/** Whether an element is on screen; true until the browser says otherwise. */
export function useInView(ref: RefObject<HTMLElement | null>, margin = '-48px 0px 0px 0px'): boolean {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? true), { rootMargin: margin })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, margin])
  return visible
}
