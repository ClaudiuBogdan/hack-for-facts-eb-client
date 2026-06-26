import { ExternalLink, FileText } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import type { MonitorulPublication } from '@/schemas/legal'
import { formatLegalDate, formatShortSha } from '../lib/legal-formatting'

type Props = {
  readonly publication: MonitorulPublication | null
}

function formatPageSpan(publication: MonitorulPublication): string {
  if (publication.pageStart === null && publication.pageEnd === null) {
    return t`pagini neprecizate`
  }

  if (
    publication.pageStart !== null &&
    publication.pageEnd !== null &&
    publication.pageStart !== publication.pageEnd
  ) {
    return t`pagini ${publication.pageStart}-${publication.pageEnd}`
  }

  const singlePage = publication.pageStart ?? publication.pageEnd

  if (singlePage === null) {
    return t`pagini neprecizate`
  }

  return t`pagina ${singlePage}`
}

export function MonitorulPublicationCard({ publication }: Props) {
  if (!publication) {
    return (
      <EmptyState
        title={t`Coordonatele de publicare nu sunt disponibile`}
        description={t`Actul rămâne vizibil prin sursa Portal Legislativ, dar legătura cu Monitorul Oficial nu este încă disponibilă în acest set de date.`}
      />
    )
  }

  const hasFullText = publication.hasFullText
  const resolutionLabel =
    publication.resolution === 'unique'
      ? t`potrivire unică`
      : publication.resolution === 'ambiguous'
        ? t`potrivire posibilă`
        : t`fără potrivire`

  return (
    <section
      aria-label={t`Publicare în Monitorul Oficial`}
      className="rounded-md border border-border bg-background p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" aria-hidden="true" />
            <Trans>Publicat în Monitorul Oficial</Trans>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <Trans>
              Partea {publication.partCode} · nr. {publication.issueNumber}/
              {publication.issueYear} · {formatLegalDate(publication.issueDate)}
            </Trans>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatPageSpan(publication)} · {resolutionLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={hasFullText ? 'success' : 'warning'}>
            {hasFullText ? (
              <Trans>text disponibil</Trans>
            ) : (
              <Trans>coordonate de publicare</Trans>
            )}
          </Badge>
          {publication.resolution !== 'unique' ? (
            <Badge variant="outline">
              <Trans>verificare necesară</Trans>
            </Badge>
          ) : null}
        </div>
      </div>

      {!hasFullText ? (
        <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Trans>
            Pentru acest număr este disponibilă metadată de publicare; textul
            integral nu este încă disponibil în client.
          </Trans>
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>SHA-256: {formatShortSha(publication.pdfSha256)}</span>
        {publication.pdfUrl ? (
          <Button asChild variant="outline" size="sm">
            <a
              href={publication.pdfUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t`Deschide PDF-ul Monitorul Oficial într-o filă nouă`}
            >
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              <Trans>Deschide PDF</Trans>
            </a>
          </Button>
        ) : (
          <span>
            <Trans>PDF indisponibil</Trans>
          </span>
        )}
      </div>
    </section>
  )
}
