import { useEffect, useMemo, useState } from 'react';
import { Globe, Lock, Eye } from 'lucide-react';
import { t } from '@lingui/core/macro';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { cn, getUserLocale } from '@/lib/utils';
import {
  useAdvancedMapDatasetOwnerDetailQuery,
  useAdvancedMapDatasetPublicDetailQuery,
  useAdvancedMapDatasetsOwnerListQuery,
  useAdvancedMapDatasetsPublicListQuery,
} from '@/features/advanced-map-datasets/hooks/use-advanced-map-datasets';
import type {
  AdvancedMapDatasetDetail,
  AdvancedMapDatasetSummary,
} from '@/features/advanced-map-datasets/api/schemas';
import {
  createAdvancedMapStateFromUploadedDataset,
  getPreferredUploadedMapDatasetReference,
  type UploadedMapDatasetReference,
} from '@/features/advanced-map-analytics/uploaded-map-dataset';
import { useMapPreviewRuntimeState } from '@/features/advanced-map-analytics/hooks/use-map-preview-runtime-state';
import { MapAnalyticsWorkspace } from '@/features/advanced-map-analytics/components/map-analytics-workspace';

type UploadedMapDatasetDialogMode = 'launch-map' | 'select-series';

interface UploadedMapDatasetDialogProps {
  open: boolean;
  mode: UploadedMapDatasetDialogMode;
  initialSelection?: UploadedMapDatasetReference | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selection: UploadedMapDatasetReference, dataset: AdvancedMapDatasetDetail) => void;
}

type DatasetTabValue = 'owner' | 'public';

function getSelectionKey(selection: UploadedMapDatasetReference | null): string {
  if (!selection) {
    return 'none';
  }

  return selection.source === 'owner'
    ? `owner:${selection.datasetId}`
    : `public:${selection.datasetPublicId}`;
}

function matchesDatasetSelection(
  selection: UploadedMapDatasetReference,
  dataset: AdvancedMapDatasetDetail | null | undefined
): dataset is AdvancedMapDatasetDetail {
  if (!dataset) {
    return false;
  }

  return selection.source === 'owner'
    ? dataset.id === selection.datasetId
    : dataset.publicId === selection.datasetPublicId;
}

function getSelectedDatasetDetail(
  selection: UploadedMapDatasetReference | null,
  ownerDataset: AdvancedMapDatasetDetail | null | undefined,
  publicDataset: AdvancedMapDatasetDetail | null | undefined
): AdvancedMapDatasetDetail | null {
  if (!selection) {
    return null;
  }

  const candidate = selection.source === 'owner' ? ownerDataset : publicDataset;
  return matchesDatasetSelection(selection, candidate) ? candidate : null;
}

function getDatasetVisibilityBadge(visibility: string) {
  if (visibility === 'public') {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
        <Globe className="h-3 w-3" />
        {t`Public`}
      </Badge>
    );
  }

  if (visibility === 'unlisted') {
    return (
      <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
        <Eye className="h-3 w-3" />
        {t`Unlisted`}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 border-slate-200 bg-slate-50 text-slate-700">
      <Lock className="h-3 w-3" />
      {t`Private`}
    </Badge>
  );
}

function DatasetPreviewWorkspace({
  selection,
  dataset,
}: Readonly<{
  selection: UploadedMapDatasetReference;
  dataset: AdvancedMapDatasetDetail;
}>) {
  const mapStateDefinition = useMemo(
    () => createAdvancedMapStateFromUploadedDataset(dataset, selection),
    [dataset, selection]
  );
  const { mapState, setMapState } = useMapPreviewRuntimeState({
    mapKey: `uploaded-dataset-preview:${getSelectionKey(selection)}`,
    mapStateDefinition,
    forceMapActiveView: true,
  });

  return (
    <MapAnalyticsWorkspace
      mode="public"
      layout="preview"
      mapState={mapState}
      setMapState={setMapState}
      mapDescription={dataset.description ?? ''}
      capabilities={{ readOnly: true }}
      previewContainerClassName="rounded-xl border"
    />
  );
}

function DatasetSummaryButton({
  dataset,
  isSelected,
  onSelect,
}: Readonly<{
  dataset: AdvancedMapDatasetSummary;
  isSelected: boolean;
  onSelect: () => void;
}>) {
  const dateTimeLocale = getUserLocale() === 'en' ? 'en-US' : 'ro-RO';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border px-3 py-3 text-left transition-colors',
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{dataset.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {dataset.rowCount.toLocaleString()} {t`rows`}
          </p>
        </div>
        {getDatasetVisibilityBadge(dataset.visibility)}
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
        {dataset.description?.trim() || t`No description`}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {t`Updated`} {new Date(dataset.updatedAt).toLocaleString(dateTimeLocale)}
      </p>
    </button>
  );
}

