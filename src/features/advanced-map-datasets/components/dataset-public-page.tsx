import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Copy, Database, Globe } from 'lucide-react';
import { t } from '@lingui/core/macro';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createDatasetCloneHandoff } from '@/features/advanced-map-datasets/store/dataset-clone-handoff';
import { useAdvancedMapDatasetPublicDetailQuery } from '@/features/advanced-map-datasets/hooks/use-advanced-map-datasets';
import { getUserLocale } from '@/lib/utils';
import { UploadedMapDatasetDialog } from '@/features/advanced-map-analytics/components/uploaded-map-dataset-dialog';
import { createAdvancedMapStateFromUploadedDataset } from '@/features/advanced-map-analytics/uploaded-map-dataset';
import { createMapCloneHandoff } from '@/features/advanced-map-analytics/store/map-clone-handoff';
import { createAdvancedMapDatasetCloneDraft } from '@/features/advanced-map-datasets/utils/clone-draft';
import { formatAdvancedMapDatasetJsonValue } from '@/features/advanced-map-datasets/utils/draft';

interface AdvancedMapDatasetPublicPageProps {
  publicId: string;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

export function AdvancedMapDatasetPublicPage({ publicId }: Readonly<AdvancedMapDatasetPublicPageProps>) {
  const navigate = useNavigate({ from: '/maps/datasets/public/$publicId' });
  const [isMapPreviewOpen, setIsMapPreviewOpen] = useState(false);
  const hasValidPublicId = isUuid(publicId);
  const publicDatasetQuery = useAdvancedMapDatasetPublicDetailQuery(publicId, hasValidPublicId);
  const dateTimeLocale = getUserLocale() === 'en' ? 'en-US' : 'ro-RO';

  const cloneDraft = useMemo(() => {
    if (!publicDatasetQuery.data) {
      return null;
    }

    return createAdvancedMapDatasetCloneDraft(publicDatasetQuery.data);
  }, [publicDatasetQuery.data]);

  const handleCreateCopy = () => {
    if (!cloneDraft) {
      return;
    }

    const { token } = createDatasetCloneHandoff(cloneDraft);
    navigate({
      to: '/maps/datasets/new',
      search: {
        draftId: crypto.randomUUID(),
        cloneRef: token,
      },
    });
  };

  const handleCreateMapWithDataset = () => {
    if (!dataset) {
      return;
    }

    const cloneRef = createMapCloneHandoff({
      mapState: createAdvancedMapStateFromUploadedDataset(dataset, {
        source: 'public',
        datasetPublicId: publicId,
      }),
      mapDescription: dataset.description ?? '',
    });

    setIsMapPreviewOpen(false);
    navigate({
      to: '/maps/editor/new',
      search: { cloneRef },
    });
  };

  if (publicDatasetQuery.isLoading) {
    return (
      <div className="container mx-auto py-12">
        <LoadingSpinner text={t`Loading public data series...`} />
      </div>
    );
  }

  if (!hasValidPublicId) {
    return (
      <div className="container mx-auto max-w-md py-12">
        <Card className="border-destructive/20 text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Database className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-xl">{t`Invalid data series link`}</CardTitle>
              <CardDescription>{t`The public dataset link is malformed.`}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (publicDatasetQuery.error || !publicDatasetQuery.data) {
    return (
      <div className="container mx-auto max-w-md py-12">
        <Card className="border-destructive/20 text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Database className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-xl">{t`Failed to load data series`}</CardTitle>
              <CardDescription>{publicDatasetQuery.error?.message ?? t`Dataset not found.`}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const dataset = publicDatasetQuery.data;

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{dataset.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Database className="h-3 w-3" />
              {dataset.rowCount.toLocaleString()} {t`rows`}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span>{t`updated`} {new Date(dataset.updatedAt).toLocaleString(dateTimeLocale)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsMapPreviewOpen(true)}>
            {t`Preview on map`}
          </Button>
          <Button onClick={handleCreateCopy} className="gap-2">
            <Copy className="h-4 w-4" />
            {t`Create editable copy`}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
            <CardTitle className="text-base">{t`Dataset details`}</CardTitle>
          <CardDescription>{t`This dataset is read-only here. Clone it to edit your own copy.`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t`Unit`}</p>
              <p className="mt-1 font-medium">{dataset.unit || '—'}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t`Visibility`}</p>
              <p className="mt-1">
                <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <Globe className="h-3 w-3" />
                  {t`Public`}
                </Badge>
              </p>
            </div>
          </div>
          {dataset.description ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t`Description`}</p>
              <p className="mt-1">{dataset.description}</p>
            </div>
          ) : null}
          {dataset.markdown ? (
            <div className="rounded-lg border bg-muted/30 p-4 whitespace-pre-wrap text-sm">{dataset.markdown}</div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
            <CardTitle className="text-base">{t`Values`}</CardTitle>
          <CardDescription>{t`Public dataset values are shown below for reference.`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60dvh] overflow-auto rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider">{t`SIRUTA`}</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">{t`Value`}</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider">{t`Payload`}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataset.rows.map((row) => (
                  <TableRow key={row.sirutaCode} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.sirutaCode}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{row.valueNumber ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.valueJson ? `${row.valueJson.type}: ${formatAdvancedMapDatasetJsonValue(row.valueJson)}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UploadedMapDatasetDialog
        open={isMapPreviewOpen}
        mode="launch-map"
        initialSelection={{
          source: 'public',
          datasetPublicId: publicId,
        }}
        onOpenChange={setIsMapPreviewOpen}
        onConfirm={() => handleCreateMapWithDataset()}
      />
    </div>
  );
}
