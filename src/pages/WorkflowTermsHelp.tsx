import React from 'react';
import { Button } from '@acornops/ui';

export const WorkflowTermsHelp: React.FC<{ onOpenGuide?: () => void }> = ({ onOpenGuide }) => (
  <details className="rounded-md border border-ui-border bg-ui-surface px-4 py-3">
    <summary className="control-target cursor-pointer type-row-title text-ui-text">Workflow terms</summary>
    <dl className="mt-3 grid gap-3 border-t border-ui-border pt-3 type-caption text-ui-text-muted sm:grid-cols-2">
      <div><dt className="type-emphasis text-ui-text">Agent</dt><dd>The reviewed worker or coordinated team that follows the workflow prompt.</dd></div>
      <div><dt className="type-emphasis text-ui-text">Capabilities</dt><dd>The effective tools and integrations available when this workflow runs.</dd></div>
      <div><dt className="type-emphasis text-ui-text">MCP connection</dt><dd>An authenticated external tool connection owned by the workspace or run owner.</dd></div>
      <div><dt className="type-emphasis text-ui-text">Write policy</dt><dd>The rule that decides whether live-system changes are disabled, automatic, or approval-gated.</dd></div>
    </dl>
    {onOpenGuide && <Button type="button" variant="tertiary" size="sm" onClick={onOpenGuide} className="mt-3">Open searchable guide</Button>}
  </details>
);
