import React from 'react';

export function useWorkflowSearchShortcut(): void {
  React.useEffect(() => {
    const focusWorkflowSearch = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      const search = ['workflow-library-desktop-search', 'workflow-library-mobile-search']
        .map((id) => document.getElementById(id) as HTMLInputElement | null)
        .find((input) => input && input.offsetParent !== null);
      if (!search) return;
      event.preventDefault();
      search.focus();
    };
    window.addEventListener('keydown', focusWorkflowSearch);
    return () => window.removeEventListener('keydown', focusWorkflowSearch);
  }, []);
}

export function useWorkflowLaunchShortcut({
  blocked,
  onOpen,
  workflowId
}: {
  blocked: boolean;
  onOpen: () => void;
  workflowId?: string;
}): void {
  const openRef = React.useRef(onOpen);
  openRef.current = onOpen;

  React.useEffect(() => {
    const openLaunchReview = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey) || blocked || !workflowId) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]') || target?.closest('[role="dialog"]')) return;
      event.preventDefault();
      openRef.current();
    };
    window.addEventListener('keydown', openLaunchReview);
    return () => window.removeEventListener('keydown', openLaunchReview);
  }, [blocked, workflowId]);
}
