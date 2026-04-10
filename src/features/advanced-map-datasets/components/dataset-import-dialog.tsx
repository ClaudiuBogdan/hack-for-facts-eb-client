import { useRef, useState } from 'react';
import { AlertTriangle, ClipboardPaste, FileUp, Loader2, Upload } from 'lucide-react';
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
import type { AdvancedMapDatasetImportIssue } from '@/features/advanced-map-datasets/types';

interface DatasetImportDialogProps {
  open: boolean;
  isBusy: boolean;
  issues: AdvancedMapDatasetImportIssue[];
  onOpenChange: (open: boolean) => void;
  onImportText: (text: string) => Promise<boolean | void> | void;
  onImportFile: (file: File) => Promise<void> | void;
}

export function DatasetImportDialog({
  open,
  isBusy,
  issues,
  onOpenChange,
  onImportText,
  onImportFile,
}: Readonly<DatasetImportDialogProps>) {
  const [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportText = async () => {
    const result = await onImportText(pastedText);
    if (result !== false) {
      setPastedText('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t`Import dataset rows`}</DialogTitle>
          <DialogDescription>
            {t`Paste spreadsheet rows or upload a CSV/XLSX file. Supported data columns are value, text, link, and markdown, and each row may set at most one payload column.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ClipboardPaste className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">{t`Paste data`}</p>
            </div>
            <Textarea
              value={pastedText}
              onChange={(event) => setPastedText(event.currentTarget.value)}
              className="min-h-[200px] resize-none rounded-lg border-muted-foreground/20 font-mono text-sm focus-visible:border-primary"
              placeholder={t`Paste spreadsheet rows here…`}
              disabled={isBusy}
            />
          </div>

          <Separator />

          <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-6 transition-colors hover:border-muted-foreground/40 hover:bg-muted/50">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <FileUp className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t`Upload file`}</p>
                <p className="text-xs text-muted-foreground">
                  {t`Accepted formats: .csv, .tsv, .xlsx, .xls`}
                </p>
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.tsv,.xlsx,.xls"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) {
                    void onImportFile(file);
                  }
                  event.currentTarget.value = '';
                }}
                disabled={isBusy}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" />
                {t`Choose file`}
              </Button>
            </div>
          </div>

          {issues.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/40 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                {t`Import issues`}
              </div>
              <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                {issues.slice(0, 8).map((issue) => (
                  <li key={`${issue.rowNumber}-${issue.message}`} className="font-mono text-xs">
                    {t`Row`} {issue.rowNumber}: {issue.message}
                  </li>
                ))}
                {issues.length > 8 ? (
                  <li className="text-xs opacity-70">
                    …{t`${issues.length - 8} more issues`}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            {t`Cancel`}
          </Button>
          <Button type="button" onClick={() => void handleImportText()} disabled={isBusy || pastedText.trim() === ''} className="gap-2">
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t`Importing…`}
              </>
            ) : (
              <>
                <ClipboardPaste className="h-4 w-4" />
                {t`Import pasted data`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
