import { Info } from 'lucide-react'
import type { ParliamentSpeechSearchDepth } from '@/schemas/parliament'

type Props = {
  readonly depth: ParliamentSpeechSearchDepth
}

/**
 * The honesty banner under the stenograme search: says exactly how deep the
 * active `q` went. `depth` comes from the SERVER RESPONSE (`searchDepth`) when
 * available, falling back to the client-side hint while loading — the copy is
 * written to stay truthful either way. Rendered only while a search is active.
 */
export function ParliamentSpeechSearchDepthNotice({ depth }: Props) {
  const full = depth === 'FULL_TEXT'
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 border-2 border-parliament-border bg-parliament-surface px-4 py-3"
    >
      <Info
        aria-hidden
        className="mt-0.5 h-4 w-4 shrink-0 text-parliament-muted"
      />
      {full ? (
        <p className="text-sm leading-6 text-parliament-fg">
          Căutarea include <strong>transcrierea completă</strong> a
          intervențiilor, acolo unde stenograma a fost încărcată.
        </p>
      ) : (
        <p className="text-sm leading-6 text-parliament-fg">
          Căutarea se aplică <strong>titlurilor și rezumatelor</strong>{' '}
          intervențiilor. Pentru a căuta și în transcrierea completă, alegeți un
          vorbitor sau restrângeți perioada la cel mult 3 luni (din filtre).
        </p>
      )}
    </div>
  )
}
