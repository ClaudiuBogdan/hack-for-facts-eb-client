import { useEffect, useState } from 'react'

/**
 * Whether the landing is on screen for the first time since the document
 * loaded.
 *
 * The page's entrances — blocks fading in, figures counting up, labels
 * unscrambling, the hero's panel and margin field arriving — are for that first
 * time. A reader who opens a section and comes back has seen them; played again
 * they are a distraction, and the page is put back at the scroll position it
 * was left at, where a block still fading in looks like a page still loading.
 *
 * Module state rather than `sessionStorage`: it lasts exactly as long as the
 * document does, so moving around the app and back skips the entrances and a
 * reload plays them once more (the server's HTML starts the hero's own before
 * any script runs, so a stored flag could not stop those anyway). Never written
 * on the server, where effects do not run, so one request cannot switch the
 * entrances off for the next.
 *
 * Read at the first render and written at mount: StrictMode's second effect run
 * still sees the answer the first render got.
 */
let seen = false

export function useFirstVisit(): boolean {
  const [first] = useState(() => !seen)
  useEffect(() => {
    seen = true
  }, [])
  return first
}
