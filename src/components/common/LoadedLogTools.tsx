import React, { useId, useState } from 'react';
import { Button, TextInput } from '@acornops/ui';
import { Copy, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { findLoadedLogMatches, safeLogFilename } from './loadedLogContent';

interface LoadedLogToolsProps {
  query: string;
  onQueryChange: (query: string) => void;
  matchCount: number;
  content: string;
  source: string;
  scope: string;
  disabled?: boolean;
}

/** Deliberate local-only actions shared by the two bounded log viewers. */
export function LoadedLogTools({ query, onQueryChange, matchCount, content, source, scope, disabled }: LoadedLogToolsProps) {
  const { t } = useTranslation();
  const id = useId();
  const [feedback, setFeedback] = useState<'copied' | 'copyFailed' | 'downloadFailed' | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const exportText = `${source}\n${scope}\n\n${content}`;

  const copy = async () => {
    setIsCopying(true);
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(exportText);
      setFeedback('copied');
    } catch {
      setFeedback('copyFailed');
    } finally {
      setIsCopying(false);
    }
  };
  const download = () => {
    setFeedback(null);
    let url: string | undefined;
    try {
      url = URL.createObjectURL(new Blob([exportText], { type: 'text/plain;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = safeLogFilename(source);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      setFeedback('downloadFailed');
    } finally {
      if (url) {
        const downloadUrl = url;
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label htmlFor={id} className="type-label">{t('loadedLogs.find')}</label>
        <TextInput id={id} type="search" value={query} onChange={event => onQueryChange(event.target.value)} aria-describedby={`${id}-scope ${id}-result`} />
      </div>
      <p id={`${id}-scope`} className="type-caption break-words text-ui-text-muted">{scope} {t('loadedLogs.localOnly')}</p>
      <p id={`${id}-result`} role="status" className="type-caption text-ui-text-muted">
        {query ? t(matchCount ? 'loadedLogs.matches' : 'loadedLogs.noMatches', { count: matchCount }) : t('loadedLogs.findHelp')}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={disabled || !content || isCopying} onClick={() => void copy()}>
          <Copy className="h-4 w-4" />{t('loadedLogs.copy')}
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={disabled || !content} onClick={download}>
          <Download className="h-4 w-4" />{t('loadedLogs.download')}
        </Button>
      </div>
      {feedback && <p role={feedback === 'copied' ? 'status' : 'alert'} className="type-caption">{t(`loadedLogs.${feedback}`)}</p>}
    </div>
  );
}

export function HighlightedLogText({ content, query }: { content: string; query: string }) {
  const matches = findLoadedLogMatches(content, query);
  let start = 0;
  return <>{matches.map(match => {
    const prefix = content.slice(start, match.start);
    start = match.end;
    return <React.Fragment key={match.start}>{prefix}<mark className="bg-status-warning-soft text-status-warning-text">{content.slice(match.start, match.end)}</mark></React.Fragment>;
  })}{content.slice(start)}</>;
}
