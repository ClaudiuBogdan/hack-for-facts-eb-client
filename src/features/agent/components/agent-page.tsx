import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { MessageSquarePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import {
  deleteAgentConversation,
  getAgentConversation,
  listAgentConversations,
} from '../api/conversations'
import { AgentChat } from './agent-chat'

import type { AgentConversationDetail } from '../api/conversations'
import type { UIMessage } from 'ai'

const newConversationId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

/**
 * Agent page: thread sidebar + chat panel. Authenticated-only (the server
 * rejects anonymous requests; the UI shows a sign-in wall).
 */
export function AgentPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string>(() => newConversationId())
  const [openedExisting, setOpenedExisting] = useState(false)

  const conversations = useQuery({
    queryKey: ['agent', 'conversations'],
    queryFn: listAgentConversations,
    enabled: isSignedIn,
  })

  const activeConversation = useQuery({
    queryKey: ['agent', 'conversation', activeId],
    queryFn: () => getAgentConversation(activeId),
    enabled: isSignedIn && openedExisting,
  })

  const initialMessages = useMemo(
    () => (openedExisting ? activeConversation.data?.messages : undefined),
    [openedExisting, activeConversation.data]
  )

  // After each completed exchange: mirror the live messages into the
  // conversation cache (so reopening this thread doesn't serve stale data)
  // and refresh the sidebar (new threads appear, titles update).
  const handleExchangeFinish = useCallback(
    (conversationId: string, messages: UIMessage[]) => {
      queryClient.setQueryData<AgentConversationDetail>(
        ['agent', 'conversation', conversationId],
        previous => ({
          id: conversationId,
          title: previous?.title ?? null,
          createdAt: previous?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages,
        })
      )
      void queryClient.invalidateQueries({ queryKey: ['agent', 'conversations'] })
    },
    [queryClient]
  )

  if (!isLoaded) return null

  if (!isSignedIn) {
    return (
      <div className="mx-auto mt-24 max-w-md text-center">
        <h1 className="text-2xl font-semibold">
          <Trans>Transparenta Agent</Trans>
        </h1>
        <p className="mt-2 text-muted-foreground">
          <Trans>Sign in to chat with the agent about Romanian public data.</Trans>
        </p>
        <Button asChild className="mt-6">
          <Link to="/sign-in">
            <Trans>Sign in</Trans>
          </Link>
        </Button>
      </div>
    )
  }

  const startNewConversation = () => {
    setOpenedExisting(false)
    setActiveId(newConversationId())
  }

  const openConversation = (id: string) => {
    setOpenedExisting(true)
    setActiveId(id)
  }

  const removeConversation = async (id: string) => {
    try {
      await deleteAgentConversation(id)
    } catch {
      toast.error(t`Could not delete the conversation. Please try again.`)
      return
    }
    queryClient.removeQueries({ queryKey: ['agent', 'conversation', id] })
    await queryClient.invalidateQueries({ queryKey: ['agent', 'conversations'] })
    if (id === activeId) startNewConversation()
  }

  const chatReady = !openedExisting || activeConversation.isSuccess

  return (
    <div className="flex h-[calc(100dvh-4rem)]">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border md:flex">
        <div className="p-3">
          <Button variant="outline" className="w-full justify-start" onClick={startNewConversation}>
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            <Trans>New conversation</Trans>
          </Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {(conversations.data ?? []).map(conversation => (
            <div
              key={conversation.id}
              className={cn(
                'group flex items-center rounded-md text-sm',
                conversation.id === activeId ? 'bg-muted' : 'hover:bg-muted/50'
              )}
            >
              <button
                type="button"
                className="flex-1 truncate px-2 py-1.5 text-left"
                onClick={() => openConversation(conversation.id)}
              >
                {conversation.title ?? <Trans>Untitled conversation</Trans>}
              </button>
              <button
                type="button"
                className="invisible px-2 text-muted-foreground hover:text-destructive group-hover:visible"
                onClick={() => void removeConversation(conversation.id)}
                aria-label={t`Delete conversation`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1">
        {chatReady ? (
          <AgentChat
            key={activeId}
            conversationId={activeId}
            initialMessages={initialMessages}
            onExchangeFinish={messages => handleExchangeFinish(activeId, messages)}
          />
        ) : null}
      </main>
    </div>
  )
}
