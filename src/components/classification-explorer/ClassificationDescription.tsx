import { Trans } from '@lingui/react/macro'
import type { ClassificationType } from '@/types/classification-explorer'
import { Link } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  DISALLOWED_ELEMENTS,
  isSafeExternalHref,
  resolveClassificationHref,
} from './classification-utils'
import { useClassificationDescription } from './useClassificationDescription'

type ClassificationDescriptionProps = {
  readonly type: ClassificationType
  readonly code: string
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
              return <Link to={internalHref as string}>{children}</Link>
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
