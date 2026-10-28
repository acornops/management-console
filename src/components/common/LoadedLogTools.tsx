import React, { useId, useState } from 'react';
import { Button, TextInput, Tooltip } from '@acornops/ui';
import { Copy, Download, Search } from 'lucide-react';
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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <label htmlFor={id} className="sr-only">{t('loadedLogs.find')}</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
          <TextInput id={id} type="search" value={query} onChange={event => onQueryChange(event.target.value)} placeholder={t('loadedLogs.find')} aria-describedby={`${id}-scope ${id}-result`} className="w-full pl-10" />
        </div>
        <Tooltip content={t('loadedLogs.copy')}>
          <Button type="button" variant="icon" size="md" aria-label={t('loadedLogs.copy')} disabled={disabled || !content || isCopying} onClick={() => void copy()}>
            <Copy className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Tooltip>
        <Tooltip content={t('loadedLogs.download')}>
          <Button type="button" variant="icon" size="md" aria-label={t('loadedLogs.download')} disabled={disabled || !content} onClick={download}>
            <Download className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Tooltip>
      </div>
      <p id={`${id}-scope`} className="type-caption break-words text-ui-text-muted">{scope} {t('loadedLogs.localOnly')}</p>
      <p id={`${id}-result`} role="status" className="type-caption text-ui-text-muted">
        {query ? t(matchCount ? 'loadedLogs.matches' : 'loadedLogs.noMatches', { count: matchCount }) : t('loadedLogs.findHelp')}
      </p>
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
