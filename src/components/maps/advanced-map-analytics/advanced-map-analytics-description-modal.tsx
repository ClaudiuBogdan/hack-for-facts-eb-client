import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { ModalSection } from '@/components/ui/modal-section';
import { modalSizes } from '@/components/ui/modal-sizes';
import { Textarea } from '@/components/ui/textarea';
import { MapDescriptionRenderer } from '@/components/maps/advanced-map-analytics/map-description-renderer';
import { useBufferedCommittedValue } from '@/lib/hooks/useBufferedCommittedValue';
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
  const descriptionDraft = useBufferedCommittedValue({
    value: description,
    onCommit: (nextDescription) => {
      if (mode === 'edit') {
        props.onDescriptionChange(nextDescription);
      }
    },
    enabled: mode === 'edit',
  });
  const displayedDescription = mode === 'edit' ? descriptionDraft.value : description;
  const trimmedDescription = displayedDescription.trim();
  const hasDescription = trimmedDescription.length > 0;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && mode === 'edit') {
      descriptionDraft.commit();
    }

    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={mode === 'edit' ? modalSizes['4xl'] : modalSizes.xl}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{t`Map description`}</DialogTitle>
        </DialogHeader>

        {mode === 'edit' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label={t`Markdown`} htmlFor="map-description-modal-editor">
              <Textarea
                id="map-description-modal-editor"
                value={descriptionDraft.value}
                onChange={(event) => descriptionDraft.setValue(event.currentTarget.value)}
                onBlur={descriptionDraft.commit}
                maxLength={2000}
                className="min-h-[360px] resize-y font-mono text-sm"
                placeholder={t`Describe what this map shows...`}
                aria-label={t`Map description markdown editor`}
              />
            </FormField>
            <ModalSection className="overflow-hidden">
              <p className="text-sm font-medium">{t`Preview`}</p>
              <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted/20 p-3">
                {hasDescription ? (
                  <MapDescriptionRenderer description={displayedDescription} />
                ) : (
                  <p className="text-sm text-muted-foreground">{t`No description provided.`}</p>
                )}
              </div>
            </ModalSection>
          </div>
        ) : hasDescription ? (
          <MapDescriptionRenderer
            description={displayedDescription}
            className="max-h-[60vh] overflow-y-auto"
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t`No description provided.`}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
