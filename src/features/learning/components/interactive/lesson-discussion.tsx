import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { ChevronDown, ExternalLink, MessageSquare, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

type LessonDiscussionProps = {
  readonly topicId: number
  readonly topicSlug?: string
  readonly discourseBaseUrl: string
  readonly lessonTitle: string
}

type DiscourseEmbedMessage = {
  readonly type?: 'discourse-resize' | 'discourse-scroll'
  readonly height?: number
  readonly top?: number
}

function normalizeDiscourseBaseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

function buildDiscussionUrl(params: {
  readonly discourseBaseUrl: string
  readonly topicId: number
  readonly topicSlug?: string
}): string {
  const normalizedBaseUrl = normalizeDiscourseBaseUrl(params.discourseBaseUrl)
  if (params.topicSlug) {
    return `${normalizedBaseUrl}/t/${encodeURIComponent(params.topicSlug)}/${params.topicId}`
  }
  return `${normalizedBaseUrl}/t/${params.topicId}`
}

function buildDiscussionEmbedUrl(params: {
  readonly discourseBaseUrl: string
  readonly topicId: number
}): string {
  const normalizedBaseUrl = normalizeDiscourseBaseUrl(params.discourseBaseUrl)
  const queryString = new URLSearchParams({
    topic_id: String(params.topicId),
  }).toString()
  return `${normalizedBaseUrl}/embed/comments?${queryString}`
}

function getElementTopOffset(element: HTMLElement): number {
  let currentElement: HTMLElement | null = element
  let topOffset = 0
  while (currentElement) {
    topOffset += currentElement.offsetTop
    currentElement = currentElement.offsetParent as HTMLElement | null
  }
  return topOffset
}

export function LessonDiscussion({
  topicId,
  topicSlug,
  discourseBaseUrl,
  lessonTitle,
}: LessonDiscussionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasEmbedError, setHasEmbedError] = useState(false)
  const embedFrameRef = useRef<HTMLIFrameElement | null>(null)

  const discussionUrl = useMemo(
    () => buildDiscussionUrl({ discourseBaseUrl, topicId, topicSlug }),
    [discourseBaseUrl, topicId, topicSlug]
  )

  const discussionEmbedUrl = useMemo(
    () => buildDiscussionEmbedUrl({ discourseBaseUrl, topicId }),
    [discourseBaseUrl, topicId]
  )

  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false)
      setHasEmbedError(false)
      return
    }
    setIsLoading(true)
    setHasEmbedError(false)
  }, [isOpen, discussionEmbedUrl])

  const handleEmbedLoad = useCallback(() => {
    setIsLoading(false)
    setHasEmbedError(false)
  }, [])

  const handleEmbedError = useCallback(() => {
    setIsLoading(false)
    setHasEmbedError(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const expectedOrigin = new URL(normalizeDiscourseBaseUrl(discourseBaseUrl)).origin
    const handleMessage = (event: MessageEvent<DiscourseEmbedMessage>) => {
      if (event.origin !== expectedOrigin) return
      if (!event.data || typeof event.data !== 'object') return

      const embedFrame = embedFrameRef.current
      if (!embedFrame) return

      if (event.data.type === 'discourse-resize' && typeof event.data.height === 'number') {
        embedFrame.style.height = `${event.data.height}px`
        setIsLoading(false)
        return
      }

      if (event.data.type === 'discourse-scroll' && typeof event.data.top === 'number') {
        window.scrollTo({
          top: getElementTopOffset(embedFrame) + event.data.top,
        })
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [discourseBaseUrl, isOpen])

  const copy = {
    heading: t`Discussion`,
    description: t`Ask questions and discuss this lesson with the community.`,
    ctaLabel: t`Open in forum`,
    loadingLabel: t`Loading comments...`,
    errorLabel: t`Failed to load comments`,
    promptLabel: t`Want to add a comment?`,
  }

  return (
    <section className="not-prose mt-10">
      <Accordion
        type="single"
        collapsible
        value={isOpen ? 'discussion' : ''}
        onValueChange={(value) => setIsOpen(value === 'discussion')}
      >
        <AccordionItem value="discussion" className="border-none">
          <div className="relative overflow-hidden rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-gradient-to-r from-blue-50/80 to-white dark:from-blue-950/30 dark:to-zinc-950/30 shadow-sm">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative z-10">
              <AccordionTrigger className="px-5 md:px-6 py-5 hover:no-underline hover:bg-blue-100/50 dark:hover:bg-blue-900/20 rounded-2xl transition-colors [&[data-state=open]>div>div:last-child>svg]:rotate-180 [&>svg]:hidden">
                <div className="flex items-center gap-4 w-full">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 shrink-0">
                    <Users className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {copy.heading}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                      {copy.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200" />
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-5 md:px-6 pb-5">
                <div className="pt-4 border-t border-blue-100/50 dark:border-blue-900/30">
                  <div id="discourse-comments" className="relative min-h-[200px]">
                    {isOpen ? (
                      <iframe
                        ref={embedFrameRef}
                        src={discussionEmbedUrl}
                        title={`${copy.heading} - ${lessonTitle}`}
                        className={`w-full border-0 transition-opacity duration-150 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={handleEmbedLoad}
                        onError={handleEmbedError}
                        referrerPolicy="no-referrer-when-downgrade"
                        scrolling="no"
                      />
                    ) : null}

                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center h-[200px] text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          <span className="text-sm">{copy.loadingLabel}</span>
                        </div>
                      </div>
                    )}

                    {hasEmbedError && !isLoading && (
                      <div className="flex items-center justify-center h-[200px] text-zinc-500 dark:text-zinc-400">
                        <span className="text-sm">{copy.errorLabel}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-blue-100/50 dark:border-blue-900/30">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {copy.promptLabel}
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="rounded-xl font-semibold shadow-lg shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 text-white border-none"
                    >
                      <a
                        href={discussionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${copy.ctaLabel} - ${lessonTitle}`}
                      >
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                        {copy.ctaLabel}
                        <ExternalLink className="ml-1.5 h-3 w-3 opacity-70" />
                      </a>
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </div>
          </div>
        </AccordionItem>
      </Accordion>
    </section>
  )
}

export type { LessonDiscussionProps }
