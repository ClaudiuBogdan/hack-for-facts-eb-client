import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createCampaignAdminNotificationDryRunPlan,
  executeCampaignAdminNotificationTriggerBulk,
  executeCampaignAdminNotificationTrigger,
  getCampaignAdminNotificationPlanPage,
  getCampaignAdminNotificationsMeta,
  getCampaignAdminNotificationTemplatePreview,
  listCampaignAdminRunnableTemplates,
  listCampaignAdminNotificationTemplates,
  listCampaignAdminNotificationTriggers,
  listCampaignAdminNotifications,
  sendCampaignAdminNotificationPlan,
} from "@/features/campaigns/buget/admin/api/campaign-admin-notifications";
import { CampaignAdminApiError } from "@/features/campaigns/buget/admin/api/campaign-admin-user-interactions";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminNotificationsAuditFilters,
  CampaignAdminNotificationsListResponse,
  CampaignAdminNotificationsMetaResponse,
  CampaignAdminNotificationPlanResponse,
  CampaignAdminNotificationPlanSendResponse,
  CampaignAdminNotificationTemplateDescriptor,
  CampaignAdminNotificationTemplatePreview,
  CampaignAdminNotificationTriggerBulkExecutionBody,
  CampaignAdminNotificationTriggerBulkExecutionResponse,
  CampaignAdminNotificationTriggerDescriptor,
  CampaignAdminNotificationTriggerExecutionBody,
  CampaignAdminNotificationTriggerExecutionResponse,
  CampaignAdminRunnableTemplateDescriptor,
  CampaignAdminRunnableTemplateDryRunBody,
} from "@/features/campaigns/buget/admin/types";

export const campaignAdminNotificationsKeys = {
  all: ["campaign-admin"] as const,
  allForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey] as const,
  notificationsForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "notifications"] as const,
  meta: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "notifications", "meta"] as const,
  audit: (
    campaignKey: CampaignAdminCampaignKey,
    filters: CampaignAdminNotificationsAuditFilters,
    cursor: string | null,
    limit: number,
  ) =>
    [
      "campaign-admin",
      campaignKey,
      "notifications",
      "audit",
      filters,
      cursor ?? null,
      limit,
    ] as const,
  triggers: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "notifications", "triggers"] as const,
  runnableTemplates: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "notifications", "runnable-templates"] as const,
  templates: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "notifications", "templates"] as const,
  templatePreview: (
    campaignKey: CampaignAdminCampaignKey,
    templateId: string | null,
  ) =>
    [
      "campaign-admin",
      campaignKey,
      "notifications",
      "templates",
      templateId ?? null,
      "preview",
    ] as const,
  planPage: (
    campaignKey: CampaignAdminCampaignKey,
    planId: string | null,
    cursor: string | null,
    limit: number,
  ) =>
    [
      "campaign-admin",
      campaignKey,
      "notifications",
      "plans",
      planId ?? null,
      cursor ?? null,
      limit,
    ] as const,
};

export function campaignAdminNotificationsAuditQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly filters: CampaignAdminNotificationsAuditFilters;
  readonly cursor: string | null;
  readonly limit: number;
  readonly enabled?: boolean;
}) {
  return queryOptions<
    CampaignAdminNotificationsListResponse,
    CampaignAdminApiError
  >({
    queryKey: campaignAdminNotificationsKeys.audit(
      input.campaignKey,
      input.filters,
      input.cursor,
      input.limit,
    ),
    queryFn: async () =>
      listCampaignAdminNotifications({
        campaignKey: input.campaignKey,
        filters: input.filters,
        cursor: input.cursor,
        limit: input.limit,
      }),
    enabled: input.enabled ?? true,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function campaignAdminNotificationsMetaQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return queryOptions<
    CampaignAdminNotificationsMetaResponse,
    CampaignAdminApiError
  >({
    queryKey: campaignAdminNotificationsKeys.meta(input.campaignKey),
    queryFn: async () =>
      getCampaignAdminNotificationsMeta({
        campaignKey: input.campaignKey,
      }),
    enabled: input.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function campaignAdminNotificationTriggersQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return queryOptions<
    readonly CampaignAdminNotificationTriggerDescriptor[],
    CampaignAdminApiError
  >({
    queryKey: campaignAdminNotificationsKeys.triggers(input.campaignKey),
    queryFn: async () =>
      listCampaignAdminNotificationTriggers({
        campaignKey: input.campaignKey,
      }),
    enabled: input.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function campaignAdminNotificationTemplatesQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return queryOptions<
    readonly CampaignAdminNotificationTemplateDescriptor[],
    CampaignAdminApiError
  >({
    queryKey: campaignAdminNotificationsKeys.templates(input.campaignKey),
    queryFn: async () =>
      listCampaignAdminNotificationTemplates({
        campaignKey: input.campaignKey,
      }),
    enabled: input.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function campaignAdminRunnableTemplatesQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return queryOptions<
    readonly CampaignAdminRunnableTemplateDescriptor[],
    CampaignAdminApiError
  >({
    queryKey: campaignAdminNotificationsKeys.runnableTemplates(
      input.campaignKey,
    ),
    queryFn: async () =>
      listCampaignAdminRunnableTemplates({
        campaignKey: input.campaignKey,
      }),
    enabled: input.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function campaignAdminNotificationTemplatePreviewQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly templateId: string | null;
  readonly enabled?: boolean;
}) {
  return queryOptions<
    CampaignAdminNotificationTemplatePreview,
    CampaignAdminApiError
  >({
    queryKey: campaignAdminNotificationsKeys.templatePreview(
      input.campaignKey,
      input.templateId,
    ),
    queryFn: async () => {
      if (input.templateId === null) {
        throw new CampaignAdminApiError(
          "Campaign notification template preview requires a template ID.",
          400,
          {
            code: "missing_template_id",
            retryable: false,
          },
        );
      }

      return getCampaignAdminNotificationTemplatePreview({
        campaignKey: input.campaignKey,
        templateId: input.templateId,
      });
    },
    enabled: (input.enabled ?? true) && input.templateId !== null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function campaignAdminNotificationPlanPageQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly planId: string | null;
  readonly cursor: string | null;
  readonly limit: number;
  readonly enabled?: boolean;
}) {
  return queryOptions<CampaignAdminNotificationPlanResponse, CampaignAdminApiError>(
    {
      queryKey: campaignAdminNotificationsKeys.planPage(
        input.campaignKey,
        input.planId,
        input.cursor,
        input.limit,
      ),
      queryFn: async () => {
        if (input.planId === null) {
          throw new CampaignAdminApiError(
            "Campaign notification plan request requires a plan ID.",
            400,
            {
              code: "missing_plan_id",
              retryable: false,
            },
          );
        }

        return getCampaignAdminNotificationPlanPage({
          campaignKey: input.campaignKey,
          planId: input.planId,
          cursor: input.cursor,
          limit: input.limit,
        });
      },
      enabled: (input.enabled ?? true) && input.planId !== null,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );
}

export function useCampaignAdminNotificationsAuditQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly filters: CampaignAdminNotificationsAuditFilters;
  readonly cursor: string | null;
  readonly limit: number;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminNotificationsAuditQueryOptions(input));
}

export function useCampaignAdminNotificationsMetaQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminNotificationsMetaQueryOptions(input));
}

export function useCampaignAdminNotificationTriggersQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminNotificationTriggersQueryOptions(input));
}

export function useCampaignAdminNotificationTemplatesQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminNotificationTemplatesQueryOptions(input));
}

export function useCampaignAdminRunnableTemplatesQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminRunnableTemplatesQueryOptions(input));
}

export function useCampaignAdminNotificationTemplatePreviewQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly templateId: string | null;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminNotificationTemplatePreviewQueryOptions(input));
}

export function useCampaignAdminNotificationPlanPageQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly planId: string | null;
  readonly cursor: string | null;
  readonly limit: number;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminNotificationPlanPageQueryOptions(input));
}

export function useCreateCampaignAdminNotificationDryRunPlanMutation(
  campaignKey: CampaignAdminCampaignKey,
) {
  const queryClient = useQueryClient();

  return useMutation<
    CampaignAdminNotificationPlanResponse,
    CampaignAdminApiError,
    {
      readonly runnableId: string;
      readonly body: CampaignAdminRunnableTemplateDryRunBody;
    }
  >({
    mutationFn: async (input) =>
      createCampaignAdminNotificationDryRunPlan({
        campaignKey,
        runnableId: input.runnableId,
        body: input.body,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          campaignAdminNotificationsKeys.notificationsForCampaign(campaignKey),
      });
    },
  });
}

export function useSendCampaignAdminNotificationPlanMutation(
  campaignKey: CampaignAdminCampaignKey,
) {
  const queryClient = useQueryClient();

  return useMutation<
    CampaignAdminNotificationPlanSendResponse,
    CampaignAdminApiError,
    {
      readonly planId: string;
    }
  >({
    mutationFn: async (input) =>
      sendCampaignAdminNotificationPlan({
        campaignKey,
        planId: input.planId,
      }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            campaignAdminNotificationsKeys.notificationsForCampaign(campaignKey),
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "campaign-admin",
            campaignKey,
            "notifications",
            "plans",
            variables.planId,
          ],
        }),
      ]);
    },
  });
}

export function useExecuteCampaignAdminNotificationTriggerMutation(
  campaignKey: CampaignAdminCampaignKey,
) {
  const queryClient = useQueryClient();

  return useMutation<
    CampaignAdminNotificationTriggerExecutionResponse,
    CampaignAdminApiError,
    {
      readonly triggerId: string;
      readonly body: CampaignAdminNotificationTriggerExecutionBody;
    }
  >({
    mutationFn: async (input) =>
      executeCampaignAdminNotificationTrigger({
        campaignKey,
        triggerId: input.triggerId,
        body: input.body,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          campaignAdminNotificationsKeys.notificationsForCampaign(campaignKey),
      });
    },
    onError: async (error) => {
      if (error.status === 404 || error.status === 409) {
        await queryClient.invalidateQueries({
          queryKey:
            campaignAdminNotificationsKeys.notificationsForCampaign(
              campaignKey,
            ),
        });
      }
    },
  });
}

export function useExecuteCampaignAdminNotificationTriggerBulkMutation(
  campaignKey: CampaignAdminCampaignKey,
) {
  const queryClient = useQueryClient();

  return useMutation<
    CampaignAdminNotificationTriggerBulkExecutionResponse,
    CampaignAdminApiError,
    {
      readonly triggerId: string;
      readonly body: CampaignAdminNotificationTriggerBulkExecutionBody;
    }
  >({
    mutationFn: async (input) =>
      executeCampaignAdminNotificationTriggerBulk({
        campaignKey,
        triggerId: input.triggerId,
        body: input.body,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          campaignAdminNotificationsKeys.notificationsForCampaign(campaignKey),
      });
    },
    onError: async (error) => {
      if (error.status === 404 || error.status === 409) {
        await queryClient.invalidateQueries({
          queryKey:
            campaignAdminNotificationsKeys.notificationsForCampaign(
              campaignKey,
            ),
        });
      }
    },
  });
}