export function UploadedMapDatasetDialog({
  open,
  mode,
  initialSelection = null,
  onOpenChange,
  onConfirm,
}: Readonly<UploadedMapDatasetDialogProps>) {
  const { isSignedIn } = useAuth();
  const [selectedTab, setSelectedTab] = useState<DatasetTabValue>(
    initialSelection?.source === 'public' ? 'public' : 'owner'
  );
  const [selectedDatasetRef, setSelectedDatasetRef] = useState<UploadedMapDatasetReference | null>(
    initialSelection
  );

  const ownerDatasetsQuery = useAdvancedMapDatasetsOwnerListQuery(undefined, open && mode === 'select-series' && isSignedIn);
  const publicDatasetsQuery = useAdvancedMapDatasetsPublicListQuery(undefined, open && mode === 'select-series');

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedTab(initialSelection?.source === 'public' ? 'public' : 'owner');
    setSelectedDatasetRef(initialSelection);
  }, [initialSelection, open]);

  useEffect(() => {
    if (!open || mode !== 'select-series' || selectedDatasetRef !== null) {
      return;
    }

    const firstOwnerDataset = ownerDatasetsQuery.data?.[0];
    if (firstOwnerDataset) {
      setSelectedDatasetRef(getPreferredUploadedMapDatasetReference(firstOwnerDataset));
      setSelectedTab(
        getPreferredUploadedMapDatasetReference(firstOwnerDataset).source === 'public' ? 'public' : 'owner'
      );
      return;
    }

    const firstPublicDataset = publicDatasetsQuery.data?.find((dataset) => dataset.publicId !== null);
    if (firstPublicDataset?.publicId) {
      setSelectedDatasetRef({
        source: 'public',
        datasetPublicId: firstPublicDataset.publicId,
      });
      setSelectedTab('public');
    }
  }, [mode, open, ownerDatasetsQuery.data, publicDatasetsQuery.data, selectedDatasetRef]);

  const ownerDetailQuery = useAdvancedMapDatasetOwnerDetailQuery(
    selectedDatasetRef?.source === 'owner' ? selectedDatasetRef.datasetId : '',
    open && selectedDatasetRef?.source === 'owner'
  );
  const publicDetailQuery = useAdvancedMapDatasetPublicDetailQuery(
    selectedDatasetRef?.source === 'public' ? selectedDatasetRef.datasetPublicId : '',
    open && selectedDatasetRef?.source === 'public'
  );

  const selectedDatasetQuery = selectedDatasetRef?.source === 'owner' ? ownerDetailQuery : publicDetailQuery;
  const selectedDataset = getSelectedDatasetDetail(
    selectedDatasetRef,
    ownerDetailQuery.data,
    publicDetailQuery.data
  );
  const selectedDatasetError = selectedDatasetRef ? selectedDatasetQuery.error : null;
  const isSelectedDatasetLoading = Boolean(selectedDatasetRef) && selectedDatasetQuery.isLoading;
  const isBrowserVisible = mode === 'select-series';

  const handleConfirm = () => {
    if (!selectedDatasetRef || !selectedDataset) {
      return;
    }

    onConfirm(selectedDatasetRef, selectedDataset);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl overflow-hidden p-0 sm:max-h-[90vh]">
        <div className={cn('grid min-h-0', isBrowserVisible ? 'md:grid-cols-[300px_minmax(0,1fr)]' : 'grid-cols-1')}>
          {isBrowserVisible ? (
            <aside className="border-r bg-muted/20">
              <div className="border-b px-5 py-4">
                <DialogHeader className="text-left">
                  <DialogTitle>{t`Choose dataset`}</DialogTitle>
                  <DialogDescription>
                    {t`Browse your datasets or shared datasets, then preview the map before selecting.`}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="px-5 py-4">
                <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as DatasetTabValue)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="owner">{t`My data series`}</TabsTrigger>
                    <TabsTrigger value="public">{t`Public explorer`}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="owner" className="mt-3">
                    <ScrollArea className="h-[62vh] pr-3">
                      <div className="space-y-2">
                        {ownerDatasetsQuery.isLoading ? (
                          <LoadingSpinner text={t`Loading your datasets...`} />
                        ) : (ownerDatasetsQuery.data ?? []).length === 0 ? (
                          <p className="rounded-xl border border-dashed px-3 py-6 text-sm text-muted-foreground">
                            {t`No owned datasets available.`}
                          </p>
                        ) : (
                          (ownerDatasetsQuery.data ?? []).map((dataset) => (
                            <DatasetSummaryButton
                              key={dataset.id}
                              dataset={dataset}
                              isSelected={
                                getSelectionKey(selectedDatasetRef) ===
                                getSelectionKey(getPreferredUploadedMapDatasetReference(dataset))
                              }
                              onSelect={() => setSelectedDatasetRef(getPreferredUploadedMapDatasetReference(dataset))}
                            />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="public" className="mt-3">
                    <ScrollArea className="h-[62vh] pr-3">
                      <div className="space-y-2">
                        {publicDatasetsQuery.isLoading ? (
                          <LoadingSpinner text={t`Loading shared datasets...`} />
                        ) : (publicDatasetsQuery.data ?? []).length === 0 ? (
                          <p className="rounded-xl border border-dashed px-3 py-6 text-sm text-muted-foreground">
                            {t`No public datasets available.`}
                          </p>
                        ) : (
                          (publicDatasetsQuery.data ?? [])
                            .filter((dataset) => dataset.publicId !== null)
                            .map((dataset) => (
                              <DatasetSummaryButton
                                key={dataset.publicId ?? dataset.id}
                                dataset={dataset}
                                isSelected={
                                  selectedDatasetRef?.source === 'public' &&
                                  selectedDatasetRef.datasetPublicId === dataset.publicId
                                }
                                onSelect={() =>
                                  setSelectedDatasetRef({
                                    source: 'public',
                                    datasetPublicId: dataset.publicId!,
                                  })
                                }
                              />
                            ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            </aside>
          ) : null}

          <section className="flex min-h-0 flex-col">
            <div className="border-b px-5 py-4">
              <DialogHeader className="text-left">
                <DialogTitle>
                  {mode === 'launch-map' ? t`Preview dataset on map` : t`Preview selection`}
                </DialogTitle>
                <DialogDescription>
                  {mode === 'launch-map'
                    ? t`This preview uses the persisted dataset state from the server.`
                    : t`The map preview uses only the persisted dataset state from the server.`}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
              {isSelectedDatasetLoading ? (
                <div className="flex min-h-[520px] items-center justify-center">
                  <LoadingSpinner text={t`Loading dataset preview...`} />
                </div>
              ) : selectedDatasetError ? (
                <Card className="border-destructive/30">
                  <CardHeader>
                    <CardTitle className="text-base">{t`Failed to load dataset preview`}</CardTitle>
                    <CardDescription>{selectedDatasetError.message}</CardDescription>
                  </CardHeader>
                </Card>
              ) : !selectedDataset || !selectedDatasetRef ? (
                <Card className="border-dashed">
                  <CardContent className="flex min-h-[520px] items-center justify-center text-sm text-muted-foreground">
                    {t`Select a dataset to preview it on the map.`}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-lg">{selectedDataset.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {selectedDataset.rowCount.toLocaleString()} {t`rows`}
                          </CardDescription>
                        </div>
                        {getDatasetVisibilityBadge(selectedDataset.visibility)}
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border bg-muted/20 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t`Unit`}</p>
                        <p className="mt-1 text-sm font-medium">{selectedDataset.unit || '—'}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t`Reference`}</p>
                        <p className="mt-1 truncate font-mono text-xs">
                          {selectedDatasetRef.source === 'owner'
                            ? selectedDatasetRef.datasetId
                            : selectedDatasetRef.datasetPublicId}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t`Map source`}</p>
                        <p className="mt-1 text-sm font-medium">
                          {selectedDatasetRef.source === 'owner' ? t`Owner dataset` : t`Shareable dataset`}
                        </p>
                      </div>
                      {selectedDataset.description ? (
                        <div className="rounded-lg border bg-muted/20 px-3 py-2 sm:col-span-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t`Description`}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{selectedDataset.description}</p>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>

                  <DatasetPreviewWorkspace selection={selectedDatasetRef} dataset={selectedDataset} />
                </>
              )}
            </div>

            <div className="border-t px-5 py-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t`Close`}
                </Button>
                <Button type="button" onClick={handleConfirm} disabled={!selectedDataset || !selectedDatasetRef}>
                  {mode === 'launch-map' ? t`Create map with this dataset` : t`Use this dataset`}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
