import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ParliamentGroupsSearch } from "@/schemas/parliament";
import { useParliamentMembers } from "../hooks/use-parliament-data";
import { ChamberCompositionSection } from "./chamber-composition-section";
import { MembersFilters } from "./members-filters";
import { ParliamentListHeader } from "./parliament-list-surface";
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
          {/* The count used to ride on this heading; it is the same fact the
              pager states at the foot of the table, where it answers a question
              the reader actually has by then. */}
          <ParliamentListHeader
            title="Parlamentari"
            description="Deputații și senatorii, cu grupul din care fac parte și județul pe care îl reprezintă."
          />

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
