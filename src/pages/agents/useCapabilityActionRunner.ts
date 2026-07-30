import React from 'react';

interface CapabilityActionRunnerOptions {
  reload: () => Promise<void>;
  setBusy: (value: string) => void;
  setError: (value: string) => void;
  setNotice: (value: string) => void;
}

export function useCapabilityActionRunner({
  reload,
  setBusy,
  setError,
  setNotice
}: CapabilityActionRunnerOptions) {
  return React.useCallback(async (
    key: string,
    action: () => Promise<unknown>,
    message: string
  ) => {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await action();
      await reload();
      setNotice(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The capability change failed.');
    } finally {
      setBusy('');
    }
  }, [reload, setBusy, setError, setNotice]);
}
