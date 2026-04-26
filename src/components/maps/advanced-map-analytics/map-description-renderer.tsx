import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const DISALLOWED_ELEMENTS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
];

const isSafeExternalHref = (href: string | undefined): boolean => {
  if (!href) return false;
  return href.startsWith('http://') || href.startsWith('https://');
};

interface MapDescriptionRendererProps {
  description: string;
  className?: string;
}

/**
 * Shared Markdown renderer for map descriptions. Sanitizes disallowed
 * elements and only allows http/https links (other anchors render as plain
 * text). Used by the description modal and the inline public description.
 *
 * The prose overrides cap heading sizes so user-entered markdown (e.g.
 * `# My title`) doesn't dominate compact surfaces like the public sidebar.
 */
export function MapDescriptionRenderer({
  description,
  className,
}: Readonly<MapDescriptionRendererProps>) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none break-words dark:prose-invert',
        'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground',
        'prose-h1:text-base prose-h1:mt-0 prose-h1:mb-1.5',
        'prose-h2:text-sm prose-h2:mt-3 prose-h2:mb-1',
        'prose-h3:text-sm prose-h3:mt-2.5 prose-h3:mb-1',
        'prose-h4:text-xs prose-h4:mt-2 prose-h4:mb-1 prose-h4:uppercase prose-h4:tracking-wide prose-h4:text-muted-foreground',
        'prose-p:my-1.5 prose-p:leading-relaxed',
        'prose-ul:my-1.5 prose-ul:pl-5 prose-ol:my-1.5 prose-ol:pl-5 prose-li:my-0',
        'prose-blockquote:my-2 prose-blockquote:border-l-2 prose-blockquote:border-muted-foreground/30 prose-blockquote:pl-3 prose-blockquote:not-italic prose-blockquote:text-muted-foreground',
        'prose-code:rounded prose-code:bg-muted/60 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none',
        'prose-hr:my-3 prose-hr:border-border',
        'prose-a:text-primary prose-a:underline-offset-2 hover:prose-a:underline',
        className
      )}
    >
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
  );
}
