import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { ChevronDown, ExternalLink, MessageSquare, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  buildDiscourseTopicEmbedUrl,
  buildDiscourseTopicUrl,
  normalizeDiscourseBaseUrl,
} from '@/lib/discourse'
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
    () => buildDiscourseTopicUrl({ discourseBaseUrl, topicId, topicSlug }),
    [discourseBaseUrl, topicId, topicSlug]
  )

  const discussionEmbedUrl = useMemo(
    () => buildDiscourseTopicEmbedUrl({ discourseBaseUrl, topicId }),
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
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="relative z-10">
              <AccordionTrigger className="px-5 md:px-6 py-5 hover:no-underline hover:bg-primary/10 rounded-2xl transition-colors [&[data-state=open]>div>div:last-child>svg]:rotate-180 [&>svg]:hidden">
                <div className="flex items-center gap-4 w-full">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-md shrink-0">
                    <Users className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="text-base font-semibold text-foreground">
                      {copy.heading}
                    </h3>
                    <p className="text-sm text-foreground mt-0.5">
                      {copy.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/20 text-primary">
                    <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200" />
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-5 md:px-6 pb-5">
                <div className="pt-4 border-t border-border">
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
                      <div className="absolute inset-0 flex items-center justify-center h-[200px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <span className="text-sm">{copy.loadingLabel}</span>
                        </div>
                      </div>
                    )}

                    {hasEmbedError && !isLoading && (
                      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                        <span className="text-sm">{copy.errorLabel}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      {copy.promptLabel}
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="rounded-xl font-semibold shadow-md hover:bg-primary hover:shadow-lg border-none"
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
