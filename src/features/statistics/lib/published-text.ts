/**
 * TEMPO publishes its matrix text (definition, methodology, observations) as
 * plain text with `\r\n` line breaks and, in roughly a quarter of the fields,
 * embedded `<a href="…" target="_blank">label</a>` anchors pointing at INS
 * quality reports (measured 2026-09-17 on all 3,832 captured objects: 6,506
 * anchors, two stray `<td>` tags, one broken anchor). The API serves the text
 * verbatim; this module turns it into segments the UI can render WITHOUT
 * ever injecting HTML: anchors become links only when their target is an
 * absolute http(s) URL, every other tag is dropped, and its inner text kept.
 */

export type PublishedTextSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'link'; readonly href: string; readonly label: string }

const ANCHOR = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a\s*>/giu
const TAG = /<\/?[a-zA-Z][^>]*>/gu
const SOURCE_MARKER = /\s*<<\d+>>\s*$/u

function safeHref(raw: string): string | null {
  const href = raw.trim()
  if (!/^https?:\/\//iu.test(href)) return null
  try {
    return new URL(href).toString()
  } catch {
    return null
  }
}

function stripTags(text: string): string {
  return text.replace(TAG, '')
}

/** Split published text into text and link segments; never returns HTML. */
export function parsePublishedText(raw: string): PublishedTextSegment[] {
  const normalized = raw.replace(/\r\n?/gu, '\n')
  const segments: PublishedTextSegment[] = []
  let cursor = 0
  const push = (text: string) => {
    const clean = stripTags(text)
    if (clean.length === 0) return
    const last = segments[segments.length - 1]
    if (last?.kind === 'text') {
      segments[segments.length - 1] = { kind: 'text', text: last.text + clean }
    } else {
      segments.push({ kind: 'text', text: clean })
    }
  }
  for (const match of normalized.matchAll(ANCHOR)) {
    const index = match.index ?? 0
    push(normalized.slice(cursor, index))
    const href = safeHref(match[1] ?? match[2] ?? '')
    const label = stripTags(match[3] ?? '').trim()
    if (href !== null && label.length > 0) {
      segments.push({ kind: 'link', href, label })
    } else {
      push(label.length > 0 ? label : href ?? '')
    }
    cursor = index + match[0].length
  }
  push(normalized.slice(cursor))
  return segments
}

/** Published text as words alone: a link is its label, a break is a space. */
export function publishedTextPlain(raw: string): string {
  return parsePublishedText(raw)
    .map((segment) => (segment.kind === 'link' ? segment.label : segment.text))
    .join('')
    .replace(/\s+/gu, ' ')
    .trim()
}

/**
 * The opening of published text for a `<meta name="description">`: at most
 * `maxLength` characters of the plain words, cut at a word and marked as cut.
 */
export function publishedTextExcerpt(raw: string, maxLength = 160): string {
  const plain = publishedTextPlain(raw)
  if (plain.length <= maxLength) return plain
  const head = plain.slice(0, maxLength + 1)
  const lastSpace = head.lastIndexOf(' ')
  const cut = lastSpace > maxLength / 2 ? head.slice(0, lastSpace) : head.slice(0, maxLength)
  return `${cut.replace(/[\s,;:.\-–]+$/u, '')}…`
}

/** A published data-source name without TEMPO's trailing `<<NNNN>>` link marker. */
export function stripSourceMarker(name: string): string {
  return name.replace(SOURCE_MARKER, '').trim()
}
