import { parsePublishedText } from '../lib/published-text'

type Props = {
  readonly text: string
  readonly className?: string
}

/**
 * INS published text, rendered from parsed segments: line breaks preserved,
 * quality-report anchors as real links, no HTML injection anywhere.
 */
export function PublishedText({ text, className }: Props) {
  const segments = parsePublishedText(text)
  return (
    <p className={className ?? 'whitespace-pre-line text-sm leading-relaxed'}>
      {segments.map((segment, index) =>
        segment.kind === 'link' ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            {segment.label}
          </a>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  )
}
