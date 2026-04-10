import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Copy, Database, Globe, Lock, Eye, PencilLine, RefreshCw } from 'lucide-react';
import { t } from '@lingui/core/macro';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  useAdvancedMapDatasetOwnerDetailQuery,
  useAdvancedMapDatasetPublicDetailQuery,
  useAdvancedMapDatasetsOwnerListQuery,
  useAdvancedMapDatasetsPublicListQuery,
} from '@/features/advanced-map-datasets/hooks/use-advanced-map-datasets';
import { useAdvancedMapDatasetUatDirectoryQuery } from '@/features/advanced-map-datasets/hooks/use-advanced-map-dataset-uat-directory';
import { createDatasetCloneHandoff } from '@/features/advanced-map-datasets/store/dataset-clone-handoff';
import { createAdvancedMapDatasetCloneDraft } from '@/features/advanced-map-datasets/utils/clone-draft';
import type {
  AdvancedMapDatasetDetail,
  AdvancedMapDatasetSummary,
} from '@/features/advanced-map-datasets/api/schemas';
import type { UploadedMapDatasetReference } from '@/features/advanced-map-analytics/uploaded-map-dataset';
import { formatAdvancedMapDatasetJsonValue } from '@/features/advanced-map-datasets/utils/draft';

const DATASET_TABLE_PREVIEW_ROWS = 12;

interface UploadedMapDatasetBrowserProps {
  readonly open: boolean;
  readonly currentSelection?: UploadedMapDatasetReference | null;
  readonly onApply: (selection: UploadedMapDatasetReference, dataset: AdvancedMapDatasetDetail) => void;
}

function getSelectionKey(selection: UploadedMapDatasetReference | null | undefined): string {
  if (!selection) {
    return 'none';
  }

  return selection.source === 'owner'
    ? `owner:${selection.datasetId}`
    : `public:${selection.datasetPublicId}`;
}

function buildOwnerSelection(dataset: Pick<AdvancedMapDatasetSummary, 'id'>): UploadedMapDatasetReference {
  return {
    source: 'owner',
    datasetId: dataset.id,
  };
}

function buildPublicSelection(
  dataset: Pick<AdvancedMapDatasetSummary, 'publicId'>
): UploadedMapDatasetReference | null {
  if (typeof dataset.publicId !== 'string' || dataset.publicId.trim().length === 0) {
    return null;
  }

  return {
    source: 'public',
    datasetPublicId: dataset.publicId,
  };
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

function openInNewTab(pathname: string, searchParams?: URLSearchParams): void {
  if (typeof window === 'undefined') {
    return;
  }

  const href = searchParams && Array.from(searchParams.keys()).length > 0
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  window.open(href, '_blank', 'noopener,noreferrer');
}

const VISIBILITY_META: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
  public: { icon: <Globe className="h-3 w-3" />, className: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: t`Public` },
  unlisted: { icon: <Eye className="h-3 w-3" />, className: 'border-amber-200 bg-amber-50 text-amber-700', label: t`Unlisted` },
  private: { icon: <Lock className="h-3 w-3" />, className: 'border-slate-200 bg-slate-50 text-slate-700', label: t`Private` },
};

