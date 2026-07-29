import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type {
  MemberVoteChoice,
  ParliamentVotesSearch,
  VoteChamber,
  VoteKind,
  VoteOutcome,
} from '@/schemas/parliament'
import {
  useParliamentGroupCohesion,
  useParliamentVoteKindCounts,
} from '../hooks/use-parliament-data'
import { cohesionWindow } from '../lib/group-roster'
import { rollingWindow } from '../lib/vote-activity-grid'
import {
  getActiveVoteFilterCount,
  readVoteKinds,
  VOTE_KIND_LABELS,
  VOTE_KIND_ORDER,
  type VotesListScope,
} from '../lib/votes-filter-state'
import { PARLIAMENT_ACTION_BLUE } from '../lib/hub-theme'
import { FilterTriggerButton } from './parliament-filter-trigger-button'

/**
 * The votes tab's trigger — the shared one, with a name of its own.
 *
 * It used to be a second implementation of the same button at a different
 * weight and border colour, which is how two tabs side by side ended up with
 * two different "Filtre" buttons.
 */
export function VotesFilterTriggerButton({
  activeCount,
  onClick,
}: {
  readonly activeCount: number
  readonly onClick: () => void
}) {
  return (
    <FilterTriggerButton
      activeCount={activeCount}
      onClick={onClick}
      ariaLabel={
        activeCount > 0
          ? `Filtrează voturile, ${activeCount} filtre active`
          : 'Filtrează voturile'
      }
    />
  )
}

type Props = {
  readonly search: ParliamentVotesSearch
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSearchChange: (search: ParliamentVotesSearch) => void
}

type DraftSearch = {
  readonly chamber: VotesListScope
  readonly kinds: readonly VoteKind[]
  readonly from: string
  readonly to: string
  readonly outcome: VoteOutcome | 'all'
  readonly grupVot: string
  readonly alegere: MemberVoteChoice | ''
}

/**
 * The list's chamber, as the facet sees it. An absent `?chamber=` is the
 * all-chambers list, so the select opens on "Toate camerele" rather than on no
 * option at all.
 */
function toScope(chamber: ParliamentVotesSearch['chamber']): VotesListScope {
  return chamber ?? 'all'
}

/** The chamber facet, in list order. `all` first — it is the widest reading. */
const SCOPE_OPTIONS: ReadonlyArray<{
  readonly value: VotesListScope
  readonly label: string
}> = [
  { value: 'all', label: 'Toate camerele' },
  { value: 'camera', label: 'Camera Deputaților' },
  { value: 'senat', label: 'Senat' },
  { value: 'comun', label: 'Camerele reunite (ședințe comune)' },
]

const labelClassName =
  'block text-sm font-bold leading-5 text-[var(--pnrr-fg)]'

const controlClassName =
  'box-border h-11 w-full shrink-0 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-base leading-none shadow-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

const sectionClassName = 'space-y-3'

const legendClassName =
  'text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]'

const CHOICE_OPTIONS: ReadonlyArray<{
  readonly value: MemberVoteChoice
  readonly label: string
}> = [
  { value: 'pentru', label: 'Pentru' },
  { value: 'impotriva', label: 'Împotrivă' },
  { value: 'abtinere', label: 'Abținere' },
  { value: 'nu_a_votat', label: 'Nu au votat' },
]

/**
 * The votes list facets, in a sliding panel (the PNRR filter pattern).
 *
 * They used to be a four-across bar above the results, which had no room left
 * for the group and stance facets and pushed the results themselves below the
 * fold. The free-text search keeps its own always-visible bar; everything that
 * NARROWS the corpus lives behind this one button, with a badge so the reader
 * can never be filtering without seeing that they are.
 */
