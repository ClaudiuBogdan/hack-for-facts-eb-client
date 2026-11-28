import { useEffect, useState } from 'react'

/**
 * The section whose top has passed a line a quarter of the way down the
 * window: the one a reader is in. Null until the browser says (the server
 * marks none). Pass only the ids the page renders. The same rule as the
 * national budget page's bar (copied, not shared: owner's ask, 25 November 2026).
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join(' ')
  useEffect(() => {
    // Every section on the line, the first of them in page order the current one: two neighbours can both touch the
    // line, and when one of them leaves the other is still there (a reversed scroll never leaves the bar unmarked).
    const order = key.split(' ')
    const onLine = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onLine.add(entry.target.id)
          else onLine.delete(entry.target.id)
        }
        setActive(order.find((id) => onLine.has(id)) ?? null)
      },
      { rootMargin: '-25% 0px -74% 0px' },
    )
    for (const id of order) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [key])
  return active
}
