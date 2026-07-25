import React from 'react';

export const WorkspaceNavigationGroupBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="rounded-full border border-status-warning/25 bg-status-warning-soft px-1.5 py-0.5 text-[0.625rem] font-bold normal-case leading-none tracking-normal text-status-warning-text">
    {children}
  </span>
);
