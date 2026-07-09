import { Link } from '@tanstack/react-router'
import { ArrowLeft, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PARLIAMENT_ACTION_BLUE } from '../lib/hub-theme'
import {
  voteDetailCardClassName,
  voteDetailPageContainerClassName,
  VOTE_DETAIL_SURFACE,
} from '../lib/vote-detail-theme'
import { VoteDetailBreadcrumb } from './vote-detail-breadcrumb'

type ActionLink = {
  readonly label: string
  readonly to: '/parlament' | '/parlament/stenograme'
  readonly search?: Record<string, string | undefined>
  readonly variant?: 'primary' | 'secondary'
}

type Props = {
  readonly title: string
  readonly description: string
  readonly actions: ReadonlyArray<ActionLink>
  readonly chamber?: 'camera' | 'senat'
  readonly breadcrumbLabel?: string
  readonly className?: string
}

/** UK Parliament–style not found state for Parlament routes */
export function ParliamentNotFoundPage({
  title,
  description,
  actions,
  chamber,
  breadcrumbLabel = 'Pagină negăsită',
  className,
}: Props) {
  return (
    <div className={cn('min-h-screen', className)} style={{ backgroundColor: VOTE_DETAIL_SURFACE }}>
      {chamber ? (
        <VoteDetailBreadcrumb chamber={chamber} divisionLabel={breadcrumbLabel} />
      ) : (
        <nav
          className="py-3 text-sm text-white"
          style={{ backgroundColor: '#372554' }}
          aria-label="Breadcrumb"
        >
          <div className={voteDetailPageContainerClassName}>
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link to="/parlament" search={{ tab: 'prezentare' }} className="hover:underline">
                  Parlament
                </Link>
              </li>
              <li aria-hidden className="opacity-70">
                ›
              </li>
              <li className="font-semibold" aria-current="page">
                {breadcrumbLabel}
              </li>
            </ol>
          </div>
        </nav>
      )}

      <div className={cn(voteDetailPageContainerClassName, 'py-10 sm:py-12')}>
        <section className={cn(voteDetailCardClassName, 'overflow-visible p-8 sm:p-10')}>
          <div className="flex max-w-2xl flex-col gap-6 sm:flex-row sm:items-start">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#dee0e2] bg-[#f8f9fd] text-[#512178]"
              aria-hidden
            >
              <FileQuestion className="h-7 w-7" strokeWidth={2} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold uppercase tracking-wide text-[#512178]">
                Nu am găsit pagina
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight text-[#0b0c0c] sm:text-3xl dark:text-[var(--pnrr-fg)]">
                {title}
              </h1>
              <p className="mt-4 text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                {description}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {actions.map((action) =>
                  action.variant === 'secondary' ? (
                    <Button
                      key={action.label}
                      asChild
                      variant="outline"
                      className="h-10 rounded-none border-[#b1b4b6] px-4 text-sm font-normal"
                    >
                      <Link to={action.to} search={action.search}>
                        {action.label}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      key={action.label}
                      asChild
                      className="h-10 rounded-none border-0 px-4 text-sm font-normal text-white hover:opacity-90"
                      style={{ backgroundColor: PARLIAMENT_ACTION_BLUE }}
                    >
                      <Link to={action.to} search={action.search}>
                        {action.label}
                      </Link>
                    </Button>
                  ),
                )}
              </div>

              <Link
                to="/parlament"
                search={{ tab: 'prezentare' }}
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#1d70b8] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Înapoi la Parlament
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

type VoteNotFoundProps = {
  readonly chamber: 'camera' | 'senat'
  readonly voteId: string
}

/** Vote division detail not found */
export function ParliamentVoteNotFoundPage({ chamber, voteId }: VoteNotFoundProps) {
  const chamberVotesLabel =
    chamber === 'camera' ? 'Voturi în Camera Deputaților' : 'Voturi în Senat'

  return (
    <ParliamentNotFoundPage
      chamber={chamber}
      breadcrumbLabel="Vot negăsit"
      title="Votul nu a fost găsit"
      description={`Nu am găsit divizarea „${voteId}”. Verifică linkul sau revino la lista de voturi.`}
      actions={[
        {
          label: chamberVotesLabel,
          to: '/parlament',
          search: { tab: 'voturi', chamber },
          variant: 'primary',
        },
        {
          label: 'Toate voturile',
          to: '/parlament',
          search: { tab: 'voturi' },
          variant: 'secondary',
        },
      ]}
    />
  )
}
