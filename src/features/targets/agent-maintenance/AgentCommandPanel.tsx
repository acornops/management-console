import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, InlineAlert } from '@acornops/ui';
import { useAgentCommand } from './useAgentCommand';

export function AgentCommandPanel({ instructions, label, sensitive, showExpiry = true, regenerating = false, onRegenerate }: {
  instructions: { command: string; warnings: string[]; enrollmentExpiresAt?: string };
  label?: string;
  sensitive?: 'credential' | 'enrollment';
  showExpiry?: boolean;
  regenerating?: boolean;
  onRegenerate?: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const command = useAgentCommand(instructions);
  const commandLabel = label || t('agentMaintenance.command');
  return <>
    <div className="min-w-0 rounded-lg border border-ui-border bg-ui-bg shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="type-micro-label">{commandLabel}</span>
          {sensitive && <span className="rounded-full bg-status-warning-soft px-2 py-0.5 type-micro-label text-status-warning-text">{t(sensitive === 'credential' ? 'agentMaintenance.secretCredential' : 'agentMaintenance.sensitive')}</span>}
        </div>
        <Button type="button" variant="icon" size="icon" onClick={() => void command.copy()} disabled={command.enrollmentExpired} aria-label={command.hasCopied ? t('agentMaintenance.copied') : t('agentMaintenance.copy')}>
          {command.hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <div tabIndex={0} role="region" aria-label={commandLabel} className="max-h-[18rem] overflow-auto px-4 pb-4 pt-3 font-mono type-caption leading-6 text-ui-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-control-boundary custom-scrollbar">
        <pre className="whitespace-pre-wrap break-words">{instructions.command}</pre>
      </div>
      {command.copyFailed && <InlineAlert tone="danger" className="rounded-none border-x-0 border-b-0 p-3 type-caption">{t('agentMaintenance.copyFailed')}</InlineAlert>}
    </div>
    {instructions.warnings.length > 0 && <div className="space-y-1 rounded-lg border border-status-warning/25 bg-status-warning-soft p-3 type-caption text-status-warning-text">
      {instructions.warnings.map((warning) => <p key={warning}>{warning}</p>)}
    </div>}
    {showExpiry && command.enrollmentExpiry !== null && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ui-border bg-ui-surface p-3 type-caption text-ui-text-muted">
      <span>{command.enrollmentExpired ? t('agentMaintenance.expired') : t('agentMaintenance.expiresIn', { time: command.timeRemaining })}</span>
      {command.enrollmentExpired && onRegenerate && <Button size="sm" variant="secondary" disabled={regenerating} onClick={() => void onRegenerate()}>{t('agentMaintenance.generateNew')}</Button>}
    </div>}
  </>;
}
