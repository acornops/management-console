import React from 'react';

export const McpServerMutationNotice: React.FC<{ message: string | null }> = ({ message }) => message ? (
  <p role="status" className="type-caption mb-5 rounded-lg border border-status-success/30 bg-status-success-soft px-4 py-3 text-status-success-text">
    {message}
  </p>
) : null;
