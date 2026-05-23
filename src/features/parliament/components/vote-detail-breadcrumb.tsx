import { Link } from '@tanstack/react-router'
import { getChamberLabel } from '../lib/formatting'
import { VOTE_DETAIL_BREADCRUMB_BG, voteDetailPageContainerClassName } from '../lib/vote-detail-theme'

type Props = {
  readonly chamber: 'camera' | 'senat'
  readonly divisionLabel: string
}

/** UK Parliament breadcrumb band */
export function VoteDetailBreadcrumb({ chamber, divisionLabel }: Props) {
  const chamberLabel = getChamberLabel(chamber)

  return (
    <nav
      className="py-3 text-sm text-white"
      style={{ backgroundColor: VOTE_DETAIL_BREADCRUMB_BG }}
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
        <li>
          <Link to="/parlament" search={{ tab: 'voturi' }} className="hover:underline">
            Voturi
          </Link>
        </li>
        <li aria-hidden className="opacity-70">
          ›
        </li>
        <li>
          <Link
            to="/parlament"
            search={{ tab: 'voturi', chamber }}
            className="hover:underline"
          >
            Voturi în {chamberLabel}
          </Link>
        </li>
        <li aria-hidden className="opacity-70">
          ›
        </li>
        <li className="font-semibold" aria-current="page">
          {divisionLabel}
        </li>
      </ol>
      </div>
    </nav>
  )
}
