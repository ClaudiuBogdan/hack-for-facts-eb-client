import { useBlocker, useNavigate } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ClipboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ChevronDown, Copy, Database, Download, FileJson, FileSpreadsheet, HardDrive, Loader2, Redo2, Save, Search, Undo2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@lingui/core/macro';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AuthSignInButton, useAuth } from '@/lib/auth';
import type { PublicMapViewport } from '@/features/advanced-map-analytics/hooks/use-public-map-viewport';
import {
  useAdvancedMapDatasetOwnerDetailQuery,
  useCreateAdvancedMapDatasetMutation,
  useReplaceAdvancedMapDatasetRowsMutation,
  useUpdateAdvancedMapDatasetMetadataMutation,
} from '@/features/advanced-map-datasets/hooks/use-advanced-map-datasets';
import { useAdvancedMapDatasetEditorInitialState } from '@/features/advanced-map-datasets/hooks/use-advanced-map-dataset-editor-initial-state';
import { useAdvancedMapDatasetLocalSnapshots } from '@/features/advanced-map-datasets/hooks/use-advanced-map-dataset-local-snapshots';
import { useAdvancedMapDatasetStorageFallbackWarning } from '@/features/advanced-map-datasets/hooks/use-advanced-map-dataset-storage-fallback-warning';
import { useAdvancedMapDatasetUatDirectoryQuery } from '@/features/advanced-map-datasets/hooks/use-advanced-map-dataset-uat-directory';
import { migrateLocalDatasetSnapshotsResourceKey } from '@/features/advanced-map-datasets/local-snapshots/local-dataset-snapshots-db';
import { DatasetImportDialog } from '@/features/advanced-map-datasets/components/dataset-import-dialog';
import { DatasetEditorMapPreview } from '@/features/advanced-map-datasets/components/dataset-editor-map-preview';
import { DatasetEditorUatDialog } from '@/features/advanced-map-datasets/components/dataset-editor-uat-dialog';
import { DatasetLocalSnapshotsModal } from '@/features/advanced-map-datasets/components/dataset-local-snapshots-modal';
import { DatasetUnsavedChangesDialog } from '@/features/advanced-map-datasets/components/dataset-unsaved-changes-dialog';
import { consumeDatasetCloneHandoff, createDatasetCloneHandoff } from '@/features/advanced-map-datasets/store/dataset-clone-handoff';
import {
  migrateAdvancedMapDatasetDraftStorage,
  useDatasetEditorDraftStore,
} from '@/features/advanced-map-datasets/store/dataset-editor-draft-store';
import { useAdvancedMapDatasetDraftHistory } from '@/features/advanced-map-datasets/hooks/use-advanced-map-dataset-draft-history';
import {
  createComparableAdvancedMapDatasetDraftHash,
  createComparableAdvancedMapDatasetRowsHash,
  formatAdvancedMapDatasetJsonValue,
  getAdvancedMapDatasetRowNumberText,
  hydrateAdvancedMapDatasetDraftWithReferenceRows,
  parseAdvancedMapDatasetFileImport,
  parseAdvancedMapDatasetTextImport,
  parseDatasetValueText,
  serializeAdvancedMapDatasetRowsToCsv,
  serializeAdvancedMapDatasetToJson,
  validateAdvancedMapDatasetDraftForSave,
} from '@/features/advanced-map-datasets/utils/draft';
import {
  createEmptyAdvancedMapDatasetDraft,
  type AdvancedMapDatasetImportIssue,
  type AdvancedMapDatasetDraft,
  type AdvancedMapDatasetPayloadDraft,
  type AdvancedMapDatasetDraftRow,
  type AdvancedMapDatasetReferenceRow,
  hasAdvancedMapDatasetPayloadDraftData,
  resolveAdvancedMapDatasetPayloadDraft,
} from '@/features/advanced-map-datasets/types';
import type { DatasetEditorValuesView } from '@/features/advanced-map-datasets/utils/dataset-editor-route-search';
import { matchesAdvancedMapDatasetRowSearch } from '@/features/advanced-map-datasets/utils/search';
import {
  mergeAdvancedMapDatasetClipboardRowsIntoDraft,
  serializeAdvancedMapDatasetRowsToClipboardTsv,
  tryParseAdvancedMapDatasetTabularPaste,
} from '@/features/advanced-map-datasets/utils/clipboard';

interface AdvancedMapDatasetEditorPageProps {
  mode: 'new' | 'edit';
  resourceKey: string;
  datasetId?: string;
  cloneRef?: string;
  valuesView: DatasetEditorValuesView;
  onValuesViewChange: (nextView: DatasetEditorValuesView) => void;
  mapZoomOverride?: number;
  mapCenterOverride?: [number, number];
  onMapViewportChange?: (nextViewport: PublicMapViewport) => void;
}

type BufferedDatasetMetadata = Readonly<Pick<
  AdvancedMapDatasetDraft,
  'title' | 'unit' | 'description' | 'markdown'
>>;

const METADATA_COMMIT_DELAY_MS = 500;
const ROW_VALUE_COMMIT_DELAY_MS = 500;

interface DatasetRowValueInputProps {
  value: string;
  placeholder: string;
  className?: string;
  onCommit: (nextValue: string) => void;
}

