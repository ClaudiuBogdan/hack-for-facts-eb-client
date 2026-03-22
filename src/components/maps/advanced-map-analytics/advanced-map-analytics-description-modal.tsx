import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { ModalSection } from '@/components/ui/modal-section';
import { modalSizes } from '@/components/ui/modal-sizes';
import { Textarea } from '@/components/ui/textarea';
import { t } from '@lingui/core/macro';

const DISALLOWED_ELEMENTS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'];

const isSafeExternalHref = (href: string | undefined): boolean => {
  if (!href) return false;
  return href.startsWith('http://') || href.startsWith('https://');
};

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
                value={description}
                onChange={(event) => onDescriptionChange?.(event.currentTarget.value)}
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
                  <div className="prose prose-sm max-w-none break-words dark:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      disallowedElements={DISALLOWED_ELEMENTS}
                      components={{
                        a: ({ href, children }) => {
                          if (!isSafeExternalHref(href)) {
                            return <span>{children}</span>;
                          }
                          return (
                            <a href={href} target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {description}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t`No description provided.`}</p>
                )}
              </div>
            </ModalSection>
          </div>
        ) : hasDescription ? (
          <div className="prose prose-sm max-h-[60vh] max-w-none overflow-y-auto break-words dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              disallowedElements={DISALLOWED_ELEMENTS}
              components={{
                a: ({ href, children }) => {
                  if (!isSafeExternalHref(href)) {
                    return <span>{children}</span>;
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  );
                },
              }}
            >
              {description}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t`No description provided.`}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
