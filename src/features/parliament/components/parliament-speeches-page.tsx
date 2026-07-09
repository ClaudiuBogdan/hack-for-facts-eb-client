import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ParliamentSpeechesSearch } from '@/schemas/parliament'
import {
  useParliamentSpeeches,
  useParliamentSpeechActivity,
} from '../hooks/use-parliament-data'
import {
  buildParliamentSpeechesFilter,
  countActiveParliamentSpeechFilters,
  expectedSearchDepth,
  getParliamentSpeechQ,
} from '../lib/parliament-speeches-filter'
import {
  memberDetailNoticeClassName,
  memberDetailSectionIntroClassName,
  memberDetailSectionTitleClassName,
} from '../lib/member-detail-theme'
import { ParliamentShell } from './parliament-shell'
import { MemberSpeechActivityHeatmap } from './member-speech-activity-heatmap'
import { MemberSpeechRecordCard } from './member-speech-record-card'
import { ParliamentDebouncedSearchInput } from './parliament-debounced-search-input'
import { FilterTriggerButton } from './parliament-filter-trigger-button'
import { ParliamentSpeechSearchDepthNotice } from './parliament-speech-search-depth-notice'
import {
  ParliamentSpeechesActiveFilters,
  ParliamentSpeechesFilterSheet,
  type ParliamentSpeechesFilterPatch,
} from './parliament-speeches-filter-sheet'

type Props = {
  readonly search: ParliamentSpeechesSearch
}

/** Drop `undefined` keys so the committed URL stays minimal. */
function stripUndefined(
  search: ParliamentSpeechesSearch,
): ParliamentSpeechesSearch {
  return Object.fromEntries(
    Object.entries(search).filter(([, value]) => value !== undefined),
  ) as ParliamentSpeechesSearch
}

/** "1.234" / "peste 10.000" — the capped-total presentation. */
function formatTotal(total: number, estimated: boolean): string {
  const formatted = new Intl.NumberFormat('ro-RO').format(total)
  return estimated ? `peste ${formatted}` : formatted
}

/**
 * The global stenograme page (/parlament/stenograme): a beginner-friendly
 * browse-and-search surface over every plenary intervention. Same architecture
 * as the member interventii tab — all state in the URL, a per-year activity
 * heatmap (date-stripped filter), a cursor-paged list (full filter), and a
 * debounced free-text search whose applied depth is reported honestly from the
 * server's `searchDepth`.
 */
