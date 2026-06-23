import React from 'react';
import { CheckCircle2 } from 'lucide-react';

type ModalStepIndicatorStep = {
  id: string;
  label: string;
};

export const ModalStepIndicator: React.FC<{
  steps: ModalStepIndicatorStep[];
  currentStepId: string;
  className?: string;
}> = ({ steps, currentStepId, className = '' }) => {
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStepId));

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {steps.map((step, index) => {
        const active = index === currentIndex;
        const complete = index < currentIndex;
        return (
          <React.Fragment key={step.id}>
            {index > 0 && <span className="h-px w-16 bg-ui-border" />}
            <span className={`type-micro-label inline-flex items-center gap-2 ${active || complete ? 'text-accent-strong' : 'text-ui-text-muted'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                active ? 'bg-accent text-[oklch(0.99_0.004_86)]' : complete ? 'bg-accent-soft text-accent-strong' : 'border border-ui-border bg-ui-surface'
              }`}>
                {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
              </span>
              {step.label}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};
