import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TargetAssistantReadinessState } from '@/features/targets/chat/components/TargetAssistantReadinessState';

const copy: Record<string, string> = {
  'chat.aiReadinessLoadingTitle': 'Checking AI readiness',
  'chat.aiReadinessLoadingBody': 'Loading configuration.',
  'chat.aiSettingsRequiredManageTitle': 'Connect an AI model to continue',
  'chat.aiSettingsRequiredManageBody': 'Configure an AI provider and model.',
  'chat.aiSettingsRequiredReadOnlyTitle': 'AI configuration required',
  'chat.aiSettingsRequiredReadOnlyBody': 'Contact a workspace administrator.',
  'chat.aiSettingsUnavailableTitle': 'AI settings unavailable',
  'chat.aiSettingsUnavailableManageBody': 'Open AI Settings.',
  'chat.aiSettingsUnavailableReadOnlyBody': 'Contact an administrator.',
  'chat.openAiSettings': 'Open AI Settings',
  'chat.configureAi': 'Configure AI'
};

const t = ((key: string, options?: { count?: number }) => (
  key === 'chat.toolsAvailableAfterSetup'
    ? `${options?.count} tools will be available after setup`
    : copy[key] || key
)) as never;

describe('TargetAssistantReadinessState', () => {
  it('shows setup recovery and successful capability preview details to administrators', () => {
    const markup = renderToStaticMarkup(
      <TargetAssistantReadinessState
        status="unconfigured"
        canManageAiSettings
        onOpenAiSettings={() => undefined}
        toolCount={4}
        t={t}
      />
    );

    expect(markup).toContain('data-empty-state="true"');
    expect(markup).toContain('data-empty-state-surface="embedded"');
    expect(markup).toContain('Connect an AI model to continue');
    expect(markup).toContain('Configure AI');
    expect(markup).toContain('4 tools will be available after setup');
  });

  it('directs read-only users to an administrator without rendering an unavailable action', () => {
    const markup = renderToStaticMarkup(
      <TargetAssistantReadinessState
        status="unconfigured"
        canManageAiSettings={false}
        onOpenAiSettings={() => undefined}
        t={t}
      />
    );

    expect(markup).toContain('AI configuration required');
    expect(markup).toContain('Contact a workspace administrator.');
    expect(markup).not.toContain('<button');
    expect(markup).not.toContain('tools will be available');
  });

  it('keeps loading stable and gives only administrators settings recovery on failures', () => {
    const loading = renderToStaticMarkup(
      <TargetAssistantReadinessState status="loading" canManageAiSettings onOpenAiSettings={() => undefined} t={t} />
    );
    const unavailable = renderToStaticMarkup(
      <TargetAssistantReadinessState status="unavailable" canManageAiSettings onOpenAiSettings={() => undefined} t={t} />
    );

    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('Checking AI readiness');
    expect(loading).not.toContain('<button');
    expect(unavailable).toContain('AI settings unavailable');
    expect(unavailable).toContain('Open AI Settings');
  });
});
