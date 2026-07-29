import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  MemberVoteChoice,
  ParliamentVotesSearch,
  VoteSort,
} from "@/schemas/parliament";
import { useParliamentVotesBrowse } from "../hooks/use-parliament-data";
import { getVoteChamberLabel } from "../lib/formatting";
import { ParliamentDebouncedSearchInput } from "./parliament-debounced-search-input";
import { ParliamentHubVoteActivity } from "./parliament-hub-vote-activity";
import {
  ParliamentActiveFilterChips,
  ParliamentListFooter,
  ParliamentListHeader,
  ParliamentListToolbar,
  type ParliamentFilterChip,
} from "./parliament-list-surface";
import { VoteListRowCard } from "./vote-list-row-card";
import {
  VotesFilterSheet,
  VotesFilterTriggerButton,
} from "./votes-filter-sheet";
import {
  DEFAULT_VOTE_SORT,
  getActiveVoteFilterCount,
  getVotesChamberFilter,
  readVoteKinds,
  VOTE_KIND_LABELS,
  VOTE_SORT_LABELS,
  VOTE_SORT_ORDER,
} from "../lib/votes-filter-state";
import { ParliamentInlineLoadError } from "./parliament-load-error-page";
import {
  countedNoun,
  formatParliamentTotal,
  parliamentListStrongClassName,
} from "../lib/list-surface-theme";

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

  /** Every narrowing facet, as one removable chip each. */
  const chips: ParliamentFilterChip[] = [];
  if (search.q) {
    chips.push({
      key: "q",
      label: `Conține: ${search.q}`,
      onRemove: () =>
        handleSearchChange({ ...listSearch, q: undefined, page: 1 }),
    });
  }
  if (chamberFilter) {
    chips.push({
      key: "chamber",
      label: getVoteChamberLabel(chamberFilter),
      onRemove: () =>
        handleSearchChange({ ...listSearch, chamber: undefined, page: 1 }),
    });
  }
  if (search.from || search.to) {
    chips.push({
      key: "period",
      label:
        search.from && search.from === search.to
          ? formatDay(search.from)
          : `${search.from ? formatDay(search.from) : "început"} – ${search.to ? formatDay(search.to) : "prezent"}`,
      onRemove: () =>
        handleSearchChange({
          ...listSearch,
          from: undefined,
          to: undefined,
          page: 1,
        }),
    });
  }
  if (search.outcome) {
    chips.push({
      key: "outcome",
      label: `Rezultat: ${search.outcome}`,
      onRemove: () =>
        handleSearchChange({ ...listSearch, outcome: undefined, page: 1 }),
    });
  }
  for (const kind of readVoteKinds(search)) {
    chips.push({
      key: `kind-${kind}`,
      label: VOTE_KIND_LABELS[kind],
      onRemove: () => {
        const remaining = readVoteKinds(search).filter(
          (value) => value !== kind,
        );
        handleSearchChange({
          ...listSearch,
          tipVot: remaining.length > 0 ? remaining : undefined,
          page: 1,
        });
      },
    });
  }
  if (groupVoteFilter) {
    chips.push({
      key: "group",
      label: `${groupVoteFilter.group}: ${VOTE_CHOICE_LABELS[groupVoteFilter.choice]}`,
      onRemove: () =>
        handleSearchChange({
          ...listSearch,
          grupVot: undefined,
          alegere: undefined,
          page: 1,
        }),
    });
  }

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
      <ParliamentListHeader
        title="Voturile din Parlament"
        description="Divizările din Camera Deputaților, Senat și ședințele comune, într-o singură listă — de la cea mai recentă."
        about={
          <>
            <p>
              O divizare este o singură chemare la vot din plen. Ședințele
              comune ale celor două Camere apar sub eticheta{" "}
              <strong className="font-bold">Camerele reunite</strong>, alături de
              voturile fiecărei Camere.
            </p>
            <p className="mt-2">
              Filtrul pe poziția unui grup selectează voturile în care{" "}
              <strong className="font-bold">majoritatea</strong> grupului a ales
              acea variantă; un vot în care grupul s-a împărțit egal nu apare în
              listă.
            </p>
          </>
        }
      />

      <ParliamentListToolbar
        chips={
          <ParliamentActiveFilterChips
            chips={chips}
            onClearAll={() =>
              handleSearchChange({
                tab: search.tab,
                pageSize: listSearch.pageSize,
              })
            }
            note={
              groupVoteFilter ? (
                /*
                  The reader may arrive here from a PERCENTAGE on the group
                  dossier while this list is a COUNT OF VOTES — a different
                  denominator. Restating the rule at the destination is what
                  stops the two numbers being read as the same claim.
                */
                <>
                  Se afișează voturile în care majoritatea grupului{" "}
                  <span className={parliamentListStrongClassName}>
                    {groupVoteFilter.group}
                  </span>{" "}
                  a ales „{VOTE_CHOICE_LABELS[groupVoteFilter.choice]}”. Un vot
                  în care grupul s-a împărțit egal nu apare în listă.
                </>
              ) : null
            }
          />
        }
      >
        {/* The free-text search stays on the page: it is the one control a
            reader reaches for immediately, and burying it behind the filter
            button would cost a click on every search. */}
        <ParliamentDebouncedSearchInput
          inputId="votes-q"
          ariaLabel="Caută după titlu sau număr divizare"
          placeholder="Caută după titlu sau număr divizare…"
          value={search.q}
          onCommit={(next) =>
            handleSearchChange({ ...listSearch, q: next, page: 1 })
          }
          className="flex-1"
        />
        <div className="flex shrink-0 items-center gap-3">
          <Label htmlFor="vote-sort" className="sr-only">
            Ordonează rezultatele
          </Label>
          {/*
            Applied on change rather than behind the filter panel's Apply: it
            reorders what is already on screen, so making the reader open a
            panel and confirm would be a step with nothing to decide.
          */}
          <Select
            value={search.ordine ?? DEFAULT_VOTE_SORT}
            onValueChange={(value) =>
              handleSearchChange({
                ...listSearch,
                ordine: value as VoteSort,
                page: 1,
              })
            }
          >
            <SelectTrigger
              id="vote-sort"
              className="h-11 w-52 rounded-none border-2 border-[#b1b4b6] bg-white text-sm text-[#0b0c0c] shadow-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOTE_SORT_ORDER.map((option) => (
                <SelectItem key={option} value={option}>
                  {VOTE_SORT_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <VotesFilterTriggerButton
            activeCount={activeFilterCount}
            onClick={() => setFiltersOpen(true)}
          />
        </div>
      </ParliamentListToolbar>

      <VotesFilterSheet
        search={listSearch}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onSearchChange={handleSearchChange}
      />

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
          <div className="space-y-4">
            {votes.map((vote) => (
              <VoteListRowCard
                key={vote.voteId}
                vote={vote}
                // Only where it TELLS the reader something: with a chamber
                // filter on, the chip above already says it, on every row.
                showChamber={chamberFilter === undefined}
              />
            ))}
          </div>

          {/* The count closes the list rather than introducing it: it answers
              "is this all of it?", which is a question the reader has after the
              rows, not before them. */}
          <ParliamentListFooter
            summary={
              total === undefined ? (
                /* No total from the server — describe only what is loaded, and
                   never imply a corpus size the response did not report. */
                <>
                  Se afișează cele mai recente{" "}
                  <span className={parliamentListStrongClassName}>
                    {votes.length}
                  </span>{" "}
                  voturi
                  {hasNextPage ? " — mai există rezultate mai vechi." : "."}
                </>
              ) : (
                <>
                  <span className={parliamentListStrongClassName}>
                    {votes.length}
                  </span>{" "}
                  din{" "}
                  <span className={parliamentListStrongClassName}>
                    {formatParliamentTotal(total, totalEstimated)}
                  </span>{" "}
                  {countedNoun(total, "vot", "voturi")}
                </>
              )
            }
          >
            {hasNextPage ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-none border-2 border-[#0b0c0c] px-5 text-base font-normal dark:border-[var(--pnrr-border)]"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Se încarcă…" : "Încarcă voturi mai vechi"}
              </Button>
            ) : null}
          </ParliamentListFooter>
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
          Numărul de voturi din plen pe zile, în ultimele 12 luni, folosind
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
