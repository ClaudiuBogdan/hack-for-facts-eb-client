import { useEffect } from 'react';
import { toast } from 'sonner';
import { t } from '@lingui/core/macro';
import { subscribeToSessionStorageFailures } from '@/features/advanced-map-analytics/storage/safe-session-storage';

export function useAdvancedMapDatasetStorageFallbackWarning(): void {
  useEffect(() => {
    return subscribeToSessionStorageFailures((failure) => {
      if (!failure.key.startsWith('ama-dataset-') && !failure.key.startsWith('amad-')) {
        return;
      }

      toast.warning(t`Session storage is unavailable. Your dataset draft is kept only in tab memory.`);
    });
  }, []);
}