function DatasetRowValueInput({
  value,
  placeholder,
  className,
  onCommit,
}: Readonly<DatasetRowValueInputProps>) {
  const [draftValue, setDraftValue] = useState(value);
  const latestValueRef = useRef(value);
  const onCommitRef = useRef(onCommit);
  const pendingCommitTimeoutRef = useRef<number | null>(null);
  const hasPendingCommitRef = useRef(false);

  useEffect(() => {
    latestValueRef.current = value;
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  const clearPendingCommit = () => {
    if (pendingCommitTimeoutRef.current !== null) {
      window.clearTimeout(pendingCommitTimeoutRef.current);
      pendingCommitTimeoutRef.current = null;
    }
  };

  const flushPendingCommit = (nextValue: string = latestValueRef.current) => {
    clearPendingCommit();

    if (!hasPendingCommitRef.current) {
      return;
    }

    hasPendingCommitRef.current = false;
    onCommitRef.current(nextValue);
  };

  useEffect(() => () => {
    flushPendingCommit();
  }, []);

  return (
    <Input
      value={draftValue}
      onChange={(event) => {
        const nextValue = event.currentTarget.value;
        latestValueRef.current = nextValue;
        setDraftValue(nextValue);
        hasPendingCommitRef.current = true;
        clearPendingCommit();
        pendingCommitTimeoutRef.current = window.setTimeout(() => {
          flushPendingCommit(nextValue);
        }, ROW_VALUE_COMMIT_DELAY_MS);
      }}
      onBlur={() => flushPendingCommit()}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
          return;
        }

        event.preventDefault();
        flushPendingCommit(latestValueRef.current);
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

function mergeDraftWithReferenceRows(
  resourceKey: string,
  referenceRows: AdvancedMapDatasetReferenceRow[],
  clonedDraft: AdvancedMapDatasetDraft
): AdvancedMapDatasetDraft {
  const clonedRowsBySirutaCode = new Map(clonedDraft.rows.map((row) => [row.sirutaCode, row]));

  return {
    ...createEmptyAdvancedMapDatasetDraft(resourceKey, referenceRows),
    metadata: {
      ...createEmptyAdvancedMapDatasetDraft(resourceKey, referenceRows).metadata,
      title: clonedDraft.title,
      description: clonedDraft.description,
      markdownText: clonedDraft.markdown,
      markdown: clonedDraft.markdown,
      unit: clonedDraft.unit,
      visibility: 'private',
    },
    title: clonedDraft.title,
    description: clonedDraft.description,
    markdown: clonedDraft.markdown,
    unit: clonedDraft.unit,
    visibility: 'private',
    updatedAt: clonedDraft.updatedAt,
    rows: referenceRows.map((referenceRow) => {
      const clonedRow = clonedRowsBySirutaCode.get(referenceRow.sirutaCode);
      const clonedValueText = getAdvancedMapDatasetRowNumberText(clonedRow ?? { valueNumber: '' });
      if (!clonedRow) {
        return {
          ...referenceRow,
          valueNumber: '',
          valueJson: null,
          payloadDraft: null,
          value: '',
          rawValue: '',
          valueText: '',
          source: 'manual',
          importedFrom: 'manual',
          isEmpty: true,
          parsedNumericValue: null,
          payloadValidationMessage: null,
          validationMessage: null,
          validationError: null,
        };
      }

      return {
        ...referenceRow,
        valueNumber: clonedValueText,
        valueJson: clonedRow.valueJson ?? null,
        payloadDraft: clonedRow.payloadDraft ?? null,
        value: clonedValueText,
        rawValue: clonedValueText,
        valueText: clonedValueText,
        source: clonedRow.source,
        importedFrom: clonedRow.importedFrom,
        isEmpty: clonedValueText.trim() === '' && clonedRow.valueJson === null && !hasAdvancedMapDatasetPayloadDraftData(clonedRow.payloadDraft),
        parsedNumericValue: clonedRow.parsedNumericValue,
        payloadValidationMessage: clonedRow.payloadValidationMessage ?? null,
        validationMessage: clonedRow.validationMessage,
        validationError: clonedRow.validationError,
      };
    }),
    rowsBySirutaCode: Object.fromEntries(
      referenceRows.map((referenceRow) => {
        const clonedRow = clonedRowsBySirutaCode.get(referenceRow.sirutaCode);
        const valueText = getAdvancedMapDatasetRowNumberText(clonedRow ?? { valueNumber: '' });
        return [
          referenceRow.sirutaCode,
          {
            ...referenceRow,
            valueNumber: valueText,
            valueJson: clonedRow?.valueJson ?? null,
            payloadDraft: clonedRow?.payloadDraft ?? null,
            value: valueText,
            rawValue: valueText,
            valueText,
            source: clonedRow?.source ?? 'manual',
            importedFrom: clonedRow?.importedFrom ?? 'manual',
            isEmpty: valueText.trim() === '' && (clonedRow?.valueJson ?? null) === null && !hasAdvancedMapDatasetPayloadDraftData(clonedRow?.payloadDraft),
            parsedNumericValue: clonedRow?.parsedNumericValue ?? null,
            payloadValidationMessage: clonedRow?.payloadValidationMessage ?? null,
            validationMessage: clonedRow?.validationMessage ?? null,
            validationError: clonedRow?.validationError ?? null,
          },
        ];
      })
    ),
  };
}

function createCloneDraftFromCurrentDraft(draft: AdvancedMapDatasetDraft): AdvancedMapDatasetDraft {
  return {
    ...draft,
    resourceKey: 'clone',
    draftId: null,
    datasetId: null,
    publicId: null,
    metadata: {
      ...draft.metadata,
      title: draft.title.trim() === '' ? '' : `Copy of ${draft.title}`,
      description: draft.description,
      markdownText: draft.markdown,
      markdown: draft.markdown,
      unit: draft.unit,
      visibility: 'private',
    },
    title: draft.title.trim() === '' ? '' : `Copy of ${draft.title}`,
    visibility: 'private',
    updatedAt: new Date().toISOString(),
  };
}

function hasDraftRowData(
  row: Pick<AdvancedMapDatasetDraftRow, 'valueNumber' | 'valueJson' | 'payloadDraft' | 'rawValue' | 'valueText' | 'value'>
): boolean {
  return getAdvancedMapDatasetRowNumberText(row).trim() !== '' || row.valueJson !== null || hasAdvancedMapDatasetPayloadDraftData(row.payloadDraft);
}

function formatPayloadSummary(row: Pick<AdvancedMapDatasetDraftRow, 'valueJson' | 'payloadDraft'>): string {
  const payloadState = resolveAdvancedMapDatasetPayloadDraft(row.payloadDraft, row.valueJson);
  const payloadDraft = payloadState.payloadDraft;

  if (!payloadState.hasDraftData && payloadDraft.type === 'none') {
    return t`No payload`;
  }

  if (payloadDraft.type === 'link') {
    const label = payloadDraft.linkLabel.trim();
    const url = payloadDraft.value.trim();
    const content = label !== '' ? `${label} | ${url}` : url;
    return `link: ${content || t`draft`}`;
  }

  if (payloadDraft.type === 'text' || payloadDraft.type === 'markdown') {
    return `${payloadDraft.type}: ${payloadDraft.value.trim() || t`draft`}`;
  }

  return row.valueJson
    ? `${row.valueJson.type}: ${formatAdvancedMapDatasetJsonValue(row.valueJson)}`
    : t`No payload`;
}

function createBufferedDatasetMetadata(
  draft: Pick<AdvancedMapDatasetDraft, 'title' | 'unit' | 'description' | 'markdown'>
): BufferedDatasetMetadata {
  return {
    title: draft.title,
    unit: draft.unit,
    description: draft.description,
    markdown: draft.markdown,
  };
}

function applyBufferedDatasetMetadata(
  currentDraft: AdvancedMapDatasetDraft,
  nextMetadata: BufferedDatasetMetadata
): AdvancedMapDatasetDraft {
  if (
    currentDraft.title === nextMetadata.title &&
    currentDraft.unit === nextMetadata.unit &&
    currentDraft.description === nextMetadata.description &&
    currentDraft.markdown === nextMetadata.markdown
  ) {
    return currentDraft;
  }

  return {
    ...currentDraft,
    metadata: {
      ...currentDraft.metadata,
      title: nextMetadata.title,
      unit: nextMetadata.unit,
      description: nextMetadata.description,
      markdownText: nextMetadata.markdown,
      markdown: nextMetadata.markdown,
    },
    title: nextMetadata.title,
    unit: nextMetadata.unit,
    description: nextMetadata.description,
    markdown: nextMetadata.markdown,
  };
}

function replaceDraftRow(
  currentDraft: AdvancedMapDatasetDraft,
  sirutaCode: string,
  updater: (row: AdvancedMapDatasetDraftRow) => AdvancedMapDatasetDraftRow
): AdvancedMapDatasetDraft {
  const rowIndex = currentDraft.rows.findIndex((row) => row.sirutaCode === sirutaCode);
  if (rowIndex === -1) {
    return currentDraft;
  }

  const currentRow = currentDraft.rows[rowIndex];
  const nextRow = updater(currentRow);

  if (nextRow === currentRow) {
    return currentDraft;
  }

  const nextRows = currentDraft.rows.slice();
  nextRows[rowIndex] = nextRow;

  return {
    ...currentDraft,
    rows: nextRows,
    rowsBySirutaCode: {
      ...currentDraft.rowsBySirutaCode,
      [sirutaCode]: nextRow,
    },
  };
}

// See docs/specs/specs-202604092015-custom-map-data-series-editor.md:
// import merges both numeric and typed payload cells; numeric-only is map/export logic.
function mergeImportedRows(
  currentDraft: AdvancedMapDatasetDraft,
  importedRows: readonly AdvancedMapDatasetDraftRow[]
): AdvancedMapDatasetDraft {
  // Spreadsheet import stays numeric-first, but imported payload columns must
  // survive the merge so local draft/edit/export behavior matches the dataset
  // row contract. See:
  // docs/specs/specs-202604092015-custom-map-data-series-editor.md
  const importedRowsBySirutaCode = new Map(importedRows.map((row) => [row.sirutaCode, row]));
  const nextRows = currentDraft.rows.map((row) => {
    const importedRow = importedRowsBySirutaCode.get(row.sirutaCode);
    if (!importedRow) {
      return row;
    }

    const valueNumber = getAdvancedMapDatasetRowNumberText(importedRow);

    return {
      ...row,
      valueNumber,
      valueJson: importedRow.valueJson ?? null,
      payloadDraft: importedRow.payloadDraft ?? row.payloadDraft ?? null,
      value: valueNumber,
      rawValue: valueNumber,
      valueText: valueNumber,
      source: importedRow.source,
      importedFrom: importedRow.importedFrom,
      isEmpty: valueNumber.trim() === '' && (importedRow.valueJson ?? null) === null && !hasAdvancedMapDatasetPayloadDraftData(importedRow.payloadDraft ?? row.payloadDraft),
      parsedNumericValue: importedRow.parsedNumericValue ?? null,
      payloadValidationMessage:
        importedRow.payloadValidationMessage !== undefined
          ? importedRow.payloadValidationMessage
          : (row.payloadValidationMessage ?? null),
      validationMessage: importedRow.validationMessage ?? null,
      validationError: importedRow.validationError ?? null,
    };
  });

  return {
    ...currentDraft,
    rows: nextRows,
    rowsBySirutaCode: Object.fromEntries(nextRows.map((row) => [row.sirutaCode, row])),
  };
}

export function AdvancedMapDatasetEditorPage({
  mode,
  resourceKey,
  datasetId,
  cloneRef,
  valuesView,
  onValuesViewChange,
  mapZoomOverride,
  mapCenterOverride,
  onMapViewportChange,
}: Readonly<AdvancedMapDatasetEditorPageProps>) {
  const valuesGridClass =
    'grid grid-cols-[88px_96px_minmax(0,1.1fr)_minmax(0,0.8fr)_156px_minmax(0,1fr)_minmax(72px,0.5fr)] items-center gap-3';
  const navigate = useNavigate({
    from: mode === 'new' ? '/maps/datasets/new' : '/maps/datasets/$datasetId',
  });
  const { isLoaded, isSignedIn } = useAuth();
  const uatDirectoryQuery = useAdvancedMapDatasetUatDirectoryQuery();
  const datasetQuery = useAdvancedMapDatasetOwnerDetailQuery(datasetId ?? '', mode === 'edit' && datasetId !== undefined);
  const createDatasetMutation = useCreateAdvancedMapDatasetMutation();
  const replaceRowsMutation = useReplaceAdvancedMapDatasetRowsMutation();
  const updateDatasetMutation = useUpdateAdvancedMapDatasetMetadataMutation();
  const draft = useDatasetEditorDraftStore(resourceKey, (state) => state);
  const replaceDraft = useDatasetEditorDraftStore(resourceKey, (state) => state.replaceDraft);
  const { commitDraftChange, undo, redo, canUndo, canRedo, resetHistory } = useAdvancedMapDatasetDraftHistory({
    resourceKey,
    draft,
    replaceDraft,
  });
  const [isInitialStateResolved, setIsInitialStateResolved] = useState(mode === 'new');
  const [cloneResolutionError, setCloneResolutionError] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isSnapshotsModalOpen, setIsSnapshotsModalOpen] = useState(false);
  const [isImportBusy, setIsImportBusy] = useState(false);
  const [importIssues, setImportIssues] = useState<AdvancedMapDatasetImportIssue[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCounty, setSelectedCounty] = useState<string>('all');
  const [showEditedOnly, setShowEditedOnly] = useState(false);
  const [selectedUatSirutaCode, setSelectedUatSirutaCode] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const hasConsumedCloneRef = useRef(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [metadataDraft, setMetadataDraft] = useState<BufferedDatasetMetadata>(() =>
    createBufferedDatasetMetadata(draft)
  );
  const metadataDraftRef = useRef(metadataDraft);
  const flushPendingMetadataCommitRef = useRef<() => AdvancedMapDatasetDraft>(() => draft);
  const pendingMetadataCommitTimeoutRef = useRef<number | null>(null);
  const hasPendingMetadataCommitRef = useRef(false);

  useAdvancedMapDatasetStorageFallbackWarning();

  const clearPendingMetadataCommit = useCallback(() => {
    if (pendingMetadataCommitTimeoutRef.current !== null) {
      window.clearTimeout(pendingMetadataCommitTimeoutRef.current);
      pendingMetadataCommitTimeoutRef.current = null;
    }
  }, []);

  const getDraftWithBufferedMetadata = useCallback(
    (currentDraft: AdvancedMapDatasetDraft): AdvancedMapDatasetDraft =>
      applyBufferedDatasetMetadata(currentDraft, metadataDraftRef.current),
    []
  );

  const flushPendingMetadataCommit = useCallback((): AdvancedMapDatasetDraft => {
    clearPendingMetadataCommit();

    let flushedDraft: AdvancedMapDatasetDraft = draft;
    if (!hasPendingMetadataCommitRef.current) {
      return getDraftWithBufferedMetadata(flushedDraft);
    }

    hasPendingMetadataCommitRef.current = false;
    commitDraftChange((currentDraft) => {
      const nextDraft = getDraftWithBufferedMetadata(currentDraft);
      flushedDraft = nextDraft;
      return nextDraft;
    });

    return flushedDraft;
  }, [clearPendingMetadataCommit, commitDraftChange, draft, getDraftWithBufferedMetadata]);

  const queueMetadataCommit = useCallback(() => {
    hasPendingMetadataCommitRef.current = true;
    clearPendingMetadataCommit();
    pendingMetadataCommitTimeoutRef.current = window.setTimeout(() => {
      flushPendingMetadataCommit();
    }, METADATA_COMMIT_DELAY_MS);
  }, [clearPendingMetadataCommit, flushPendingMetadataCommit]);

  const updateMetadataDraftField = useCallback(
    <K extends keyof BufferedDatasetMetadata>(field: K, value: BufferedDatasetMetadata[K]) => {
      if (metadataDraftRef.current[field] === value) {
        return;
      }

      const nextMetadataDraft = {
        ...metadataDraftRef.current,
        [field]: value,
      } as BufferedDatasetMetadata;

      metadataDraftRef.current = nextMetadataDraft;
      setMetadataDraft(nextMetadataDraft);
      queueMetadataCommit();
    },
    [queueMetadataCommit]
  );

  useEffect(() => {
    const nextMetadataDraft = createBufferedDatasetMetadata(draft);
    metadataDraftRef.current = nextMetadataDraft;
    hasPendingMetadataCommitRef.current = false;
    clearPendingMetadataCommit();
    setMetadataDraft(nextMetadataDraft);
  }, [clearPendingMetadataCommit, draft.description, draft.markdown, draft.title, draft.unit]);

  useEffect(() => {
    flushPendingMetadataCommitRef.current = flushPendingMetadataCommit;
  }, [flushPendingMetadataCommit]);

  useEffect(() => () => {
    flushPendingMetadataCommitRef.current();
  }, []);

  useEffect(() => {
    if (!uatDirectoryQuery.data || draft.rows.length === 0) {
      return;
    }

    const hydratedDraft = hydrateAdvancedMapDatasetDraftWithReferenceRows(draft, uatDirectoryQuery.data.rows);
    if (hydratedDraft !== draft) {
      replaceDraft(hydratedDraft);
    }
  }, [draft, replaceDraft, uatDirectoryQuery.data]);

  useEffect(() => {
    if (!uatDirectoryQuery.data || draft.rows.length > 0) {
      return;
    }

    if (mode === 'new') {
      const baseDraft = createEmptyAdvancedMapDatasetDraft(resourceKey, uatDirectoryQuery.data.rows);
      if (cloneRef && !hasConsumedCloneRef.current) {
        hasConsumedCloneRef.current = true;
        const clonedDraft = consumeDatasetCloneHandoff(cloneRef);
        if (clonedDraft) {
          replaceDraft(mergeDraftWithReferenceRows(resourceKey, uatDirectoryQuery.data.rows, clonedDraft));
        } else {
          setCloneResolutionError(t`The dataset copy link is invalid or expired. Starting from an empty draft instead.`);
          replaceDraft(baseDraft);
        }
      } else {
        replaceDraft(baseDraft);
      }

      setIsInitialStateResolved(true);
      return;
    }
  }, [cloneRef, draft.rows.length, mode, replaceDraft, resourceKey, uatDirectoryQuery.data]);

  const {
    snapshots,
    isLoading: isSnapshotsLoading,
    isDirty,
    createManualSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    clearSnapshots,
    setBaselineFromHash,
  } = useAdvancedMapDatasetLocalSnapshots({
    resourceKey,
    draft,
    enabled: isLoaded && isSignedIn && draft.rows.length > 0,
    isBaselineReady: isInitialStateResolved,
  });

  useAdvancedMapDatasetEditorInitialState({
    resourceKey,
    datasetQueryData: datasetQuery.data,
    referenceRows: uatDirectoryQuery.data?.rows ?? [],
    isDatasetQueryFetching: datasetQuery.isFetching,
    draft,
    draftUpdatedAt: draft.updatedAt,
    isLoaded,
    isSignedIn,
    setDraft: replaceDraft,
    setBaselineFromHash,
    setIsInitialStateResolved,
  });

  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => isDirty && next.pathname !== current.pathname,
    withResolver: true,
    enableBeforeUnload: false,
  });

  const countyOptions = useMemo(() => {
    const counties = new Set(draft.rows.map((row) => row.countyName));
    return Array.from(counties).sort((left, right) => left.localeCompare(right));
  }, [draft.rows]);

  const totalRowCount = draft.rows.length;
  const editedRowCount = useMemo(
    () => draft.rows.filter((row) => hasDraftRowData(row)).length,
    [draft.rows]
  );

  const filteredRowSirutaCodes = useMemo(() => {
    return draft.rows
      .filter((row) => {
        if (showEditedOnly && !hasDraftRowData(row)) {
          return false;
        }

        if (selectedCounty !== 'all' && row.countyName !== selectedCounty) {
          return false;
        }

        if (deferredSearchTerm.trim() === '') {
          return true;
        }

        return matchesAdvancedMapDatasetRowSearch(row, deferredSearchTerm);
      })
      .map((row) => row.sirutaCode);
  }, [deferredSearchTerm, draft.rows, selectedCounty, showEditedOnly]);

  const visibleRowCount = filteredRowSirutaCodes.length;
  const selectedUatRow = selectedUatSirutaCode
    ? draft.rowsBySirutaCode[selectedUatSirutaCode] ?? null
    : null;
  const serverRowsBySirutaCode = useMemo(
    () =>
      new Map((datasetQuery.data?.rows ?? []).map((row) => [row.sirutaCode, row])),
    [datasetQuery.data?.rows]
  );

  const virtualizer = useVirtualizer({
    count: filteredRowSirutaCodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 12,
  });

  useEffect(() => {
    if (valuesView !== 'table') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      virtualizer.measure();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [filteredRowSirutaCodes.length, valuesView, virtualizer]);

  const currentValidationIssues = useMemo(
    () => draft.rows.filter((row) => row.validationMessage !== null || row.payloadValidationMessage !== null),
    [draft.rows]
  );

  const isSaving = createDatasetMutation.isPending || replaceRowsMutation.isPending || updateDatasetMutation.isPending;
  const hasUnsavedChanges = isInitialStateResolved && isDirty;

  const updateRowValue = useCallback(
    (currentDraft: AdvancedMapDatasetDraft, sirutaCode: string, nextValue: string): AdvancedMapDatasetDraft => {
      return replaceDraftRow(currentDraft, sirutaCode, (row) => {
        const normalizedValue = nextValue;
        const parsedNumericValue = parseDatasetValueText(normalizedValue);
        const validationMessage =
          normalizedValue.trim() !== '' && parsedNumericValue === null
            ? t`Invalid number`
            : null;
        const currentValue = getAdvancedMapDatasetRowNumberText(row);

        if (
          currentValue === normalizedValue &&
          row.parsedNumericValue === parsedNumericValue &&
          row.validationMessage === validationMessage &&
          row.validationError === validationMessage &&
          row.isEmpty === (normalizedValue.trim() === '' && row.valueJson === null && !hasAdvancedMapDatasetPayloadDraftData(row.payloadDraft))
        ) {
          return row;
        }

        return {
          ...row,
          valueNumber: normalizedValue,
          value: normalizedValue,
          rawValue: normalizedValue,
          valueText: normalizedValue,
          source: 'manual',
          importedFrom: 'manual',
          isEmpty: normalizedValue.trim() === '' && row.valueJson === null && !hasAdvancedMapDatasetPayloadDraftData(row.payloadDraft),
          parsedNumericValue,
          validationMessage,
          validationError: validationMessage,
        };
      });
    },
    []
  );

  const updateRowPayload = useCallback(
    (
      currentDraft: AdvancedMapDatasetDraft,
      sirutaCode: string,
      nextPayloadDraft: AdvancedMapDatasetPayloadDraft
    ): AdvancedMapDatasetDraft => {
      return replaceDraftRow(currentDraft, sirutaCode, (row) => {
        const valueNumber = getAdvancedMapDatasetRowNumberText(row);
        const payloadState = resolveAdvancedMapDatasetPayloadDraft(nextPayloadDraft);

        return {
          ...row,
          payloadDraft: payloadState.payloadDraft,
          payloadValidationMessage: payloadState.validationMessage,
          valueJson: payloadState.valueJson,
          source: 'manual',
          importedFrom: 'manual',
          isEmpty: valueNumber.trim() === '' && payloadState.valueJson === null && !payloadState.hasDraftData,
        };
      });
    },
    []
  );

  const handleImportText = async (text: string) => {
    if (!uatDirectoryQuery.data) {
      return false;
    }

    setIsImportBusy(true);
    try {
      const result = parseAdvancedMapDatasetTextImport(text, uatDirectoryQuery.data.rows);
      setImportIssues(result.issues);

      if (result.issues.length === 0) {
        commitDraftChange((currentDraft) => mergeImportedRows(currentDraft, result.rows));
        toast.success(t`Import applied`);
        return true;
      }

      return false;
    } finally {
      setIsImportBusy(false);
    }
  };

  const handleImportFile = async (file: File) => {
    if (!uatDirectoryQuery.data) {
      return;
    }

    setIsImportBusy(true);
    try {
      const result = await parseAdvancedMapDatasetFileImport(file, uatDirectoryQuery.data.rows);
      setImportIssues(result.issues);

      if (result.issues.length === 0) {
        commitDraftChange((currentDraft) => mergeImportedRows(currentDraft, result.rows));
        toast.success(t`File imported`);
      }
    } finally {
      setIsImportBusy(false);
    }
  };

  const handleCopyVisibleRows = useCallback(async () => {
    try {
      const visibleRows = filteredRowSirutaCodes
        .map((sirutaCode) => draft.rowsBySirutaCode[sirutaCode])
        .filter((row): row is AdvancedMapDatasetDraftRow => row !== undefined);

      await navigator.clipboard.writeText(serializeAdvancedMapDatasetRowsToClipboardTsv(visibleRows));
      toast.success(t`Copied data to clipboard`);
    } catch {
      toast.error(t`Failed to copy data`);
    }
  }, [draft.rowsBySirutaCode, filteredRowSirutaCodes]);

  const handleValuesPaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      if (!uatDirectoryQuery.data) {
        return;
      }

      const rawText = event.clipboardData.getData('text/plain');
      const parsed = tryParseAdvancedMapDatasetTabularPaste(rawText, uatDirectoryQuery.data.rows);
      if (!parsed) {
        if (/[\t\n\r]/.test(rawText)) {
          event.preventDefault();
          toast.error(t`Clipboard data must contain SIRUTA and numeric values.`);
        }

        return;
      }

      event.preventDefault();
      commitDraftChange((currentDraft) =>
        mergeAdvancedMapDatasetClipboardRowsIntoDraft(currentDraft, parsed.rows, 'paste')
      );
      toast.success(t`Pasted values applied`);
    },
    [commitDraftChange, uatDirectoryQuery.data]
  );

  const handleCloneCurrentDraft = () => {
    const nextDraft = flushPendingMetadataCommit();
    const { token } = createDatasetCloneHandoff(createCloneDraftFromCurrentDraft(nextDraft));
    navigate({
      to: '/maps/datasets/new',
      search: {
        draftId: crypto.randomUUID(),
        cloneRef: token,
      },
    });
  };

  const handleExportCsv = () => {
    try {
      const nextDraft = flushPendingMetadataCommit();
      const nonEmptyRows = nextDraft.rows.filter((row) => hasDraftRowData(row));
      if (nonEmptyRows.length === 0) {
        toast.error(t`No data to export.`);
        return;
      }
      const csv = serializeAdvancedMapDatasetRowsToCsv(nonEmptyRows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nextDraft.title.trim() || 'dataset'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t`CSV exported`);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      toast.error(t`Failed to export CSV.`);
    }
  };

  const handleExportJson = () => {
    try {
      const nextDraft = flushPendingMetadataCommit();
      const nonEmptyRows = nextDraft.rows.filter((row) => hasDraftRowData(row));
      if (nonEmptyRows.length === 0) {
        toast.error(t`No data to export.`);
        return;
      }
      const json = serializeAdvancedMapDatasetToJson(nextDraft);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nextDraft.title.trim() || 'dataset'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t`JSON exported`);
    } catch (error) {
      console.error('Failed to export JSON:', error);
      toast.error(t`Failed to export JSON.`);
    }
  };

  const handleSave = async () => {
    const nextDraft = flushPendingMetadataCommit();
    const validationResult = validateAdvancedMapDatasetDraftForSave(nextDraft);
    if (!validationResult.ok) {
      toast.error(validationResult.issues[0] ?? t`The dataset draft is invalid.`);
      return;
    }
    const savePayload = validationResult.payload;
    const saveRows = savePayload.rows ?? [];

    try {
      if (mode === 'new') {
        const createdDataset = await createDatasetMutation.mutateAsync({
          title: savePayload.title,
          description: savePayload.description,
          markdown: savePayload.markdown ?? savePayload.markdownText ?? null,
          unit: savePayload.unit,
          visibility: savePayload.visibility,
          rows: saveRows,
        });

        const nextResourceKey = `dataset:${createdDataset.id}`;
        migrateAdvancedMapDatasetDraftStorage(resourceKey, nextResourceKey);
        await migrateLocalDatasetSnapshotsResourceKey(resourceKey, nextResourceKey);
        toast.success(t`Data series created`);
        navigate({
          to: '/maps/datasets/$datasetId',
          params: { datasetId: createdDataset.id },
          replace: true,
        });
        return;
      }

      if (!datasetQuery.data || datasetId === undefined) {
        return;
      }

      const currentRowHash = createComparableAdvancedMapDatasetRowsHash(
        nextDraft.rows.map((row) => ({
          sirutaCode: row.sirutaCode,
          valueNumber: row.valueNumber,
          valueJson: row.valueJson,
          payloadDraft: null,
          value: row.value,
          valueText: row.valueText,
          rawValue: row.rawValue,
        }))
      );
      const serverRowHash = createComparableAdvancedMapDatasetRowsHash(
        nextDraft.rows.map((row) => ({
          sirutaCode: row.sirutaCode,
          valueNumber: serverRowsBySirutaCode.get(row.sirutaCode)?.valueNumber ?? '',
          valueJson: serverRowsBySirutaCode.get(row.sirutaCode)?.valueJson ?? null,
          payloadDraft: null,
          value: serverRowsBySirutaCode.get(row.sirutaCode)?.valueNumber ?? '',
          valueText: serverRowsBySirutaCode.get(row.sirutaCode)?.valueNumber ?? '',
          rawValue: serverRowsBySirutaCode.get(row.sirutaCode)?.valueNumber ?? '',
        }))
      );
      const hasRowChanges = currentRowHash !== serverRowHash;
      const hasMetadataChanges =
        nextDraft.title.trim() !== datasetQuery.data.title ||
        nextDraft.description.trim() !== (datasetQuery.data.description ?? '') ||
        nextDraft.markdown.trim() !== (datasetQuery.data.markdown ?? '') ||
        nextDraft.unit.trim() !== (datasetQuery.data.unit ?? '') ||
        nextDraft.visibility !== datasetQuery.data.visibility;

      if (hasRowChanges) {
        await replaceRowsMutation.mutateAsync({
          datasetId,
          input: {
            rows: saveRows,
          },
        });
      }

      if (hasMetadataChanges) {
        await updateDatasetMutation.mutateAsync({
          datasetId,
          input: {
            title: savePayload.title,
            description: savePayload.description,
            markdown: savePayload.markdown ?? savePayload.markdownText ?? null,
            unit: savePayload.unit,
            visibility: savePayload.visibility,
          },
        });
      }

      setBaselineFromHash(createComparableAdvancedMapDatasetDraftHash(nextDraft));
      toast.success(hasRowChanges || hasMetadataChanges ? t`Data series saved` : t`No changes to save`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t`Failed to save data series`);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: number) => {
    const snapshot = await restoreSnapshot(snapshotId);
    if (!snapshot) {
      return;
    }

    replaceDraft(snapshot.draft);
    resetHistory(snapshot.draft);
    setIsSnapshotsModalOpen(false);
    toast.success(t`Local snapshot restored`);
  };

  const handleCreateManualSnapshot = async (description: string | null) => {
    flushPendingMetadataCommit();
    const wasSaved = await createManualSnapshot({ description });
    if (wasSaved) {
      toast.success(t`Local snapshot saved`);
    }
  };

  useEffect(() => {
    if (!selectedUatSirutaCode) {
      return;
    }

    if (draft.rowsBySirutaCode[selectedUatSirutaCode]) {
      return;
    }

    setSelectedUatSirutaCode(null);
  }, [draft.rowsBySirutaCode, selectedUatSirutaCode]);

  if (!isLoaded || (mode === 'edit' && datasetQuery.isLoading)) {
    return (
      <div className="container mx-auto py-12">
        <LoadingSpinner text={t`Loading data series editor...`} />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto max-w-md py-16">
        <Card>
          <CardHeader className="items-center space-y-3 pb-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">{t`Sign in required`}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t`You need to be signed in to edit custom data series.`}
            </p>
          </CardHeader>
          <CardContent>
            <AuthSignInButton>
              <Button className="w-full">{t`Sign in`}</Button>
            </AuthSignInButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === 'edit' && datasetQuery.error) {
    return (
      <div className="container mx-auto max-w-md py-16">
        <Card className="border-destructive/30">
          <CardHeader className="items-center space-y-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Database className="h-5 w-5 text-destructive" />
            </div>
            <CardTitle className="text-base font-semibold">{t`Failed to load data series`}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {datasetQuery.error.message}
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (mode === 'edit' && (!uatDirectoryQuery.data || !isInitialStateResolved)) {
    return (
      <div className="container mx-auto py-12">
        <LoadingSpinner text={t`Preparing data series editor...`} />
      </div>
    );
  }

  return (
    <>
      <DatasetUnsavedChangesDialog
        open={blocker.status === 'blocked' && isDirty}
        isSaving={isSaving}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      />

      <DatasetImportDialog
        open={isImportDialogOpen}
        isBusy={isImportBusy}
        issues={importIssues}
        onOpenChange={setIsImportDialogOpen}
        onImportText={handleImportText}
        onImportFile={handleImportFile}
      />

      <DatasetLocalSnapshotsModal
        open={isSnapshotsModalOpen}
        snapshots={snapshots}
        isLoading={isSnapshotsLoading}
        isBusy={isSaving}
        onOpenChange={setIsSnapshotsModalOpen}
        onSaveCurrent={handleCreateManualSnapshot}
        onLoad={handleRestoreSnapshot}
        onDelete={deleteSnapshot}
        onClearAll={clearSnapshots}
      />

      <DatasetEditorUatDialog
        open={selectedUatRow !== null}
        row={selectedUatRow}
        unit={draft.unit}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUatSirutaCode(null);
          }
        }}
        onValueChange={(sirutaCode, nextValue) => {
          commitDraftChange((currentDraft) =>
            updateRowValue(currentDraft, sirutaCode, nextValue)
          );
        }}
        onPayloadChange={(sirutaCode, nextPayload) => {
          commitDraftChange((currentDraft) =>
            updateRowPayload(currentDraft, sirutaCode, nextPayload)
          );
        }}
      />

      <AnimatePresence>
        {hasUnsavedChanges ? (
          <motion.div
            key="save-dataset-cta"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-none fixed inset-x-0 bottom-8 z-[60] flex justify-center px-4"
          >
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="pointer-events-auto rounded-full bg-[linear-gradient(90deg,#ef4444,#f59e0b,#22c55e,#06b6d4,#6366f1,#ec4899,#ef4444)] p-px shadow-lg shadow-accent/10 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 dark:shadow-accent/5"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground backdrop-blur-md dark:bg-accent dark:text-accent-foreground">
                <Save className="h-3.5 w-3.5" />
                {isSaving
                  ? t`Saving…`
                  : mode === 'new'
                    ? t`Create data series`
                    : t`Save changes`}
              </span>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="space-y-6">
        <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
          <div className="container mx-auto flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">
                {mode === 'new' ? t`Create data series` : t`Edit data series`}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="truncate">
                  {mode === 'new'
                    ? t`Build a custom dataset for use in the map editor.`
                    : t`Update metadata and values for this custom dataset.`}
                </span>
                {hasUnsavedChanges ? (
                  <>
                    <span aria-hidden className="hidden h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40 md:inline-block" />
                    <span className="hidden items-center gap-1.5 whitespace-nowrap text-xs font-medium text-amber-600 dark:text-amber-500 md:inline-flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                      {t`Unsaved changes`}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportDialogOpen(true)}
                disabled={isSaving || !uatDirectoryQuery.data}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" />
                {t`Import`}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSaving || !uatDirectoryQuery.data}
                    className="gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    {t`Export`}
                    <ChevronDown className="ml-0.5 h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={handleExportCsv} disabled={isSaving || !uatDirectoryQuery.data}>
                    <FileSpreadsheet className="h-4 w-4" />
                    {t`Export as CSV`}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportJson} disabled={isSaving || !uatDirectoryQuery.data}>
                    <FileJson className="h-4 w-4" />
                    {t`Export as JSON`}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCloneCurrentDraft} disabled={isSaving}>
                    <Copy className="h-4 w-4" />
                    {t`Create copy`}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSnapshotsModalOpen(true)}
                disabled={isSaving}
                className="gap-1.5"
              >
                <HardDrive className="h-4 w-4" />
                {t`Snapshots`}
              </Button>

              <Separator orientation="vertical" className="mx-1 hidden h-6 md:block" />

              <Button size="sm" onClick={() => void handleSave()} disabled={isSaving || !isInitialStateResolved}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t`Saving…`}
                  </>
                ) : mode === 'new' ? (
                  t`Create data series`
                ) : (
                  t`Save changes`
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto space-y-5">

        {cloneResolutionError ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
            <div className="space-y-0.5">
              <p className="font-medium">{t`Copy link issue`}</p>
              <p className="text-amber-800/80 dark:text-amber-200/80">{cloneResolutionError}</p>
            </div>
          </div>
        ) : null}

        {mode === 'edit' ? (
          <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">{t`This dataset is live`}</p>
              <p className="text-muted-foreground">
                {t`Changes update every map and snapshot that references it. Create a copy first if you need to branch.`}
              </p>
            </div>
          </div>
        ) : null}

        {currentValidationIssues.length > 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-medium">{t`Validation issues`}</p>
              <p className="text-destructive/90">
                {currentValidationIssues[0]?.validationMessage ?? currentValidationIssues[0]?.payloadValidationMessage}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="lg:sticky lg:top-[96px] lg:self-start">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t`Details`}</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t`Describe the dataset and control how it’s shared.`}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label={t`Title`} htmlFor="dataset-title">
                <Input
                  id="dataset-title"
                  value={metadataDraft.title}
                  onChange={(event) => updateMetadataDraftField('title', event.currentTarget.value)}
                  onBlur={() => flushPendingMetadataCommit()}
                />
              </FormField>

              <FormField label={t`Unit`} htmlFor="dataset-unit">
                <Input
                  id="dataset-unit"
                  value={metadataDraft.unit}
                  onChange={(event) => updateMetadataDraftField('unit', event.currentTarget.value)}
                  onBlur={() => flushPendingMetadataCommit()}
                />
              </FormField>

              <FormField label={t`Visibility`} htmlFor="dataset-visibility">
                <Select
                  value={draft.visibility}
                  onValueChange={(value) =>
                    commitDraftChange((currentDraft) => ({
                      ...currentDraft,
                      metadata: {
                        ...currentDraft.metadata,
                        visibility: value as AdvancedMapDatasetDraft['visibility'],
                      },
                      visibility: value as AdvancedMapDatasetDraft['visibility'],
                    }))
                  }
                >
                  <SelectTrigger id="dataset-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">{t`Private`}</SelectItem>
                    <SelectItem value="unlisted">{t`Unlisted`}</SelectItem>
                    <SelectItem value="public">{t`Public`}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t`Description`} htmlFor="dataset-description">
                <Textarea
                  id="dataset-description"
                  value={metadataDraft.description}
                  onChange={(event) => updateMetadataDraftField('description', event.currentTarget.value)}
                  onBlur={() => flushPendingMetadataCommit()}
                />
              </FormField>

              <FormField label={t`Markdown notes`} htmlFor="dataset-markdown">
                <Textarea
                  id="dataset-markdown"
                  value={metadataDraft.markdown}
                  onChange={(event) => updateMetadataDraftField('markdown', event.currentTarget.value)}
                  onBlur={() => flushPendingMetadataCommit()}
                  className="min-h-[180px]"
                  />
                </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t`Values`}</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t`Start from the UAT list, then paste, import, or edit values manually.`}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <Tabs
                value={valuesView}
                onValueChange={(value) => onValuesViewChange(value as DatasetEditorValuesView)}
                className="space-y-5"
              >
                <div className="-mt-1 flex items-center justify-between border-b border-border/60">
                  <TabsList className="h-auto justify-start gap-1 rounded-none border-0 bg-transparent p-0">
                    <TabsTrigger
                      value="table"
                      className="relative rounded-none border-b-2 border-transparent bg-transparent px-3 pb-2.5 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                    >
                      {t`Table`}
                    </TabsTrigger>
                    <TabsTrigger
                      value="map"
                      className="relative rounded-none border-b-2 border-transparent bg-transparent px-3 pb-2.5 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                    >
                      {t`Map`}
                    </TabsTrigger>
                  </TabsList>
                  <span className="hidden text-xs text-muted-foreground sm:inline-block">
                    {valuesView === 'table'
                      ? t`${visibleRowCount} of ${totalRowCount} · ${editedRowCount} edited`
                      : t`${totalRowCount} UATs · ${editedRowCount} edited`}
                  </span>
                </div>

                <TabsContent
                  value="table"
                  forceMount
                  hidden={valuesView !== 'table'}
                  className="mt-0 space-y-4"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="grid flex-1 gap-2 md:grid-cols-[minmax(0,1fr)_200px]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.currentTarget.value)}
                          placeholder={t`Search by UAT name, CUI, or SIRUTA`}
                          className="pl-9"
                        />
                      </div>
                      <Select value={selectedCounty} onValueChange={setSelectedCounty}>
                        <SelectTrigger>
                          <SelectValue placeholder={t`Filter by county`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t`All counties`}</SelectItem>
                          {countyOptions.map((countyName) => (
                            <SelectItem key={countyName} value={countyName}>
                              {countyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 xl:justify-end">
                      <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
                        <Switch checked={showEditedOnly} onCheckedChange={setShowEditedOnly} />
                        <span>{t`Edited only`}</span>
                      </label>
                      <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          flushPendingMetadataCommit();
                          undo();
                        }}
                        disabled={!canUndo || isSaving}
                        aria-label={t`Undo`}
                        title={t`Undo`}
                        className="h-8 w-8"
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          flushPendingMetadataCommit();
                          redo();
                        }}
                        disabled={!canRedo || isSaving}
                        aria-label={t`Redo`}
                        title={t`Redo`}
                        className="h-8 w-8"
                      >
                        <Redo2 className="h-4 w-4" />
                      </Button>
                      <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleCopyVisibleRows()}
                        disabled={isSaving || visibleRowCount === 0}
                        className="gap-1.5"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        {t`Copy data`}
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-border/60">
                    <div
                      className={`${valuesGridClass} box-border border-b border-border/60 bg-muted/30 px-5 py-2.5 text-xs font-medium text-muted-foreground`}
                    >
                      <div>{t`SIRUTA`}</div>
                      <div>{t`CUI`}</div>
                      <div>{t`Name`}</div>
                      <div>{t`County`}</div>
                      <div className="text-right">{t`Value`}</div>
                      <div>{t`Payload`}</div>
                      <div>{t`Unit`}</div>
                    </div>
                    <div
                      ref={parentRef}
                      onPaste={handleValuesPaste}
                      className="h-[24rem] overflow-y-auto overflow-x-hidden md:h-[27rem] xl:h-[29rem]"
                    >
                      <div
                        style={{
                          height: `${virtualizer.getTotalSize()}px`,
                          position: 'relative',
                          width: '100%',
                        }}
                      >
                        {virtualizer.getVirtualItems().map((virtualItem) => {
                          const sirutaCode = filteredRowSirutaCodes[virtualItem.index];
                          const row = sirutaCode ? draft.rowsBySirutaCode[sirutaCode] ?? null : null;
                          if (!row) {
                            return null;
                          }

                          const hasData = hasDraftRowData(row);

                          return (
                            <div
                              key={row.sirutaCode}
                              className="absolute inset-x-0 top-0 box-border border-b border-border/40 px-5 py-2.5 transition-colors hover:bg-muted/40"
                              style={{
                                height: `${virtualItem.size}px`,
                                transform: `translateY(${virtualItem.start}px)`,
                              }}
                            >
                              <div className={valuesGridClass}>
                                <div className="min-w-0 truncate font-mono text-xs text-muted-foreground">{row.sirutaCode}</div>
                                <div className="min-w-0 truncate font-mono text-xs text-muted-foreground">{row.cui}</div>
                                <div className="min-w-0 truncate text-sm font-medium">{row.name}</div>
                                <div className="min-w-0 truncate text-sm text-muted-foreground">{row.countyName}</div>
                                <div className="min-w-0">
                                  <DatasetRowValueInput
                                    value={row.valueNumber}
                                    onCommit={(nextValue) =>
                                      commitDraftChange((currentDraft) =>
                                        updateRowValue(currentDraft, row.sirutaCode, nextValue)
                                      )
                                    }
                                    placeholder={t`Value`}
                                    className="h-9 min-w-0 text-right text-sm tabular-nums"
                                  />
                                  {row.validationMessage ? (
                                    <p className="mt-0.5 text-[11px] text-destructive">{row.validationMessage}</p>
                                  ) : null}
                                </div>
                                <div className="min-w-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={`h-9 w-full justify-start overflow-hidden px-2 text-left text-xs ${hasAdvancedMapDatasetPayloadDraftData(row.payloadDraft) || row.valueJson ? 'text-foreground' : 'text-muted-foreground'}`}
                                    onClick={() => setSelectedUatSirutaCode(row.sirutaCode)}
                                  >
                                    <span className="truncate">
                                      {formatPayloadSummary(row)}
                                    </span>
                                  </Button>
                                </div>
                                <div className={`min-w-0 truncate text-sm ${hasData ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {draft.unit.trim() === '' ? '—' : draft.unit}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-5 py-2.5 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {t`${visibleRowCount} visible · ${totalRowCount} total · ${editedRowCount} edited`}
                      </span>
                      <span className="hidden tabular-nums text-muted-foreground/70 sm:inline">
                        {t`Tip: paste tabular SIRUTA + value to update many rows at once.`}
                      </span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="map"
                  hidden={valuesView !== 'map'}
                  className="mt-0 space-y-4"
                >
                  <DatasetEditorMapPreview
                    resourceKey={resourceKey}
                    title={draft.title}
                    unit={draft.unit}
                    rows={draft.rows}
                    mapZoomOverride={mapZoomOverride}
                    mapCenterOverride={mapCenterOverride}
                    onMapViewportChange={onMapViewportChange}
                    onSelectSirutaCode={setSelectedUatSirutaCode}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </>
  );
}
