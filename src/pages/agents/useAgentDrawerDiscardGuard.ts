import React from 'react';

export type AgentDiscardRequest = {
  panel: 'create' | 'edit';
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
      let panel: AgentDiscardRequest['panel'] | null = null;
      if (createPanelOpenRef.current && createDirtyRef.current) {
        panel = 'create';
      } else if (editPanelOpenRef.current && editDirtyRef.current) {
        panel = 'edit';
      }
      if (!panel) return;
      skipNextPopstateRef.current = true;
      window.history.forward();
      setDiscardRequest({ panel, fromHistory: true });
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    window.addEventListener('popstate', guardHistoryExit, { capture: true });
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload);
      window.removeEventListener('popstate', guardHistoryExit, { capture: true });
    };
  }, []);

  const requestClose = (panel: AgentDiscardRequest['panel']) => {
    const dirty = panel === 'create' ? createDirty : editDirty;
    if (dirty) {
      setDiscardRequest({ panel, fromHistory: false });
      return;
    }
    if (panel === 'create') {
      onCloseCreate();
    } else {
      onCloseEdit();
    }
  };

  const discardChanges = () => {
    if (!discardRequest) return;
    if (discardRequest.fromHistory) {
      if (discardRequest.panel === 'create') {
        onDiscardCreateHistory();
      } else {
        onDiscardEditHistory();
      }
    } else {
      if (discardRequest.panel === 'create') {
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
