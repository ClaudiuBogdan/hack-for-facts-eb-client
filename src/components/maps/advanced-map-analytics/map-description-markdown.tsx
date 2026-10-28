import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

/**
 * A map description's Markdown. Sanitizes disallowed elements and only allows
 * http/https links (other anchors render as plain text). Loaded on demand by
 * `MapDescriptionRenderer`, which styles it.
 */
export function MapDescriptionMarkdown({ description }: Readonly<{ description: string }>) {
  return (
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
  );
}
