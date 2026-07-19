import React from 'react';
import { Button } from '@/components/common/Button';

export const AppUnavailableScreen: React.FC<{
  logoSrc: string;
  title: string;
  description: string;
  onRetry: () => void;
}> = ({ logoSrc, title, description, onRetry }) => (
  <main className="flex min-h-screen items-center justify-center bg-ui-bg px-6 text-ui-text">
    <section className="w-full max-w-md rounded-xl border border-ui-border bg-ui-surface p-8 text-center shadow-sm">
      <img src={logoSrc} className="mx-auto h-12 w-12" alt="AcornOps" />
      <h1 className="mt-5 text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-ui-text-muted">{description}</p>
      <Button className="mt-6" variant="primary" onClick={onRetry}>Try again</Button>
    </section>
  </main>
);
