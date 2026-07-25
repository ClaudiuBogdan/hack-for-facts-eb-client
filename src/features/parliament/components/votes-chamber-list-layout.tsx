import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ParliamentVotesSearch } from "@/schemas/parliament";
import { useParliamentVotesBrowse } from "../hooks/use-parliament-data";
import { getChamberLabel } from "../lib/formatting";
import { ParliamentChamberMark } from "./parliament-hub-panel";
import { VoteChamberVoteCard } from "./vote-chamber-vote-card";
import { VotesChamberSearchForm } from "./votes-chamber-search-form";
import { ParliamentInlineLoadError } from "./parliament-load-error-page";
import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_SENAT_RED,
} from "../lib/hub-theme";

const LIST_PAGE_SIZE = 10;

type Props = {
  readonly search: ParliamentVotesSearch & {
    readonly chamber: "camera" | "senat";
  };
};

/**
 * Dedicated chamber votes list.
 *
 * The votes API is a KEYSET connection: it reports "here is a page, and whether
 * more exist" — never a total or a page count. This list used to render numbered
 * pagination over invented values (`page: 1`, `totalPages: 1`, `total` = the
 * length of the one page it fetched), so "10 rezultate" stood in for a 20k-row
 * corpus and the page buttons were inert. Now it loads forward on the cursor and
 * says exactly what it is showing: the most recent N, newest first.
 */
export function VotesChamberListLayout({ search }: Props) {
  const navigate = useNavigate({ from: "/parlament/" });
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

  const chamberColor =
    search.chamber === "camera"
      ? PARLIAMENT_CAMERA_GREEN
      : PARLIAMENT_SENAT_RED;
  const chamberLabel = getChamberLabel(search.chamber);
  const votes = data?.pages.flatMap((page) => page.votes) ?? [];

  const handleSearchChange = (next: ParliamentVotesSearch) => {
    void navigate({
      search: {
        ...next,
        tab: "voturi",
        chamber: search.chamber,
        pageSize: next.pageSize ?? LIST_PAGE_SIZE,
      },
      replace: true,
    });
  };

  return (
    <div className="space-y-6">
      <Link
        to="/parlament"
        search={{ tab: "voturi" }}
        className="inline-block text-sm font-semibold text-[var(--pnrr-fg)] underline underline-offset-2 hover:text-[var(--pnrr-muted)]"
      >
        ← Toate camerele
      </Link>

      <header className="max-w-4xl">
        <h2 className="flex items-start gap-2.5 text-2xl font-bold leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)] sm:text-[1.75rem]">
          <ParliamentChamberMark color={chamberColor} className="mt-1" />
          <span>Voturi în {chamberLabel}</span>
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Caută divizările după titlu, interval de date sau rezultat.
          Rezultatele sunt afișate de la cel mai recent, în ordinea datei
          votului.
        </p>
      </header>

      <VotesChamberSearchForm
        search={listSearch}
        chamberLabel={chamberLabel}
        onSearchChange={handleSearchChange}
      />

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-none" />
      ) : isError ? (
        <ParliamentInlineLoadError
          title="Lista voturilor nu a putut fi încărcată"
          description="Nu putem spune că nu există rezultate cât timp citirea datelor a eșuat."
          onRetry={() => void refetch()}
        />
      ) : votes.length > 0 ? (
        <div className="space-y-5">
          {/*
            Honest count copy: "cele mai recente N" describes what is loaded.
            The API reports no total, so the page never claims one.
          */}
          <p className="border border-[#b1b4b6] bg-[#f3f2f1] px-4 py-3 text-sm text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]">
            Se afișează cele mai recente{" "}
            <span className="font-bold">{votes.length}</span> voturi
            {hasNextPage ? " — mai există rezultate mai vechi." : "."}
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {votes.map((vote) => (
              <VoteChamberVoteCard key={vote.voteId} vote={vote} />
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
  );
}
