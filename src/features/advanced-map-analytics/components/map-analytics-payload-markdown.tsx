import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

function isSafeHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/**
 * A dataset's Markdown payload in the map's entity panel: only http(s) links
 * stay links. Loaded on demand by `map-analytics-entity-details-panel.tsx`.
 */
export function MapAnalyticsPayloadMarkdown({ markdown }: Readonly<{ markdown: string }>) {
  const markdownComponents: Components = {
    p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
    li: ({ children }) => <li>{children}</li>,
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-[0.92em]">
        {children}
      </code>
    ),
    a: ({ href, children }) => {
      const safeHref = typeof href === 'string' && isSafeHttpUrl(href) ? href : undefined;
      if (!safeHref) {
        return <span>{children}</span>;
      }

      return (
        <a
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {children}
        </a>
      );
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {markdown}
    </ReactMarkdown>
  );
}
