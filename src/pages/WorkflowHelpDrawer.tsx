import React from 'react';

import { DrawerFrame, TextInput } from '@acornops/ui';

const topics = [
  { title: 'Create, activate, and launch', body: 'Create saves the workflow definition. Activate makes it available to run. Launch shows a final review and starts a run only after you confirm.' },
  { title: 'Agents and coordination', body: 'An Agent performs the workflow. Select one Agent for a direct run or multiple Agents for AcornOps to coordinate.' },
  { title: 'Capabilities and MCP', body: 'Capabilities are the tools and integrations an Agent may use. An MCP connection gives an Agent authenticated access to an external tool server.' },
  { title: 'Access and approvals', body: 'Read-only access can inspect systems. Write access can change them under the workflow\'s approval policy. An approval pause requires an operator decision before work continues.' },
  { title: 'Schedules and cron', body: 'Schedules start recurring runs in the selected timezone. Choose a frequency or enter a five-part cron expression under Custom.' },
  { title: 'Inbound webhooks', body: 'An inbound webhook is a signed endpoint that lets an external system start this workflow. Keep its signing secret private and rotate it after suspected exposure.' },
  { title: 'Runs', body: 'Runs record manual, scheduled, and webhook activity. Open a run to inspect its status, approvals, trace, and operator messages.' },
  { title: 'Keyboard shortcuts', body: 'Press / to search workflows. In the library, use Arrow Up, Arrow Down, Home, and End to move. Press Control+Enter or Command+Enter to open launch review for a ready workflow; confirmation is still required.' }
];

export const WorkflowHelpDrawer: React.FC<{
  open: boolean;
  initialTopic?: string;
  onClose: () => void;
}> = ({ open, initialTopic, onClose }) => {
  const [query, setQuery] = React.useState('');
  React.useEffect(() => {
    if (open) setQuery(initialTopic === 'overview' ? '' : initialTopic || '');
  }, [initialTopic, open]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleTopics = topics.filter((topic) => !normalizedQuery || `${topic.title} ${topic.body}`.toLowerCase().includes(normalizedQuery));
  return (
    <DrawerFrame open={open} width="md" title="Workflow help" titleId="workflow-help-title" description="Definitions and safeguards for building and running workflows." onClose={onClose}>
      <label className="block">
        <span className="type-micro-label text-ui-text-muted">Search workflow help</span>
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search MCP, read-only, cron, or approval" className="mt-2" />
      </label>
      <div className="mt-5 divide-y divide-ui-border" aria-live="polite">
        {visibleTopics.map((topic) => <section key={topic.title} className="py-4 first:pt-0">
          <h3 className="type-row-title">{topic.title}</h3>
          <p className="type-body mt-1 text-ui-text-muted">{topic.body}</p>
        </section>)}
        {visibleTopics.length === 0 && <p className="type-body py-4 text-ui-text-muted">No help topic matches that search.</p>}
      </div>
    </DrawerFrame>
  );
};
