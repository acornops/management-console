import React from 'react';
import { CheckCircle2 } from 'lucide-react';

type ModalStepIndicatorStep = {
  id: string;
  label: string;
};

export const ModalStepIndicator: React.FC<{
  steps: ModalStepIndicatorStep[];
  currentStepId: string;
  onStepSelect?: (stepId: string) => void;
  className?: string;
}> = ({ steps, currentStepId, onStepSelect, className = '' }) => {
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStepId));

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {steps.map((step, index) => {
        const active = index === currentIndex;
        const complete = index < currentIndex;
        const selectable = Boolean(!active && onStepSelect);
        const marker = (
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
            active ? 'bg-accent text-ui-bg' : complete ? 'bg-accent-soft text-accent-strong' : 'border border-ui-border bg-ui-surface'
          }`}>
            {complete ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
          </span>
        );
        const content = (
          <>
            {marker}
            {step.label}
          </>
        );
        return (
          <React.Fragment key={step.id}>
            {index > 0 && <span className="h-px w-16 bg-ui-border" />}
            {selectable ? (
              <button
                type="button"
                onClick={() => onStepSelect?.(step.id)}
                className={`type-micro-label -mx-2 inline-flex min-h-11 items-center gap-2 rounded-md px-2 transition-colors hover:bg-accent-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 sm:min-h-8 ${complete ? 'text-accent-strong' : 'text-ui-text-muted hover:text-accent-strong'}`}
                aria-label={`Go to ${step.label}`}
              >
                {content}
              </button>
            ) : (
              <span className={`type-micro-label inline-flex items-center gap-2 ${active || complete ? 'text-accent-strong' : 'text-ui-text-muted'}`}>
                {content}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