export function VotesFilterSheet({
  search,
  open,
  onOpenChange,
  onSearchChange,
}: Props) {
  const fieldId = useId()
  const [draft, setDraft] = useState<DraftSearch>(() => ({
    chamber: toScope(search.chamber),
    kinds: readVoteKinds(search),
    from: search.from ?? '',
    to: search.to ?? '',
    outcome: search.outcome ?? 'all',
    grupVot: search.grupVot ?? '',
    alegere: search.alegere ?? '',
  }))

  // Reads the fields individually rather than the whole object: `search` is a
  // fresh object each render, so depending on it would reset the panel mid-edit.
  useEffect(() => {
    setDraft({
      chamber: toScope(search.chamber),
      // Read from the PARAM, not via `readVoteKinds(search)` — passing the
      // whole object would make this effect depend on a value that is a fresh
      // object every render, resetting the panel while the reader is using it.
      kinds: search.tipVot
        ? Array.isArray(search.tipVot)
          ? search.tipVot
          : [search.tipVot]
        : [],
      from: search.from ?? '',
      to: search.to ?? '',
      outcome: search.outcome ?? 'all',
      grupVot: search.grupVot ?? '',
      alegere: search.alegere ?? '',
    })
  }, [
    search.chamber,
    search.tipVot,
    search.from,
    search.to,
    search.outcome,
    search.grupVot,
    search.alegere,
  ])

  // Counts follow the DRAFT scope, so switching the chamber facet updates the
  // numbers next to each kind before the reader applies anything.
  const { data: kindCounts } = useParliamentVoteKindCounts(draft.chamber)

  /**
   * The group options come from the COHESION rows, not from `parliamentGroups`.
   *
   * The filter matches `vote_records.group_name` exactly, and the nomenclator
   * spells some groups differently — offering the directory's "Neafiliaţi"
   * would be a dropdown entry that always returns nothing. The cohesion
   * endpoint answers in the ballot vocabulary itself.
   *
   * A FIXED six-month window sources it, independent of the dates the reader
   * chose: this call is for the vocabulary, never the numbers, and the endpoint
   * refuses windows wider than 500 votes.
   *
   * The endpoint is chamber-scoped, so the all-chambers scope UNIONS the three
   * assemblies' vocabularies. Three hooks, always called — for a single-chamber
   * scope they share one query key and React Query answers two from the cache.
   */
  const vocabularyWindow = useMemo(() => cohesionWindow(new Date()), [])
  const scopeIsAll = draft.chamber === 'all'
  const chamberA: VoteChamber = scopeIsAll ? 'camera' : draft.chamber
  const chamberB: VoteChamber = scopeIsAll ? 'senat' : chamberA
  const chamberC: VoteChamber = scopeIsAll ? 'comun' : chamberA
  const cohesionA = useParliamentGroupCohesion(chamberA, vocabularyWindow)
  const cohesionB = useParliamentGroupCohesion(chamberB, vocabularyWindow)
  const cohesionC = useParliamentGroupCohesion(chamberC, vocabularyWindow)
  const groupOptions = useMemo(
    () =>
      [
        ...new Set(
          [cohesionA.data, cohesionB.data, cohesionC.data].flatMap(
            (rows) => rows?.map((row) => row.groupName) ?? [],
          ),
        ),
      ].sort((left, right) => left.localeCompare(right, 'ro')),
    [cohesionA.data, cohesionB.data, cohesionC.data],
  )

  const activeCount = getActiveVoteFilterCount(search)

  /**
   * Cross-chamber group filtering needs a TIME BOUND: the server refuses a
   * `groupVote` filter with no chamber and no period (vote_records has no index
   * on group_name — an unbounded read is a deliberate INVALID_INPUT, not a slow
   * success). So when the reader picks a group under "Toate camerele" with the
   * period empty, the period fields are pre-filled with the last 12 months —
   * visible and editable, never a hidden constraint.
   */
  const fillPeriodIfUnbounded = (next: Partial<DraftSearch>) => {
    setDraft((prev) => {
      const merged = { ...prev, ...next }
      if (
        merged.chamber === 'all' &&
        merged.grupVot !== '' &&
        merged.from === '' &&
        merged.to === ''
      ) {
        const window = rollingWindow({ months: 12, today: new Date() })
        return { ...merged, from: window.startIso, to: window.endIso }
      }
      return merged
    })
  }

  const groupNeedsPeriod =
    draft.chamber === 'all' &&
    draft.grupVot !== '' &&
    draft.from === '' &&
    draft.to === ''

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // The reader cleared the auto-filled period back out — refuse to send a
    // query the server will reject, and let the inline note say why.
    if (groupNeedsPeriod) return
    onSearchChange({
      ...search,
      // "Toate camerele" is the ABSENT param, not `chamber=all`: the widest
      // reading is the list's default, so it leaves no token behind in a URL
      // the reader may share.
      chamber: draft.chamber === 'all' ? undefined : draft.chamber,
      tipVot: draft.kinds.length > 0 ? [...draft.kinds] : undefined,
      from: draft.from || undefined,
      to: draft.to || undefined,
      outcome: draft.outcome === 'all' ? undefined : draft.outcome,
      // The group carries the filter; the stance only narrows it. A stance with
      // no group is dropped — it describes no subset of votes, and the server
      // rejects it outright.
      grupVot: draft.grupVot || undefined,
      alegere: draft.grupVot && draft.alegere ? draft.alegere : undefined,
      page: 1,
    })
    onOpenChange(false)
  }

  const handleReset = () => {
    setDraft({
      // The chamber is a facet in this panel, so "Resetează" widens it back to
      // the whole parliament like every other one.
      chamber: 'all',
      kinds: [],
      from: '',
      to: '',
      outcome: 'all',
      grupVot: '',
      alegere: '',
    })
    onSearchChange({
      tab: search.tab,
      // The free-text term lives outside this panel, so clearing the FILTERS
      // must not silently discard what the reader typed in the search bar.
      q: search.q,
      page: 1,
      pageSize: search.pageSize,
    })
  }

  const stanceWithoutGroup = draft.grupVot === '' && draft.alegere !== ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex w-full max-w-full flex-col overflow-hidden border-l-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-0 sm:max-w-xl [&>button.absolute]:right-5 [&>button.absolute]:top-5 [&>button.absolute]:h-8 [&>button.absolute]:w-8 [&>button.absolute]:rounded-none [&>button.absolute]:bg-transparent [&>button.absolute]:opacity-100 [&>button.absolute]:ring-offset-0 [&>button.absolute]:hover:bg-[var(--pnrr-card)] [&>button.absolute]:focus:ring-[var(--pnrr-blue)]"
      >
        <SheetHeader className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-6 pr-14 text-left">
          <SheetTitle className="text-left text-4xl font-black leading-none tracking-tight text-[var(--pnrr-fg)]">
            Filtre
          </SheetTitle>
          <SheetDescription className="pt-1 text-left text-base font-bold text-[var(--pnrr-muted)]">
            {activeCount === 1 ? '1 filtru activ' : `${activeCount} filtre active`}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1">
            <div className="w-full min-w-0 space-y-6 p-4 sm:p-6">
              <fieldset className={sectionClassName}>
                <legend className={legendClassName}>Camera</legend>
                <p className="text-sm leading-5 text-[var(--pnrr-muted)]">
                  „Toate camerele” caută în Camera Deputaților, Senat și
                  ședințele comune deodată; fiecare rezultat spune camera care a
                  votat.
                </p>
                <select
                  id={`${fieldId}-chamber`}
                  value={draft.chamber}
                  onChange={(e) =>
                    fillPeriodIfUnbounded({
                      chamber: e.target.value as VotesListScope,
                    })
                  }
                  className={controlClassName}
                  aria-label="Camera"
                >
                  {SCOPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </fieldset>

              <fieldset className={sectionClassName}>
                <legend className={legendClassName}>Tipul votului</legend>
                {/*
                  Only `legislative` rests on a column (`bill_key IS NOT NULL`).
                  The other five are read off the free-text title, so the panel
                  says so once instead of implying all six carry the same
                  authority.
                */}
                <p className="text-sm leading-5 text-[var(--pnrr-muted)]">
                  „Proiecte de lege” urmează legătura către proiect. Celelalte
                  categorii sunt deduse din titlul votului, care nu este
                  standardizat.
                </p>
                <ul className="space-y-2">
                  {VOTE_KIND_ORDER.map((kind) => {
                    const count = kindCounts?.[kind]
                    // A bucket this chamber never uses (the Senate has no
                    // amendment or attendance votes) is shown DISABLED with its
                    // zero, not hidden — an option that silently vanished would
                    // read as a bug.
                    const empty = count === 0
                    return (
                      <li key={kind}>
                        <label
                          className={cn(
                            'flex items-center gap-3 text-base',
                            empty
                              ? 'text-[var(--pnrr-muted)]'
                              : 'text-[var(--pnrr-fg)]',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-5 w-5 shrink-0 rounded-none border-2 border-[var(--pnrr-border)] accent-[var(--pnrr-blue)]"
                            checked={draft.kinds.includes(kind)}
                            disabled={empty}
                            onChange={(event) =>
                              setDraft((prev) => ({
                                ...prev,
                                kinds: event.target.checked
                                  ? [...prev.kinds, kind]
                                  : prev.kinds.filter((entry) => entry !== kind),
                              }))
                            }
                          />
                          <span className="min-w-0 flex-1">
                            {VOTE_KIND_LABELS[kind]}
                          </span>
                          {/*
                            A flex container drops whitespace-only text nodes,
                            so without a REAL space the accessible name reads
                            "Proiecte de lege4.408". The gap utility fixes the
                            eye; only a text node fixes the screen reader.
                          */}
                          {count === undefined ? null : (
                            <>
                              {' '}
                              <span className="shrink-0 tabular-nums text-sm text-[var(--pnrr-muted)]">
                                {count.toLocaleString('ro-RO')}
                              </span>
                            </>
                          )}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </fieldset>

              <fieldset className={sectionClassName}>
                <legend className={legendClassName}>Perioadă</legend>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldId}-from`} className={labelClassName}>
                    De la
                  </Label>
                  <Input
                    id={`${fieldId}-from`}
                    type="date"
                    value={draft.from}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, from: e.target.value }))
                    }
                    className={controlClassName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldId}-to`} className={labelClassName}>
                    Până la
                  </Label>
                  <Input
                    id={`${fieldId}-to`}
                    type="date"
                    value={draft.to}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, to: e.target.value }))
                    }
                    className={controlClassName}
                  />
                </div>
              </fieldset>

              <fieldset className={sectionClassName}>
                <legend className={legendClassName}>Rezultat</legend>
                {/*
                  Only the two outcomes the source records (`votes.outcome` is
                  `adoptat | respins | null`) — "amânat" is a UI-only state and
                  picking it would silently broaden the query to every vote.
                */}
                <select
                  id={`${fieldId}-outcome`}
                  value={draft.outcome}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      outcome: e.target.value as DraftSearch['outcome'],
                    }))
                  }
                  className={controlClassName}
                  aria-label="Rezultat"
                >
                  <option value="all">Toate rezultatele</option>
                  {/* These filter the TALLY (the server derives outcome as
                      pentru > impotriva), not whether the bill passed. */}
                  <option value="adoptat">Majoritate pentru</option>
                  <option value="respins">Majoritate împotrivă</option>
                </select>
              </fieldset>

              <fieldset className={sectionClassName}>
                <legend className={legendClassName}>Poziția unui grup</legend>
                <p className="text-sm leading-5 text-[var(--pnrr-muted)]">
                  Doar grupul: toate voturile la care grupul a participat. Cu o
                  variantă aleasă: doar voturile în care majoritatea grupului a
                  ales-o — un vot în care grupul s-a împărțit egal nu apare.
                </p>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldId}-grup`} className={labelClassName}>
                    Grup
                  </Label>
                  <select
                    id={`${fieldId}-grup`}
                    value={draft.grupVot}
                    onChange={(e) =>
                      fillPeriodIfUnbounded({ grupVot: e.target.value })
                    }
                    className={controlClassName}
                  >
                    <option value="">Oricare</option>
                    {groupOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor={`${fieldId}-alegere`}
                    className={labelClassName}
                  >
                    A votat (opțional)
                  </Label>
                  <select
                    id={`${fieldId}-alegere`}
                    value={draft.alegere}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        alegere: e.target.value as DraftSearch['alegere'],
                      }))
                    }
                    className={controlClassName}
                  >
                    <option value="">Oricum (toate participările)</option>
                    {CHOICE_OPTIONS.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </div>
                {stanceWithoutGroup ? (
                  <p
                    className="border-l-4 border-l-[#d4351c] pl-3 text-sm leading-5 text-[var(--pnrr-fg)]"
                    role="status"
                  >
                    Alegeți un grup — o variantă de vot fără grup nu descrie
                    niciun set de voturi.
                  </p>
                ) : null}
                {groupNeedsPeriod ? (
                  <p
                    className="border-l-4 border-l-[#d4351c] pl-3 text-sm leading-5 text-[var(--pnrr-fg)]"
                    role="status"
                  >
                    Pentru „Toate camerele”, poziția unui grup se caută
                    într-o perioadă de timp. Alegeți o perioadă mai sus —
                    la selectarea grupului am completat ultimele 12 luni.
                  </p>
                ) : draft.chamber === 'all' && draft.grupVot !== '' ? (
                  <p className="text-sm leading-5 text-[var(--pnrr-muted)]">
                    În „Toate camerele”, poziția grupului se caută în perioada
                    aleasă mai sus.
                  </p>
                ) : null}
              </fieldset>
            </div>
          </ScrollArea>

          <div className="flex shrink-0 flex-col gap-3 border-t-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4 sm:flex-row sm:p-6">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-none border-2 text-base"
              onClick={handleReset}
            >
              Resetează
            </Button>
            <Button
              type="submit"
              className="h-11 flex-1 rounded-none border-0 text-base font-normal text-white hover:opacity-90"
              style={{ backgroundColor: PARLIAMENT_ACTION_BLUE }}
            >
              Aplică filtrele
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
