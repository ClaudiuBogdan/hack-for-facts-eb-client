import { FilterTag } from "@/components/ui/filter-tag";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FilterItem = {
  key: string;
  label: string;
  value: string;
  id?: string; // Optional ID for cases where we need to identify specific items in arrays
};

export type ActiveFiltersBarProps = {
  filters: FilterItem[];
  onRemoveFilter: (key: string, id?: string) => void;
  onClearFilters: () => void;
  className?: string;
};

export function ActiveFiltersBar({
  filters,
  onRemoveFilter,
  onClearFilters,
  className,
}: ActiveFiltersBarProps) {
  if (filters.length === 0) return null;

  return (
    <div
      className={cn(
        "relative flex items-center py-2 px-4 bg-card border border-border rounded-md",
        className
      )}
    >
      {/* Scrollable container for filter tags */}
      <div className="flex flex-1 hide-scrollbar pr-32">
        <div className="flex gap-2 flex-nowrap">
          {filters.map((filter) => (
            <FilterTag
              key={filter.id ? `${filter.key}-${filter.id}` : filter.key}
              label={filter.label}
              value={filter.value}
              onRemove={() => onRemoveFilter(filter.key, filter.id)}
              className="flex-none whitespace-nowrap overflow-hidden text-ellipsis"
            />
          ))}
        </div>
      </div>
      {/* "Clear All" button always visible on the right */}
      <div className="absolute right-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-7 text-xs gap-1 px-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Clear All
        </Button>
      </div>
      {/* Gradient fade to indicate scroll overflow */}
      <div className="absolute right-32 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-card to-transparent" />
    </div>
  );
}
