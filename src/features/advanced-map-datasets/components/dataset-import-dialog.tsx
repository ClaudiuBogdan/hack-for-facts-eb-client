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
          <DialogTitle className="text-lg font-semibold tracking-tight">{t`Import dataset rows`}</DialogTitle>
          <DialogDescription className="text-sm">
            {t`Paste spreadsheet rows or upload a CSV/XLSX file. Supported columns: value, text, link, markdown — at most one payload column per row.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ClipboardPaste className="h-4 w-4 text-muted-foreground" />
              {t`Paste data`}
            </div>
            <Textarea
              value={pastedText}
              onChange={(event) => setPastedText(event.currentTarget.value)}
              className="min-h-[200px] resize-none rounded-lg border-border/60 font-mono text-sm focus-visible:border-primary"
              placeholder={t`Paste spreadsheet rows here…`}
              disabled={isBusy}
            />
          </section>

          <Separator className="bg-border/60" />

          <section className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-4 transition-colors hover:border-border hover:bg-muted/40 sm:flex-row sm:items-center">
            <FileUp className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{t`Upload file`}</p>
              <p className="text-xs text-muted-foreground">
                {t`.csv, .tsv, .xlsx, .xls`}
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
          </section>

          {issues.length > 0 ? (
            <div className="rounded-lg border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-sm dark:border-amber-800/40 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" />
                {t`Import issues`}
              </div>
              <ul className="mt-2 space-y-1 text-amber-800/90 dark:text-amber-200/80">
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
          <Button
            type="button"
            onClick={() => void handleImportText()}
            disabled={isBusy || pastedText.trim() === ''}
            className="gap-2"
          >
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
