import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEntitySearch } from "./useEntitySearch";
import { SearchResultItem } from "./SearchResultItems";
import { EntitySearchNode } from "@/schemas/entities";
import { useHotkeys } from "react-hotkeys-hook";
import { t } from "@lingui/core/macro";
import { useGuardedBlur } from "@/lib/hooks/useGuardedBlur";
import type { EntitySelectionBehavior } from "@/lib/entity-navigation";

interface EntitySearchInputProps {
    className?: string;
    placeholder?: string;
    onSelect?: (entity: EntitySearchNode) => void;
    selectionBehavior?: EntitySelectionBehavior;
    entitySearchFilter?: {
        isUat?: boolean;
        excludeCounty?: boolean;
    };
    autoFocus?: boolean;
    /** When true, scroll the input into view (top) on focus. Useful for mobile UX. */
    scrollToTopOnFocus?: boolean;
    renderResultTrailing?: (entity: EntitySearchNode) => ReactNode;
}

export function EntitySearchInput({
    className,
    placeholder = t`Search entities by name or CUI...`,
    onSelect,
    selectionBehavior = 'navigate-to-entity',
    entitySearchFilter,
    autoFocus,
    scrollToTopOnFocus,
    renderResultTrailing,
}: EntitySearchInputProps) {
    const {
        searchTerm,
        setSearchTerm,
        results,
        isLoading,
        isError,
        isDropdownOpen,
        openDropdown,
        closeDropdown,
        activeIndex,
        handleClearSearch,
        handleSelection,
        handleKeyDown,
        debouncedSearchTerm,
        id: searchId,
    } = useEntitySearch({ onSelect, selectionBehavior, entitySearchFilter });

    const { containerRef, onBlur } = useGuardedBlur<HTMLDivElement>(closeDropdown);
    const inputRef = useRef<HTMLInputElement>(null);

    useHotkeys("mod+k", (e) => {
        e.preventDefault();
        inputRef.current?.focus();
    });

    const showDropdown = isDropdownOpen && debouncedSearchTerm.trim().length > 2;
    const activeDescendantId = activeIndex > -1 ? `${searchId}-result-${activeIndex}` : undefined;

    useEffect(() => {
        if (!autoFocus) {
            return;
        }

        inputRef.current?.focus();
    }, [autoFocus]);

    return (
        <div
            ref={containerRef}
            className={cn("relative w-full max-w-3xl pt-8 mx-auto", className)}
            // When focus leaves the component, close the dropdown (guarded for iOS tap ordering)
            onFocus={() => {
                if (scrollToTopOnFocus) {
                    // Ensure the input is visible and near the top of the viewport on mobile
                    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                openDropdown();
            }}
            onBlur={onBlur}
        >
            <div className="relative">
                <Search aria-hidden="true" className="absolute left-5 sm:left-7 top-1/2 h-6 w-6 sm:h-8 sm:w-8 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        openDropdown();
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={openDropdown}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    // ARIA attributes for accessibility
                    role="combobox"
                    aria-label={placeholder}
                    aria-autocomplete="list"
                    aria-expanded={showDropdown}
                    aria-controls={`${searchId}-listbox`}
                    aria-activedescendant={activeDescendantId}
                    className={cn(
                        "w-full py-7 pl-14 pr-4 text-base bg-white dark:bg-slate-800 rounded-3xl placeholder:text-slate-400 shadow-sm hover:shadow-md focus:shadow-lg transition-shadow duration-300 border-slate-300 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-600 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-600 sm:px-20 md:text-xl",
                        searchTerm ? "pr-16 sm:pr-20" : undefined,
                    )}
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => {
                            handleClearSearch();
                            inputRef.current?.focus();
                        }}
                        className="absolute right-7 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        aria-label={t`Clear search`}
                    >
                        <X className="h-8 w-8" />
                    </button>
                )}
            </div>

            {showDropdown && (
                <div className="absolute z-20 mt-3 w-full bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-700 shadow-2xl rounded-3xl max-h-[65vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="p-6 flex items-center justify-center text-slate-500 dark:text-slate-400">
                            <Loader2 className="h-7 w-7 animate-spin mr-4" />
                            <span className="text-xl">Searching...</span>
                        </div>
                    ) : isError ? (
                        <div className="p-6 text-xl text-red-500 text-center">
                            Error fetching results. Please try again.
                        </div>
                    ) : results.length > 0 ? (
                        <ul id={`${searchId}-listbox`} role="listbox" className="py-2 divide-y divide-slate-100 dark:divide-slate-700">
                            {results.map((entity, index) => (
                                <SearchResultItem
                                    key={entity.cui}
                                    id={`${searchId}-result-${index}`}
                                    entity={entity}
                                    isActive={activeIndex === index}
                                    selectionBehavior={selectionBehavior}
                                    trailingContent={renderResultTrailing?.(entity)}
                                    onClick={(e) => {
                                        // Allow browser default for new-tab/window gestures
                                        if (e.metaKey || e.ctrlKey) {
                                            handleSelection(index, { skipNavigate: true });
                                            return;
                                        }
                                        e.preventDefault();
                                        handleSelection(index);
                                    }}
                                />
                            ))}
                        </ul>
                    ) : (
                        <div className="p-6 text-xl text-slate-500 dark:text-slate-400 text-center">
                            No entities found for "<strong>{debouncedSearchTerm}</strong>".
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
