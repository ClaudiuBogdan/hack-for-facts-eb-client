import type { Ref } from 'react'
import { parsePublishedText } from '../../lib/published-text'

type Props = {
  readonly text: string
  readonly className?: string
  readonly id?: string
  /** The paragraph itself, for a caller that measures it. */
  readonly ref?: Ref<HTMLParagraphElement>
}

/**
 * INS published text, rendered from parsed segments: line breaks preserved,
 * quality-report anchors as real links, no HTML injection anywhere.
 */
export function PublishedText({ text, className, id, ref }: Props) {
  const segments = parsePublishedText(text)
  return (
    <p ref={ref} id={id} className={className ?? 'whitespace-pre-line text-sm leading-relaxed'}>
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
