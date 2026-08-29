import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { PARLIAMENT_RESOURCE_PURPLE } from '../lib/hub-theme'
import {
  getVoteDetailHeroColor,
  VOTE_DETAIL_CHART_PLOT_BG,
  VOTE_DETAIL_INFO_BG,
  VOTE_DETAIL_SURFACE,
  voteDetailCardClassName,
  voteDetailHeroStickyClassName,
  voteDetailPageContainerClassName,
  voteDetailSectionTitleClassName,
} from '../lib/vote-detail-theme'
import { VoteDetailBreadcrumb } from './vote-detail-breadcrumb'

type Props = {
  readonly chamber: 'camera' | 'senat'
}

/**
 * Height of the two placeholder columns, as a share of the plot area.
 *
 * DELIBERATELY EQUAL. Two columns of unequal height would be read as a result —
 * a landslide, or a close call — before the page has counted anything. Equal
 * columns are plainly schematic: they say "a chart goes here", not "this is how
 * it went".
 */
const PLOT_BAR_HEIGHT = '66%'

/**
 * Tab labels are fixed text plus a count, so their widths are near-fixed too —
 * measured off the rendered tabs, so the row does not reflow on arrival.
 */
const TAB_WIDTHS = ['w-36', 'w-40', 'w-24', 'w-24', 'w-20'] as const

/** One placeholder ballot card, matching `VoteMemberResultCard`'s frame. */
function MemberCardSkeleton() {
  return (
    <div className="flex overflow-hidden rounded-none border border-l-0 border-[#ececec] bg-white dark:border-[var(--pnrr-border)]/50 dark:bg-[var(--pnrr-card)]">
      <Skeleton className="w-1.5 shrink-0 self-stretch rounded-none sm:w-2" />
      <div className="flex min-w-0 flex-1 items-start gap-x-2.5 px-3 pb-4 pt-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2 pt-1.5">
          <Skeleton className="h-4 w-32 rounded-none" />
          <Skeleton className="h-3.5 w-20 rounded-none" />
        </div>
      </div>
    </div>
  )
}

/**
 * Loading placeholder for the division page.
 *
 * Built to the real page's frame rather than to a single grey slab: the vote
 * detail fans out to several ballot pages, so this is on screen long enough to
 * be read as the page itself. Everything the URL already settles is drawn FOR
 * REAL — the breadcrumb and its working links, the chamber's hero colour, the
 * section headings, the "Pentru" / "Împotrivă" labels and their icons. Only
 * what the server has yet to say (title, counts, outcome, groups, ballots) is
 * greyed. That keeps the arrival a fill-in rather than a re-layout, and it
 * means a reader who lands here on a slow connection can still leave.
 */
