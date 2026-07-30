import { Link } from '@tanstack/react-router'
import type {
  MemberVoteChoice,
  ParliamentChamber,
  ParliamentGroupCohesion,
} from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { cohesionBand, cohesionRank } from '../lib/group-roster'
import {
  GROUP_BALLOT_COLORS,
  GROUP_BALLOT_LABELS,
  groupBadgeClassName,
  groupCardClassName,
  groupCohesionBandLabel,
  groupCohesionBandToneClassName,
  groupEyebrowClassName,
  groupMutedTextClassName,
} from '../lib/group-theme'

/** `2026-01-28` → `28 ian. 2026`. */
function formatDay(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

type Segment = {
  readonly key: keyof typeof GROUP_BALLOT_LABELS
  readonly pct: number
}

/** Bar segment → the `choice` the votes list filters on. */
const SEGMENT_CHOICE: Readonly<
  Partial<Record<keyof typeof GROUP_BALLOT_LABELS, MemberVoteChoice>>
> = {
  pentru: 'pentru',
  impotriva: 'impotriva',
  abtinere: 'abtinere',
  absent: 'nu_a_votat',
}

function segments(row: ParliamentGroupCohesion): readonly Segment[] {
  return (
    [
      { key: 'pentru', pct: row.forPct },
      { key: 'impotriva', pct: row.againstPct },
      { key: 'abtinere', pct: row.abstainPct },
      { key: 'absent', pct: row.absentPct },
      { key: 'conflicting', pct: row.conflictingPct },
      { key: 'unknown', pct: row.unknownPct },
    ] as const
  )
    .filter((segment): segment is Segment => typeof segment.pct === 'number')
    .filter((segment) => segment.pct > 0)
}

/**
 * A single stacked bar of the group's four ballot shares.
 *
 * The bar is decoration: every share is also printed as a labelled number
 * underneath, so the panel is readable without colour and without hovering.
 */
function BallotBar({ parts }: { readonly parts: readonly Segment[] }) {
  const total = parts.reduce((sum, part) => sum + part.pct, 0)
  if (total <= 0) return null
  return (
    <div className="flex h-4 w-full overflow-hidden" aria-hidden>
      {parts.map((part) => (
        <div
          key={part.key}
          style={{
            width: `${(part.pct / total) * 100}%`,
            backgroundColor: GROUP_BALLOT_COLORS[part.key],
          }}
        />
      ))}
    </div>
  )
}

type Props = {
  readonly groupName: string
  readonly chamber: ParliamentChamber
  readonly row: ParliamentGroupCohesion | undefined
  readonly rows: readonly ParliamentGroupCohesion[] | undefined
  readonly window: { from: string; to: string }
  readonly isLoading: boolean
  readonly isError: boolean
}

/**
 * "Cum a votat grupul" — the group's ballot split and how united it was.
 *
 * Every number here is bounded by a WINDOW, and the window is printed in the
 * panel: `parliamentVoteCohesion` refuses spans wider than 500 votes, so this
 * can never be "PSD's voting record" in general. Saying which votes it covers
 * is what keeps the claim true (DESIGN.md — Data Trust & Provenance).
 */
export function ParliamentGroupCohesionPanel({
  groupName,
  chamber,
  row,
  rows,
  window,
  isLoading,
  isError,
}: Props) {
  if (isLoading) {
    return (
      <div className={cn(groupCardClassName, 'p-5 sm:p-6')}>
        <div className="h-4 w-48 animate-pulse bg-[#dee0e2]" />
        <div className="mt-5 h-4 w-full animate-pulse bg-[#dee0e2]" />
        <div className="mt-5 h-4 w-64 animate-pulse bg-[#dee0e2]" />
      </div>
    )
  }

  // Three DIFFERENT reasons produce no row, and they must not share a message.
  // Explaining a failed request as a group-name mismatch would be a confident,
  // specific and false account of why the reader is looking at an empty panel.
  if (!row) {
    return (
      <div className={cn(groupCardClassName, 'p-5 sm:p-6')}>
        <p className={groupMutedTextClassName}>
          {isError || rows === undefined ? (
            <>
              Nu am putut încărca datele de vot pentru {groupName}. Încercați
              din nou mai târziu.
            </>
          ) : rows.length === 0 ? (
            <>
              Sursa nu raportează voturi în intervalul analizat, așa că nu putem
              descrie comportamentul de vot al grupului {groupName}.
            </>
          ) : (
            // The endpoint answers with "neafiliat" / "Senatori neafiliați" /
            // "PIR" for groups the directory calls something else. Guessing
            // which row belongs to which group would put one group's voting
            // record on another's page.
            <>
              Nu putem afișa comportamentul de vot pentru {groupName}. Sursa
              raportează rezultatele de vot sub alte denumiri de grup decât cele
              din nomenclator, iar o potrivire aproximativă ar risca să atribuie
              acestui grup voturile altuia.
            </>
          )}
        </p>
      </div>
    )
  }

  const parts = segments(row)
  const band =
    row.cohesionIndex === undefined
      ? undefined
      : cohesionBand(row.cohesionIndex)
  const rank = rows?.length ? cohesionRank(row, rows) : undefined

  return (
    <div className={cn(groupCardClassName, 'p-5 sm:p-6')}>
      <p className={groupEyebrowClassName}>
        {row.voteCount === undefined
          ? 'Perioada analizată'
          : `${row.voteCount.toLocaleString('ro-RO')} voturi`}{' '}
        · {formatDay(window.from)} – {formatDay(window.to)}
      </p>

      {parts.length > 0 ? (
        <>
          <div className="mt-4">
            <BallotBar parts={parts} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
            {parts.map((part) => (
              <div key={part.key} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-1.5 h-3 w-3 shrink-0"
                  style={{ backgroundColor: GROUP_BALLOT_COLORS[part.key] }}
                />
                <div className="min-w-0">
                  <dt className={groupMutedTextClassName}>
                    {GROUP_BALLOT_LABELS[part.key]}
                  </dt>
                  <dd className="text-lg font-bold tabular-nums">
                    {/* The group name sent to the votes list is the COHESION
                        row's, not the nomenclator's: the filter matches
                        `vote_records.group_name` exactly, and the two spell
                        some groups differently. */}
                    {SEGMENT_CHOICE[part.key] ? (
                      <Link
                        to="/parlament"
                        search={{
                          tab: 'voturi',
                          chamber,
                          from: window.from,
                          to: window.to,
                          grupVot: row.groupName,
                          alegere: SEGMENT_CHOICE[part.key],
                        }}
                        className="underline decoration-2 underline-offset-4 hover:no-underline"
                      >
                        {part.pct.toLocaleString('ro-RO', {
                          maximumFractionDigits: 1,
                        })}
                        %
                        <span className="sr-only">
                          {' '}
                          — vezi voturile în care majoritatea grupului a ales „
                          {GROUP_BALLOT_LABELS[part.key]}”
                        </span>
                      </Link>
                    ) : (
                      <span>
                        {part.pct.toLocaleString('ro-RO', {
                          maximumFractionDigits: 1,
                        })}
                        %
                      </span>
                    )}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
          {/* Named, because the two numbers genuinely differ: the percentage is
              a share of the group's ballot slots across the window, the list
              behind it counts VOTES where the group's majority chose that
              option. Letting a reader assume they match would be the whole
              point of the link quietly lying. */}
          <p className={cn(groupMutedTextClassName, 'mt-3')}>
            Procentele sunt din totalul voturilor exprimate de membrii grupului.
            Apăsând pe un procent vedeți voturile în care majoritatea grupului a
            ales acea variantă — o listă de voturi, deci un număr diferit.
          </p>
        </>
      ) : (
        <p className={cn(groupMutedTextClassName, 'mt-4')}>
          Sursa nu raportează repartiția voturilor pentru acest grup în perioada
          de mai sus.
        </p>
      )}

      {band && row.cohesionIndex !== undefined ? (
        <div className="mt-6 border-t border-[#b1b4b6] pt-4 dark:border-[var(--pnrr-border)]">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                groupBadgeClassName,
                'border-2',
                groupCohesionBandToneClassName[band],
              )}
            >
              {groupCohesionBandLabel[band]}
            </span>
            <span className="text-lg font-bold tabular-nums">
              {row.cohesionIndex.toLocaleString('ro-RO', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            {rank ? (
              <span className={groupMutedTextClassName}>
                locul {rank.rank} din {rank.total} grupuri din cameră
              </span>
            ) : null}
          </div>
          <p className={cn(groupMutedTextClassName, 'mt-2')}>
            Indicele de coeziune măsoară cât de des au votat membrii grupului la
            fel. 1,00 înseamnă că grupul a votat unitar la fiecare vot din
            perioadă.
          </p>
        </div>
      ) : null}
    </div>
  )
}
