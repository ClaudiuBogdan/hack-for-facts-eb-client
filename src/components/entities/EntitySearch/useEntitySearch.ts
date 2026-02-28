import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { searchEntities } from "@/lib/api/entities";
import { EntitySearchNode } from "@/schemas/entities";
import { Analytics } from "@/lib/analytics";

interface UseEntitySearchProps {
    debounceMs?: number;
    onSelect?: (entity: EntitySearchNode) => void;
    openNotificationModal?: boolean;
    selectionBehavior?: 'navigate-to-entity' | 'callback-only';
    entitySearchFilter?: {
        isUat?: boolean;
        excludeCounty?: boolean;
    };
}

export function useEntitySearch({
    debounceMs = 500,
    onSelect,
    openNotificationModal = false,
    selectionBehavior = 'navigate-to-entity',
    entitySearchFilter,
}: UseEntitySearchProps = {}) {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const debouncedSearchTerm = useDebouncedValue(searchTerm, debounceMs);

    // Track meaningful searches (>= 3 chars) after debounce
    const lastSearchPayload = useMemo(() => ({ q: debouncedSearchTerm?.trim() ?? "" }), [debouncedSearchTerm]);

    const {
        data: results = [],
        isLoading,
        isError,
    } = useQuery<EntitySearchNode[], Error>({
        queryKey: ["entitySearch", debouncedSearchTerm, entitySearchFilter?.isUat, entitySearchFilter?.excludeCounty],
        queryFn: () => searchEntities(debouncedSearchTerm, 8, entitySearchFilter),
        enabled: !!debouncedSearchTerm && debouncedSearchTerm.trim().length > 2,
    });

    useEffect(() => {
        const q = lastSearchPayload.q;
        if (!q || q.length < 3) return;
        Analytics.capture(Analytics.EVENTS.EntitySearchPerformed, {
            query_len: q.length,
            results_count: results?.length ?? 0,
            has_results: (results?.length ?? 0) > 0,
        });
    }, [lastSearchPayload, results]);

    // Reset active index when results change
    useEffect(() => {
        setActiveIndex(-1);
    }, [results]);

    const openDropdown = useCallback(() => setDropdownOpen(true), []);
    const closeDropdown = useCallback(() => {
        setDropdownOpen(false);
        setActiveIndex(-1);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchTerm("");
        closeDropdown();
    }, [closeDropdown]);

    const handleSelection = useCallback((index: number, options?: { skipNavigate?: boolean }) => {
        if (results?.[index]) {
            const selectedEntity = results[index];
            Analytics.capture(Analytics.EVENTS.EntitySearchSelected, {
                cui: selectedEntity.cui,
            });
            const shouldNavigateToEntity =
                selectionBehavior === 'navigate-to-entity' && !options?.skipNavigate;

            // Navigate programmatically unless explicitly skipped (e.g., Cmd/Ctrl+Click opens new tab)
            if (shouldNavigateToEntity) {
                navigate({
                    to: "/entities/$cui",
                    params: { cui: selectedEntity.cui },
                    search: (prev) => ({
                        ...prev,
                        ...(openNotificationModal && { notificationModal: 'open' as const })
                    })
                });
            }
            handleClearSearch();
            onSelect?.(selectedEntity);
        }
    }, [results, selectionBehavior, navigate, handleClearSearch, onSelect, openNotificationModal]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isDropdownOpen || results.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setActiveIndex((prevIndex) => (prevIndex + 1) % results.length);
                break;
            case "ArrowUp":
                e.preventDefault();
                setActiveIndex((prevIndex) => (prevIndex - 1 + results.length) % results.length);
                break;
            case "Enter":
                e.preventDefault();
                if (activeIndex !== -1) {
                    handleSelection(activeIndex);
                } else {
                    handleSelection(0);
                }
                break;
            case "Escape":
                e.preventDefault();
                handleClearSearch();
                break;
        }
    }, [isDropdownOpen, results, activeIndex, handleSelection, handleClearSearch]);

    // Generate unique IDs for ARIA attributes
    const entitySearchId = useMemo(() => `entity-search-${Math.random().toString(36).slice(2, 9)}`, []);

    return {
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
        id: entitySearchId,
    };
}
