import type { ReactNode } from 'react'
import { ExternalLink, FileQuestion, RefreshCw, ServerCrash } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ParliamentStenogramFailure } from '../lib/parliament-stenogram-error'
import { stenogramLinkClassName } from '../lib/stenogram-theme'

type Props = {
  readonly failure: ParliamentStenogramFailure
  readonly onRetry?: () => void
  /** Official source link — the only useful action for a SOURCE_ONLY capture. */
  readonly sourceUrl?: string
  readonly sourceLabel?: string
  readonly className?: string
  /** Extra navigation the caller wants under the message. */
  readonly children?: ReactNode
}

/**
 * The four failure states, told apart in words.
 *
 * Every branch answers three things: WHAT happened, what it means for the
 * RECORD (does this sitting exist or not?), and what the reader can do next.
 * The distinction is the product requirement — "nu am găsit ședința" and "nu am
 * putut ajunge la server" must never wear the same sentence, because the first
 * is a statement about Parliament and the second is a statement about us.
 */
export function ParliamentStenogramFailureNotice({
  failure,
  onRetry,
  sourceUrl,
  sourceLabel,
  className,
  children,
}: Props) {
  const content = describeFailure(failure)

  return (
    <div
      role={failure.kind === 'not_found' ? 'status' : 'alert'}
      className={cn(
        'border-2 border-[#b1b4b6] bg-white px-5 py-6 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {failure.kind === 'not_found' ? (
          <FileQuestion
            className="mt-0.5 h-5 w-5 shrink-0 text-[#505a5f]"
            aria-hidden
          />
        ) : (
          <ServerCrash
            className={cn(
              'mt-0.5 h-5 w-5 shrink-0',
              failure.kind === 'transcript_unavailable'
                ? 'text-[#505a5f]'
                : 'text-[#d4351c]',
            )}
            aria-hidden
          />
        )}
        <div className="min-w-0">
          <p className="font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {content.title}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {content.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {failure.retryable && onRetry ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-none border-2"
                onClick={onRetry}
              >
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                <Trans>Reîncearcă</Trans>
              </Button>
            ) : null}
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  stenogramLinkClassName,
                  'inline-flex items-center gap-1.5 text-sm',
                )}
              >
                {sourceLabel ?? t`Deschide sursa oficială`}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function describeFailure(failure: ParliamentStenogramFailure): {
  title: string
  description: string
} {
  switch (failure.kind) {
    case 'not_found':
      return {
        title: t`Nu am găsit această ședință`,
        description: t`Adresa nu corespunde niciunei stenograme publice pe care o servim. Verificați linkul sau căutați ședința după dată în lista completă.`,
      }

    case 'transcript_unavailable':
      // The three reasons are three different facts about the record; only one
      // of them is about us, and only that one is worth retrying.
      if (failure.reason === 'source_only') {
        return {
          title: t`Ședința există, dar textul nu este servit aici`,
          description: t`Captura acestei ședințe conține doar navigația sursei, nu și dezbaterea. Ședința a avut loc și îi păstrăm adresa oficială — o puteți citi direct la sursă.`,
        }
      }
      if (failure.reason === 'no_public_segments') {
        return {
          title: t`Ședința există, dar nu are blocuri publice de citit`,
          description: t`Nu servim niciun bloc de text pentru această ședință. Adresa oficială rămâne disponibilă.`,
        }
      }
      if (failure.reason === 'projection_unavailable') {
        return {
          title: t`Cititorul de stenograme nu este disponibil momentan`,
          description: t`Proiecția canonică a stenogramelor nu răspunde pe acest mediu. Este o problemă de la noi, nu o lipsă în datele Parlamentului — reîncercați în câteva momente.`,
        }
      }
      return {
        title: t`Ședința există, dar nu putem servi textul ei`,
        description: t`Ședința este reală; transcrierea nu este disponibilă prin acest cititor.`,
      }

    case 'search_unavailable':
      return {
        title: t`Căutarea în stenograme nu este disponibilă`,
        description: t`Indexul de căutare pe tot istoricul nu răspunde. Nu restrângem căutarea la titluri fără să vă spunem, pentru că ar răspunde la o întrebare mai îngustă arătând ca un răspuns complet. Puteți naviga ședințele după dată sau reîncerca.`,
      }

    case 'graphql':
      return {
        title: t`Cererea a fost refuzată de server`,
        description: t`Serverul a răspuns, dar a respins această interogare. Filtrele selectate pot fi în afara a ceea ce poate servi; încercați să le simplificați sau reîncercați.`,
      }

    case 'transport':
      return {
        title: t`Nu am putut contacta serverul`,
        description: t`Cererea nu a ajuns la API sau răspunsul nu a putut fi citit. Nu știm dacă ședința există — verificați conexiunea și reîncercați.`,
      }
  }
}
