import { useState, useMemo, useEffect, useCallback, useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { searchEntities } from "@/lib/api/entities";
import { EntitySearchNode } from "@/schemas/entities";
import { Analytics } from "@/lib/analytics";
import {
    buildEntitySelectionPath,
    type EntitySelectionBehavior,
} from "@/lib/entity-navigation";

interface UseEntitySearchProps {
    debounceMs?: number;
    onSelect?: (entity: EntitySearchNode) => void;
    openNotificationModal?: boolean;
    selectionBehavior?: EntitySelectionBehavior;
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
    const currentSearch = useSearch({ strict: false }) as Record<string, unknown>;
    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const debouncedSearchTerm = useDebouncedValue(searchTerm, debounceMs);
    const normalizedSearchTerm = useMemo(
        () => debouncedSearchTerm.trim(),
        [debouncedSearchTerm],
    );

    // Track meaningful searches (>= 3 chars) after debounce
    const lastSearchPayload = useMemo(() => ({ q: normalizedSearchTerm }), [normalizedSearchTerm]);

    const {
        data: results = [],
        isLoading,
        isError,
    } = useQuery<EntitySearchNode[], Error>({
        queryKey: ["entitySearch", normalizedSearchTerm, entitySearchFilter?.isUat, entitySearchFilter?.excludeCounty],
        queryFn: () => searchEntities(normalizedSearchTerm, 8, entitySearchFilter),
        enabled: normalizedSearchTerm.length > 2,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
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
            const shouldNavigate =
                selectionBehavior !== 'callback-only' && !options?.skipNavigate;

            // Navigate programmatically unless explicitly skipped (e.g., Cmd/Ctrl+Click opens new tab)
            if (shouldNavigate) {
                const destination = buildEntitySelectionPath({
                    cui: selectedEntity.cui,
                    entityType: selectedEntity.entity_type,
                    isUat: selectedEntity.is_uat,
                }, selectionBehavior);
                const nextSearch = openNotificationModal
                    ? {
                        ...currentSearch,
                        notificationModal: 'open' as const,
                    }
                    : currentSearch;

                if (openNotificationModal) {
                    navigate({
                        to: '/entities/$cui',
                        params: { cui: selectedEntity.cui },
                        search: nextSearch as never,
                    } as never);
                } else {
                    navigate({
                        to: destination as '/',
                        search: nextSearch as never,
                    });
                }
            }
            handleClearSearch();
            onSelect?.(selectedEntity);
        }
    }, [results, selectionBehavior, navigate, handleClearSearch, onSelect, openNotificationModal, currentSearch]);

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

    // Generate SSR-stable IDs for ARIA attributes.
    const reactId = useId();
    const entitySearchId = useMemo(
        () => `entity-search-${reactId.replace(/:/g, "")}`,
        [reactId],
    );

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
