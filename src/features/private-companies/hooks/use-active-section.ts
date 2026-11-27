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
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setActive((was) => (entry.isIntersecting ? entry.target.id : was === entry.target.id ? null : was))
      },
      { rootMargin: '-25% 0px -74% 0px' },
    )
    for (const id of key.split(' ')) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [key])
  return active
}
