/**
 * `to_plain_text` — the client port of the scrapper's frozen fold transformer
 * (TLDF spec §3.4; the server carries the same port). Normative emission
 * order: within a block, runs and children interleave by ascending span
 * start; each run contributes `(sep ?? '') + text`.
 *
 * The reader's renderer emits EXACTLY this sequence as its text content, so
 * `foldTldfBlocks` is the fidelity oracle the renderer tests compare against:
 * what the DOM shows is the proven clean text, character for character.
 */

import type { TldfBlock } from './types'

export function foldTldfBlocks(blocks: readonly TldfBlock[]): string {
  const parts: string[] = []
  const emit = (block: TldfBlock): void => {
    const items = [
      ...block.content.map((run) => ({ start: run.span[0], run })),
      ...(block.children ?? []).map((child) => ({ start: child.span[0], child })),
    ].sort((a, b) => a.start - b.start)
    for (const item of items) {
      if ('run' in item) parts.push((item.run.sep ?? '') + item.run.text)
      else emit(item.child)
    }
  }
  for (const block of blocks) emit(block)
  return parts.join('')
}
