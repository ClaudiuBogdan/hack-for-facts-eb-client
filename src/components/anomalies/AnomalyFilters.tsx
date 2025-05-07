import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, Search, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AnomalyFilter, useAnomalyFilters } from "@/stores/anomalyFilters";
import { getUniqueCategories } from "@/lib/api/anomalies";

export function AnomalyFilters() {
  const { filters, setFilter, resetFilters } = useAnomalyFilters();
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const uniqueCategories = getUniqueCategories();
    setCategories(uniqueCategories);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter("searchQuery", e.target.value);
  };

  const handleStatusChange = (value: string) => {
    setFilter("status", value as AnomalyFilter["status"]);
  };

  const handleSeverityChange = (value: string) => {
    setFilter("severity", value as AnomalyFilter["severity"]);
  };

  const handleFromDateChange = (date: Date | undefined) => {
    setFilter("dateRange", {
      ...filters.dateRange,
      from: date || null,
    });
  };

  const handleToDateChange = (date: Date | undefined) => {
    setFilter("dateRange", {
      ...filters.dateRange,
      to: date || null,
    });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.category.includes(category)
      ? filters.category.filter((c) => c !== category)
      : [...filters.category, category];

    setFilter("category", newCategories);
  };

  const clearFilters = () => {
    resetFilters();
  };

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.severity !== "all" ||
    filters.dateRange.from !== null ||
    filters.dateRange.to !== null ||
    filters.searchQuery !== "" ||
    filters.category.length > 0;

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            size="sm"
            className="h-8 gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search anomalies..."
          className="pl-8"
          value={filters.searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Severity</Label>
        <Select value={filters.severity} onValueChange={handleSeverityChange}>
          <SelectTrigger>
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Date Range</Label>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal w-[120px]",
                  !filters.dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.from ? (
                  format(filters.dateRange.from, "PP")
                ) : (
                  <span>From</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.dateRange.from || undefined}
                onSelect={handleFromDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal w-[120px]",
                  !filters.dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.to ? (
                  format(filters.dateRange.to, "PP")
                ) : (
                  <span>To</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.dateRange.to || undefined}
                onSelect={handleToDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Categories</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={
                filters.category.includes(category) ? "default" : "outline"
              }
              className="cursor-pointer"
              onClick={() => toggleCategory(category)}
            >
              {filters.category.includes(category) && (
                <Check className="mr-1 h-3 w-3" />
              )}
              {category}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
