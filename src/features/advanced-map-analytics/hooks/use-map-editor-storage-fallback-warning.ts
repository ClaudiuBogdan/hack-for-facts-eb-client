import { useEffect } from 'react';
import { toast } from 'sonner';
import { t } from '@lingui/core/macro';
import { Analytics } from '@/lib/analytics';
import { subscribeToSessionStorageFailures } from '@/features/advanced-map-analytics/storage/safe-session-storage';

let hasShownFallbackWarning = false;

export function useMapEditorStorageFallbackWarning(): void {
  useEffect(() => {
    const unsubscribe = subscribeToSessionStorageFailures((failure) => {
      Analytics.capture(Analytics.EVENTS.AdvancedMapAnalyticsStorageFallbackTriggered, {
        operation: failure.operation,
        storage_key: failure.key,
      });

      if (hasShownFallbackWarning) {
        return;
      }

      hasShownFallbackWarning = true;
      toast.warning(
        t`Session storage is unavailable. Your map changes are kept only in this tab memory.`
      );
    });

    return unsubscribe;
  }, []);
}
