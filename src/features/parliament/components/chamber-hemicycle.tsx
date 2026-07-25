import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { ParliamentChamberComposition, ParliamentSeat } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { getChamberLabel, formatSeatSharePercent } from '../lib/formatting'
import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_SENAT_RED,
} from '../lib/hub-theme'

const INACTIVE_SEAT_FILL = '#c5c7c9'
const INACTIVE_SEAT_STROKE = '#b1b4b6'

type Props = {
  readonly composition: ParliamentChamberComposition
  readonly className?: string
}

function getSeatFill(seat: ParliamentSeat): string {
  return seat.isActive ? seat.color : INACTIVE_SEAT_FILL
}

/** Interactive hemicycle seat chart for a parliamentary chamber */
export function ChamberHemicycle({ composition, className }: Props) {
  const navigate = useNavigate()
  const [hoveredSeat, setHoveredSeat] = useState<ParliamentSeat | null>(null)
  const chamberAccent =
    composition.chamber === 'camera'
      ? PARLIAMENT_CAMERA_GREEN
      : PARLIAMENT_SENAT_RED

  const handleSeatClick = (
    event: React.MouseEvent<SVGCircleElement>,
    memberId: string,
  ) => {
    event.preventDefault()
    void navigate({ to: '/parlament/membri/$memberId', params: { memberId } })
  }

  const seatLabel = (seat: ParliamentSeat): string => {
    const who = seat.memberId === undefined ? 'Loc neatribuit unui profil' : seat.memberName
    const base = `${who}, ${seat.groupName}`
    return seat.isActive ? base : `${base} — nu corespunde filtrului`
  }

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox={composition.viewBox}
        preserveAspectRatio="xMidYMax meet"
        role="img"
        aria-label={
          composition.hasActiveFilters
            ? `Componența ${getChamberLabel(composition.chamber)} — ${composition.activeSeatCount} din ${composition.totalSeats} locuri evidențiate`
            : `Componența ${getChamberLabel(composition.chamber)} — ${composition.totalSeats} locuri`
        }
        className="mx-auto block w-full max-w-xl"
        style={{ height: 'auto', maxHeight: 'min(280px, 42vw)' }}
      >
        {/*
          Seats are NOT tab stops. 330 focusable SVG circles put a keyboard user
          through hundreds of stops before the next control, and the placeholder
          seats aren't even people. The chart is exposed as one labelled image;
          the keyboard/AT path to the same data is the party legend below (each
          card links to its group) plus the members directory.
        */}
        {composition.seats.map((seat) => {
          const { memberId } = seat
          return (
            <circle
              key={seat.seatIndex}
              cx={seat.x}
              cy={seat.y}
              r={composition.seatRadius}
              fill={getSeatFill(seat)}
              stroke={seat.isActive ? '#ffffff' : INACTIVE_SEAT_STROKE}
              strokeWidth={0.15}
              className={cn(
                'transition-opacity',
                seat.isActive ? 'hover:opacity-80' : 'opacity-70 hover:opacity-90',
                // Only a seat that resolves to a real member is clickable.
                memberId === undefined ? 'cursor-default' : 'cursor-pointer',
              )}
              onMouseEnter={() => setHoveredSeat(seat)}
              onMouseLeave={() => setHoveredSeat(null)}
              {...(memberId === undefined
                ? {}
                : { onClick: (event) => handleSeatClick(event, memberId) })}
            >
              <title>{seatLabel(seat)}</title>
            </circle>
          )
        })}
      </svg>

      {hoveredSeat ? (
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-none border border-[#b1b4b6] bg-[#0b0c0c] px-3 py-1.5 text-center text-xs text-white shadow-sm dark:border-[var(--pnrr-border)]"
          role="tooltip"
        >
          <p className="font-semibold">
            {hoveredSeat.memberId === undefined
              ? 'Loc neatribuit unui profil'
              : hoveredSeat.memberName}
          </p>
          <p className="text-white/80">{hoveredSeat.groupName}</p>
          {!hoveredSeat.isActive ? (
            <p className="mt-0.5 text-white/60">Nu corespunde filtrului</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1 text-center">
        <p className="text-3xl font-black tabular-nums leading-none text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          {composition.hasActiveFilters ? (
            <>
              {composition.activeSeatCount}
              <span className="text-xl font-bold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                {' '}
                / {composition.totalSeats}
              </span>
            </>
          ) : (
            composition.totalSeats
          )}
        </p>
        <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {getChamberLabel(composition.chamber)}
          {composition.hasActiveFilters ? ' · filtru activ' : ''}
        </p>
      </div>

      <div className="mt-3 flex justify-between gap-4 border-t border-[#b1b4b6] pt-3 text-xs text-[#505a5f] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-muted)]">
        <p>
          <span className="font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {composition.majoritySeats}
          </span>{' '}
          locuri pentru majoritate
        </p>
        <p className="font-medium" style={{ color: chamberAccent }}>
          {formatSeatSharePercent(
            composition.activeSeatCount,
            composition.totalSeats,
          )}
          {composition.hasActiveFilters ? ' din locuri' : ' din total'}
        </p>
      </div>
    </div>
  )
}