export function VoteDetailSkeleton({ chamber }: Props) {
  const heroColor = getVoteDetailHeroColor(chamber)

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: VOTE_DETAIL_SURFACE }}
      aria-busy="true"
      aria-label="Se încarcă votul"
    >
      <VoteDetailBreadcrumb chamber={chamber} />

      {/* Pinned exactly as the real hero is, so the band does not jump the
          moment the division resolves. */}
      <section
        className={cn(voteDetailHeroStickyClassName, 'py-8 text-white')}
        style={{ backgroundColor: heroColor }}
      >
        <div
          className={cn(
            voteDetailPageContainerClassName,
            'grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start',
          )}
        >
          <div>
            {/* Two title lines: the median division title wraps once at this
                measure, so one line would jump and three would over-reserve. */}
            <Skeleton className="h-8 w-full max-w-[36rem] rounded-none bg-white/25 sm:h-9 lg:h-10" />
            <Skeleton className="mt-2 h-8 w-3/5 max-w-[22rem] rounded-none bg-white/25 sm:h-9 lg:h-10" />
            <Skeleton className="mt-3 h-6 w-56 rounded-none bg-white/20" />
          </div>

          <div className="min-w-[14rem]">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-8 w-8 shrink-0" strokeWidth={2.25} aria-hidden />
                  <Skeleton className="h-9 w-16 rounded-none bg-white/25" />
                </div>
                <p className="mt-1 text-sm text-white/90">Pentru</p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <ThumbsDown className="h-8 w-8 shrink-0" strokeWidth={2.25} aria-hidden />
                  <Skeleton className="h-9 w-16 rounded-none bg-white/25" />
                </div>
                <p className="mt-1 text-sm text-white/90">Împotrivă</p>
              </div>
            </div>
            <Skeleton className="mt-4 h-5 w-44 rounded-none bg-white/20" />
          </div>
        </div>
      </section>

      <div className={cn(voteDetailPageContainerClassName, 'pb-8 pt-6')}>
        {/* The related-bill card is deliberately NOT reserved: it renders only
            when the division carries a bill, and a block that vanishes on
            arrival shifts the whole page up. The source link below it is on
            every division we serve. */}
        <Skeleton className="mb-6 h-5 w-44 rounded-none" />

        <section className={voteDetailCardClassName}>
          <div className="p-5 sm:p-6">
            <h2 className={voteDetailSectionTitleClassName}>
              Voturi pe grupuri parlamentare
            </h2>

            <div
              className="mt-5 p-4 sm:p-5"
              style={{ backgroundColor: VOTE_DETAIL_CHART_PLOT_BG }}
            >
              <div className="flex h-[22rem] w-full min-w-0 gap-3">
                <div className="flex w-9 shrink-0 flex-col justify-between py-1">
                  {[0, 1, 2, 3, 4, 5].map((tick) => (
                    <Skeleton key={tick} className="h-3 w-7 rounded-none" />
                  ))}
                </div>
                <div className="grid flex-1 grid-cols-2 items-end gap-6 border-b border-l border-[#b1b4b6] px-6 pb-0">
                  {[0, 1].map((column) => (
                    <Skeleton
                      key={column}
                      className="w-full rounded-none"
                      style={{ height: PLOT_BAR_HEIGHT }}
                      data-testid={`vote-detail-skeleton-bar-${String(column)}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-5">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((entry) => (
                  <div key={entry} className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 shrink-0 rounded-none" />
                    <Skeleton className="h-3.5 w-14 rounded-none" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Skeleton className="h-10 w-48 rounded-none" />
            </div>
          </div>

          <div
            className="border-t border-[#b1b4b6] dark:border-[var(--pnrr-border)]"
            role="separator"
            aria-hidden
          />

          <div className="p-5 sm:p-6">
            <div
              className="mb-6 space-y-2 border-l-[5px] px-4 py-3"
              style={{
                backgroundColor: VOTE_DETAIL_INFO_BG,
                borderLeftColor: PARLIAMENT_RESOURCE_PURPLE,
              }}
            >
              <Skeleton className="h-4 w-full max-w-[34rem] rounded-none" />
              <Skeleton className="h-4 w-2/3 max-w-[22rem] rounded-none" />
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 className={voteDetailSectionTitleClassName}>
                Voturi individuale pe grup
              </h2>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Skeleton className="h-10 w-full rounded-none sm:w-[17rem]" />
                <Skeleton className="h-10 w-full rounded-none sm:w-48" />
              </div>
            </div>

            <div className="mt-6 flex flex-nowrap gap-6 overflow-hidden border-b border-[#b1b4b6] sm:gap-8 dark:border-[var(--pnrr-border)]">
              {TAB_WIDTHS.map((width, index) => (
                <Skeleton
                  // Keyed by POSITION: two tabs legitimately share a width, and
                  // keying by the class made React drop one of them.
                  key={index}
                  className={cn('my-3 h-5 shrink-0 rounded-none', width)}
                />
              ))}
            </div>

            <div className="mt-6">
              <Skeleton className="h-7 w-56 rounded-none" />
              <div className="mt-4 grid gap-3 px-1 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((card) => (
                  <MemberCardSkeleton key={card} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
