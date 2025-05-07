import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Check,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DataDiscoveryFilter,
  useDataDiscoveryFilters,
} from "@/stores/dataDiscoveryFilters";
import {
  getUniqueCounties,
  getUniqueEconomicCategories,
  getUniqueFunctionalCategories,
} from "@/lib/api/dataDiscovery";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AIFilterGenerator } from "./AIFilterGenerator";

export function DataDiscoveryFilters() {
  const { filters, setFilter, resetFilters } = useDataDiscoveryFilters();
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [isAIFilterOpen, setIsAIFilterOpen] = useState(false);

  const { data: counties = [], isLoading: isLoadingCounties } = useQuery({
    queryKey: ["counties"],
    queryFn: getUniqueCounties,
  });

  const {
    data: functionalCategories = [],
    isLoading: isLoadingFunctionalCategories,
  } = useQuery({
    queryKey: ["functionalCategories"],
    queryFn: getUniqueFunctionalCategories,
  });

  const {
    data: economicCategories = [],
    isLoading: isLoadingEconomicCategories,
  } = useQuery({
    queryKey: ["economicCategories"],
    queryFn: getUniqueEconomicCategories,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter("searchQuery", e.target.value);
  };

  const handleSortByChange = (value: string) => {
    setFilter("sortBy", value as DataDiscoveryFilter["sortBy"]);
  };

  const handleSortOrderChange = (value: string) => {
    setFilter("sortOrder", value as DataDiscoveryFilter["sortOrder"]);
  };

  const handleYearRangeChange = (values: number[]) => {
    setFilter("yearRange", {
      from: values[0],
      to: values[1],
    });
  };

  const handleAmountRangeChange = (values: number[]) => {
    setFilter("amountRange", {
      min: values[0],
      max: values[1],
    });
  };

  const toggleCounty = (code: string) => {
    const newCounties = filters.counties.includes(code)
      ? filters.counties.filter((c) => c !== code)
      : [...filters.counties, code];

    setFilter("counties", newCounties);
  };
  

  const toggleFunctionalCategory = (code: string) => {
    const newCategories = filters.functionalCategory.includes(code)
      ? filters.functionalCategory.filter((c) => c !== code)
      : [...filters.functionalCategory, code];

    setFilter("functionalCategory", newCategories);
  };

  const toggleEconomicCategory = (code: string) => {
    const newCategories = filters.economicCategory.includes(code)
      ? filters.economicCategory.filter((c) => c !== code)
      : [...filters.economicCategory, code];

    setFilter("economicCategory", newCategories);
  };

  const clearFilters = () => {
    resetFilters();
  };

  const hasActiveFilters =
    filters.counties.length > 0 ||
    filters.uats.length > 0 ||
    filters.functionalCategory.length > 0 ||
    filters.economicCategory.length > 0 ||
    filters.searchQuery !== "" ||
    filters.amountRange.min !== null ||
    filters.amountRange.max !== null ||
    filters.yearRange.from !== new Date().getFullYear() - 1 ||
    filters.yearRange.to !== new Date().getFullYear();

  const toggleAdvancedFilters = () => {
    setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen);
  };

  const isLoading =
    isLoadingCounties ||
    isLoadingFunctionalCategories ||
    isLoadingEconomicCategories;

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Data Filters</h3>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              size="sm"
              className="h-8 gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            onClick={toggleAdvancedFilters}
            size="sm"
            className={cn("h-8 gap-1", isAdvancedFiltersOpen && "bg-secondary")}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {isAdvancedFiltersOpen ? "Basic" : "Advanced"}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search entities, categories..."
          className="pl-8 pr-10"
          value={filters.searchQuery}
          onChange={handleSearchChange}
        />
        <Dialog open={isAIFilterOpen} onOpenChange={setIsAIFilterOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8"
              title="Use AI to generate filters"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <AIFilterGenerator
              onClose={() => setIsAIFilterOpen(false)}
              initialPrompt={filters.searchQuery}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        <Label>Sort By</Label>
        <div className="grid grid-cols-2 gap-2">
          <Select value={filters.sortBy} onValueChange={handleSortByChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sortOrder}
            onValueChange={handleSortOrderChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Counties</Label>
            {isLoadingCounties && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {counties.map((county) => (
              <Badge
                key={county.code}
                variant={
                  filters.counties.includes(county.code) ? "default" : "outline"
                }
                className="cursor-pointer"
                onClick={() => toggleCounty(county.code)}
              >
                {filters.counties.includes(county.code) && (
                  <Check className="mr-1 h-3 w-3" />
                )}
                {county.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Year Range</Label>
        <div className="pt-2 px-1">
          <Slider
            defaultValue={[
              filters.yearRange.from || new Date().getFullYear() - 1,
              filters.yearRange.to || new Date().getFullYear(),
            ]}
            max={new Date().getFullYear()}
            min={new Date().getFullYear() - 10}
            step={1}
            onValueChange={handleYearRangeChange}
            value={[
              filters.yearRange.from || new Date().getFullYear() - 1,
              filters.yearRange.to || new Date().getFullYear(),
            ]}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>
              {filters.yearRange.from || new Date().getFullYear() - 1}
            </span>
            <span>{filters.yearRange.to || new Date().getFullYear()}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Amount Range (millions)</Label>
          <div className="pt-2 px-1">
            <Slider
              defaultValue={[
                filters.amountRange.min || 0,
                filters.amountRange.max || 100000000,
              ]}
              max={100000000}
              min={0}
              step={1000000}
              onValueChange={handleAmountRangeChange}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>
                {filters.amountRange.min !== null
                  ? `${(filters.amountRange.min / 1000000).toFixed(0)}M`
                  : "0M"}
              </span>
              <span>
                {filters.amountRange.max !== null
                  ? `${(filters.amountRange.max / 1000000).toFixed(0)}M`
                  : "100M"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced filters that can be toggled */}
      {isAdvancedFiltersOpen && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Functional Categories</Label>
              {isLoadingFunctionalCategories && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {functionalCategories.map((category) => (
                <Badge
                  key={category.code}
                  variant={
                    filters.functionalCategory.includes(category.code)
                      ? "default"
                      : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleFunctionalCategory(category.code)}
                >
                  {filters.functionalCategory.includes(category.code) && (
                    <Check className="mr-1 h-3 w-3" />
                  )}
                  {category.code} - {category.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Economic Categories</Label>
              {isLoadingEconomicCategories && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {economicCategories.map((category) => (
                <Badge
                  key={category.code}
                  variant={
                    filters.economicCategory.includes(category.code)
                      ? "default"
                      : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleEconomicCategory(category.code)}
                >
                  {filters.economicCategory.includes(category.code) && (
                    <Check className="mr-1 h-3 w-3" />
                  )}
                  {category.code} - {category.name}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {isLoading && (
        <div className="py-2 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
          Loading filter options...
        </div>
      )}
    </div>
  );
}
