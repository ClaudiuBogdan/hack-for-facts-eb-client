import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Copy,
  History,
  MoreHorizontal,
  ChevronRight,
  Lock,
  Globe,
  Layers,
  Plus,
  Map,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import {
  useAdvancedMapAnalyticsMapQuery,
  useAdvancedMapAnalyticsMapsQuery,
  useAdvancedMapAnalyticsSnapshotsQuery,
} from "@/features/advanced-map-analytics/hooks/use-advanced-map-analytics";
import type { AdvancedMapAnalyticsApiError } from "@/features/advanced-map-analytics/api/advanced-map-analytics-api";
import { useMapEditorStorageFallbackWarning } from "@/features/advanced-map-analytics/hooks/use-map-editor-storage-fallback-warning";
import { stripMapEditorSearchParams } from "@/features/advanced-map-analytics/map-editor-search";
import { createMapCloneHandoff } from "@/features/advanced-map-analytics/store/map-clone-handoff";
import { AdvancedMapAnalyticsUrlStateSchema } from "@/schemas/advanced-map-analytics";
import { Analytics } from "@/lib/analytics";
import { t } from "@lingui/core/macro";
import { getUserLocale } from "@/lib/utils";

function MapVisibility({ state }: { readonly state: string }) {
  if (state === "public") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <Globe className="h-3 w-3" aria-hidden="true" />
        {t`Public`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Lock className="h-3 w-3" aria-hidden="true" />
      {t`Private`}
    </span>
  );
}

type MapItemProps = {
  readonly map: {
    readonly id: string;
    readonly title: string;
    readonly state: string;
    readonly snapshotCount: number;
    readonly updatedAt: string;
  };
  readonly dateTimeLocale: string;
  readonly onCloneLatest: (mapId: string) => void;
  readonly onCloneSnapshot: (mapId: string) => void;
};

