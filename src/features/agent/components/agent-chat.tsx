import { useMemo, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Send, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createAgentTransport } from '../api/agent-transport'
import { MessageParts } from './message-parts'

import type { UIMessage } from 'ai'

interface AgentChatProps {
  /** Conversation id — also the server-side thread id. */
  conversationId: string
  /** Stored messages when reopening an existing thread. */
  initialMessages?: UIMessage[]
  /** Called with the full message list after each completed exchange. */
  onExchangeFinish?: (messages: UIMessage[]) => void
}

/**
 * One chat thread against the agent (server: POST /api/v1/agent/chat).
 * Remount with a different `key`/`conversationId` to switch threads.
 */
export function AgentChat({ conversationId, initialMessages, onExchangeFinish }: AgentChatProps) {
  const { t } = useLingui()
  const [input, setInput] = useState('')
  const transport = useMemo(() => createAgentTransport(), [])

  const { messages, sendMessage, status, error, regenerate, stop, clearError } = useChat({
    id: conversationId,
    messages: initialMessages ?? [],
    transport,
    onFinish: ({ messages: finishedMessages, isError }) => {
      if (!isError) onExchangeFinish?.(finishedMessages)
    },
  })

  const busy = status === 'submitted' || status === 'streaming'

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-16 text-center text-muted-foreground">
            <Trans>
              Ask about public spending, institutions, parliament activity, procurement or PNRR
              projects.
            </Trans>
          </div>
        )}
        {messages.map(message => (
          <div
            key={message.id}
            className={cn(
              'max-w-[85%] rounded-lg px-3 py-2 text-sm',
              message.role === 'user'
                ? 'ml-auto bg-primary text-primary-foreground'
                : 'mr-auto bg-muted'
            )}
          >
            <MessageParts message={message} />
          </div>
        ))}
        {error && (
          <div className="mr-auto max-w-[85%] rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            <p>
              <Trans>Something went wrong.</Trans>
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => regenerate()}>
              <Trans>Retry</Trans>
            </Button>
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-border p-3"
        onSubmit={event => {
          event.preventDefault()
          const text = input.trim()
          if (!text || busy) return
          if (error) clearError()
          void sendMessage({ text })
          setInput('')
        }}
      >
        <Input
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder={t`Ask the Transparenta agent…`}
          autoFocus
        />
        {busy ? (
          <Button type="button" variant="outline" size="icon" onClick={() => void stop()}>
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={input.trim() === ''}>
            <Send className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  )
}
