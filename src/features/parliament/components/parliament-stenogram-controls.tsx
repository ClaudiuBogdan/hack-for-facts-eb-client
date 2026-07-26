import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type {
  ParliamentSpeechesSearch,
  ParliamentStenogrameView,
} from '@/schemas/parliament'
import { useParliamentMember } from '../hooks/use-parliament-data'
import { formatMemberName } from '../lib/formatting'
import {
  getStenogrameView,
  projectSearchForView,
} from '../lib/parliament-stenogram-filter'
import { getParliamentSpeechQ } from '../lib/parliament-speeches-filter'
import {
  stenogramAvailabilityLabel,
  stenogramChamberLabel,
} from '../lib/stenogram-presentation'
import { stenogramStickyBarClassName } from '../lib/stenogram-theme'

export type ParliamentStenogramePatch = Partial<ParliamentSpeechesSearch>

const VIEW_LINK_CLASS =
  'inline-flex h-10 items-center justify-center border-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] focus-visible:ring-offset-1'

const VIEW_LINK_ACTIVE_CLASS = 'border-[#1d70b8] bg-[#1d70b8] text-white'

const VIEW_LINK_IDLE_CLASS =
  'border-[#b1b4b6] bg-white text-[#0b0c0c] hover:bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]'

/**
 * The two-view switch.
 *
 * Rendered as real `<Link>`s rather than buttons: the view IS the URL, so a
 * middle-click, a bookmark and a back button all have to work, and the browser
 * gives that for free. `aria-current="page"` (not `role="tab"`) is the honest
 * role — these navigate, they do not reveal a hidden panel.
 */
function StenogrameViewSwitch({
  search,
  view,
}: {
  readonly search: ParliamentSpeechesSearch
  readonly view: ParliamentStenogrameView
}) {
  const options: ReadonlyArray<{
    readonly value: ParliamentStenogrameView
    readonly label: string
  }> = [
    { value: 'sedinte', label: t`Ședințe` },
    { value: 'interventii', label: t`Intervenții` },
  ]

  return (
    <nav
      aria-label={t`Mod de citire a stenogramelor`}
      className="flex shrink-0 -space-x-0.5"
    >
      {options.map((option) => {
        const active = option.value === view
        return (
          <Link
            key={option.value}
            to="/parlament/stenograme"
            search={projectSearchForView(search, option.value)}
            replace
            resetScroll={false}
            aria-current={active ? 'page' : undefined}
            className={cn(
              VIEW_LINK_CLASS,
              active ? VIEW_LINK_ACTIVE_CLASS : VIEW_LINK_IDLE_CLASS,
            )}
          >
            {option.label}
          </Link>
        )
      })}
    </nav>
  )
}

type BarProps = {
  readonly search: ParliamentSpeechesSearch
  /** Search input, year combobox, filter trigger — composed by the page. */
  readonly children: ReactNode
  readonly chips: ReactNode
}

/**
 * The compact sticky control band.
 *
 * Sticky because the two things a reader changes most often (the view and the
 * query) must stay reachable while scrolling a long list — `top-0` with a solid
 * background, no blur, per the elevation rules. `print:hidden` because controls
 * are not part of a printed document.
 */
export function ParliamentStenogramControls({
  search,
  children,
  chips,
}: BarProps) {
  const view = getStenogrameView(search)
  return (
    <div className={stenogramStickyBarClassName}>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <StenogrameViewSwitch search={search} view={view} />
        {children}
      </div>
      {chips}
    </div>
  )
}

/** Chip label for the speaker facet — resolves the member name when cached. */
function SpeakerChipLabel({ mandateKey }: { readonly mandateKey: string }) {
  const { data: member } = useParliamentMember(mandateKey)
  const name = member
    ? formatMemberName(member.firstName, member.lastName)
    : mandateKey
  return <Trans>Vorbitor: {name}</Trans>
}

type ChipsProps = {
  readonly search: ParliamentSpeechesSearch
  readonly onChange: (patch: ParliamentStenogramePatch) => void
  readonly onClearAll: () => void
}

