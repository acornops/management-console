import type { CSSProperties } from 'react';
import { ICONS } from '@/constants';

const visualEvidenceTrace = [
  {
    label: 'Pod events',
    value: 'CrashLoopBackOff spike',
    state: 'changed',
    tone: 'warning'
  },
  {
    label: 'Deploy diff',
    value: 'Memory limit reduced',
    state: 'linked',
    tone: 'accent'
  },
  {
    label: 'Endpoints',
    value: 'Service path clear',
    state: 'clear',
    tone: 'success'
  }
] as const;

const traceDelays = ['0ms', '120ms', '240ms'] as const;

function toneClass(tone: (typeof visualEvidenceTrace)[number]['tone']) {
  if (tone === 'accent') return 'border-accent/25 bg-accent-soft text-accent-strong';
  if (tone === 'success') return 'border-status-success/25 bg-status-success-soft text-status-success-text';
  return 'border-status-warning/25 bg-status-warning-soft text-status-warning-text';
}

export function LoginPreview() {
  return (
    <div data-login-visual-variant="a3" className="relative z-10 w-full max-w-[42rem] px-6 py-10 xl:px-10" aria-hidden="true">
      <div className="login-evidence-glow absolute inset-0 z-0" />

      <div className="relative z-10 mb-10 max-w-[29rem]">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-ui-border bg-ui-surface px-3 py-1 text-ui-text-muted">
          <span className="login-health-indicator h-1.5 w-1.5 rounded-full bg-status-warning" />
          <span className="type-caption">Service health</span>
        </div>
        <h2 className="type-section-title">Service restart loop</h2>
        <p className="type-body mt-2">
          AcornOps keeps the evidence, recommended action, and blast radius in one readable path.
        </p>
      </div>

      <div className="relative z-10 min-h-[31rem]">
        <div className="login-evidence-rule absolute z-0 left-8 top-1 h-[23rem] w-px" />
        <div className="login-evidence-rule absolute z-0 left-8 top-[12rem] h-px w-[27rem] max-w-[calc(100%-4rem)]" />
        <div className="login-evidence-signal absolute z-0 left-8 top-[11.8125rem] h-2 w-2 rounded-full bg-accent shadow-sm shadow-accent/30" />
        <div className="login-evidence-signal-y absolute z-0 left-[1.8125rem] top-1 h-2 w-2 rounded-full bg-status-warning shadow-sm shadow-status-warning/30" />

        <div className="login-evidence-node login-evidence-run-card absolute z-10 left-0 top-5 w-40 px-4 py-3">
          <p className="type-micro-label">Run events</p>
          <span className="mt-3 block h-px w-full bg-ui-border/80" />
          <span className="mt-2 block h-px w-2/3 bg-ui-border/70" />
        </div>

        <div className="login-evidence-note login-evidence-note-card absolute z-10 right-4 top-14 w-40 px-4 py-3">
          <p className="type-micro-label">Evidence</p>
          <span className="mt-3 block h-px w-full bg-ui-border/80" />
          <span className="mt-2 block h-px w-3/4 bg-ui-border/70" />
        </div>

        <div className="login-evidence-node absolute z-10 left-10 top-[7rem] w-[20rem] max-w-[calc(100%-2.5rem)] p-5">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-status-warning/25 bg-status-warning-soft text-status-warning-text">
              <ICONS.AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="type-panel-title">Restart loop linked</p>
              <p className="type-body mt-1">Events, deploy changes, and endpoint state resolve to one change window.</p>
            </div>
          </div>
          <span className="type-micro-label rounded-full border border-status-warning/25 bg-status-warning-soft px-2.5 py-1 text-status-warning-text">
            Active investigation
          </span>
        </div>

        <div className="login-evidence-trace absolute z-10 left-8 right-0 top-[21rem] p-3">
          {visualEvidenceTrace.map((item, index) => (
            <div
              key={item.label}
              className="login-evidence-trace-row grid min-w-0 grid-cols-[6rem_minmax(0,1fr)_4.5rem] items-center gap-3 border-b border-ui-border px-3 py-2.5 last:border-b-0"
              style={{ animationDelay: traceDelays[index] } as CSSProperties}
            >
              <span className="type-caption min-w-0 truncate text-ui-text-muted">{item.label}</span>
              <span className="type-caption min-w-0 truncate text-ui-text">{item.value}</span>
              <span className={`type-micro-label rounded-full border px-2 py-1 text-center ${toneClass(item.tone)}`}>
                {item.state}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
