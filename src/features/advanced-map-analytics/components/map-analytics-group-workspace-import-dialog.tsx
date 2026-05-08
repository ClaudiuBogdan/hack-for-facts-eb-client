import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AlertTriangle, ClipboardPaste, FileUp, Upload } from 'lucide-react';
import { t } from '@lingui/core/macro';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { MapGroup } from '@/schemas/advanced-map-analytics';
import { cn } from '@/lib/utils';
import {
  parseGroupWorkspaceCsvImport,
  type GroupWorkspaceImportReferenceUat,
} from '@/features/advanced-map-analytics/group-workspace-import';

interface MapAnalyticsGroupWorkspaceImportDialogProps {
  open: boolean;
  references: readonly GroupWorkspaceImportReferenceUat[];
  onOpenChange: (open: boolean) => void;
  onImport: (workspaceLabel: string, groups: MapGroup[]) => void;
}

function createWorkspaceNameFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '').trim();
  if (!withoutExtension) {
    return t`Imported group workspace`;
  }

  return withoutExtension
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getFormatLabel(format: string): string {
  if (format === 'simulation-cluster') {
    return t`Simulation cluster CSV`;
  }

  if (format === 'row-per-uat') {
    return t`Row-per-UAT CSV`;
  }

  return t`Unknown format`;
}

function formatGroupCount(count: number): string {
  return count === 1 ? t`1 group` : t`${count} groups`;
}

function formatAssignedUatCount(count: number): string {
  return count === 1 ? t`1 UAT assigned` : t`${count} UATs assigned`;
}

function isFileDrag(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes('Files');
}

export function MapAnalyticsGroupWorkspaceImportDialog({
  open,
  references,
  onOpenChange,
  onImport,
}: Readonly<MapAnalyticsGroupWorkspaceImportDialogProps>) {
  const defaultWorkspaceName = t`Imported group workspace`;
  const [workspaceName, setWorkspaceName] = useState(defaultWorkspaceName);
  const [csvText, setCsvText] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    if (open) {
      return;
    }

    setWorkspaceName(defaultWorkspaceName);
    setCsvText('');
    setIsDragActive(false);
    dragDepthRef.current = 0;
  }, [defaultWorkspaceName, open]);

  const parsedImport = useMemo(
    () => (csvText.trim() ? parseGroupWorkspaceCsvImport(csvText, references) : null),
    [csvText, references]
  );
  const canImport = Boolean(parsedImport && !parsedImport.hasErrors && parsedImport.groups.length > 0);
  const previewGroups = parsedImport?.groups.slice(0, 4) ?? [];

  const readCsvFile = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
    if (workspaceName.trim() === '' || workspaceName === defaultWorkspaceName) {
      setWorkspaceName(createWorkspaceNameFromFileName(file.name));
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    await readCsvFile(file);
    event.currentTarget.value = '';
  };

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!isFileDrag(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!isFileDrag(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!isFileDrag(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (!isFileDrag(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      void readCsvFile(file);
    }
  };

  const handleImport = () => {
    if (!parsedImport || parsedImport.hasErrors || parsedImport.groups.length === 0) {
      return;
    }

    onImport(workspaceName.trim() || defaultWorkspaceName, parsedImport.groups);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'overflow-hidden sm:max-w-3xl',
          isDragActive && 'ring-2 ring-primary/70 ring-offset-2'
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragActive ? (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm">
            <div className="rounded-xl border border-dashed border-primary bg-background px-6 py-5 text-center shadow-lg">
              <FileUp className="mx-auto h-7 w-7 text-primary" />
              <p className="mt-2 text-sm font-semibold text-foreground">{t`Drop CSV file to import`}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t`The file will be parsed before you confirm the import.`}
              </p>
            </div>
          </div>
        ) : null}
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {t`Import group workspace`}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t`Create a new group workspace from CSV rows. Existing map settings and series are kept unchanged.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <label htmlFor="group-workspace-import-name" className="text-sm font-medium">
              {t`Workspace name`}
            </label>
            <Input
              id="group-workspace-import-name"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.currentTarget.value)}
              placeholder={t`Imported group workspace`}
            />
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ClipboardPaste className="h-4 w-4 text-muted-foreground" />
              {t`Paste CSV`}
            </div>
            <Textarea
              value={csvText}
              onChange={(event) => setCsvText(event.currentTarget.value)}
              className="min-h-[180px] resize-none rounded-lg border-border/60 font-mono text-sm focus-visible:border-primary"
              placeholder={[
                'siruta_code,group,group_label,primary,order',
                '1017,alba_iulia,Alba Iulia area,true,1',
                '1071,alba_iulia,Alba Iulia area,false,2',
              ].join('\n')}
            />
          </section>

          <Separator className="bg-border/60" />

          <section className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-4 transition-colors hover:border-border hover:bg-muted/40 sm:flex-row sm:items-center">
            <FileUp className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{t`Upload CSV file`}</p>
              <p className="text-xs text-muted-foreground">
                {t`Supports row-per-UAT CSV and simulation cluster CSV. You can also drag a file anywhere in this dialog.`}
              </p>
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv,text/csv"
              onChange={(event) => {
                void handleFileChange(event);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <Upload className="h-4 w-4" />
              {t`Choose file`}
            </Button>
          </section>

          {parsedImport ? (
            <section className="rounded-lg border border-border/70 bg-background px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <span className="font-medium">{getFormatLabel(parsedImport.format)}</span>
                <span className="text-muted-foreground">
                  {formatGroupCount(parsedImport.groupCount)}
                </span>
                <span className="text-muted-foreground">
                  {formatAssignedUatCount(parsedImport.assignedUatCount)}
                </span>
              </div>

              {previewGroups.length > 0 ? (
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {previewGroups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium text-foreground">
                        {group.label || group.id}
                      </span>
                      <span className="shrink-0">
                        {group.memberSirutaCodes.length === 1
                          ? t`1 UAT`
                          : t`${group.memberSirutaCodes.length} UATs`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {parsedImport && parsedImport.issues.length > 0 ? (
            <div className="rounded-lg border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-sm dark:border-amber-800/40 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" />
                {t`Import issues`}
              </div>
              <ul className="mt-2 space-y-1 text-amber-800/90 dark:text-amber-200/80">
                {parsedImport.issues.slice(0, 8).map((issue, index) => (
                  <li
                    key={`${issue.severity}-${issue.rowNumber ?? 'global'}-${index}`}
                    className="font-mono text-xs"
                  >
                    {issue.rowNumber ? `${t`Row`} ${issue.rowNumber}: ` : ''}
                    {issue.message}
                  </li>
                ))}
                {parsedImport.issues.length > 8 ? (
                  <li className="text-xs opacity-70">
                    ...{t`${parsedImport.issues.length - 8} more issues`}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t`Cancel`}
          </Button>
          <Button type="button" onClick={handleImport} disabled={!canImport}>
            {t`Import workspace`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
