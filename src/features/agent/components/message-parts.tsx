import { Trans } from '@lingui/react/macro'
import { ExternalLink, Loader2, Wrench } from 'lucide-react'
import { isToolUIPart, isDynamicToolUIPart, getToolOrDynamicToolName } from 'ai'

import type { DynamicToolUIPart, ToolUIPart, UIMessage } from 'ai'

/**
 * Tool results arrive as the kernel MCP envelope
 * ({ ok, kind, link?, summary?, items?, meta? }) — see server
 * docs/AGENT-MODULE-SPEC.md §2.4. `chart_spec` / `map_spec` kinds will render
 * inline via the chart-renderer in a follow-up; today they show summary+link.
 */
interface ToolEnvelope {
  ok?: boolean
  kind?: string
  link?: string
  summary?: string
  error?: string
}

function asToolEnvelope(output: unknown): ToolEnvelope | null {
  if (typeof output !== 'object' || output === null) return null
  return output as ToolEnvelope
}

/** Tool output is the least-trusted field in the stream — only http(s) hrefs. */
function safeHttpLink(link: string | undefined): string | null {
  if (link === undefined) return null
  return /^https?:\/\//i.test(link) ? link : null
}

function ToolPartCard({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  const toolName = getToolOrDynamicToolName(part)
  const running = part.state === 'input-streaming' || part.state === 'input-available'
  const envelope = part.state === 'output-available' ? asToolEnvelope(part.output) : null
  const link = safeHttpLink(envelope?.link)

  return (
    <div className="my-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
        <span className="font-mono text-xs">{toolName}</span>
        {part.state === 'output-error' && (
          <span className="text-destructive text-xs">
            <Trans>tool error</Trans>
          </span>
        )}
      </div>
      {envelope?.summary ? <p className="mt-1 text-foreground">{envelope.summary}</p> : null}
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <Trans>Open in Transparenta</Trans>
        </a>
      ) : null}
    </div>
  )
}

export function MessageParts({ message }: { message: UIMessage }) {
  return (
    <>
      {message.parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <p key={index} className="whitespace-pre-wrap leading-relaxed">
              {part.text}
            </p>
          )
        }
        if (part.type === 'reasoning') {
          return part.text === '' ? null : (
            <p key={index} className="whitespace-pre-wrap text-xs italic text-muted-foreground">
              {part.text}
            </p>
          )
        }
        if (isToolUIPart(part) || isDynamicToolUIPart(part)) {
          return <ToolPartCard key={index} part={part} />
        }
        return null
      })}
    </>
  )
}
