import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ParliamentGroupsSearch } from "@/schemas/parliament";
import { useParliamentMembers } from "../hooks/use-parliament-data";
import { ChamberCompositionSection } from "./chamber-composition-section";
import { MembersFilters } from "./members-filters";
import { MembersTable, MembersTableSkeleton } from "./members-table";
import { ParliamentGroupsFloatingBar } from "./parliament-groups-floating-bar";
import { ParliamentInlineLoadError } from "./parliament-load-error-page";
import { DEFAULT_MEMBERS_PAGE_SIZE } from "../lib/table-theme";

type Props = {
  readonly search: ParliamentGroupsSearch;
};

/** Groups tab — members directory and hemicycle composition charts */
export function ParliamentGroupsContent({ search }: Props) {
  const navigate = useNavigate({ from: "/parlament/" });
  const { data, isLoading, isError, refetch } = useParliamentMembers(search);
  const filtersAnchorRef = useRef<HTMLDivElement>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [findRepOpen, setFindRepOpen] = useState(false);

  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    if (search.find !== "1" && search.find !== 1) return;

    setFindRepOpen(true);
    const { find: _find, ...restSearch } = searchRef.current;
    void navigate({
      search: {
        ...restSearch,
        tab: "grupuri",
      },
      replace: true,
      resetScroll: false,
    });
  }, [navigate, search.find]);

  const handleSearchChange = (next: ParliamentGroupsSearch) => {
    void navigate({
      search: {
        ...next,
        tab: "grupuri",
        find: undefined,
      },
      replace: true,
      resetScroll: false,
    });
  };

  const handlePageChange = (page: number) => {
    void navigate({
      search: {
        ...search,
        tab: "grupuri",
        page,
      },
      replace: true,
      resetScroll: false,
    });
  };

  const handleClearFilters = () => {
    void navigate({
      search: {
        tab: "grupuri",
        page: 1,
      },
      replace: true,
      resetScroll: false,
    });
  };

  return (
    <>
      <ParliamentGroupsFloatingBar
        anchorRef={filtersAnchorRef}
        search={search}
        onSearchChange={handleSearchChange}
        onClearAll={handleClearFilters}
        onOpenFilters={() => setFilterSheetOpen(true)}
        onFindRep={() => setFindRepOpen(true)}
      />

      <div className="space-y-8">
        <section id="membri" className="scroll-mt-8 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="h-10 w-1.5 bg-[var(--pnrr-blue)]" aria-hidden />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <h2 className="text-2xl font-black leading-none tracking-tight text-[var(--pnrr-fg)]">
                  Membri
                </h2>
                {data ? (
                  <span className="text-sm text-[var(--pnrr-muted)]">
                    {data.total.toLocaleString("ro-RO")} membri
                    {data.totalPages > 1
                      ? ` · pagina ${data.page} din ${data.totalPages}`
                      : ""}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div ref={filtersAnchorRef}>
            <MembersFilters
              search={search}
              onSearchChange={handleSearchChange}
              filterSheetOpen={filterSheetOpen}
              onFilterSheetOpenChange={setFilterSheetOpen}
              findRepOpen={findRepOpen}
              onFindRepOpenChange={setFindRepOpen}
            />
          </div>

          {isLoading ? (
            <MembersTableSkeleton
              rowCount={search.pageSize ?? DEFAULT_MEMBERS_PAGE_SIZE}
            />
          ) : isError ? (
            <ParliamentInlineLoadError
              title="Lista parlamentarilor nu a putut fi încărcată"
              description="Serviciul de date nu a răspuns. Reîncearcă înainte de a concluziona că nu există membri pentru filtrele alese."
              onRetry={() => void refetch()}
            />
          ) : data ? (
            <MembersTable
              page={data}
              search={search}
              onPageChange={handlePageChange}
              onClearFilters={handleClearFilters}
            />
          ) : (
            <MembersTable
              page={{
                members: [],
                total: 0,
                page: 1,
                pageSize: DEFAULT_MEMBERS_PAGE_SIZE,
                totalPages: 1,
              }}
              search={search}
              onPageChange={handlePageChange}
              onClearFilters={handleClearFilters}
            />
          )}
        </section>

        <ChamberCompositionSection chamber="camera" search={search} />
        <ChamberCompositionSection chamber="senat" search={search} />
      </div>
    </>
  );
}