function DatasetRow({
  dataset,
  selection,
  isSelected,
  onSelect,
}: Readonly<{
  dataset: AdvancedMapDatasetSummary;
  selection: UploadedMapDatasetReference;
  isSelected: boolean;
  onSelect: (selection: UploadedMapDatasetReference) => void;
}>) {
  const meta = VISIBILITY_META[dataset.visibility] ?? VISIBILITY_META.private;

  return (
    <button
      type="button"
      onClick={() => onSelect(selection)}
      className={cn(
        'flex w-full items-start gap-4 rounded-md px-3 py-2.5 text-left transition-colors',
        isSelected
          ? 'bg-primary/5 outline outline-1 outline-primary'
          : 'hover:bg-muted/40'
      )}
      aria-pressed={isSelected}
    >
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">{dataset.title}</span>
        {dataset.description?.trim() ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{dataset.description.trim()}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-4 pt-0.5">
        <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
          {dataset.rowCount.toLocaleString()} {t`rows`}
        </span>
        <span className="w-12 text-right text-xs text-muted-foreground">{dataset.unit?.trim() || '\u2014'}</span>
        <Badge variant="outline" className={cn('gap-1 text-[10px] px-1.5 py-0 min-w-[62px] justify-center', meta.className)}>
          {meta.icon}
          {meta.label}
        </Badge>
      </div>
    </button>
  );
}

function DatasetListContent({
  datasets,
  isLoading,
  errorMessage,
  selectedDatasetRef,
  onSelect,
  onRetry,
  buildSelection,
  emptyTitle,
  emptyDescription,
}: Readonly<{
  datasets: readonly AdvancedMapDatasetSummary[];
  isLoading: boolean;
  errorMessage: string | null;
  selectedDatasetRef: UploadedMapDatasetReference | null;
  onSelect: (selection: UploadedMapDatasetReference) => void;
  onRetry: () => void;
  buildSelection: (dataset: AdvancedMapDatasetSummary) => UploadedMapDatasetReference | null;
  emptyTitle: string;
  emptyDescription: string;
}>) {
  if (isLoading) {
    return (
      <div className="flex h-56 items-center justify-center">
        <LoadingSpinner text={t`Loading datasets...`} />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-3">
        <EmptyState
          icon={<Database className="h-5 w-5" />}
          title={t`Failed to load datasets`}
          description={errorMessage}
        />
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t`Try again`}
          </Button>
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <EmptyState
        icon={<Database className="h-5 w-5" />}
        title={emptyTitle}
        description={emptyDescription}
        className="min-h-56"
      />
    );
  }

  return (
    <ScrollArea className="h-56 pr-1">
      <div className="space-y-1">
        {datasets.map((dataset) => {
          const selection = buildSelection(dataset);
          if (!selection) {
            return null;
          }

          return (
            <DatasetRow
              key={selection.source === 'owner' ? dataset.id : dataset.publicId ?? dataset.id}
              dataset={dataset}
              selection={selection}
              isSelected={getSelectionKey(selectedDatasetRef) === getSelectionKey(selection)}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function UploadedMapDatasetBrowser({
  open,
  currentSelection = null,
  onApply,
}: Readonly<UploadedMapDatasetBrowserProps>) {
  const navigate = useNavigate();
  const { isSignedIn, user } = useAuth();
  const [selectedDatasetRef, setSelectedDatasetRef] = useState<UploadedMapDatasetReference | null>(
    currentSelection
  );

  const ownerDatasetsQuery = useAdvancedMapDatasetsOwnerListQuery(undefined, open && isSignedIn);
  const publicDatasetsQuery = useAdvancedMapDatasetsPublicListQuery(undefined, open);
  const uatDirectoryQuery = useAdvancedMapDatasetUatDirectoryQuery();

  const publicDatasets = useMemo(
    () => (publicDatasetsQuery.data ?? []).filter((dataset) => buildPublicSelection(dataset) !== null),
    [publicDatasetsQuery.data]
  );
  const normalizedCurrentSelection = useMemo<UploadedMapDatasetReference | null>(() => {
    if (!currentSelection) {
      return null;
    }

    return currentSelection.source === 'owner'
      ? {
          source: 'owner',
          datasetId: currentSelection.datasetId,
        }
      : {
          source: 'public',
          datasetPublicId: currentSelection.datasetPublicId,
        };
  }, [currentSelection]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedDatasetRef(normalizedCurrentSelection);
  }, [normalizedCurrentSelection, open]);

  useEffect(() => {
    if (!open || selectedDatasetRef !== null) {
      return;
    }

    const firstOwnerDataset = ownerDatasetsQuery.data?.[0];
    if (firstOwnerDataset) {
      setSelectedDatasetRef(buildOwnerSelection(firstOwnerDataset));
      return;
    }

    const firstPublicDataset = publicDatasets[0];
    const publicSelection = firstPublicDataset ? buildPublicSelection(firstPublicDataset) : null;
    if (publicSelection) {
      setSelectedDatasetRef(publicSelection);
    }
  }, [open, ownerDatasetsQuery.data, publicDatasets, selectedDatasetRef]);

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
  const isSelectedDatasetLoading = Boolean(selectedDatasetRef) && selectedDatasetQuery.isLoading;
  const isOwnedByCurrentUser = selectedDataset?.userId === user?.id;
  const previewRows = selectedDataset?.rows.slice(0, DATASET_TABLE_PREVIEW_ROWS) ?? [];

  const defaultTab = (normalizedCurrentSelection?.source === 'public' ? 'public' : 'owner') as string;

  const handleSelectAndApply = (selection: UploadedMapDatasetReference) => {
    setSelectedDatasetRef(selection);
  };

  useEffect(() => {
    if (!selectedDatasetRef || !selectedDataset) {
      return;
    }

    if (getSelectionKey(currentSelection) === getSelectionKey(selectedDatasetRef)) {
      return;
    }

    onApply(selectedDatasetRef, selectedDataset);
  }, [selectedDatasetRef, selectedDataset, currentSelection, onApply]);

  const handleEditDataset = () => {
    if (!selectedDataset) {
      return;
    }

    openInNewTab(`/maps/datasets/${selectedDataset.id}`);
  };

  const handleCloneDataset = () => {
    if (!selectedDataset) {
      return;
    }

    const draftId = crypto.randomUUID();
    const { token, persistedToLocalStorage } = createDatasetCloneHandoff(
      createAdvancedMapDatasetCloneDraft(selectedDataset)
    );
    const searchParams = new URLSearchParams({
      draftId,
      cloneRef: token,
    });

    if (persistedToLocalStorage) {
      openInNewTab('/maps/datasets/new', searchParams);
      return;
    }

    toast.warning(t`Browser storage is unavailable. Opening the dataset copy in the current tab instead.`);
    void navigate({
      to: '/maps/datasets/new',
      search: {
        draftId,
        cloneRef: token,
      },
    });
  };

  const uatBySiruta = uatDirectoryQuery.data?.bySirutaCode;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border overflow-hidden">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="flex w-full justify-start rounded-none border-b bg-muted/30 px-3">
            <TabsTrigger value="owner" className="gap-2 text-xs">
              {t`Your datasets`}
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {ownerDatasetsQuery.data?.length ?? 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="public" className="gap-2 text-xs">
              {t`Public datasets`}
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {publicDatasets.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="owner" className="p-2 mt-0">
            {isSignedIn ? (
              <DatasetListContent
                datasets={ownerDatasetsQuery.data ?? []}
                isLoading={ownerDatasetsQuery.isLoading}
                errorMessage={ownerDatasetsQuery.error?.message ?? null}
                selectedDatasetRef={selectedDatasetRef}
                onSelect={handleSelectAndApply}
                onRetry={() => {
                  void ownerDatasetsQuery.refetch();
                }}
                buildSelection={buildOwnerSelection}
                emptyTitle={t`No owned datasets yet`}
                emptyDescription={t`Create or upload a dataset to make it available here.`}
              />
            ) : (
              <EmptyState
                icon={<Database className="h-5 w-5" />}
                title={t`Sign in to browse owned datasets`}
                description={t`Public datasets are still available in the shared list.`}
                className="min-h-56"
              />
            )}
          </TabsContent>

          <TabsContent value="public" className="p-2 mt-0">
            <DatasetListContent
              datasets={publicDatasets}
              isLoading={publicDatasetsQuery.isLoading}
              errorMessage={publicDatasetsQuery.error?.message ?? null}
              selectedDatasetRef={selectedDatasetRef}
              onSelect={handleSelectAndApply}
              onRetry={() => {
                void publicDatasetsQuery.refetch();
              }}
              buildSelection={buildPublicSelection}
              emptyTitle={t`No public datasets available`}
              emptyDescription={t`Shared datasets will appear here when they are published or unlisted for reuse.`}
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t`Preview`}</span>

          {selectedDataset && selectedDatasetRef ? (
            <div className="flex items-center gap-1.5">
              {isOwnedByCurrentUser ? (
                <Button type="button" variant="outline" size="sm" onClick={handleEditDataset} className="h-7 gap-1.5 text-xs">
                  <PencilLine className="h-3 w-3" />
                  {t`Edit dataset`}
                </Button>
              ) : selectedDatasetRef.source === 'public' ? (
                <Button type="button" variant="outline" size="sm" onClick={handleCloneDataset} className="h-7 gap-1.5 text-xs">
                  <Copy className="h-3 w-3" />
                  {t`Clone dataset`}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {!selectedDatasetRef ? (
          <div className="px-4 py-8">
            <EmptyState
              icon={<Database className="h-5 w-5" />}
              title={t`No dataset selected`}
              description={t`Pick a dataset from the list above.`}
            />
          </div>
        ) : isSelectedDatasetLoading ? (
          <div className="flex min-h-[200px] items-center justify-center px-4 py-8">
            <LoadingSpinner text={t`Loading dataset details...`} />
          </div>
        ) : selectedDatasetQuery.error ? (
          <div className="px-4 py-6 space-y-3">
            <EmptyState
              icon={<Database className="h-5 w-5" />}
              title={t`Failed to load dataset details`}
              description={selectedDatasetQuery.error.message}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void selectedDatasetQuery.refetch()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {t`Try again`}
              </Button>
            </div>
          </div>
        ) : !selectedDataset ? (
          <div className="px-4 py-8">
            <EmptyState
              icon={<Database className="h-5 w-5" />}
              title={t`Dataset unavailable`}
              description={t`The selected dataset could not be resolved from the server.`}
            />
          </div>
        ) : (
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{selectedDataset.title}</p>
                {selectedDataset.description?.trim() ? (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{selectedDataset.description.trim()}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                <span>{selectedDataset.rowCount.toLocaleString()} {t`rows`}</span>
                <span>{selectedDataset.unit?.trim() || t`No unit`}</span>
              </div>
            </div>

            {previewRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-xs h-8">#</TableHead>
                    <TableHead className="text-xs h-8">{t`UAT`}</TableHead>
                    <TableHead className="text-xs h-8">{t`County`}</TableHead>
                    <TableHead className="text-xs h-8">{t`SIRUTA`}</TableHead>
                    <TableHead className="text-right text-xs h-8">{t`Value`}</TableHead>
                    <TableHead className="text-xs h-8">{t`Payload`}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, index) => {
                    const uat = uatBySiruta?.get(row.sirutaCode);
                    return (
                      <TableRow key={`${row.sirutaCode}:${index}`}>
                        <TableCell className="text-muted-foreground text-xs py-1.5">{index + 1}</TableCell>
                        <TableCell className="text-xs py-1.5">{uat?.name ?? '\u2014'}</TableCell>
                        <TableCell className="text-xs py-1.5 text-muted-foreground">{uat?.countyName ?? '\u2014'}</TableCell>
                        <TableCell className="font-mono text-xs py-1.5">{row.sirutaCode}</TableCell>
                        <TableCell className="text-right font-mono text-xs py-1.5">{row.valueNumber ?? '\u2014'}</TableCell>
                        <TableCell className="text-xs py-1.5 text-muted-foreground">
                          {row.valueJson ? `${row.valueJson.type}: ${formatAdvancedMapDatasetJsonValue(row.valueJson)}` : '\u2014'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={<Database className="h-5 w-5" />}
                title={t`No rows available`}
                description={t`This dataset does not currently expose any persisted rows.`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
