import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Whether the act's head has left the screen, read from a marker placed right under it. False on the server and in
 * the first client render (nothing is observed there), so both render the page the same; an observer fills it in.
 * The head has left only when the marker is ABOVE the window: a head taller than a phone's screen leaves the marker
 * below it, which is not „away".
 */
export function useAwayFromHead(): { readonly markerRef: RefObject<HTMLDivElement | null>; readonly away: boolean } {
  const markerRef = useRef<HTMLDivElement | null>(null)
  const [away, setAway] = useState(false)
  useEffect(() => {
    const marker = markerRef.current
    if (marker === null || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      setAway(entry !== undefined && !entry.isIntersecting && entry.boundingClientRect.top < 0)
    })
    observer.observe(marker)
    return () => observer.disconnect()
  }, [])
  return { markerRef, away }
}
