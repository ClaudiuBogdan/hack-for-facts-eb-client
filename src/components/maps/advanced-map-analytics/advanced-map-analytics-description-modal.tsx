import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { t } from '@lingui/core/macro';

interface AdvancedMapAnalyticsDescriptionModalBaseProps {
  open: boolean;
  description: string;
  onOpenChange: (open: boolean) => void;
}

interface AdvancedMapAnalyticsDescriptionPreviewModalProps extends AdvancedMapAnalyticsDescriptionModalBaseProps {
  mode: 'preview';
}

interface AdvancedMapAnalyticsDescriptionEditModalProps extends AdvancedMapAnalyticsDescriptionModalBaseProps {
  mode: 'edit';
  onDescriptionChange: (nextDescription: string) => void;
}

type AdvancedMapAnalyticsDescriptionModalProps =
  | AdvancedMapAnalyticsDescriptionPreviewModalProps
  | AdvancedMapAnalyticsDescriptionEditModalProps;

export function AdvancedMapAnalyticsDescriptionModal(
  props: Readonly<AdvancedMapAnalyticsDescriptionModalProps>
) {
  const { open, description, mode, onOpenChange } = props;
  const trimmedDescription = description.trim();
  const hasDescription = trimmedDescription.length > 0;
  const onDescriptionChange =
    mode === 'edit' ? (nextDescription: string) => props.onDescriptionChange(nextDescription) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={mode === 'edit' ? 'max-w-5xl' : 'max-w-2xl'}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{t`Map description`}</DialogTitle>
        </DialogHeader>

        {mode === 'edit' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="map-description-modal-editor">
                {t`Markdown`}
              </label>
              <Textarea
                id="map-description-modal-editor"
                value={description}
                onChange={(event) => onDescriptionChange?.(event.currentTarget.value)}
                maxLength={2000}
                className="min-h-[360px] resize-y font-mono text-sm"
                placeholder={t`Describe what this map shows...`}
                aria-label={t`Map description markdown editor`}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t`Preview`}</p>
              <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted/20 p-3">
                {hasDescription ? (
                  <div className="prose prose-sm max-w-none break-words dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t`No description provided.`}</p>
                )}
              </div>
            </div>
          </div>
        ) : hasDescription ? (
          <div className="prose prose-sm max-h-[60vh] max-w-none overflow-y-auto break-words dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t`No description provided.`}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
