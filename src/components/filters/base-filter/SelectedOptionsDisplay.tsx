import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { X as XIcon, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { OptionItem } from "./interfaces";

// Number of badges to show before collapsing into "+X more"
const VISIBLE_BADGES_COUNT = 1;
// Threshold to trigger the "show more/less" behavior.
// The view will be compact if selected.length > MIN_ITEMS_FOR_COMPACT_VIEW
const MIN_ITEMS_FOR_COMPACT_VIEW = VISIBLE_BADGES_COUNT + 1;

interface SelectedOptionsDisplayProps {
    selectedOptions: OptionItem[];
    toggleSelect: (option: OptionItem) => void;
    clearSelection: () => void;
    showAllSelected: boolean;
    setShowAllSelected: (show: boolean) => void;
    className?: string;
}

export function SelectedOptionsDisplay({
    selectedOptions: selected,
    toggleSelect,
    clearSelection,
    showAllSelected,
    setShowAllSelected,
    className,
}: SelectedOptionsDisplayProps) {
    // Determine if the compact view (e.g., "Item 1, +5 more") should be shown
    const shouldShowCompactBadgeSummary = selected.length > MIN_ITEMS_FOR_COMPACT_VIEW && !showAllSelected;
    // Items to display in the compact summary (e.g., just the first item)
    const itemsToShowInCompactSummary = selected.slice(0, VISIBLE_BADGES_COUNT);
    // The count for the "+X more" badge
    const remainingCountForCompactBadge = selected.length - VISIBLE_BADGES_COUNT;

    if (selected.length === 0) {
        return null;
    }

    return (
        <div className={cn("px-4 pt-3 w-full", className)}> {/* Added pt-3 for consistency */}
            <div className={cn("flex items-center justify-between mb-2 min-h-[28px]")}>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Selected ({selected.length})
                </span>
                <div className="flex items-center gap-2">
                    {selected.length > MIN_ITEMS_FOR_COMPACT_VIEW && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllSelected(!showAllSelected)}
                            className={cn("h-auto py-1 px-2 text-xs")}
                            aria-live="polite"
                        >
                            {showAllSelected ? (
                                <ChevronUp className="w-3 h-3 mr-1" />
                            ) : (
                                <ChevronDown className="w-3 h-3 mr-1" />
                            )}
                            {showAllSelected ? "Show less" : "Show all"}
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSelection}
                        className={cn("h-auto py-1 px-2 text-xs")}
                    >
                        <XIcon className="w-3 h-3 mr-1" /> Clear All
                    </Button>
                </div>
            </div>

            {shouldShowCompactBadgeSummary ? (
                <div className={cn("flex items-center gap-2")}>
                    {itemsToShowInCompactSummary.map((option) => (
                        <Badge
                            key={option.id}
                            variant="secondary"
                            className={cn("flex items-center gap-1.5 py-1 pl-2.5 pr-1 text-sm")}
                        >
                            <span className="truncate max-w-[100px] block" title={option.label}>
                                {option.label}
                            </span>
                            <button
                                onClick={() => toggleSelect(option)}
                                className={cn(
                                    "rounded-full text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 p-0.5",
                                    "focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1"
                                )}
                                aria-label={`Remove ${option.label}`}
                            >
                                <XIcon className="w-3.5 h-3.5" />
                            </button>
                        </Badge>
                    ))}
                    {remainingCountForCompactBadge > 0 && (
                        <Badge
                            variant="outline"
                            className={cn("py-1 px-2.5 text-sm cursor-pointer hover:bg-accent")}
                            onClick={() => setShowAllSelected(true)}
                            title={`Show ${remainingCountForCompactBadge} more selected items`}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowAllSelected(true); }}
                        >
                            +{remainingCountForCompactBadge} more
                        </Badge>
                    )}
                </div>
            ) : (
                <ScrollArea className={cn("w-full whitespace-nowrap")}>
                    <div className={cn("flex gap-2 pb-2")}>
                        {selected.map((option) => (
                            <Badge
                                key={option.id}
                                variant="secondary"
                                className={cn(
                                    "flex items-center gap-1.5 py-1 pl-2.5 pr-1 text-sm relative group"
                                )}
                            >
                                <span className="truncate max-w-[150px] block" title={option.label}>
                                    {option.label}
                                </span>
                                <button
                                    onClick={() => toggleSelect(option)}
                                    className={cn(
                                        "rounded-full text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 p-0.5",
                                        "focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 focus:z-10"
                                    )}
                                    aria-label={`Remove ${option.label}`}
                                >
                                    <XIcon className="w-3.5 h-3.5" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            )}
        </div>
    );
}
