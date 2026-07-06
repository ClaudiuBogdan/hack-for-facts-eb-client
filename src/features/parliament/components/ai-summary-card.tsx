import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  /** Server-provided disclaimer — rendered VERBATIM, never paraphrased. */
  readonly disclaimer: string
  readonly model: string
  readonly summary?: string
  /** ISO/date string of the enrichment load; shown in the provenance line. */
  readonly loadedAt?: string
  readonly topic?: string
  readonly domains?: readonly string[]
  readonly keywords?: readonly string[]
  readonly className?: string
}

function formatLoadedAt(value: string | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function Chip({ label }: { readonly label: string }) {
  return (
    <span className="inline-flex items-center rounded-none bg-[#f3f0ff] px-2 py-1 text-xs font-semibold text-[#512178] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]">
      {label}
    </span>
  )
}

/**
 * AI-generated summary card. Deliberately styled DISTINCT from authoritative
 * content — a labelled "AI" badge + coloured inset border make clear this is
 * machine-generated, not an official statement. The server `disclaimer` is shown
 * verbatim so the caveat is never lost or reworded.
 */
export function AiSummaryCard({
  disclaimer,
  model,
  summary,
  loadedAt,
  topic,
  domains,
  keywords,
  className,
}: Props) {
  const loadedAtLabel = formatLoadedAt(loadedAt)
  const chips = [...(domains ?? []), ...(keywords ?? [])]

  return (
    <section
      className={cn(
        'border-2 border-[#512178] border-l-8 bg-[#faf9ff] p-5 dark:bg-[var(--pnrr-card)]',
        className,
      )}
      aria-label="Rezumat generat de AI"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-none bg-[#512178] px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          AI
        </span>
        <h3 className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          Rezumat generat de AI
        </h3>
      </div>

      <p className="mt-3 text-sm italic leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        {disclaimer}
      </p>

      {summary ? (
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          {summary}
        </p>
      ) : null}

      {topic ? (
        <p className="mt-4 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          <span className="font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            Temă:
          </span>{' '}
          {topic}
        </p>
      ) : null}

      {chips.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip, i) => (
            <Chip key={`${chip}-${i}`} label={chip} />
          ))}
        </div>
      ) : null}

      <p className="mt-4 border-t border-[#512178]/15 pt-3 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        model {model}
        {loadedAtLabel ? ` · ${loadedAtLabel}` : ''}
      </p>
    </section>
  )
}