export function ParliamentSpeechesPage({ search }: Props) {
  const navigate = useNavigate({ from: '/parlament/stenograme/' })
  const [filterOpen, setFilterOpen] = useState(false)
  const currentYear = new Date().getFullYear()

  const q = getParliamentSpeechQ(search)

  // Bootstrap year: availableYears is independent of `year`, so the first
  // fetch reveals the full year set; default = most recent year with turns.
  const bootstrapYear = search.an ?? currentYear
  const activityFilter = useMemo(
    () =>
      buildParliamentSpeechesFilter(search, {
        stripDate: true,
        year: bootstrapYear,
      }),
    [search, bootstrapYear],
  )
  const bootstrap = useParliamentSpeechActivity(bootstrapYear, activityFilter, q)
  const availableYears = bootstrap.data?.availableYears ?? []
  const year =
    search.an ??
    (availableYears.length > 0 ? Math.max(...availableYears) : currentYear)
  const activityQuery = useParliamentSpeechActivity(year, activityFilter, q)
  const activity = activityQuery.data ?? undefined
  const isActivityLoading = bootstrap.isLoading || activityQuery.isLoading

  const listFilter = useMemo(
    () => buildParliamentSpeechesFilter(search, { year }),
    [search, year],
  )
  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useParliamentSpeeches(listFilter, q)

  const pages = data?.pages ?? []
  const speeches = pages.flatMap((page) => page.speeches)
  const first = pages[0]
  const activeCount = countActiveParliamentSpeechFilters(search)
  const selectedDay =
    search.from && search.from === search.to ? search.from : undefined
  // The server response is the depth source of truth; the pure hint covers the
  // loading gap so the notice never flickers between the two meanings.
  const searchDepth =
    first?.searchDepth ?? activity?.searchDepth ?? expectedSearchDepth(search)

  const commit = (patch: ParliamentSpeechesFilterPatch) => {
    void navigate({
      search: stripUndefined({ ...search, ...patch }),
      replace: true,
      resetScroll: false,
    })
  }

  const handleSelectDay = (day: string | null) => {
    if (!day || (search.from === day && search.to === day)) {
      commit({ from: undefined, to: undefined })
      return
    }
    commit({ from: day, to: day })
  }

  const handleClearAll = () =>
    commit({
      vorbitor: undefined,
      camera: undefined,
      from: undefined,
      to: undefined,
      q: undefined,
    })

  return (
    <ParliamentShell activeTab="stenograme">
      <div className="space-y-8">
        <div>
          <h2 className={memberDetailSectionTitleClassName}>
            Stenogramele Parlamentului
          </h2>
          <p className={memberDetailSectionIntroClassName}>
            Stenograma este transcrierea oficială a dezbaterilor din plen —
            fiecare luare de cuvânt a unui parlamentar, consemnată cuvânt cu
            cuvânt. Alegeți o zi din calendar, căutați un subiect sau filtrați
            după vorbitor și cameră.
          </p>
        </div>

        <section className="space-y-4">
          <div>
            <h3 className={memberDetailSectionTitleClassName}>
              Activitatea în plen
            </h3>
            <p className={memberDetailSectionIntroClassName}>
              Fiecare pătrat reprezintă o zi; intensitatea arată câte
              intervenții au fost consemnate. Faceți clic pe o zi pentru a
              filtra lista.
            </p>
          </div>
          <MemberSpeechActivityHeatmap
            activity={activity}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
            year={year}
            onSelectYear={(next) => commit({ an: next })}
            isLoading={isActivityLoading}
          />
        </section>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ParliamentDebouncedSearchInput
              inputId="parliament-speeches-q"
              ariaLabel="Caută în stenograme"
              placeholder="Caută un subiect (ex. buget, educație)…"
              value={search.q}
              onCommit={(next) => commit({ q: next })}
              className="flex-1"
            />
            <FilterTriggerButton
              activeCount={activeCount}
              onClick={() => setFilterOpen(true)}
              className="self-start sm:self-auto"
            />
          </div>
          {q ? <ParliamentSpeechSearchDepthNotice depth={searchDepth} /> : null}
          <ParliamentSpeechesActiveFilters
            search={search}
            onChange={commit}
            onClearAll={handleClearAll}
          />
        </div>

        <aside className={memberDetailNoticeClassName}>
          <p>
            Fiecare card conține o intervenție (o luare de cuvânt) și numele
            vorbitorului. Transcrierea completă este disponibilă acolo unde a
            fost încărcată din stenogramă.
          </p>
        </aside>

        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-none" />
        ) : isError ? (
          <div className="space-y-3">
            <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Stenogramele nu au putut fi încărcate. Verificați conexiunea și
              încercați din nou.
            </p>
            <Button
              type="button"
              variant="outline"
              className="rounded-none border-2 px-6"
              onClick={() => void refetch()}
            >
              Reîncearcă
            </Button>
          </div>
        ) : speeches.length > 0 && first ? (
          <div className="space-y-4">
            <p className="border border-[#b1b4b6] bg-[#f3f2f1] px-5 py-3 text-sm text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)]">
              Afișate <span className="font-bold">{speeches.length}</span> din{' '}
              <span className="font-bold">
                {formatTotal(first.total, first.totalEstimated)}
              </span>{' '}
              intervenții
            </p>
            {speeches.map((speech) => (
              <MemberSpeechRecordCard
                key={speech.speechKey}
                speech={speech}
                detailTo={speech.speechKey}
                speaker={
                  speech.speaker
                    ? {
                        name: speech.speaker.fullName,
                        memberId: speech.speaker.mandateKey,
                        groupName: speech.speaker.groupName,
                      }
                    : speech.speakerName
                      ? { name: speech.speakerName }
                      : undefined
                }
              />
            ))}
            {hasNextPage ? (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none border-2 px-6"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage
                    ? 'Se încarcă…'
                    : 'Încarcă mai multe intervenții'}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {activeCount > 0
              ? 'Nicio intervenție nu corespunde filtrelor selectate.'
              : `Nu există intervenții consemnate pentru anul ${year}.`}
          </p>
        )}

        <ParliamentSpeechesFilterSheet
          open={filterOpen}
          onOpenChange={setFilterOpen}
          search={search}
          onChange={commit}
          onClearAll={handleClearAll}
        />
      </div>
    </ParliamentShell>
  )
}
