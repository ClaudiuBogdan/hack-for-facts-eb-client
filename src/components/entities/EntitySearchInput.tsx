import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { searchEntities } from "@/lib/api/entities";
import { EntitySearchNode } from "@/schemas/entities";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { Search, X, Loader2, ExternalLink, MapPin } from "lucide-react";

interface EntitySearchInputProps {
  className?: string;
  inputContainerClassName?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  placeholder?: string;
  onResultClick?: () => void;
}

export function EntitySearchInput({
  className,
  inputContainerClassName,
  inputClassName,
  dropdownClassName,
  placeholder = "Search entities by name or CUI...",
  onResultClick,
}: EntitySearchInputProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 500);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { 
    data: results,
    isLoading,
    isError,
  } = useQuery<EntitySearchNode[], Error>({
    queryKey: ["entitySearch", debouncedSearchTerm],
    queryFn: () => searchEntities(debouncedSearchTerm, 10),
    enabled: !!debouncedSearchTerm && debouncedSearchTerm.trim().length > 0,
  });

  const handleClearSearch = () => {
    setSearchTerm("");
    inputRef.current?.focus();
  };

  const showDropdown = isFocused && debouncedSearchTerm.trim().length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-3xl mx-auto", className)}>
      <div 
        className={cn(
            "relative rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out",
            "ring-2 ring-transparent",
            isFocused && "ring-primary-focus shadow-2xl",
            inputContainerClassName
        )}
      >
        <Search className="absolute left-7 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className={cn(
            "w-full pl-20 pr-20 py-7 text-xl md:text-xl bg-white dark:bg-slate-800 rounded-3xl placeholder:text-slate-400",
            "focus:outline-none focus:ring-0 border-transparent focus:border-transparent",
            inputClassName
          )}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-7 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-8 w-8" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div 
          className={cn(
            "absolute z-20 mt-3 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-3xl",
            "max-h-[65vh] overflow-y-auto",
            dropdownClassName
          )}
        >
          {isLoading && (
            <div className="p-6 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin mr-4" />
              <span className="text-xl">Searching...</span>
            </div>
          )}
          {isError && (
            <div className="p-6 text-xl text-red-500 text-center">
              Unable to fetch results. Please try again.
            </div>
          )}
          {!isLoading && !isError && (!results || results.length === 0) && (
            <div className="p-6 text-xl text-slate-500 dark:text-slate-400 text-center">
              No entities found for "<strong>{debouncedSearchTerm}</strong>".
            </div>
          )}
          {!isLoading && !isError && results && results.length > 0 && (
            <ul className="py-2 divide-y divide-slate-100 dark:divide-slate-700">
              {results.map((entity) => (
                <li key={entity.cui}>
                  <Link
                    to="/entities/$cui"
                    params={{ cui: entity.cui }}
                    className={cn(
                        "block w-full px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 focus:bg-slate-50 dark:focus:bg-slate-700 focus:outline-none transition-colors group"
                    )}
                    onClick={() => {
                      setIsFocused(false);
                      setSearchTerm("");
                      if (onResultClick) onResultClick();
                    }}
                  >
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col mr-4 min-w-0">
                            <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary dark:group-hover:text-primary-focus transition-colors truncate">
                                {entity.name}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 text-left">
                                CUI: {entity.cui}
                            </div>
                            {entity.uat?.county_name && (
                                <div className="mt-0.5 flex items-center text-xs text-slate-400 dark:text-slate-500">
                                    <MapPin className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                                    {entity.uat.county_name}
                                </div>
                            )}
                        </div>
                        <ExternalLink className="h-5 w-5 text-slate-400 dark:text-slate-500 group-hover:text-primary dark:group-hover:text-primary-focus transition-colors flex-shrink-0" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
} 