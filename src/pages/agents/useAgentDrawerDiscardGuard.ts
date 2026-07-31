import React from 'react';

export type AgentDiscardRequest = {
  target: 'create' | 'edit';
  fromHistory: boolean;
};

interface AgentDrawerDiscardGuardOptions {
  createDirty: boolean;
  createPanelOpen: boolean;
  editDirty: boolean;
  editPanelOpen: boolean;
  onCloseCreate: () => void;
  onCloseEdit: () => void;
  onDiscardCreateHistory: () => void;
  onDiscardEditHistory: () => void;
}

export function useAgentDrawerDiscardGuard({
  createDirty,
  createPanelOpen,
  editDirty,
  editPanelOpen,
  onCloseCreate,
  onCloseEdit,
  onDiscardCreateHistory,
  onDiscardEditHistory
}: AgentDrawerDiscardGuardOptions) {
  const [discardRequest, setDiscardRequest] = React.useState<AgentDiscardRequest | null>(null);
  const skipNextPopstateRef = React.useRef(false);
  const createDirtyRef = React.useRef(createDirty);
  const editDirtyRef = React.useRef(editDirty);
  const createPanelOpenRef = React.useRef(createPanelOpen);
  const editPanelOpenRef = React.useRef(editPanelOpen);

  createDirtyRef.current = createDirty;
  editDirtyRef.current = editDirty;
  createPanelOpenRef.current = createPanelOpen;
  editPanelOpenRef.current = editPanelOpen;

  React.useLayoutEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (createDirtyRef.current || editDirtyRef.current) event.preventDefault();
    };
    const guardHistoryExit = () => {
      if (skipNextPopstateRef.current) {
        skipNextPopstateRef.current = false;
        return;
      }
      let target: AgentDiscardRequest['target'] | null = null;
      if (createPanelOpenRef.current && createDirtyRef.current) {
        target = 'create';
      } else if (editPanelOpenRef.current && editDirtyRef.current) {
        target = 'edit';
      }
      if (!target) return;
      skipNextPopstateRef.current = true;
      window.history.forward();
      setDiscardRequest({ target, fromHistory: true });
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    window.addEventListener('popstate', guardHistoryExit, { capture: true });
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload);
      window.removeEventListener('popstate', guardHistoryExit, { capture: true });
    };
  }, []);

  const requestClose = (target: AgentDiscardRequest['target']) => {
    const dirty = target === 'create' ? createDirty : editDirty;
    if (dirty) {
      setDiscardRequest({ target, fromHistory: false });
      return;
    }
    if (target === 'create') {
      onCloseCreate();
    } else {
      onCloseEdit();
    }
  };

  const discardChanges = () => {
    if (!discardRequest) return;
    if (discardRequest.fromHistory) {
      if (discardRequest.target === 'create') {
        onDiscardCreateHistory();
      } else {
        onDiscardEditHistory();
      }
    } else {
      if (discardRequest.target === 'create') {
        onCloseCreate();
      } else {
        onCloseEdit();
      }
    }
    setDiscardRequest(null);
    if (discardRequest.fromHistory) {
      skipNextPopstateRef.current = true;
      window.history.back();
    }
  };

  return {
    cancelDiscard: () => setDiscardRequest(null),
    discardChanges,
    discardRequest,
    requestCloseCreate: () => requestClose('create'),
    requestCloseEdit: () => requestClose('edit')
  };
}
