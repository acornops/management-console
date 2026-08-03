import React from 'react';
import { InlineAlert } from '@acornops/ui';

export const McpServerMutationNotice: React.FC<{
  message: string | null;
  tone?: 'success' | 'danger';
}> = ({ message, tone = 'success' }) => message ? (
  <InlineAlert tone={tone} className="mb-5">
    {message}
  </InlineAlert>
) : null;
