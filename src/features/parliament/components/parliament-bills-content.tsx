import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { BillSortBy, ParliamentBillsSearch } from "@/schemas/parliament";
import { useParliamentBills } from "../hooks/use-parliament-data";
import { BILL_DETAIL_INFO_BG } from "../lib/bill-detail-theme";
import { countActiveBillFilters } from "../lib/bills-filter";
import { BillListCard } from "./bill-list-card";
import { FilterTriggerButton } from "./parliament-filter-trigger-button";
import { ParliamentDebouncedSearchInput } from "./parliament-debounced-search-input";
import { ParliamentInlineLoadError } from "./parliament-load-error-page";
import {
  ParliamentBillsActiveFilters,
  ParliamentBillsFilterSheet,
  type ParliamentBillsFilterPatch,
} from "./parliament-bills-filter-sheet";
import { VotesListPagination } from "./votes-list-pagination";

const LIST_PAGE_SIZE = 10;

type Props = {
  readonly search: ParliamentBillsSearch;
};

/**
 * Hub tab content — find and browse legislative bills. PNRR-style search: one
 * debounced auto-applying input (no submit button), a compact sort dropdown,
 * and the remaining facets in a side filter sheet with removable chips. Every
 * facet change resets to page 1; the URL params stay byte-compatible with the
 * old submit-button form, so existing links keep filtering.
 */
export function ParliamentBillsContent({ search }: Props) {
  const navigate = useNavigate({ from: "/parlament/" });
  const [filterOpen, setFilterOpen] = useState(false);
  const listSearch = {
    ...search,
    tab: "proiecte" as const,
    page: search.page ?? 1,
    pageSize: search.pageSize ?? LIST_PAGE_SIZE,
  };
  const { data, isLoading, isError, refetch } = useParliamentBills(listSearch);

  const activeCount = countActiveBillFilters(search);

  const commit = (patch: ParliamentBillsFilterPatch) => {
    void navigate({
      search: {
        ...listSearch,
        ...patch,
        tab: "proiecte",
        page: 1,
      },
      replace: true,
      resetScroll: false,
    });
  };

  const handleClearAll = () =>
    commit({ q: undefined, billType: undefined, billLocation: undefined });

  const handlePageChange = (page: number) => {
    void navigate({
      search: {
        ...listSearch,
        page,
      },
      replace: true,
    });
  };

  return (
    <div className="space-y-6">
      <header className="max-w-4xl">
        <h2 className="text-2xl font-bold leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)] sm:text-[1.75rem]">
          Găsește un proiect de lege
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Caută proiecte de lege după titlu sau număr — rezultatele se
          actualizează pe măsură ce tastați. Tipul și etapa se aleg din filtre.
        </p>
      </header>

      <div
        className="border-l-4 px-5 py-4 text-sm leading-6 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]"
        style={{ backgroundColor: BILL_DETAIL_INFO_BG, borderColor: "#512178" }}
      >
        Pentru informații oficiale despre proiectele de lege, consultați{" "}
        <a
          href="https://www.cdep.ro/pls/legis/legis_pck.home"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2"
        >
          Camera Deputaților
        </a>{" "}
        și{" "}
        <a
          href="https://www.senat.ro/Legis/lista.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2"
        >
          Senatul României
        </a>
        .
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ParliamentDebouncedSearchInput
            inputId="bills-q"
            ariaLabel="Caută proiecte de lege"
            placeholder="Caută după titlu sau număr (ex. PL 127/2026)…"
            value={search.q}
            onCommit={(next) => commit({ q: next })}
            className="flex-1"
          />
          <div className="flex items-center gap-3">
            <Label htmlFor="bills-sort" className="sr-only">
              Sortare
            </Label>
            <Select
              value={search.sortBy ?? "updated_desc"}
              onValueChange={(value) => commit({ sortBy: value as BillSortBy })}
            >
              <SelectTrigger
                id="bills-sort"
                className="h-11 w-52 rounded-none border-2 border-[#b1b4b6] bg-white text-sm text-[#0b0c0c] shadow-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_desc">Cele mai recente</SelectItem>
                <SelectItem value="updated_asc">Cele mai vechi</SelectItem>
                <SelectItem value="title_asc">Titlu (A–Z)</SelectItem>
                <SelectItem value="title_desc">Titlu (Z–A)</SelectItem>
              </SelectContent>
            </Select>
            <FilterTriggerButton
              activeCount={activeCount}
              onClick={() => setFilterOpen(true)}
            />
          </div>
        </div>
        <ParliamentBillsActiveFilters
          search={search}
          onChange={commit}
          onClearAll={handleClearAll}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-none" />
          ))}
        </div>
      ) : isError ? (
        <ParliamentInlineLoadError
          title="Lista proiectelor de lege nu a putut fi încărcată"
          description="Serviciul de date nu a răspuns. Niciun rezultat nu este ascuns ca și cum lista ar fi goală."
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          {data && data.total > 0 ? (
            <VotesListPagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              onPageChange={handlePageChange}
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {data?.bills.map((bill) => (
              <BillListCard key={bill.billId} bill={bill} />
            ))}
          </div>

          {data && data.total === 0 ? (
            <p className="text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Nu am găsit proiecte de lege care să corespundă criteriilor
              selectate.
            </p>
          ) : null}

          {data && data.totalPages > 1 ? (
            <VotesListPagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              onPageChange={handlePageChange}
            />
          ) : null}
        </>
      )}

      <ParliamentBillsFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        search={search}
        onChange={commit}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
