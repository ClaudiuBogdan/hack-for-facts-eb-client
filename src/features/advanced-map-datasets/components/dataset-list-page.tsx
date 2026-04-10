import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Copy,
  Eye,
  MoreHorizontal,
  Plus,
  Trash2,
  ChevronRight,
  Lock,
  Globe,
  EyeOff,
  Database,
  Table2,
} from "lucide-react";
import { toast } from "sonner";
import { t } from "@lingui/core/macro";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import { getUserLocale } from "@/lib/utils";
import {
  useAdvancedMapDatasetsOwnerListQuery,
  useDeleteAdvancedMapDatasetMutation,
  useAdvancedMapDatasetsPublicListQuery,
} from "@/features/advanced-map-datasets/hooks/use-advanced-map-datasets";
import { createDatasetCloneHandoff } from "@/features/advanced-map-datasets/store/dataset-clone-handoff";
import { getAdvancedMapDataset } from "@/features/advanced-map-datasets/api/advanced-map-datasets-api";
import { UploadedMapDatasetDialog } from "@/features/advanced-map-analytics/components/uploaded-map-dataset-dialog";
import {
  createAdvancedMapStateFromUploadedDataset,
  getPreferredUploadedMapDatasetReference,
  type UploadedMapDatasetReference,
} from "@/features/advanced-map-analytics/uploaded-map-dataset";
import { createMapCloneHandoff } from "@/features/advanced-map-analytics/store/map-clone-handoff";
import { createAdvancedMapDatasetCloneDraft } from "@/features/advanced-map-datasets/utils/clone-draft";

function isUuid(value: string | null | undefined): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function DatasetVisibility({ visibility }: { readonly visibility: string }) {
  if (visibility === "public") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Globe className="h-3 w-3" aria-hidden="true" />
        {t`Public`}
      </span>
    );
  }
  if (visibility === "unlisted") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <EyeOff className="h-3 w-3" aria-hidden="true" />
        {t`Unlisted`}
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

type DatasetItemProps = {
  readonly dataset: {
    readonly id: string;
    readonly title: string;
    readonly visibility: string;
    readonly rowCount: number;
    readonly updatedAt: string;
  };
  readonly dateTimeLocale: string;
  readonly onClone: (datasetId: string) => void;
  readonly onPreview: (dataset: DatasetItemProps["dataset"]) => void;
  readonly onDelete: (datasetId: string) => void;
};

