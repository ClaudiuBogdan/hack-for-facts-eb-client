import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Copy, Database, Globe, Lock, MoreVertical, Plus, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@lingui/core/macro';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AuthSignInButton, useAuth } from '@/lib/auth';
import { getUserLocale } from '@/lib/utils';
import {
  useAdvancedMapDatasetsOwnerListQuery,
  useDeleteAdvancedMapDatasetMutation,
  useAdvancedMapDatasetsPublicListQuery,
} from '@/features/advanced-map-datasets/hooks/use-advanced-map-datasets';
import { createDatasetCloneHandoff } from '@/features/advanced-map-datasets/store/dataset-clone-handoff';
import { getAdvancedMapDataset } from '@/features/advanced-map-datasets/api/advanced-map-datasets-api';
import { UploadedMapDatasetDialog } from '@/features/advanced-map-analytics/components/uploaded-map-dataset-dialog';
import {
  createAdvancedMapStateFromUploadedDataset,
  getPreferredUploadedMapDatasetReference,
  type UploadedMapDatasetReference,
} from '@/features/advanced-map-analytics/uploaded-map-dataset';
import { createMapCloneHandoff } from '@/features/advanced-map-analytics/store/map-clone-handoff';
import { createAdvancedMapDatasetCloneDraft } from '@/features/advanced-map-datasets/utils/clone-draft';

function isUuid(value: string | null | undefined): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function VisibilityBadge({ visibility }: { readonly visibility: string }) {
  if (visibility === 'public') {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
        <Globe className="h-3 w-3" />
        {t`Public`}
      </Badge>
    );
  }
  if (visibility === 'unlisted') {
    return (
      <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        <Eye className="h-3 w-3" />
        {t`Unlisted`}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
      <Lock className="h-3 w-3" />
      {t`Private`}
    </Badge>
  );
}

