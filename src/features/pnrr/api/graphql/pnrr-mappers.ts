import type {
  PnrrLiveEntity,
  PnrrLiveEntityProfile,
  PnrrLiveOverview,
  PnrrLivePlaceProfile,
  PnrrLiveProject,
  PnrrLiveProjectConnection,
  PnrrLiveRelease,
  PnrrLiveVerification,
} from "@/schemas/pnrr-live";

/**
 * The live PNRR UI model intentionally mirrors the source-aware GraphQL
 * contract. These named mappers make the boundary explicit and are the single
 * place for future presentation-only normalization.
 */
export const mapPnrrRelease = (value: PnrrLiveRelease): PnrrLiveRelease =>
  value;
export const mapPnrrOverview = (value: PnrrLiveOverview): PnrrLiveOverview =>
  value;
export const mapPnrrProjects = (
  value: PnrrLiveProjectConnection,
): PnrrLiveProjectConnection => value;
export const mapPnrrProject = (
  value: PnrrLiveProject | null,
): PnrrLiveProject | null => value;
export const mapPnrrOrganization = <
  T extends {
    readonly entity: PnrrLiveEntity;
    readonly profile: PnrrLiveEntityProfile;
  },
>(
  value: T,
): T => value;
export const mapPnrrPlace = (
  value: PnrrLivePlaceProfile | null,
): PnrrLivePlaceProfile | null => value;
export const mapPnrrVerification = (
  value: PnrrLiveVerification,
): PnrrLiveVerification => value;
