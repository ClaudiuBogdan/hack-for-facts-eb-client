export function formatCampaignAdminUserIdPreview(
  userId: string,
  options?: {
    readonly maxLength?: number;
    readonly prefixLength?: number;
    readonly suffixLength?: number;
  },
): string {
  const maxLength = options?.maxLength ?? 14;
  const prefixLength = options?.prefixLength ?? 8;
  const suffixLength = options?.suffixLength ?? 4;

  if (userId.length <= maxLength) {
    return userId;
  }

  return `${userId.slice(0, prefixLength)}…${userId.slice(-suffixLength)}`;
}
