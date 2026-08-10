import type { LegalOutlineEntry } from '@/schemas/legal'
import type { TldfChunkIndexEntry } from './types'

/**
 * Resolving a `?nod=` deep link (a document_nodes PATH) against the outline.
 *
 * `nod` may name a grain BELOW the outline's headings — an alineat, literă or
 * punct is a legitimate deep-link target but not a TOC entry — so resolution
 * falls back to the deepest outline ANCESTOR by dotted-path prefix. The DOM
 * anchor is still tried at the exact path first (`TldfBlocksView` gives every
 * block an id), with the ancestor as the landing fallback.
 *
 * `unmarked:N` keys carry no hierarchy (a declared second key form, not a DOM
 * path): they resolve only by exact outline match, and a miss is an honest
 * null — the reader says it could not find the fragment rather than scrolling
 * somewhere plausible-looking.
 */
export interface NodResolution {
  /** The requested path — the primary DOM anchor target (`#tldf-{nod}`). */
  readonly nod: string
  /** The outline entry the target lives under (or is). */
  readonly entry: LegalOutlineEntry
  /** 0-based chunk GROUP index on chunked documents; null on envelopes. */
  readonly chunkGroupIndex: number | null
}

export function domAnchorForPath(path: string): string {
  return `tldf-${path}`
}

function isDomPath(nod: string): boolean {
  return !nod.includes(':')
}

/**
 * Deepest outline entry that is `nod` itself or one of its dotted ancestors.
 */
export function findOutlineAnchor(
  nod: string,
  outline: readonly LegalOutlineEntry[],
): LegalOutlineEntry | null {
  let best: LegalOutlineEntry | null = null
  for (const entry of outline) {
    if (entry.path === nod) return entry
    if (
      isDomPath(nod) &&
      isDomPath(entry.path) &&
      nod.startsWith(`${entry.path}.`) &&
      (best === null || entry.path.length > best.path.length)
    ) {
      best = entry
    }
  }
  return best
}

/**
 * Which chunk group holds the anchor. Manifest chunk spans partition the
 * folded text, so `charStart` containment picks exactly one; a heading
 * without offsets (the server marks them nullable) resolves to no group and
 * the caller falls back to not auto-chaining.
 */
export function findChunkGroupIndex(
  entry: LegalOutlineEntry,
  chunks: readonly TldfChunkIndexEntry[],
): number | null {
  if (entry.charStart === null) return null
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i]
    if (
      chunk !== undefined &&
      entry.charStart >= chunk.span[0] &&
      entry.charStart < chunk.span[1]
    ) {
      return i
    }
  }
  return null
}

export function resolveNod(
  nod: string,
  outline: readonly LegalOutlineEntry[],
  chunks?: readonly TldfChunkIndexEntry[],
): NodResolution | null {
  const entry = findOutlineAnchor(nod, outline)
  if (entry === null) return null
  return {
    nod,
    entry,
    chunkGroupIndex: chunks === undefined ? null : findChunkGroupIndex(entry, chunks),
  }
}
