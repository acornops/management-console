import { ControlPlaneRequestError } from '@/services/control-plane/http';

export type BrowserErrorSource = 'react-boundary' | 'window-error' | 'unhandled-rejection' | 'startup' | 'operation';

export interface BrowserIncidentRecord {
  event: 'management_console_browser_error';
  incidentId: string;
  source: BrowserErrorSource;
  errorType: string;
  status?: number;
  requestId?: string;
}

const reportedObjects = new WeakMap<object, string>();
const reportedPrimitiveFingerprints = new Map<string, string>();

function incidentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `incident-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function errorType(error: unknown): string {
  if (error instanceof ControlPlaneRequestError) return 'ControlPlaneRequestError';
  if (error instanceof Error && /^[A-Za-z][A-Za-z0-9]*$/.test(error.name)) return error.name;
  return 'UnknownError';
}

export function reportBrowserError(error: unknown, source: BrowserErrorSource): string {
  if ((typeof error === 'object' && error !== null) || typeof error === 'function') {
    const existing = reportedObjects.get(error as object);
    if (existing) return existing;
  } else {
    const fingerprint = `${source}:${typeof error}`;
    const existing = reportedPrimitiveFingerprints.get(fingerprint);
    if (existing) return existing;
  }

  const id = incidentId();
  const record: BrowserIncidentRecord = {
    event: 'management_console_browser_error',
    incidentId: id,
    source,
    errorType: errorType(error)
  };
  if (error instanceof ControlPlaneRequestError) {
    record.status = error.status;
    if (error.requestId) record.requestId = error.requestId;
  }

  if ((typeof error === 'object' && error !== null) || typeof error === 'function') {
    reportedObjects.set(error as object, id);
  } else {
    reportedPrimitiveFingerprints.set(`${source}:${typeof error}`, id);
  }
  console.error(record);
  return id;
}

export function registerGlobalBrowserErrorHandlers(target: Window = window): () => void {
  const handleError = (event: ErrorEvent) => {
    reportBrowserError(event.error ?? null, 'window-error');
  };
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportBrowserError(event.reason, 'unhandled-rejection');
  };
  target.addEventListener('error', handleError);
  target.addEventListener('unhandledrejection', handleUnhandledRejection);
  return () => {
    target.removeEventListener('error', handleError);
    target.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
}
