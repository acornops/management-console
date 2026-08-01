import React from 'react';
import { InlineAlert } from '@acornops/ui';

export const McpServerMutationNotice: React.FC<{ message: string | null }> = ({ message }) => message ? (
  <InlineAlert tone="success" className="mb-5">
    {message}
  </InlineAlert>
) : null;
