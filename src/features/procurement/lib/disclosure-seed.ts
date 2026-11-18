/**
 * The publication the browser last read (D6), and whether a server render's
 * seed belongs to it. Once the browser has read one, a seed of another — a
 * CDN copy of an older render, or a page left open across a publish — is
 * never used again, whatever render still holds it: its supplier names and
 * codes may be withheld now. A module of its own, with no reads, so a route's
 * entry chunk can ask it.
 */

let verified: string | null = null

/** The publication just read (the app shell's watch). */
export function markVerifiedPublication(version: string): void {
  verified = version
}

/** Tests only. */
export function forgetVerifiedPublicationForTests(): void {
  verified = null
}

/** Whether a loader's data may seed the page: not a server render's, or one read under the publication the browser read last (none read yet: the page as served). */
export function isSeedCurrent(data: unknown): boolean {
  if (!data || typeof data !== 'object' || !('disclosure' in data)) return true
  if (verified === null) return true
  return (data as { readonly disclosure?: string | null }).disclosure === verified
}