export function AdvancedMapDatasetListPage() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const ownerDatasetsQuery = useAdvancedMapDatasetsOwnerListQuery();
  const publicDatasetsQuery = useAdvancedMapDatasetsPublicListQuery();
  const deleteDatasetMutation = useDeleteAdvancedMapDatasetMutation();
  const [pendingDeleteDatasetId, setPendingDeleteDatasetId] = useState<string | null>(null);
  const [previewDatasetRef, setPreviewDatasetRef] = useState<UploadedMapDatasetReference | null>(null);
  const dateTimeLocale = getUserLocale() === 'en' ? 'en-US' : 'ro-RO';

  const pendingDeleteDataset = useMemo(
    () => ownerDatasetsQuery.data?.find((dataset) => dataset.id === pendingDeleteDatasetId) ?? null,
    [ownerDatasetsQuery.data, pendingDeleteDatasetId]
  );

  const createEmptyDatasetDraft = () => {
    navigate({
      to: '/maps/datasets/new',
      search: {
        draftId: crypto.randomUUID(),
      },
    });
  };

  const cloneDataset = async (datasetId: string) => {
    const dataset = await getAdvancedMapDataset(datasetId);
    const { token } = createDatasetCloneHandoff(createAdvancedMapDatasetCloneDraft(dataset));

    navigate({
      to: '/maps/datasets/new',
      search: {
        draftId: crypto.randomUUID(),
        cloneRef: token,
      },
    });
  };

  const handleCreateMapFromDataset = (
    selection: UploadedMapDatasetReference,
    dataset: Awaited<ReturnType<typeof getAdvancedMapDataset>>
  ) => {
    const cloneRef = createMapCloneHandoff({
      mapState: createAdvancedMapStateFromUploadedDataset(dataset, selection),
      mapDescription: dataset.description ?? '',
    });

    setPreviewDatasetRef(null);
    navigate({
      to: '/maps/editor/new',
      search: { cloneRef },
    });
  };

  if (!isLoaded || ownerDatasetsQuery.isLoading || publicDatasetsQuery.isLoading) {
    return (
      <div className="container mx-auto py-12">
        <LoadingSpinner text={t`Loading data series...`} />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto max-w-md py-12">
        <Card className="text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Database className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{t`Sign in required`}</CardTitle>
              <CardDescription className="text-sm">
                {t`You need to be signed in to manage custom data series.`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <AuthSignInButton>
              <Button size="lg" className="w-full">
                {t`Sign In`}
              </Button>
            </AuthSignInButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (ownerDatasetsQuery.error) {
    return (
      <div className="container mx-auto max-w-md py-12">
        <Card className="border-destructive/20">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Database className="h-8 w-8 text-destructive" />
            </div>
            <div className="text-center">
              <CardTitle className="text-xl">{t`Failed to load data series`}</CardTitle>
              <CardDescription className="text-sm">
                {ownerDatasetsQuery.error.message}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const ownerDatasets = ownerDatasetsQuery.data ?? [];
  const publicDatasets = publicDatasetsQuery.data ?? [];

  return (
    <>
      <div className="container mx-auto space-y-8 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{t`Custom data series`}</h1>
            <p className="text-muted-foreground">
              {t`Manage your own map-ready datasets or clone shared ones.`}
            </p>
          </div>
          <Button onClick={createEmptyDatasetDraft} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            {t`Create data series`}
          </Button>
        </div>

        {/* My Data Series Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <div>
              <h2 className="text-lg font-semibold">{t`My data series`}</h2>
              <p className="text-sm text-muted-foreground">
                {t`Edit datasets you own and reuse them across maps.`}
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {ownerDatasets.length}
            </Badge>
          </div>

          {ownerDatasets.length === 0 ? (
            <EmptyState
              icon={<Database className="h-10 w-10" />}
              title={t`No data series yet`}
              description={t`Create your first custom dataset to get started with map visualization.`}
              className="rounded-xl border-dashed py-12"
            />
          ) : (
            <div className="grid gap-3">
              {ownerDatasets.map((dataset) => (
                <Card 
                  key={dataset.id} 
                  className="group transition-all duration-200 hover:border-primary/20 hover:shadow-sm"
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="truncate text-base font-semibold">
                          {dataset.title}
                        </CardTitle>
                        <VisibilityBadge visibility={dataset.visibility} />
                      </div>
                      <CardDescription className="flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {dataset.rowCount.toLocaleString()} {t`rows`}
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{t`updated`} {new Date(dataset.updatedAt).toLocaleString(dateTimeLocale)}</span>
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
                          aria-label={t`Open options for ${dataset.title}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onSelect={() => void cloneDataset(dataset.id).catch((error) => {
                            toast.error(error instanceof Error ? error.message : t`Failed to create copy`);
                          })}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          {t`Create copy`}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setPendingDeleteDatasetId(dataset.id)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t`Delete`}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" className="gap-1">
                        <Link to="/maps/datasets/$datasetId" params={{ datasetId: dataset.id }} preload="intent">
                          {t`Open`}
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() =>
                          setPreviewDatasetRef(getPreferredUploadedMapDatasetReference(dataset))
                        }
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t`Preview on map`}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => void cloneDataset(dataset.id).catch((error) => {
                          toast.error(error instanceof Error ? error.message : t`Failed to create copy`);
                        })}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {t`Create copy`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Public Explorer Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <div>
              <h2 className="text-lg font-semibold">{t`Public explorer`}</h2>
              <p className="text-sm text-muted-foreground">
                {t`Explore public data series and clone them into your own workspace.`}
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {publicDatasets.length}
            </Badge>
          </div>

          {publicDatasets.length === 0 ? (
            <EmptyState
              icon={<Globe className="h-10 w-10" />}
              title={t`No public datasets available`}
              description={t`Public datasets will appear here when shared by the community.`}
              className="rounded-xl border-dashed py-12"
            />
          ) : (
            <div className="grid gap-3">
              {publicDatasets.map((dataset) => (
                <Card 
                  key={dataset.publicId ?? dataset.id} 
                  className="group transition-all duration-200 hover:border-emerald-200 hover:shadow-sm"
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <CardTitle className="truncate text-base font-semibold">
                        {dataset.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {dataset.rowCount.toLocaleString()} {t`rows`}
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{t`updated`} {new Date(dataset.updatedAt).toLocaleString(dateTimeLocale)}</span>
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const validPublicId = isUuid(dataset.publicId) ? dataset.publicId : null;

                        return validPublicId !== null ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                              onClick={() =>
                                setPreviewDatasetRef({
                                  source: 'public',
                                  datasetPublicId: validPublicId,
                                })
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {t`Preview on map`}
                            </Button>
                            <Button asChild size="sm" variant="ghost" className="gap-1">
                              <Link to="/maps/datasets/public/$publicId" params={{ publicId: validPublicId }} preload="intent">
                                {t`Open dataset`}
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            {t`Preview unavailable`}
                          </Button>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={pendingDeleteDatasetId !== null}
        onOpenChange={(nextOpen) => !nextOpen && setPendingDeleteDatasetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {t`Delete data series?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteDataset ? (
                <>
                  {t`This will permanently delete`} <strong>{pendingDeleteDataset.title}</strong>. {t`Unless it is still referenced by existing maps, it cannot be recovered.`}
                </>
              ) : (
                t`This will remove the dataset unless it is still referenced by existing maps.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDatasetMutation.isPending}>{t`Cancel`}</AlertDialogCancel>
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
                  }
                );
              }}
            >
              {deleteDatasetMutation.isPending ? t`Deleting...` : t`Delete`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </>
  );
}
