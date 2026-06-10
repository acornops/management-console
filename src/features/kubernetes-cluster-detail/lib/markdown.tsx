import { Components } from 'react-markdown';

type MarkdownTone = 'assistant' | 'user';

/**
 * Returns markdown renderers tuned for chat readability.
 *
 * This keeps final responses easy to scan by giving semantic markdown
 * (headings, lists, code blocks, tables) consistent visual treatment.
 */
export function createMarkdownComponents(tone: MarkdownTone = 'assistant'): Components {
  const isUserTone = tone === 'user';
  const textClass = isUserTone ? 'text-ui-bg/95' : 'text-ui-text';
  const headingClass = isUserTone ? 'text-ui-bg' : 'text-ui-text';
  const subtleHeadingClass = isUserTone ? 'text-ui-bg/95' : 'text-ui-text';
  const inlineCodeClass = isUserTone
    ? 'bg-ui-bg/15 text-ui-bg border border-ui-bg/20'
    : 'border border-ui-border bg-ui-bg text-ui-text';
  const codeBlockClass = isUserTone
    ? 'border-ui-bg/20 bg-ui-bg/10 text-ui-bg'
    : 'border-ui-border bg-code-bg text-slate-100';
  const blockquoteClass = isUserTone
    ? 'border-ui-bg/30 bg-ui-bg/10 text-ui-bg/90'
    : 'border-ui-border bg-ui-bg text-ui-text-muted';
  const tableTextClass = isUserTone ? 'text-ui-bg/95' : 'text-ui-text';
  const tableBorderClass = isUserTone ? 'border-ui-bg/20 bg-ui-bg/10' : 'border-ui-border bg-ui-bg';
  const tableCellBorderClass = isUserTone ? 'border-ui-bg/20' : 'border-ui-border';
  const tableRowHoverClass = isUserTone ? 'hover:bg-ui-bg/10' : 'hover:bg-ui-bg/70';
  const linkClass = isUserTone
    ? 'text-ui-bg underline-offset-2 hover:text-ui-bg/80'
    : 'text-accent-strong underline-offset-2 hover:text-accent-bright';

  return {
    h1: ({ children }) => (
      <h1 className={`type-panel-title mb-2 ${headingClass}`}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className={`type-row-title mt-3 mb-2 ${headingClass}`}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className={`type-row-title mt-3 mb-2 ${subtleHeadingClass}`}>{children}</h3>
    ),
    p: ({ children }) => (
      <p className={`type-body mb-2 last:mb-0 ${textClass}`}>{children}</p>
    ),
    ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
    li: ({ children }) => <li className={textClass}>{children}</li>,
    strong: ({ children }) => (
      <strong className={`font-semibold ${headingClass}`}>{children}</strong>
    ),
    code: ({ children, className, ...props }) => (
      <code
        className={`${className || ''} type-code rounded px-1.5 py-0.5 ${inlineCodeClass}`}
        {...props}
      >
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre
        className={`type-code my-2 overflow-x-auto rounded-lg border p-3 ${codeBlockClass}`}
      >
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className={`my-2 rounded-lg border px-3 py-2 italic ${blockquoteClass}`}>
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="my-2 overflow-x-auto">
        <table className={`type-caption w-full min-w-[360px] border-collapse ${tableTextClass}`}>
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className={`border px-2 py-1 text-left font-semibold ${tableBorderClass}`}>
        {children}
      </th>
    ),
    tr: ({ children }) => (
      <tr className={`transition-colors ${tableRowHoverClass}`}>{children}</tr>
    ),
    td: ({ children }) => (
      <td className={`border px-2 py-1 align-top ${tableCellBorderClass}`}>{children}</td>
    ),
    a: ({ children, href }) => {
      const isInternalRoute = href?.startsWith('#/');
      return (
        <a
          className={`${linkClass} underline`}
          href={href}
          target={isInternalRoute ? undefined : '_blank'}
          rel={isInternalRoute ? undefined : 'noreferrer'}
        >
          {children}
        </a>
      );
    }
  };
}
