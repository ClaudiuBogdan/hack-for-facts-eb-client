import { Link } from '@tanstack/react-router'
import { Landmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ParliamentVoteSummary } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import {
  PARLIAMENT_ACTION_BLUE,
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_SENAT_RED,
} from '../lib/hub-theme'
import { getChamberLabel } from '../lib/formatting'
import { ParliamentChamberMark } from './parliament-hub-panel'
import { VoteChamberVoteCard } from './vote-chamber-vote-card'

const CHAMBER_CONFIG = {
  camera: {
    color: PARLIAMENT_CAMERA_GREEN,
    title: 'Voturi în Camera Deputaților',
    description:
      'Voturile din Camera Deputaților sunt numite divizări. Pentru fiecare divizare, numărăm câți deputați au votat pentru, împotrivă sau s-au abținut.',
    findLabel: 'Caută voturi în Camera Deputaților',
    recentLabel: 'Ultimele patru voturi în Camera Deputaților',
  },
  senat: {
    color: PARLIAMENT_SENAT_RED,
    title: 'Voturi în Senat',
    description:
      'Voturile din Senat sunt numite divizări. Pentru fiecare divizare, numărăm câți senatori au votat pentru, împotrivă sau s-au abținut.',
    findLabel: 'Caută voturi în Senat',
    recentLabel: 'Ultimele patru voturi în Senat',
  },
} as const

type Props = {
  readonly chamber: 'camera' | 'senat'
  readonly votes: ReadonlyArray<ParliamentVoteSummary>
}

/** UK Parliament votes column — subgrid rows align headers/buttons across columns (lg+) */
export function VotesChamberPanel({ chamber, votes }: Props) {
  const config = CHAMBER_CONFIG[chamber]
  const recentVotes = votes.slice(0, 4)

  return (
    <section
      className={cn(
        'min-w-0 bg-white dark:bg-[var(--pnrr-card)]',
        'flex flex-col',
        'lg:row-span-6 lg:grid lg:grid-rows-subgrid',
      )}
      style={{ borderTop: `6px solid ${config.color}` }}
    >
      <div className="border-b border-[#b1b4b6] px-5 py-4 dark:border-[var(--pnrr-border)]">
        <h2 className="flex items-center gap-2.5 text-xl font-bold leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          <ParliamentChamberMark color={config.color} className="mt-0" />
          <span>{config.title}</span>
        </h2>
      </div>

      <div className="border-b border-[#b1b4b6] dark:border-[var(--pnrr-border)]">
        <div
          className="flex aspect-[16/9] items-center justify-center bg-[#dee0e2] dark:bg-[var(--pnrr-subtle)]"
          aria-hidden
        >
          <Landmark
            className="h-14 w-14 text-[#505a5f]/30 dark:text-[var(--pnrr-muted)]/35"
            strokeWidth={1}
          />
        </div>
        <div className="h-1.5" style={{ backgroundColor: config.color }} aria-hidden />
      </div>

      <p className="px-5 pt-5 text-base font-normal leading-7 text-[#0b0c0c] lg:pb-5 dark:text-[var(--pnrr-fg)]">
        {config.description}
      </p>

      <div className="px-5 pt-5 lg:pt-0">
        <Button
          className="h-11 w-full rounded-none border-0 text-base font-normal text-white hover:opacity-90"
          style={{ backgroundColor: PARLIAMENT_ACTION_BLUE }}
          asChild
        >
          <Link to="/parlament" search={{ tab: 'voturi', chamber }}>
            {config.findLabel}
          </Link>
        </Button>
      </div>

      <p className="px-5 pt-8 text-base font-normal leading-snug text-[#0b0c0c] lg:pt-8 dark:text-[var(--pnrr-fg)]">
        {config.recentLabel}
      </p>

      <div className="flex flex-col gap-4 px-5 pb-5 pt-4 lg:items-start lg:self-start">
        {recentVotes.length > 0 ? (
          recentVotes.map((vote, index) => (
            <VoteChamberVoteCard
              key={vote.voteId}
              vote={vote}
              divisionNumber={recentVotes.length - index}
              className="w-full"
            />
          ))
        ) : (
          <p className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Nu există voturi recente pentru {getChamberLabel(chamber)}.
          </p>
        )}
      </div>
    </section>
  )
}
