import { useEffect } from 'react'

/**
 * Keeps the tab title correct on client-side navigations whose route `head`
 * could not name the page yet.
 *
 * Profile routes that no longer block navigation on their loader hand `head`
 * an empty payload in the browser, so it falls back to a CUI-only title. The
 * server render is unaffected — crawlers and shared links still get the full
 * head from the blocking SSR path — but a human tab would otherwise read
 * "Instituție CUI 16054368" forever. Call this once the real name lands.
 *
 * Pass `null` while the name is unknown to leave the router's title alone.
 */
export function useClientDocumentTitle(title: string | null): void {
  useEffect(() => {
    if (title === null || title.length === 0) return
    if (document.title === title) return
    document.title = title
  }, [title])
}
