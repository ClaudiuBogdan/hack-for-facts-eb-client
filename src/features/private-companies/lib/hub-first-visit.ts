import { useEffect, useState } from 'react'

/**
 * Whether the companies hub is on screen for the first time since the
 * document loaded — the landing's rule (`features/landing/lib/first-visit.ts`),
 * with a flag of the hub's own: its entrances (blocks fading in, figures
 * counting up) are for that first time, and a reader who opens a company and
 * comes back has seen them. The landing's flag is not shared: a reader who
 * came through the landing has not seen this page arrive, and opening this
 * one must not switch the landing's entrances off.
 *
 * Module state, so it lasts as long as the document: a reload plays them
 * again. Never written on the server, where effects do not run. Read at the
 * first render and written at mount, so StrictMode's second effect run still
 * sees the first answer.
 */
let seen = false

export function useHubFirstVisit(): boolean {
  const [first] = useState(() => !seen)
  useEffect(() => {
    seen = true
  }, [])
  return first
}
