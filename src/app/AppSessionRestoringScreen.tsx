import React from 'react';
import { MiniProgressBar } from '@/components/common/Loading';

interface AppSessionRestoringScreenProps {
  logoSrc: string;
  label: string;
}

export const AppSessionRestoringScreen: React.FC<AppSessionRestoringScreenProps> = ({ logoSrc, label }) => (
  <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-ui-bg text-ui-text">
    <span className="sr-only">{label}</span>
    <div className="flex flex-col items-center gap-4">
      <img src={logoSrc} className="h-12 w-12" alt="AcornOps" />
      <MiniProgressBar />
    </div>
  </div>
);
