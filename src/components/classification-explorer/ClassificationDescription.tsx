import { Trans } from '@lingui/react/macro'
import type { ClassificationType } from '@/types/classification-explorer'
import { getUserLocale } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { loadClassificationDescription } from '@/lib/description-loader'

const DISALLOWED_ELEMENTS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button']

const CLASSIFICATION_BASE_PATH: Record<ClassificationType, string> = {
  functional: '/classifications/functional',
  economic: '/classifications/economic',
}

const isSafeExternalHref = (href: string | undefined): boolean => {
  if (!href) return false
  return href.startsWith('http://') || href.startsWith('https://')
}

const isSafeInternalAppHref = (href: string | undefined): boolean => {
  if (!href) return false
  return href.startsWith('/') && !href.startsWith('//')
}

const extractClassificationCodeFromHref = (href: string | undefined): string | null => {
  if (!href) return null

  const path = href.trim().split('#')[0]?.split('?')[0] ?? ''
  const lastSegment = path.split('/').filter(Boolean).pop()
  if (!lastSegment) return null

  const normalizedCode = lastSegment.replace(/\.md$/i, '')
  return /^[0-9]+(?:\.[0-9]+)*$/.test(normalizedCode) ? normalizedCode : null
}

const resolveClassificationHref = (
  href: string | undefined,
  type: ClassificationType
): string | null => {
  if (isSafeInternalAppHref(href)) {
    return href ?? null
  }

  const classificationCode = extractClassificationCodeFromHref(href)
  if (!classificationCode) {
    return null
  }

  return `${CLASSIFICATION_BASE_PATH[type]}/${classificationCode}`
}

type ClassificationDescriptionProps = {
  readonly type: ClassificationType
  readonly code: string
}

/**
 * Hook to fetch classification description data
 */
export function useClassificationDescription(type: ClassificationType, code: string) {
  const locale = getUserLocale()
  return useQuery({
    queryKey: ['classification-description', locale, type, code],
    queryFn: () => loadClassificationDescription(locale, type, code),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

export function ClassificationDescription({ type, code }: ClassificationDescriptionProps) {
  const { data, isLoading, isError } = useClassificationDescription(type, code)

  if (isLoading) return (
    <p className="text-sm text-muted-foreground italic">
      <Trans>Loading...</Trans>
    </p>
  )

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground italic">
        <Trans>Missing description</Trans>
      </p>
    )
  }

  const text = data || ''
  if (text.trim().length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        <Trans>Missing description</Trans>
      </p>
    )
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        disallowedElements={DISALLOWED_ELEMENTS}
        components={{
          a: ({ href, children }) => {
            const internalHref = resolveClassificationHref(href, type)
            if (internalHref) {
              return <Link to={internalHref as any}>{children}</Link>
            }

            if (!isSafeExternalHref(href)) {
              return <span>{children}</span>
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
