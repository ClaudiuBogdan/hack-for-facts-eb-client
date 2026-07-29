import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  MemberVoteChoice,
  ParliamentVotesSearch,
  VoteSort,
} from "@/schemas/parliament";
import { useParliamentVotesBrowse } from "../hooks/use-parliament-data";
import { getVoteChamberLabel } from "../lib/formatting";
import { ParliamentChamberMark } from "./parliament-hub-panel";
import { ParliamentHubVoteActivity } from "./parliament-hub-vote-activity";
import { VoteListRowCard } from "./vote-list-row-card";
import {
  VotesFilterSheet,
  VotesFilterTriggerButton,
} from "./votes-filter-sheet";
import {
  DEFAULT_VOTE_SORT,
  getActiveVoteFilterCount,
  getVotesChamberFilter,
  VOTE_SORT_LABELS,
  VOTE_SORT_ORDER,
} from "../lib/votes-filter-state";
import { ParliamentInlineLoadError } from "./parliament-load-error-page";
import { PARLIAMENT_ACTION_BLUE } from "../lib/hub-theme";

/** Ballot choices, worded for a citizen reading a filter chip. */
const VOTE_CHOICE_LABELS: Readonly<Record<MemberVoteChoice, string>> = {
  pentru: "Pentru",
  impotriva: "Împotrivă",
  abtinere: "Abținere",
  nu_a_votat: "Nu au votat",
};

const LIST_PAGE_SIZE = 10;

/** Anchor the activity heatmap scrolls back to when a day is chosen. */
const RESULTS_ANCHOR_ID = "voturi-rezultate";

type Props = {
  readonly search: ParliamentVotesSearch;
};

