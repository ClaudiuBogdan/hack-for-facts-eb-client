import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import type { ParliamentVoteSummary } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import cameraVotes1024 from '../assets/votes-camera-1024.png'
import cameraVotes512 from '../assets/votes-camera-512.png'
import senatVotes1024 from '../assets/votes-senat-1024.png'
import senatVotes512 from '../assets/votes-senat-512.png'
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
    illustration: {
      src: cameraVotes1024,
      srcSet: `${cameraVotes512} 512w, ${cameraVotes1024} 1024w`,
    },
    recentLabel: 'Ultimele patru voturi în Camera Deputaților',
  },
  senat: {
    color: PARLIAMENT_SENAT_RED,
    title: 'Voturi în Senat',
    description:
      'Voturile din Senat sunt numite divizări. Pentru fiecare divizare, numărăm câți senatori au votat pentru, împotrivă sau s-au abținut.',
    findLabel: 'Caută voturi în Senat',
    illustration: {
      src: senatVotes1024,
      srcSet: `${senatVotes512} 512w, ${senatVotes1024} 1024w`,
    },
    recentLabel: 'Ultimele patru voturi în Senat',
  },
} as const

type Props = {
  readonly chamber: 'camera' | 'senat'
  readonly votes: ReadonlyArray<ParliamentVoteSummary>
}

type VoteIllustrationProps = {
  readonly src: string
  readonly srcSet: string
}

/** Responsive native image: explicit geometry prevents CLS; srcSet avoids oversized mobile downloads. */
function VoteIllustration({ src, srcSet }: VoteIllustrationProps) {
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes="(min-width: 1024px) 50vw, 100vw"
      width={1024}
      height={576}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      draggable={false}
      className="h-full w-full object-cover"
    />
  )
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
        <div className="aspect-[16/9] overflow-hidden bg-[#dee0e2] dark:bg-[var(--pnrr-subtle)]">
          <VoteIllustration
            src={config.illustration.src}
            srcSet={config.illustration.srcSet}
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
          recentVotes.map((vote) => (
            <VoteChamberVoteCard key={vote.voteId} vote={vote} className="w-full" />
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
