import type { LegalOutlineEntry } from '@/schemas/legal'
import { OUTLINE_DEPTH_RANK, isOutlineHeadingKind } from '../lib/tldf/outline'
import type { TldfBlock } from '../lib/tldf/types'
import { fetchLegalRenderMock } from './legal-render-api.mock'

/**
 * Mock outline lane — derived from the committed TLDF fixtures.
 *
 * FIXTURE PLUMBING ONLY: the live lane never derives structure from render
 * blocks (the server outline is the authority, and chunked giants make
 * client-side derivation impossible anyway). Here the fixtures ARE the whole
 * corpus, so walking their blocks with the same heading-kind filter produces
 * exactly the outline the server would serve for them.
 */
export async function fetchLegalOutlineMock(
  documentId: string,
): Promise<LegalOutlineEntry[]> {
  let data
  try {
    data = await fetchLegalRenderMock(documentId)
  } catch {
    // No fixture text ⇒ no outline. The reader's empty-outline degradation
    // (single column) is a real state and the mock exercises it honestly.
    return []
  }

  const entries: LegalOutlineEntry[] = []
  const walk = (blocks: readonly TldfBlock[]) => {
    for (const block of blocks) {
      if (isOutlineHeadingKind(block.kind)) {
        entries.push({
          documentId,
          path: block.id,
          nodeKind: block.kind,
          label: block.label ?? null,
          numberKey: block.number?.key ?? null,
          numberStatus: null,
          depth: OUTLINE_DEPTH_RANK[block.kind],
          orderIndex: entries.length,
          charStart: block.span[0],
          charEnd: block.span[1],
        })
      }
      if (block.children !== undefined) walk(block.children)
    }
  }

  if (data.kind === 'envelope') {
    walk(data.tldf.blocks)
    return entries
  }

  if (data.kind === 'manifest') {
    for (const chunk of data.tldf.chunks) {
      const part = await fetchLegalRenderMock(documentId, {
        chunkIndex: chunk.chunk_index,
      })
      if (part.kind === 'chunk') walk(part.tldf.blocks)
    }
    return entries
  }

  return entries
}