/** `2026-01-28` → `28 ian. 2026`, for the active-filter summary. */
function formatDay(value: string): string {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * THE votes list — every division in Parliament, with the chamber as a filter.
 *
 * It used to be four separate branded lists reached through a two-panel
 * overview, so a reader who wanted "what did Parliament vote on" had to pick an
 * assembly first and could never see the joint sittings next to the rest. One
 * list answers that question directly; the chambers are still reachable, as a
 * facet that says so in the filter summary.
 *
 * The votes API is a KEYSET connection: it reports "here is a page, and whether
 * more exist" — never a page count. This list used to render numbered pagination
 * over invented values (`page: 1`, `totalPages: 1`, `total` = the length of the
 * one page it fetched), so "10 rezultate" stood in for a 20k-row corpus and the
 * page buttons were inert. It loads forward on the cursor and says exactly what
 * it is showing.
 *
 * Layout: a free-text search bar and a badged filter button, with every
 * narrowing facet behind a sliding panel (the PNRR filter pattern). The old
 * four-across bar had no room left for the group/stance facets and pushed the
 * results below the fold. Results are ONE column, because two columns of tall
 * cards made a reader track two independent lists down the page for records
 * that all came from the same filter.
 */
export function VotesListLayout({ search }: Props) {
  const navigate = useNavigate({ from: "/parlament/" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [queryDraft, setQueryDraft] = useState(search.q ?? "");
  // Keep the bar in step with the URL (back/forward, or a reset from the panel)
  // without clobbering what the reader is typing on unrelated re-renders.
  useEffect(() => {
    setQueryDraft(search.q ?? "");
  }, [search.q]);
  const listSearch = {
    ...search,
    pageSize: search.pageSize ?? LIST_PAGE_SIZE,
  };
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useParliamentVotesBrowse(listSearch);

  const chamberFilter = getVotesChamberFilter(search);
  const votes = data?.pages.flatMap((page) => page.votes) ?? [];
  // The count the ACTIVE FILTER matches, from the server. Capped at 10,000:
  // when the cap bit we say "peste 10.000" rather than print a number the
  // source never actually reached.
  const firstPage = data?.pages[0];
  const total = firstPage?.total;
  const totalEstimated = firstPage?.totalEstimated === true;

  // Both halves or nothing — matches `buildVotesFilter`, so the summary can
  // never claim a constraint the query did not actually send.
  const groupVoteFilter =
    search.grupVot && search.alegere
      ? { group: search.grupVot, choice: search.alegere }
      : undefined;

  const activeFilterCount = getActiveVoteFilterCount(search);

  const activeFilters = [
    search.q ? `„${search.q}”` : undefined,
    chamberFilter ? getVoteChamberLabel(chamberFilter) : undefined,
    search.from || search.to
      ? `${search.from ? formatDay(search.from) : "început"} – ${search.to ? formatDay(search.to) : "prezent"}`
      : undefined,
    search.outcome ? `Rezultat: ${search.outcome}` : undefined,
    groupVoteFilter
      ? `${groupVoteFilter.group}: ${VOTE_CHOICE_LABELS[groupVoteFilter.choice]}`
      : undefined,
  ].filter((entry): entry is string => entry !== undefined);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSearchChange({
      ...listSearch,
      q: queryDraft.trim() || undefined,
      page: 1,
    });
  };

  const handleSearchChange = (next: ParliamentVotesSearch) => {
    setFiltersOpen(false);
    void navigate({
      // `next` is taken as the WHOLE new state, chamber included: it is a facet
      // like any other now, so an absent one has to mean "all chambers" rather
      // than "keep the one you had" — otherwise it could never be cleared.
      search: {
        ...next,
        tab: "voturi",
        pageSize: next.pageSize ?? LIST_PAGE_SIZE,
      },
      replace: true,
    });
  };

  /**
   * A day chosen in the heatmap changes results the reader has already scrolled
   * past. The link does the filtering; this brings them back to what changed.
   */
  const scrollToResults = () => {
    document
      .getElementById(RESULTS_ANCHOR_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const dayFilter =
    search.from && search.from === search.to ? search.from : undefined;

  return (
    <div className="space-y-6">
      {/* One heading, whatever the filters say. A chamber narrows this list; it
          does not open a different page, so re-titling the surface per chamber
          would make the same list look like four. */}
      <header className="max-w-4xl">
        <h2 className="flex items-start gap-2.5 text-2xl font-bold leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)] sm:text-[1.75rem]">
          <ParliamentChamberMark color={PARLIAMENT_ACTION_BLUE} className="mt-1" />
          <span>Voturile din Parlament</span>
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Divizările din Camera Deputaților, Senat și ședințele comune, într-o
          singură listă — de la cea mai recentă. Caută după titlu sau
          filtrează după cameră, perioadă, rezultat ori poziția unui grup.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* The free-text search stays on the page: it is the one control a
            reader reaches for immediately, and burying it behind the filter
            button would cost a click on every search. */}
        <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-1 gap-3">
          <Input
            type="search"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="Caută după titlu sau număr divizare"
            aria-label="Caută după titlu sau număr divizare"
            className="h-11 min-w-0 flex-1 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-base shadow-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          />
          <Button
            type="submit"
            className="h-11 shrink-0 rounded-none border-0 px-6 text-base font-normal text-white hover:opacity-90"
            style={{ backgroundColor: PARLIAMENT_ACTION_BLUE }}
          >
            Caută
          </Button>
        </form>
        <div className="flex shrink-0 items-center gap-3">
          <label htmlFor="vote-sort" className="sr-only">
            Ordonează rezultatele
          </label>
          {/*
            Applied on change rather than behind the filter panel's Apply: it
            reorders what is already on screen, so making the reader open a
            panel and confirm would be a step with nothing to decide.
          */}
          <select
            id="vote-sort"
            value={search.ordine ?? DEFAULT_VOTE_SORT}
            onChange={(event) =>
              handleSearchChange({
                ...listSearch,
                ordine: event.target.value as VoteSort,
                page: 1,
              })
            }
            className="h-11 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-base text-[var(--pnrr-fg)] focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            {VOTE_SORT_ORDER.map((option) => (
              <option key={option} value={option}>
                {VOTE_SORT_LABELS[option]}
              </option>
            ))}
          </select>
          <VotesFilterTriggerButton
            activeCount={activeFilterCount}
            onClick={() => setFiltersOpen(true)}
          />
        </div>
      </div>

      <VotesFilterSheet
        search={listSearch}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onSearchChange={handleSearchChange}
      />

      {activeFilters.length > 0 ? (
        <div
          className="border-l-[5px] border-l-[#512178] bg-[#f3f0ff] px-4 py-3 text-sm leading-6 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]"
          role="status"
        >
          <p>
            Filtre active:{" "}
            <span className="font-bold">{activeFilters.join(" · ")}</span>
          </p>
          {groupVoteFilter ? (
            /*
              The reader may arrive here from a PERCENTAGE on the group dossier
              while this list is a COUNT OF VOTES — a different denominator.
              Restating the rule at the destination is what stops the two
              numbers being read as the same claim.
            */
            <p className="mt-1">
              Se afișează voturile în care majoritatea grupului{" "}
              <span className="font-bold">{groupVoteFilter.group}</span> a ales
              „{VOTE_CHOICE_LABELS[groupVoteFilter.choice]}”. Un vot în care
              grupul s-a împărțit egal nu apare în listă.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() =>
              handleSearchChange({
                tab: search.tab,
                pageSize: listSearch.pageSize,
              })
            }
            className="mt-1 text-sm font-semibold underline underline-offset-2"
          >
            Renunță la toate filtrele
          </button>
        </div>
      ) : null}

      <div id={RESULTS_ANCHOR_ID} className="scroll-mt-4">
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-none" />
          ))}
        </div>
      ) : isError ? (
        <ParliamentInlineLoadError
          title="Lista voturilor nu a putut fi încărcată"
          description="Nu putem spune că nu există rezultate cât timp citirea datelor a eșuat."
          onRetry={() => void refetch()}
        />
      ) : votes.length > 0 ? (
        <div className="space-y-5">
          <p className="border border-[#b1b4b6] bg-[#f3f2f1] px-4 py-3 text-sm text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]">
            {total === undefined ? (
              /* No total from the server — describe only what is loaded, and
                 never imply a corpus size the response did not report. */
              <>
                Se afișează cele mai recente{" "}
                <span className="font-bold">{votes.length}</span> voturi
                {hasNextPage ? " — mai există rezultate mai vechi." : "."}
              </>
            ) : (
              <>
                <span className="font-bold">
                  {totalEstimated
                    ? `peste ${total.toLocaleString("ro-RO")}`
                    : total.toLocaleString("ro-RO")}
                </span>{" "}
                {total === 1 ? "vot corespunde" : "voturi corespund"} filtrelor
                alese. Se afișează primele{" "}
                <span className="font-bold">{votes.length}</span>, de la cel mai
                recent.
              </>
            )}
          </p>

          <div className="space-y-4">
            {votes.map((vote) => (
              <VoteListRowCard
                key={vote.voteId}
                vote={vote}
                // Only where it TELLS the reader something: with a chamber
                // filter on, the summary above already says it, on every row.
                showChamber={chamberFilter === undefined}
              />
            ))}
          </div>

          {hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-none border-2 border-[#0b0c0c] text-base font-normal dark:border-[var(--pnrr-border)]"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Se încarcă…" : "Încarcă voturi mai vechi"}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="border border-[#b1b4b6] bg-white px-5 py-10 text-center dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
          <p className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            Niciun vot nu corespunde căutării
          </p>
          <p className="mt-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Încearcă un alt titlu, interval de date sau resetează filtrele.
          </p>
        </div>
      )}
      </div>

      {/* WHEN the chambers voted, under the list it filters. A square counts
          every division that day in all three assemblies — the caption says so,
          because the list above may be narrowed to one of them and the two
          numbers must not be read as the same claim. */}
      <section
        aria-labelledby="votes-list-activity-heading"
        className="border-t-2 border-[var(--pnrr-border)] pt-6"
      >
        <h3
          id="votes-list-activity-heading"
          className="text-xl font-bold leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)]"
        >
          Când a votat Parlamentul
        </h3>
        <p className="mt-2 max-w-3xl text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Numărul de voturi din plen pe zile, în ultimele 12 luni — Camera
          Deputaților, Senatul și ședințele comune la un loc, indiferent de
          filtrele de mai sus. Alege o zi pentru a o adăuga la filtrele
          curente.
        </p>
        <div className="mt-5">
          <ParliamentHubVoteActivity
            daySearch={{ ...listSearch, tab: "voturi", page: 1 }}
            onSelectDay={scrollToResults}
            cta={
              dayFilter ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 h-10 rounded-none border-2 border-[#0b0c0c] px-5 text-base font-normal dark:border-[var(--pnrr-border)]"
                  onClick={() =>
                    handleSearchChange({
                      ...listSearch,
                      from: undefined,
                      to: undefined,
                      page: 1,
                    })
                  }
                >
                  Renunță la ziua aleasă ({formatDay(dayFilter)})
                </Button>
              ) : (
                <p className="mt-4 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  Ziua aleasă se adaugă la filtre; celelalte rămân active.
                </p>
              )
            }
          />
        </div>
      </section>
    </div>
  );
}