function MapListItem({
  map,
  dateTimeLocale,
  onCloneLatest,
  onCloneSnapshot,
}: MapItemProps) {
  return (
    <div className="group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{map.title}</span>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <MapVisibility state={map.state} />
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3 w-3" aria-hidden="true" />
            {map.snapshotCount}
          </span>
          <span>·</span>
          <span>{new Date(map.updatedAt).toLocaleString(dateTimeLocale)}</span>
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-foreground"
        >
          <Link
            to="/maps/editor/$mapId"
            params={{ mapId: map.id }}
            preload="intent"
            search={(previousSearch) =>
              stripMapEditorSearchParams(
                previousSearch as Record<string, unknown>,
              )
            }
          >
            {t`Open`}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={t`Options for ${map.title}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onSelect={() => onCloneLatest(map.id)}
              className="text-sm"
            >
              <History className="mr-2 h-4 w-4" aria-hidden="true" />
              {t`Clone latest`}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onCloneSnapshot(map.id)}
              className="text-sm"
            >
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              {t`Clone snapshot`}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function MapAnalyticsListPage() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const [cloneSourceMapId, setCloneSourceMapId] = useState<string | null>(null);
  const [cloneSnapshotMapId, setCloneSnapshotMapId] = useState<string | null>(
    null,
  );

  const mapsQuery = useAdvancedMapAnalyticsMapsQuery();
  const dateTimeLocale = getUserLocale() === "en" ? "en-US" : "ro-RO";

  useMapEditorStorageFallbackWarning();

  const cloneLatestQuery = useAdvancedMapAnalyticsMapQuery(
    cloneSourceMapId ?? "",
    Boolean(cloneSourceMapId),
  );

  const cloneSnapshotsQuery = useAdvancedMapAnalyticsSnapshotsQuery(
    cloneSnapshotMapId ?? "",
    1,
    20,
    Boolean(cloneSnapshotMapId),
  );

  const maps = mapsQuery.data ?? [];

  const forbiddenError = useMemo(() => {
    if (!mapsQuery.error) {
      return null;
    }

    const error = mapsQuery.error as AdvancedMapAnalyticsApiError;
    return error.status === 403 ? error : null;
  }, [mapsQuery.error]);

  const createMapFromState = (
    state?: unknown,
    mapDescription?: string | null,
  ) => {
    if (state === undefined) {
      navigate({
        to: "/maps/editor/new",
        search: {},
      });
      return;
    }

    const parsedMapState = AdvancedMapAnalyticsUrlStateSchema.safeParse(state);
    if (!parsedMapState.success) {
      toast.error(t`Failed to clone map configuration`);
      return;
    }

    const cloneRef = createMapCloneHandoff({
      mapState: parsedMapState.data,
      mapDescription: mapDescription ?? "",
    });
    Analytics.capture(Analytics.EVENTS.AdvancedMapAnalyticsCloneHandoffUsed, {
      source: "editor_list",
    });

    navigate({
      to: "/maps/editor/new",
      search: { cloneRef },
    });
  };

  const handleCloneLatest = (mapId: string) => {
    setCloneSourceMapId(mapId);
  };

  const handleCloneSnapshot = (mapId: string) => {
    setCloneSnapshotMapId(mapId);
  };

  const completeCloneLatest = () => {
    if (!cloneLatestQuery.data) {
      return;
    }

    createMapFromState(
      cloneLatestQuery.data.lastSnapshot.config,
      cloneLatestQuery.data.description,
    );
    setCloneSourceMapId(null);
  };

  if (!isLoaded || mapsQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <p className="mb-4 text-sm text-muted-foreground">{t`Loading maps`}</p>
        <div className="flex items-center">
          <div className="h-2 w-2 animate-pulse rounded-full bg-foreground/40" />
          <div
            className="ml-2 h-2 w-2 animate-pulse rounded-full bg-foreground/40"
            style={{ animationDelay: "75ms" }}
          />
          <div
            className="ml-2 h-2 w-2 animate-pulse rounded-full bg-foreground/40"
            style={{ animationDelay: "150ms" }}
          />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <Card className="mx-auto max-w-md text-center">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg font-medium">{t`Sign in required`}</CardTitle>
            <CardDescription>
              {t`You need to be signed in to access the map editor.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthSignInButton>
              <Button className="w-full">{t`Sign In`}</Button>
            </AuthSignInButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (forbiddenError) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <Card className="mx-auto max-w-md border-destructive/20 text-center">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg font-medium">{t`Access denied`}</CardTitle>
            <CardDescription>{forbiddenError.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (mapsQuery.error) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <Card className="mx-auto max-w-md border-destructive/20 text-center">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg font-medium">{t`Failed to load maps`}</CardTitle>
            <CardDescription>{mapsQuery.error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const cloneSnapshotSourceMapDescription =
    maps.find((map) => map.id === cloneSnapshotMapId)?.description ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-xl items-center justify-between px-6 py-4">
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Map className="h-6 w-6" aria-hidden="true" />
              {t`Maps`}
            </h1>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {t`Manage and create map visualizations`}
            </p>
          </div>
          <Button
            onClick={() => createMapFromState()}
            className="ml-4 gap-2 px-5"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t`Create map`}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-6 py-6">
          {maps.length === 0 ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm font-medium text-foreground">{t`No maps yet`}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t`Create a map to visualize geographic data`}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              {maps.map((map, index) => (
                <div
                  key={map.id}
                  className={
                    index === maps.length - 1
                      ? undefined
                      : "border-b border-border/60"
                  }
                >
                  <MapListItem
                    map={map}
                    dateTimeLocale={dateTimeLocale}
                    onCloneLatest={handleCloneLatest}
                    onCloneSnapshot={handleCloneSnapshot}
                  />
                </div>
              ))}
              <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-muted-foreground hover:text-foreground"
                >
                  <Link to="/maps/datasets" preload="intent">
                    {t`Manage custom data series`}
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Clone Latest Dialog */}
      <Dialog
        open={cloneSourceMapId !== null}
        onOpenChange={(open) => !open && setCloneSourceMapId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">
              {t`Clone latest snapshot`}
            </DialogTitle>
            <DialogDescription>
              {t`Create a new map using the latest saved snapshot`}
            </DialogDescription>
          </DialogHeader>

          {cloneLatestQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-2 w-2 animate-pulse rounded-full bg-foreground/40" />
              <div
                className="ml-2 h-2 w-2 animate-pulse rounded-full bg-foreground/40"
                style={{ animationDelay: "75ms" }}
              />
              <div
                className="ml-2 h-2 w-2 animate-pulse rounded-full bg-foreground/40"
                style={{ animationDelay: "150ms" }}
              />
            </div>
          ) : cloneLatestQuery.error ? (
            <div className="rounded border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {cloneLatestQuery.error.message}
            </div>
          ) : (
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setCloneSourceMapId(null)}>
                {t`Cancel`}
              </Button>
              <Button onClick={completeCloneLatest}>{t`Clone`}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clone Snapshot Dialog */}
      <Dialog
        open={cloneSnapshotMapId !== null}
        onOpenChange={(open) => !open && setCloneSnapshotMapId(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">
              {t`Clone from snapshot`}
            </DialogTitle>
            <DialogDescription>
              {t`Select a snapshot to clone into a new map`}
            </DialogDescription>
          </DialogHeader>

          {cloneSnapshotsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-2 w-2 animate-pulse rounded-full bg-foreground/40" />
              <div
                className="ml-2 h-2 w-2 animate-pulse rounded-full bg-foreground/40"
                style={{ animationDelay: "75ms" }}
              />
              <div
                className="ml-2 h-2 w-2 animate-pulse rounded-full bg-foreground/40"
                style={{ animationDelay: "150ms" }}
              />
            </div>
          ) : cloneSnapshotsQuery.error ? (
            <div className="rounded border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {cloneSnapshotsQuery.error.message}
            </div>
          ) : (
            <div className="max-h-[400px] space-y-2 overflow-y-auto py-2">
              {(cloneSnapshotsQuery.data?.snapshots ?? []).map((snapshot) => (
                <div
                  key={snapshot.snapshotId}
                  className="flex items-center justify-between rounded-md px-3 py-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {snapshot.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(snapshot.createdAt).toLocaleString(
                        dateTimeLocale,
                      )}
                      {" · "}
                      {snapshot.stateAtSave}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      createMapFromState(
                        snapshot.config,
                        cloneSnapshotSourceMapDescription,
                      );
                      setCloneSnapshotMapId(null);
                    }}
                  >
                    {t`Clone`}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