/**
 * One chip per ACTIVE facet, each removable. The strip renders `null` when
 * empty, and only ever shows facets the current view actually applies — a chip
 * for a filter that is being ignored is worse than no chip.
 */
export function ParliamentStenogrameActiveFilters({
  search,
  onChange,
  onClearAll,
}: ChipsProps) {
  const { i18n } = useLingui()
  const view = getStenogrameView(search)

  const formatChipDate = (iso: string): string =>
    new Intl.DateTimeFormat(i18n.locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))

  const chips: Array<{
    key: string
    label: ReactNode
    ariaLabel: string
    onRemove: () => void
  }> = []

  if (search.vorbitor) {
    chips.push({
      key: 'vorbitor',
      label: <SpeakerChipLabel mandateKey={search.vorbitor} />,
      ariaLabel: t`Elimină filtrul de vorbitor`,
      onRemove: () => onChange({ vorbitor: undefined }),
    })
  }

  if (search.camera) {
    const chamber = stenogramChamberLabel(
      search.camera === 'camera' ? 'camera_deputatilor' : search.camera,
    )
    chips.push({
      key: 'camera',
      label: <Trans>Camera: {chamber}</Trans>,
      ariaLabel: t`Elimină filtrul de cameră`,
      onRemove: () => onChange({ camera: undefined }),
    })
  }

  // Availability describes a CAPTURE — it is meaningless on a single turn, so
  // it is only ever shown on the sittings view (and dropped on a view switch).
  if (view === 'sedinte' && search.disponibilitate) {
    const availability = stenogramAvailabilityLabel(search.disponibilitate)
    chips.push({
      key: 'disponibilitate',
      label: <Trans>Disponibilitate: {availability}</Trans>,
      ariaLabel: t`Elimină filtrul de disponibilitate`,
      onRemove: () => onChange({ disponibilitate: undefined }),
    })
  }

  if (search.from || search.to) {
    const clearDate = () => onChange({ from: undefined, to: undefined })
    if (search.from && search.from === search.to) {
      const day = formatChipDate(search.from)
      chips.push({
        key: 'day',
        label: <Trans>Ziua: {day}</Trans>,
        ariaLabel: t`Elimină filtrul de zi`,
        onRemove: clearDate,
      })
    } else {
      const start = search.from ? formatChipDate(search.from) : '…'
      const end = search.to ? formatChipDate(search.to) : '…'
      chips.push({
        key: 'period',
        label: (
          <Trans>
            Perioadă: {start} – {end}
          </Trans>
        ),
        ariaLabel: t`Elimină filtrul de perioadă`,
        onRemove: clearDate,
      })
    }
  } else if (view === 'sedinte' && search.an !== undefined) {
    // On the interventions view the year is a REQUIRED bound, not a facet, so
    // it gets no removable chip there — offering to remove it would offer to
    // make the query illegal.
    const year = String(search.an)
    chips.push({
      key: 'an',
      label: <Trans>Anul: {year}</Trans>,
      ariaLabel: t`Elimină filtrul de an`,
      onRemove: () => onChange({ an: undefined }),
    })
  }

  const q = getParliamentSpeechQ(search)
  if (q) {
    chips.push({
      key: 'q',
      label: <Trans>Conține: {q}</Trans>,
      ariaLabel: t`Elimină filtrul de căutare`,
      onRemove: () => onChange({ q: undefined }),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex max-w-full items-center gap-1.5 border-2 border-[#b1b4b6] bg-[#f3f2f1] px-2.5 py-1 text-sm font-semibold text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]"
        >
          <span className="min-w-0 truncate">{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={chip.ariaLabel}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center hover:text-[#1d70b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-sm font-semibold text-[#0b0c0c] underline underline-offset-4 hover:text-[#1d70b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:text-[var(--pnrr-fg)]"
      >
        <Trans>Șterge tot</Trans>
      </button>
    </div>
  )
}
