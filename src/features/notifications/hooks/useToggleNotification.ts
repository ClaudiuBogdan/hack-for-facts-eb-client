import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createNotification, getEntityNotifications, getUserNotifications, unsubscribeNotification } from '../api/notifications';
import { toast } from 'sonner';
import type { NotificationType, Notification } from '../types';

type ToggleNotificationParams = {
  entityCui: string | null;
  notificationType: NotificationType;
  isActive: boolean;
  notificationId?: string;
}

export function useToggleNotification(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ToggleNotificationParams) => {
      const { entityCui, notificationType, isActive, notificationId } = params;

      if (isActive) {
        // Activate (create/subscribe)
        return createNotification({ entityCui, notificationType });
      }

      if (notificationId) {
        return unsubscribeNotification(notificationId);
      }

      // Deactivate (unsubscribe)
      const list = entityCui ? await getEntityNotifications(entityCui) : await getUserNotifications();
      const existing = list.find((n) => n.notificationType === notificationType && n.entityCui === entityCui);
      if (!existing) {
        throw new Error('No notification found to deactivate');
      }
      return unsubscribeNotification(existing.id);
    },

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      // Snapshot previous value
      const previousAll = queryClient.getQueryData<Notification[]>(['notifications', 'all']);
      const previousEntity = variables.entityCui
        ? queryClient.getQueryData<Notification[]>(['notifications', 'entity', variables.entityCui])
        : undefined;

      // Optimistically update
      if (variables.entityCui) {
        queryClient.setQueryData<Notification[]>(
          ['notifications', 'entity', variables.entityCui],
          (old = []) => {
            const existing = old.find(
              n => n.notificationType === variables.notificationType && n.entityCui === variables.entityCui
            );

            if (existing) {
              return old.map(n =>
                n.id === existing.id ? { ...n, isActive: variables.isActive } : n
              );
            } else {
              // New notification - will be created
              return old;
            }
          }
        );
      }

      return { previousAll, previousEntity };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousAll) {
        queryClient.setQueryData(['notifications', 'all'], context.previousAll);
      }
      if (variables.entityCui && context?.previousEntity) {
        queryClient.setQueryData(
          ['notifications', 'entity', variables.entityCui],
          context.previousEntity
        );
      }

      console.error('Failed to update notification:', err);
      toast.error('Failed to update notification');
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      if (!options?.silent) {
        const action = variables.isActive ? 'enabled' : 'disabled';
        toast.success(`Notification ${action}`);
      }
    },
  });
}
