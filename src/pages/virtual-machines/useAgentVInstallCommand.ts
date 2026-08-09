import React from 'react';
import type { ControlPlaneVirtualMachineInstallInstructions } from '@/services/controlPlaneApi';

export function useAgentVInstallCommand(
  instructions: ControlPlaneVirtualMachineInstallInstructions | null,
  active = true
) {
  const [hasCopied, setHasCopied] = React.useState(false);
  const [copyFailed, setCopyFailed] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const copiedTimerRef = React.useRef<number | null>(null);
  const parsedExpiry = instructions?.enrollmentExpiresAt
    ? Date.parse(instructions.enrollmentExpiresAt)
    : Number.NaN;
  const enrollmentExpiry = Number.isFinite(parsedExpiry) ? parsedExpiry : null;
  const enrollmentExpired = enrollmentExpiry !== null && enrollmentExpiry <= now;
  const secondsRemaining = enrollmentExpiry === null
    ? null
    : Math.max(0, Math.ceil((enrollmentExpiry - now) / 1000));
  const timeRemaining = secondsRemaining === null
    ? null
    : `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}`;

  React.useEffect(() => {
    if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = null;
    setHasCopied(false);
    setCopyFailed(false);
    setNow(Date.now());
    return () => {
      if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current);
    };
  }, [instructions?.command]);

  React.useEffect(() => {
    if (!active || enrollmentExpiry === null || enrollmentExpired) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [active, enrollmentExpired, enrollmentExpiry]);

  const copy = async () => {
    if (!instructions?.command || enrollmentExpired) return;
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(instructions.command);
      setHasCopied(true);
      if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => {
        setHasCopied(false);
        copiedTimerRef.current = null;
      }, 2_200);
    } catch {
      setHasCopied(false);
      setCopyFailed(true);
    }
  };

  return { copy, copyFailed, enrollmentExpired, enrollmentExpiry, hasCopied, timeRemaining };
}
