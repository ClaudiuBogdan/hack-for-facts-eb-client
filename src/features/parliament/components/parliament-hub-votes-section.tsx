import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentVotes } from '../hooks/use-parliament-data'
import { parliamentVotesOverviewGridClassName } from '../lib/hub-theme'
import { ParliamentHubSection } from './parliament-hub-section'
import { ParliamentHubVoteActivity } from './parliament-hub-vote-activity'
import { VotesChamberPanel } from './votes-chamber-panel'

/**
 * The panels are white cards, and the grey behind them is what makes them read
 * as cards — but only in the GUTTER between the two columns. No padding: the
 * section already has its own border and the inset just cost the columns width
 * they use for four vote cards each.
 */
const panelSurfaceClassName = 'bg-[#f3f2f1] dark:bg-[var(--pnrr-subtle)]'

/**
 * The Voturi block on the hub: one column per chamber, closed by the activity
 * heatmap and the way into the full list.
 *
 * The panels used to stand IN FRONT of the votes list, on the votes tab, so a
 * reader who came to browse divisions met an introduction to the two chambers
 * and had to choose one before seeing anything. Introducing the chambers is hub
 * work — it belongs next to the other "what is this" cards — and the tab now
 * opens the list itself.
 *
 * The two columns are the two chambers because that is what a chamber panel can
 * be: joint sittings have no standing membership to introduce. They are not
 * left out of the section, though — the heatmap under the panels counts them,
 * and its link opens the list where they appear alongside the rest.
 */
export function ParliamentHubVotesSection() {
  const { data: cameraData, isLoading: cameraLoading } = useParliamentVotes({
    chamber: 'camera',
    page: 1,
    pageSize: 4,
  })
  const { data: senatData, isLoading: senatLoading } = useParliamentVotes({
    chamber: 'senat',
    page: 1,
    pageSize: 4,
  })

  const isLoading = cameraLoading || senatLoading

  return (
    <ParliamentHubSection
      id="parliament-votes-heading"
      title="Voturi"
      description="Ultimele rezultate din Camera Deputaților și Senat."
      bodyClassName="p-0"
    >
      <div className={panelSurfaceClassName}>
        <div className={parliamentVotesOverviewGridClassName}>
          {isLoading ? (
            <>
              <Skeleton className="h-[42rem] w-full rounded-none bg-white/60" />
              <Skeleton className="h-[42rem] w-full rounded-none bg-white/60" />
            </>
          ) : (
            <>
              <VotesChamberPanel
                chamber="camera"
                votes={cameraData?.votes ?? []}
              />
              <VotesChamberPanel chamber="senat" votes={senatData?.votes ?? []} />
            </>
          )}
        </div>
      </div>

      {/* The section's own footer: WHEN the chambers voted, then the list. */}
      <div className="border-t-2 border-[var(--pnrr-border)] p-5 sm:p-6">
        <ParliamentHubVoteActivity />
      </div>
    </ParliamentHubSection>
  )
}
