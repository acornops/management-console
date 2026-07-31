import React from 'react';
import { Button, TextInput } from '@acornops/ui';

import { ICONS } from '@/constants';

interface WorkflowTagsEditorProps {
  tags: string[];
  tagDraft: string;
  readOnly: boolean;
  pending: boolean;
  onTagDraftChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (tag: string) => void;
}

export const WorkflowTagsEditor: React.FC<WorkflowTagsEditorProps> = ({ tags, tagDraft, readOnly, pending, onTagDraftChange, onAdd, onRemove }) => (
  <>
    <div className="mt-3 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-ui-border bg-ui-bg pl-2.5 pr-1 type-caption type-emphasis text-ui-text-muted sm:min-h-8">
          <span>{tag}</span>
          {!readOnly && (
            <Button type="button" variant="tertiary" size="inline" aria-label={`Remove workflow tag ${tag}`} onClick={() => onRemove(tag)} disabled={pending} className="control-target rounded text-ui-text-muted transition-colors hover:bg-status-danger-soft hover:text-status-danger-text focus:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/25 disabled:cursor-not-allowed disabled:opacity-50">
              <ICONS.X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </span>
      ))}
    </div>
    {!readOnly && (
      <div className="mt-3 flex gap-2">
        <TextInput value={tagDraft} onChange={(event) => onTagDraftChange(event.target.value)} placeholder="Add tag" disabled={pending} className="min-h-10 flex-1" />
        <Button variant="secondary" size="sm" onClick={onAdd} disabled={pending || !tagDraft.trim()}>
          {pending ? 'Saving...' : 'Add tag'}
        </Button>
      </div>
    )}
  </>
);
