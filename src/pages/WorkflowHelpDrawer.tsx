import { useTranslation } from 'react-i18next';
import React from 'react';

import { DrawerFrame, TextInput } from '@acornops/ui';

const topicKeys = [
  { title: 'workflowUi.helpLaunchTitle', body: 'workflowUi.helpLaunchBody' },
  { title: 'workflowUi.helpAgentsTitle', body: 'workflowUi.helpAgentsBody' },
  { title: 'workflowUi.helpCapabilitiesTitle', body: 'workflowUi.helpCapabilitiesBody' },
  { title: 'workflowUi.helpAccessTitle', body: 'workflowUi.helpAccessBody' },
  { title: 'workflowUi.helpSchedulesTitle', body: 'workflowUi.helpSchedulesBody' },
  { title: 'workspaceWebhooks.directions.inbound', body: 'workflowUi.helpWebhooksBody' },
  { title: 'workflowActivity.title', body: 'workflowUi.helpRunsBody' },
  { title: 'workflowUi.helpKeyboardTitle', body: 'workflowUi.helpKeyboardBody' }
];

export const WorkflowHelpDrawer: React.FC<{
  open: boolean;
  initialTopic?: string;
  onClose: () => void;
}> = ({ open, initialTopic, onClose }) => {
  const { t } = useTranslation();
  const topics = topicKeys.map(topic => ({ title: t(topic.title), body: t(topic.body) }));
  const [query, setQuery] = React.useState('');
  React.useEffect(() => {
    if (open) setQuery(initialTopic === 'overview' ? '' : initialTopic || '');
  }, [initialTopic, open]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleTopics = topics.filter((topic) => !normalizedQuery || `${topic.title} ${topic.body}`.toLowerCase().includes(normalizedQuery));
  return (
    <DrawerFrame open={open} width="md" title={t('workflowUi.helpTitle')} titleId="workflow-help-title" description={t('workflowUi.helpDescription')} onClose={onClose}>
      <label className="block">
        <span className="type-micro-label text-ui-text-muted">{t('workflowUi.helpSearch')}</span>
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('workflowUi.helpPlaceholder')} className="mt-2" />
      </label>
      <div className="mt-5 divide-y divide-ui-border" aria-live="polite">
        {visibleTopics.map((topic) => <section key={topic.title} className="py-4 first:pt-0">
          <h3 className="type-row-title">{topic.title}</h3>
          <p className="type-body mt-1 text-ui-text-muted">{topic.body}</p>
        </section>)}
        {visibleTopics.length === 0 && <p className="type-body py-4 text-ui-text-muted">{t('workflowUi.helpEmpty')}</p>}
      </div>
    </DrawerFrame>
  );
};
