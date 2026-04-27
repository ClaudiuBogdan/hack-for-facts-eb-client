import { EntityDetailsData } from '../api/entities';
import { useMemo } from 'react';

/**
 * Returns a Google search URL
 */
export function useExternalSearchLink(
    entity: Pick<EntityDetailsData, 'name' | 'uat'> | null | undefined,
) {
    const searchQuery = useMemo(
        () => entity ? formatSearchQuery(entity) : '',
        [entity],
    );

    if (!entity) {
        return {
            url: null
        } as const;
    }

    const searchUrl = entity.name
        ? `https://google.com/search?q=${encodeURIComponent(searchQuery)}`
        : '';

    return {
        url: searchUrl
    } as const;
}


function formatSearchQuery(entity: Pick<EntityDetailsData, 'name' | 'entity_type' | 'uat'>) {

    if (['admin_ministry', 'admin_county_council'].includes(entity.entity_type ?? '')) {
        return entity.name
    }
    if (entity.name.toUpperCase() === 'MUNICIPIUL BUCURESTI') {
        return 'Primaria Municipiului Bucuresti'
    }
    if (['admin_municipality', 'admin_town_hall', 'admin_commune_hall', 'admin_sector_hall'].includes(entity.entity_type ?? '')) {
        return `Primaria ${entity.name.trim()}, Județul ${entity.uat?.county_name?.trim()}`
    }
    return `${entity.name.trim()}, ${entity.uat?.county_name?.trim()}`
}