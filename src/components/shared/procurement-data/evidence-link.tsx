import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ExternalLink, FileText, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

type Kind = 'source' | 'document' | 'record'

type Props = {
  readonly href: string
  readonly label?: string
  readonly kind?: Kind
  readonly className?: string
}

const KIND_ICON: Record<Kind, typeof ExternalLink> = {
  source: ExternalLink,
  document: FileText,
  record: Database,
}

const DEFAULT_LABEL: Record<Kind, string> = {
  source: t`Deschide pe e-licitatie.ro`,
  document: t`Vezi documentul`,
  record: t`Vezi înregistrarea`,
}

/**
 * Inline link to a document, monitor/publication entry, source row, or
 * scraper reference. Opens in a new tab with `rel="noopener noreferrer"`.
 *
 * Exported as `ExternalEvidenceLink` from the procurement barrel to make this
 * anchor contract distinct from the data-trust drawer-opening EvidenceLink.
 */
export function EvidenceLink({ href, label, kind = 'source', className }: Props) {
  const Icon = KIND_ICON[kind]
  const text = label ?? DEFAULT_LABEL[kind]
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium text-foreground underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{text}</span>
      <span className="sr-only">
        <Trans>(se deschide într-o filă nouă)</Trans>
      </span>
    </a>
  )
}