function DatasetListItem({
  dataset,
  dateTimeLocale,
  onClone,
  onPreview,
  onDelete,
}: DatasetItemProps) {
  return (
    <div className="group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {dataset.title}
        </span>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <DatasetVisibility visibility={dataset.visibility} />
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Table2 className="h-3 w-3" aria-hidden="true" />
            {dataset.rowCount.toLocaleString()}
          </span>
          <span>·</span>
          <span>
            {new Date(dataset.updatedAt).toLocaleString(dateTimeLocale)}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Link
            to="/maps/datasets/$datasetId"
            params={{ datasetId: dataset.id }}
            preload="intent"
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
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={t`Options for ${dataset.title}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onSelect={() => {
                void (async () => {
                  try {
                    await onClone(dataset.id);
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : t`Failed to create copy`,
                    );
                  }
                })();
              }}
              className="text-sm"
            >
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              {t`Create copy`}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onPreview(dataset)}
              className="text-sm"
            >
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              {t`Preview on map`}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDelete(dataset.id)}
              className="text-sm text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              {t`Delete`}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

type PublicDatasetItemProps = {
  readonly dataset: {
    readonly publicId: string | null;
    readonly id: string;
    readonly title: string;
    readonly rowCount: number;
    readonly updatedAt: string;
  };
  readonly dateTimeLocale: string;
  readonly onPreview: (dataset: PublicDatasetItemProps["dataset"]) => void;
};

function PublicDatasetListItem({
  dataset,
  dateTimeLocale,
  onPreview,
}: PublicDatasetItemProps) {
  const validPublicId = isUuid(dataset.publicId) ? dataset.publicId : null;

  return (
    <div className="group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {dataset.title}
        </span>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Table2 className="h-3 w-3" aria-hidden="true" />
            {dataset.rowCount.toLocaleString()}
          </span>
          <span>·</span>
          <span>
            {new Date(dataset.updatedAt).toLocaleString(dateTimeLocale)}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-1">
        {validPublicId !== null ? (
          <>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Link
                to="/maps/datasets/public/$publicId"
                params={{ publicId: validPublicId }}
                preload="intent"
              >
                {t`Open`}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={t`Preview on map`}
              onClick={() => onPreview(dataset)}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" disabled className="text-xs">
            {t`Preview unavailable`}
          </Button>
        )}
      </div>
    </div>
  );
}

export function AdvancedMapDatasetListPage() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const ownerDatasetsQuery = useAdvancedMapDatasetsOwnerListQuery();
  const publicDatasetsQuery = useAdvancedMapDatasetsPublicListQuery();
  const deleteDatasetMutation = useDeleteAdvancedMapDatasetMutation();
  const [pendingDeleteDatasetId, setPendingDeleteDatasetId] = useState<
    string | null
  >(null);
  const [previewDatasetRef, setPreviewDatasetRef] =
    useState<UploadedMapDatasetReference | null>(null);

  const ownerParentRef = useRef<HTMLDivElement>(null);
  const publicParentRef = useRef<HTMLDivElement>(null);

  const dateTimeLocale = getUserLocale() === "en" ? "en-US" : "ro-RO";

  const ownerDatasets = ownerDatasetsQuery.data ?? [];
  const publicDatasets = publicDatasetsQuery.data ?? [];

  const ownerVirtualizer = useVirtualizer({
    count: ownerDatasets.length,
    getScrollElement: () => ownerParentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const publicVirtualizer = useVirtualizer({
    count: publicDatasets.length,
    getScrollElement: () => publicParentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const pendingDeleteDataset = useMemo(
    () =>
      ownerDatasets.find((dataset) => dataset.id === pendingDeleteDatasetId) ??
      null,
    [ownerDatasets, pendingDeleteDatasetId],
  );

  const createEmptyDatasetDraft = () => {
    navigate({
      to: "/maps/datasets/new",
      search: {
        draftId: crypto.randomUUID(),
      },
    });
  };

  const cloneDataset = async (datasetId: string) => {
    const dataset = await getAdvancedMapDataset(datasetId);
    const { token } = createDatasetCloneHandoff(
      createAdvancedMapDatasetCloneDraft(dataset),
    );

    navigate({
      to: "/maps/datasets/new",
      search: {
        draftId: crypto.randomUUID(),
        cloneRef: token,
      },
    });
  };

  const handleCreateMapFromDataset = (
    selection: UploadedMapDatasetReference,
    dataset: Awaited<ReturnType<typeof getAdvancedMapDataset>>,
  ) => {
    const cloneRef = createMapCloneHandoff({
      mapState: createAdvancedMapStateFromUploadedDataset(dataset, selection),
      mapDescription: dataset.description ?? "",
    });

    setPreviewDatasetRef(null);
    navigate({
      to: "/maps/editor/new",
      search: { cloneRef },
    });
  };

  const handlePreviewDataset = (dataset: {
    readonly id: string;
    readonly publicId?: string | null;
  }) => {
    setPreviewDatasetRef(
      getPreferredUploadedMapDatasetReference(
        dataset as Parameters<typeof getPreferredUploadedMapDatasetReference>[0],
      ),
    );
  };

  const handleDeleteDataset = (datasetId: string) => {
    setPendingDeleteDatasetId(datasetId);
  };

  if (
    !isLoaded ||
    ownerDatasetsQuery.isLoading ||
    publicDatasetsQuery.isLoading
  ) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <p className="mb-4 text-sm text-muted-foreground">
          {t`Loading data series`}
        </p>
        <div className="flex items-center">
          <div className="h-2 w-2 animate-pulse rounded-full bg-foreground/40" />
          <div className="ml-2 h-2 w-2 animate-pulse rounded-full bg-foreground/40" />
          <div className="ml-2 h-2 w-2 animate-pulse rounded-full bg-foreground/40" />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <Card className="mx-auto max-w-md text-center">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg font-medium">
              {t`Sign in required`}
            </CardTitle>
            <CardDescription>
              {t`You need to be signed in to manage custom data series.`}
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

  if (ownerDatasetsQuery.error) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <Card className="mx-auto max-w-md border-destructive/20 text-center">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg font-medium">
              {t`Failed to load data series`}
            </CardTitle>
            <CardDescription>
              {ownerDatasetsQuery.error.message}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-xl items-center justify-between px-6 py-4">
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Database className="h-6 w-6" aria-hidden="true" />
              {t`Custom data series`}
            </h1>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {t`Manage your own map-ready datasets or clone shared ones.`}
            </p>
          </div>
          <Button
            onClick={createEmptyDatasetDraft}
            className="ml-4 gap-2 px-5"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t`Create data series`}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-xl space-y-6 px-6 py-6">
          {/* My Data Series Section */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {t`My data series`}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t`Edit datasets you own and reuse them across maps.`}
                </p>
              </div>
            </div>

            {ownerDatasets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                <p className="text-sm font-medium text-foreground">
                  {t`No data series yet`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t`Create your first custom dataset to get started with map visualization.`}
                </p>
              </div>
            ) : (
              <div
                ref={ownerParentRef}
                className="max-h-[400px] overflow-auto rounded-lg border border-border/60 [scrollbar-width:none] hover:[scrollbar-width:auto] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-border/60"
              >
                <div
                  style={{
                    height: `${ownerVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {ownerVirtualizer.getVirtualItems().map((virtualItem) => {
                    const dataset = ownerDatasets[virtualItem.index];
                    return (
                      <div
                        key={dataset.id}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                        className="border-b border-border/60 last:border-b-0"
                      >
                        <DatasetListItem
                          dataset={dataset}
                          dateTimeLocale={dateTimeLocale}
                          onClone={cloneDataset}
                          onPreview={handlePreviewDataset}
                          onDelete={handleDeleteDataset}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Public Explorer Section */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {t`Public explorer`}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t`Explore public data series and clone them into your own workspace.`}
                </p>
              </div>
            </div>

            {publicDatasets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                <p className="text-sm font-medium text-foreground">
                  {t`No public datasets available`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t`Public datasets will appear here when shared by the community.`}
                </p>
              </div>
            ) : (
              <div
                ref={publicParentRef}
                className="max-h-[400px] overflow-auto rounded-lg border border-border/60 [scrollbar-width:none] hover:[scrollbar-width:auto] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-border/60"
              >
                <div
                  style={{
                    height: `${publicVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {publicVirtualizer.getVirtualItems().map((virtualItem) => {
                    const dataset = publicDatasets[virtualItem.index];
                    return (
                      <div
                        key={dataset.publicId ?? dataset.id}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                        className="border-b border-border/60 last:border-b-0"
                      >
                        <PublicDatasetListItem
                          dataset={dataset}
                          dateTimeLocale={dateTimeLocale}
                          onPreview={handlePreviewDataset}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={pendingDeleteDatasetId !== null}
        onOpenChange={(nextOpen) =>
          !nextOpen && setPendingDeleteDatasetId(null)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2
                className="h-5 w-5 text-destructive"
                aria-hidden="true"
              />
              {t`Delete data series?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteDataset ? (
                <>
                  {t`This will permanently delete`}{" "}
                  <strong>{pendingDeleteDataset.title}</strong>.{" "}
                  {t`Unless it is still referenced by existing maps, it cannot be recovered.`}
                </>
              ) : (
                t`This will remove the dataset unless it is still referenced by existing maps.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDatasetMutation.isPending}>
              {t`Cancel`}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDatasetMutation.isPending}
              onClick={() => {
                if (!pendingDeleteDataset) {
                  return;
                }

                deleteDatasetMutation.mutate(
                  { datasetId: pendingDeleteDataset.id },
                  {
                    onSuccess: () => {
                      toast.success(t`Data series deleted`);
                      setPendingDeleteDatasetId(null);
                    },
                    onError: (error) => {
                      toast.error(error.message);
                    },
                  },
                );
              }}
            >
              {deleteDatasetMutation.isPending ? t`Deleting...` : t`Delete`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <UploadedMapDatasetDialog
        open={previewDatasetRef !== null}
        mode="launch-map"
        initialSelection={previewDatasetRef}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPreviewDatasetRef(null);
          }
        }}
        onConfirm={handleCreateMapFromDataset}
      />
    </div>
  );
}
