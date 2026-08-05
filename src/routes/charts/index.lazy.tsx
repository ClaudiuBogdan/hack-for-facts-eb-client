import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, Plus, Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChartCategory, StoredChart, getChartsStore } from "@/components/charts/chartsStore";
import { ChartList } from "@/components/charts/components/chart-list/ChartList";
import { cn, slugify } from "@/lib/utils";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { ChartCategories } from "@/components/charts/components/chart-categories/ChartCategories";
import ChartsBackupRestore from "@/components/charts/components/backup-restore/ChartsBackupRestore";
import { getSiteUrl } from "@/config/env";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { FloatingQuickNav } from "@/components/ui/FloatingQuickNav";
import { createDefaultExecutionYearReportPeriod } from "@/schemas/charts";

export const Route = createLazyFileRoute("/charts/")({
  component: ChartsListPage,
});

// Get store lazily on first use to avoid SSR issues
const getStore = () => getChartsStore();

type SortOption = "newest" | "oldest" | "a-z" | "z-a" | "favorites-first";

type ActiveTab = "all" | "favorites" | `category:${string}`;

function ChartsListPage() {
  const [charts, setCharts] = useState<StoredChart[]>(() =>
    getStore().loadSavedCharts({ filterDeleted: true, sort: true })
  );
  const [search, setSearch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [sortBy, setSortBy] = usePersistedState<SortOption>("charts-page-sort-by", "newest");
  const [categories, setCategories] = useState<readonly ChartCategory[]>(() => getStore().loadCategories());
  //

  const handleDeleteChart = useCallback(async (chartId: string) => {
    try {
      await getStore().deleteChart(chartId);
      setCharts((previousCharts) => previousCharts.filter((chart) => chart.id !== chartId));
      toast.success("Chart deleted");
    } catch (error) {
      console.error("Failed to delete chart:", error);
      toast.error("Failed to delete the chart. Please try again.");
    }
  }, []);

  const handleToggleFavorite = useCallback((chartId: string) => {
    getStore().toggleChartFavorite(chartId);
    setCharts((previousCharts) => {
      const chartBeforeToggle = previousCharts.find((c) => c.id === chartId);
      const updatedCharts = previousCharts.map((chart) =>
        chart.id === chartId ? { ...chart, favorite: !chart.favorite } : chart
      );
      toast.success(
        chartBeforeToggle?.favorite ? "Removed from Favorites" : "Added to Favorites"
      );
      return updatedCharts;
    });
  }, []);

  useEffect(() => {
    const reloadFromStorage = () => {
      setCharts(getStore().loadSavedCharts({ filterDeleted: true, sort: true }));
      setCategories(getStore().loadCategories());
    };
    window.addEventListener("storage", reloadFromStorage);
    return () => window.removeEventListener("storage", reloadFromStorage);
  }, []);

  // Backup/Restore moved into ChartsBackupRestore component

  const totalCount = charts.length;
  const favoritesCount = useMemo(
    () => charts.filter((chart) => chart.favorite).length,
    [charts]
  );

  const baseFilteredSortedCharts = useMemo(() => {
    const rawQuery = search.trim();
    const hashtagMatches = Array.from(rawQuery.matchAll(/#([\p{L}\p{N}_-]+)/gu)).map((m) =>
      slugify(m[1])
    );
    const queryText = rawQuery.replace(/#([\p{L}\p{N}_-]+)/gu, " ").trim().toLowerCase();

    const byQuery = (c: StoredChart) => {
      const textMatch =
        queryText.length === 0 ||
        c.title.toLowerCase().includes(queryText) ||
        (c.description ?? "").toLowerCase().includes(queryText);

      if (hashtagMatches.length === 0) return textMatch;

      const chartCategorySlugs = (c.categories ?? [])
        .map((id) => categories.find((cat) => cat.id === id)?.name)
        .filter(Boolean)
        .map((name) => slugify(name as string));

      const tagsMatch = hashtagMatches.every((t) =>
        chartCategorySlugs.some((slug) => slug.startsWith(t))
      );

      return textMatch && tagsMatch;
    };

    const sorted = (input: readonly StoredChart[]): StoredChart[] => {
      const arr = [...input];
      switch (sortBy) {
        case "oldest":
          return arr.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
        case "a-z":
          return arr.sort((a, b) => a.title.localeCompare(b.title));
        case "z-a":
          return arr.sort((a, b) => b.title.localeCompare(a.title));
        case "favorites-first":
          return arr.sort((a, b) => Number(b.favorite) - Number(a.favorite));
        case "newest":
        default:
          return arr.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      }
    };

    return sorted(charts.filter(byQuery));
  }, [charts, search, sortBy, categories]);

  const filteredAllCharts = baseFilteredSortedCharts;
  const filteredFavoriteCharts = useMemo(
    () => baseFilteredSortedCharts.filter((c) => c.favorite),
    [baseFilteredSortedCharts]
  );

  const handleToggleChartCategory = useCallback((chartId: string, categoryId: string) => {
    getStore().toggleChartCategory(chartId, categoryId);
    setCharts((prev) => prev.map((c) => c.id === chartId ? { ...c, categories: (c.categories ?? []).includes(categoryId) ? (c.categories ?? []).filter((id) => id !== categoryId) : [...(c.categories ?? []), categoryId] } : c));
  }, []);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <FloatingQuickNav
        mapViewType="UAT"
        mapActive
        tableActive
        filterInput={{
          entity_cuis: [],
          uat_ids: [],
          county_codes: [],
          report_period: createDefaultExecutionYearReportPeriod(),
          account_category: 'ch',
          normalization: 'total',
        }}
      />
      {/* Head handled by Route.head */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6 md:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
              <BarChart3 className="h-8 w-8 md:h-10 md:w-10 text-primary" />
              <Trans>Charts</Trans>
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              <Trans>Build and manage custom visualizations of public spending data.</Trans>
            </p>
            <div className="flex gap-2 pt-1">
              <Badge variant="secondary">{totalCount} <Trans>total</Trans></Badge>
              {favoritesCount > 0 ? (
                <Badge variant="success">{favoritesCount} <Trans>favorites</Trans></Badge>
              ) : null}
            </div>
          </div>
          {/* `flex-wrap`: the outer wrapper stacks at `md`, but this row's own
              contents (two backup/restore buttons plus the `size="lg"` CTA)
              still measure ~575px, which pushed "Create chart" off-screen at
              390px wide. */}
          <div className="flex flex-wrap items-center gap-2">
            <ChartsBackupRestore onAfterImport={() => {
              setCharts(getStore().loadSavedCharts({ filterDeleted: true, sort: true }));
              setCategories(getStore().loadCategories());
            }} />
            <Link to="/charts/new" replace={false}>
              <Button size="lg" className="text-base h-11 px-6">
                <Plus className="mr-2 h-5 w-5" />
                <Trans>Create chart</Trans>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="relative w-full md:max-w-lg">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder={t`Search charts…`}
            className="pl-9"
            aria-label={t`Search charts`}
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t`Sort by`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t`Newest`}</SelectItem>
              <SelectItem value="oldest">{t`Oldest`}</SelectItem>
              <SelectItem value="a-z">{t`Title A–Z`}</SelectItem>
              <SelectItem value="z-a">{t`Title Z–A`}</SelectItem>
              <SelectItem value="favorites-first">{t`Favorites first`}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2"><Trans>No charts yet</Trans></h3>
          <p className="text-muted-foreground mb-6"><Trans>Create your first chart to start visualizing public spending data.</Trans></p>
          <Link to="/charts/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <Trans>Create your first chart</Trans>
            </Button>
          </Link>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ActiveTab)}
          className="space-y-4"
        >
          <div className="max-w-full overflow-x-auto hide-scrollbar">
            <TabsList className="inline-flex items-center gap-1 whitespace-nowrap h-8 bg-muted/30 p-1 rounded-md min-w-max">
              <TabsTrigger className={cn("h-7 px-2 text-xs", activeTab === "all" && "bg-background border shadow-md data-[state=active]:bg-background data-[state=active]:border data-[state=active]:shadow-md")} value="all"><Trans>All</Trans></TabsTrigger>
              <TabsTrigger className={cn("h-7 px-2 text-xs", activeTab === "favorites" && "bg-background border shadow-md data-[state=active]:bg-background data-[state=active]:border data-[state=active]:shadow-md")} value="favorites" disabled={favoritesCount === 0}>
                <Trans>Favorites</Trans>
              </TabsTrigger>
              <ChartCategories
                categories={categories}
                activeTab={activeTab}
                onChangeActiveTab={(tab) => setActiveTab(tab)}
                onCategoriesChange={(next) => setCategories(next)}
                refreshCharts={() => setCharts(getStore().loadSavedCharts({ filterDeleted: true, sort: true }))}
              />
            </TabsList>
          </div>

          <TabsContent value="all">
            {filteredAllCharts.length === 0 ? (
              <div className="text-center py-12">
                <h4 className="text-lg font-medium mb-1"><Trans>No results</Trans></h4>
                <p className="text-muted-foreground"><Trans>Try a different search term or sorting.</Trans></p>
              </div>
            ) : (
              <ChartList
                charts={filteredAllCharts}
                onDelete={handleDeleteChart}
                onToggleFavorite={handleToggleFavorite}
                categories={categories}
                onToggleCategory={handleToggleChartCategory}
                onOpenCategory={(categoryId) => setActiveTab(`category:${categoryId}`)}
              />
            )}
          </TabsContent>

          <TabsContent value="favorites">
            {filteredFavoriteCharts.length === 0 ? (
              <div className="text-center py-12">
                <h4 className="text-lg font-medium mb-1"><Trans>No favorites yet</Trans></h4>
                <p className="text-muted-foreground"><Trans>Mark charts as favorites to quickly find them here.</Trans></p>
              </div>
            ) : (
              <ChartList
                charts={filteredFavoriteCharts}
                onDelete={handleDeleteChart}
                onToggleFavorite={handleToggleFavorite}
                categories={categories}
                onToggleCategory={handleToggleChartCategory}
                onOpenCategory={(categoryId) => setActiveTab(`category:${categoryId}`)}
              />
            )}
          </TabsContent>

          {categories.map((cat) => {
            const chartsInCat = baseFilteredSortedCharts.filter((c) => (c.categories ?? []).includes(cat.id));
            return (
              <TabsContent key={cat.id} value={`category:${cat.id}`}>
                {chartsInCat.length === 0 ? (
                  <div className="text-center py-12">
                    <h4 className="text-lg font-medium mb-1"><Trans>No charts in “{cat.name}”</Trans></h4>
                    <p className="text-muted-foreground"><Trans>Use the tag menu on a chart card to add it to this category.</Trans></p>
                  </div>
                ) : (
                  <ChartList
                    charts={chartsInCat}
                    onDelete={handleDeleteChart}
                    onToggleFavorite={handleToggleFavorite}
                    categories={categories}
                    onToggleCategory={handleToggleChartCategory}
                    onOpenCategory={(categoryId) => setActiveTab(`category:${categoryId}`)}
                  />
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Category dialogs and triggers moved into ChartCategories to avoid rerenders of the list when typing */}
    </div>
  );
}

function buildChartsListHead() {
  const site = getSiteUrl()
  const canonical = `${site}/charts/`
  const title = 'Saved charts – Transparenta.eu'
  const description = 'Manage and search your locally saved charts. Create, favorite, categorize, and share your visualizations.'
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'og:title', content: title },
      { name: 'og:description', content: description },
      { name: 'og:url', content: canonical },
      { name: 'canonical', content: canonical },
    ],
  }
}

export function head() {
  return buildChartsListHead()
}

// Category triggers and dialogs moved to ChartCategories component
