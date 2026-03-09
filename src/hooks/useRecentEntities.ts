import { useCallback, useEffect } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import { EntitySearchNode } from '@/schemas/entities';
import { EntityDetailsData } from '@/lib/api/entities';

const MAX_RECENT_ENTITIES = 5;

type RecentEntitiesHook = {
  recentEntities: EntitySearchNode[];
  addRecentEntity: (entity: EntitySearchNode) => void;
};

export function useRecentEntities(entity?: EntityDetailsData | null): RecentEntitiesHook {
  const [recentEntities, setRecentEntities] = usePersistedState<EntitySearchNode[]>('recent-entities', []);

  const addRecentEntity = useCallback((entity: EntitySearchNode) => {
    setRecentEntities(prev => {
      const existing = prev.find(e => e.cui === entity.cui);
      if (existing) {
        const mergedEntity: EntitySearchNode = {
          ...existing,
          ...entity,
          uat: entity.uat ?? existing.uat,
        }
        return [mergedEntity, ...prev.filter(e => e.cui !== entity.cui)];
      }
      // Add to the top and truncate
      return [entity, ...prev].slice(0, MAX_RECENT_ENTITIES);
    });
  }, [setRecentEntities]);



  useEffect(() => {
    if (entity) {
      addRecentEntity({
        cui: entity.cui,
        name: entity.name,
        entity_type: entity.entity_type,
        is_uat: entity.is_uat,
        uat: entity.uat,
      });
    }
  }, [entity, addRecentEntity]);

  return { recentEntities, addRecentEntity };
}
